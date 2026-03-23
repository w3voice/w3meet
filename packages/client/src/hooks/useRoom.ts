import { useState, useEffect } from "react";
import { getToken } from "../api/client";

interface RoomConnection {
  token: string;
  isHost: boolean;
  iceServers: any[];
  serverUrl: string;
}

export function useRoom(roomId: string, name: string, hostKey?: string) {
  const [connection, setConnection] = useState<RoomConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function connect() {
      try {
        const res = await getToken(roomId, name, hostKey);
        // If accessing from a different host (ngrok, etc), use /lk proxy on same origin
        // If local, use the livekitUrl directly
        const isRemote = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
        const serverUrl = isRemote
          ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/lk`
          : (res.livekitUrl || "ws://localhost:7880");
        setConnection({
          token: res.token,
          isHost: res.isHost,
          iceServers: res.iceServers,
          serverUrl,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    connect();
  }, [roomId, name, hostKey]);

  return { connection, error, loading };
}
