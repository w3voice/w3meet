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
        setConnection({
          token: res.token,
          isHost: res.isHost,
          iceServers: res.iceServers,
          serverUrl: `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/rtc`,
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
