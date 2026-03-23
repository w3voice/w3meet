import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { config } from "./config.js";
import { redis } from "./lib/redis.js";
import { RoomService } from "./services/room-service.js";
import { createRoomsRouter } from "./routes/rooms.js";
import { createTokensRouter } from "./routes/tokens.js";
import { createRecordingsRouter } from "./routes/recordings.js";
import { createArtifactsRouter } from "./routes/artifacts.js";
import { setupYjsServer } from "./yjs/yjs-server.js";
import { ensureBuckets } from "./services/storage-service.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { RATE_LIMIT_ROOMS_PER_HOUR, RATE_LIMIT_API_PER_MINUTE } from "@w3-meet/shared";

const app = express();
app.set("trust proxy", true);
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

const roomService = new RoomService(redis);

const roomRateLimit = createRateLimiter({
  maxRequests: RATE_LIMIT_ROOMS_PER_HOUR,
  windowMs: 60 * 60 * 1000,
});

const apiRateLimit = createRateLimiter({
  maxRequests: RATE_LIMIT_API_PER_MINUTE,
  windowMs: 60 * 1000,
});

app.use("/api", apiRateLimit);
app.post("/api/rooms", roomRateLimit);
app.use("/api/rooms", createRoomsRouter(roomService));
app.use("/api/rooms", createTokensRouter(roomService));
app.use("/api/rooms", createRecordingsRouter(roomService));
app.use("/api/rooms", createArtifactsRouter());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const server = createServer(app);

// Yjs WebSocket server mounted at /yjs
setupYjsServer(server, redis);

async function start() {
  await ensureBuckets();
  server.listen(config.port, () => {
    console.log(`W3-Meet server listening on port ${config.port}`);
  });
}

start().catch(console.error);
