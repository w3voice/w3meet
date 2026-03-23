import { useNavigate } from "react-router-dom";
import { createRoom } from "../api/client";
import { useState } from "react";

export function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      console.log("[W3-Meet] Creating room...");
      const { id, hostKey } = await createRoom();
      console.log("[W3-Meet] Room created:", id, "navigating...");
      navigate(`/room/${id}?host_key=${hostKey}`);
    } catch (err: any) {
      console.error("[W3-Meet] Room creation failed:", err);
      alert("Failed to create room: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      gap: 32,
    }}>
      {/* Logo mark */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "var(--accent-signal-dim)",
          border: "1px solid rgba(34, 211, 238, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 30px var(--accent-signal-glow)",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              stroke="var(--accent-signal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{
          fontSize: 42,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          letterSpacing: "-0.04em",
          color: "var(--text-hi)",
        }}>
          W3<span style={{ color: "var(--accent-signal)" }}>-</span>Meet
        </h1>
      </div>

      <p style={{
        color: "var(--text-lo)",
        fontSize: 15,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}>
        Secure video conferencing
      </p>

      <button
        className="primary"
        onClick={handleCreate}
        disabled={loading}
        style={{
          fontSize: 15,
          padding: "14px 48px",
          marginTop: 8,
        }}
      >
        {loading ? "Connecting..." : "Create Room"}
      </button>

      {/* Status indicator */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginTop: 32,
        opacity: 0.5,
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--success)",
          animation: "signal-breathe 2s ease-in-out infinite",
        }} />
        <span style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--text-lo)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          System online
        </span>
      </div>
    </div>
  );
}
