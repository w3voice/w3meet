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
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      gap: 28,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius)",
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--accent-signal)",
          animation: "signal-breathe 2s ease-in-out infinite",
        }} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13,
          color: "var(--text-mid)", letterSpacing: "0.02em",
        }}>
          Room: <span style={{ color: "var(--accent-signal)" }}>{roomId}</span>
        </span>
        {hostKey && (
          <span style={{
            fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent-warm)",
            background: "var(--accent-warm-dim)", padding: "2px 8px",
            borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.06em",
          }}>Host</span>
        )}
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 600 }}>Join Room</h2>

      <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 16, width: 320 }}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
          style={{ textAlign: "center" }}
        />
        <button type="submit" className="primary" disabled={!name.trim()} style={{ padding: "12px 24px" }}>
          Connect
        </button>
      </form>
    </div>
  );
}
