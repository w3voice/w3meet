import { useNavigate } from "react-router-dom";
import { createRoom } from "../api/client";
import { useState } from "react";

export function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const { id, hostKey } = await createRoom();
      navigate(`/room/${id}?host_key=${hostKey}`);
    } catch (err) {
      alert("Failed to create room");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 24 }}>
      <h1 style={{ fontSize: 48, fontWeight: 700 }}>W3-Meet</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 18 }}>Secure video conferencing</p>
      <button className="primary" onClick={handleCreate} disabled={loading} style={{ fontSize: 18, padding: "14px 40px" }}>
        {loading ? "Creating..." : "Create Room"}
      </button>
    </div>
  );
}
