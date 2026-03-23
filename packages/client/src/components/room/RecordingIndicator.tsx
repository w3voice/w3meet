export function RecordingIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div style={{
      position: "absolute",
      top: 14,
      right: 14,
      display: "flex",
      alignItems: "center",
      gap: 7,
      background: "var(--danger-dim)",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      padding: "5px 14px",
      borderRadius: 20,
      fontSize: 11,
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      color: "var(--danger)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      zIndex: 10,
      animation: "pulse-glow 2s ease-in-out infinite",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: "var(--danger)",
        animation: "dot-pulse 1.5s ease-in-out infinite",
      }} />
      REC
    </div>
  );
}
