interface CodePanelProps {
  roomId: string;
}

export function CodePanel({ roomId }: CodePanelProps) {
  const padUrl = `/pad/${roomId}`;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "10px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
      }}>
        <span style={{
          fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600,
          color: "var(--text-lo)", textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}>Code</span>
        <a href={padUrl} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 11, fontFamily: "var(--font-mono)",
          color: "var(--accent-signal)", textDecoration: "none",
          letterSpacing: "0.04em",
        }}>
          Open in tab
        </a>
      </div>
      <iframe
        src={padUrl}
        style={{ flex: 1, border: "none", background: "#1e1e1e" }}
        title="Rustpad Code Editor"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
