import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

export function PreJoinPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const hostKey = searchParams.get("host_key") || undefined;

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const params = new URLSearchParams({ name: name.trim() });
    if (hostKey) params.set("host_key", hostKey);
    navigate(`/room/${roomId}/session?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 24 }}>
      <h2>Join Room</h2>
      <p style={{ color: "var(--text-secondary)" }}>Room: {roomId}</p>
      <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 16, width: 300 }}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
        />
        <button type="submit" className="primary" disabled={!name.trim()}>
          Join
        </button>
      </form>
    </div>
  );
}
