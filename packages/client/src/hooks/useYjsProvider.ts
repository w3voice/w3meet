import { useEffect, useMemo } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

export function useYjsProvider(docName: string, username: string) {
  const ydoc = useMemo(() => new Y.Doc(), [docName]);

  const provider = useMemo(() => {
    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/yjs`;
    return new WebsocketProvider(wsUrl, docName, ydoc);
  }, [docName, ydoc]);

  useEffect(() => {
    provider.awareness.setLocalStateField("user", {
      name: username,
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
    });

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [provider, ydoc, username]);

  return { ydoc, provider, awareness: provider.awareness };
}
