import { useState, useEffect, useCallback } from "react";

export function useRecording(roomId: string, isHost: boolean) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`/api/rooms/${roomId}/recordings/status`);
        const data = await res.json();
        setRecording(data.recording);
      } catch {}
    }
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  const toggleRecording = useCallback(async () => {
    if (!isHost) return;
    setLoading(true);
    try {
      const endpoint = recording ? "stop" : "start";
      await fetch(`/api/rooms/${roomId}/recordings/${endpoint}`, { method: "POST" });
      setRecording(!recording);
    } catch (err) {
      console.error("Recording toggle failed:", err);
    } finally {
      setLoading(false);
    }
  }, [roomId, recording, isHost]);

  return { recording, toggleRecording, loading };
}
