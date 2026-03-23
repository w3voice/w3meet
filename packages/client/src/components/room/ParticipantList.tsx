import { useParticipants } from "@livekit/components-react";

export function ParticipantList() {
  const participants = useParticipants();

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        color: "var(--text-lo)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: 14,
      }}>
        Participants
        <span style={{
          marginLeft: 8,
          color: "var(--accent-signal)",
          fontSize: 12,
        }}>{participants.length}</span>
      </h3>
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {participants.map((p) => {
          const meta = p.metadata ? JSON.parse(p.metadata) : {};
          return (
            <li key={p.identity} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 8px",
              borderRadius: "var(--radius-sm)",
              background: p.isSpeaking ? "var(--accent-signal-dim)" : "transparent",
              transition: "background 0.2s",
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: p.isSpeaking ? "var(--accent-signal)" : "var(--text-lo)",
                transition: "background 0.2s",
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 13,
                fontFamily: "var(--font-body)",
                color: "var(--text-hi)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>{p.identity}</span>
              {meta.isHost && (
                <span style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  color: "var(--accent-warm)",
                  background: "var(--accent-warm-dim)",
                  padding: "1px 6px",
                  borderRadius: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  flexShrink: 0,
                }}>Host</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
