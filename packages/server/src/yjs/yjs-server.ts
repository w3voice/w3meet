import { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import { setupWSConnection, docs as ywsDocs } from "y-websocket/bin/utils";
import type { Redis } from "ioredis";
import { YjsRedisPersistence } from "./yjs-persistence.js";
import { YJS_SNAPSHOT_INTERVAL_MS } from "@w3-meet/shared";

export function setupYjsServer(server: HttpServer, redis: Redis): void {
  const wss = new WebSocketServer({ noServer: true });
  const persistence = new YjsRedisPersistence(redis);

  // y-websocket exposes a `docs` Map<string, WSSharedDoc> internally.
  // We use it for periodic snapshots instead of maintaining our own map.

  // Periodic snapshot to Redis
  const snapshotInterval = setInterval(async () => {
    for (const [name, doc] of ywsDocs) {
      try {
        await persistence.storeDoc(name, doc);
      } catch (err) {
        console.error(`Failed to snapshot Yjs doc ${name}:`, err);
      }
    }
  }, YJS_SNAPSHOT_INTERVAL_MS);

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);

    if (url.pathname.startsWith("/yjs")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (ws: WebSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const docName = url.pathname.replace("/yjs/", "");

    // If this doc is not yet loaded, restore from Redis
    if (!ywsDocs.has(docName)) {
      const tempDoc = new Y.Doc();
      await persistence.loadDoc(docName, tempDoc);
    }

    setupWSConnection(ws, req, { docName, gc: true });

    // Apply persisted state to the newly created shared doc
    const sharedDoc = ywsDocs.get(docName);
    if (sharedDoc) {
      await persistence.loadDoc(docName, sharedDoc);
    }
  });

  // Cleanup on server close
  server.on("close", () => {
    clearInterval(snapshotInterval);
  });
}
