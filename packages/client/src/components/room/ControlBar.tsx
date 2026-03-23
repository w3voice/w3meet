import {
  TrackToggle,
  DisconnectButton,
} from "@livekit/components-react";
import { Track } from "livekit-client";

interface ControlBarProps {
  isHost: boolean;
  activePanel: string | null;
  onPanelToggle: (panel: string) => void;
}

export function ControlBar({ isHost, activePanel, onPanelToggle }: ControlBarProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: "10px 16px",
      background: "var(--bg-surface)",
      borderTop: "1px solid var(--border-subtle)",
    }}>
      <TrackToggle source={Track.Source.Microphone} />
      <TrackToggle source={Track.Source.Camera} />
      <TrackToggle source={Track.Source.ScreenShare} />

      <div style={{ width: 1, height: 24, background: "var(--border-subtle)", margin: "0 10px" }} />

      {["whiteboard", "docs", "code"].map((panel) => (
        <button
          key={panel}
          onClick={() => onPanelToggle(panel)}
          style={{
            background: activePanel === panel ? "var(--accent-signal-dim)" : "var(--bg-elevated)",
            color: activePanel === panel ? "var(--accent-signal)" : "var(--text-mid)",
            borderColor: activePanel === panel ? "rgba(34, 211, 238, 0.25)" : "var(--border-subtle)",
            padding: "8px 16px",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
          }}
        >
          {panel}
        </button>
      ))}

      <div style={{ width: 1, height: 24, background: "var(--border-subtle)", margin: "0 10px" }} />

      <DisconnectButton style={{
        background: "var(--danger-dim)",
        color: "var(--danger)",
        border: "1px solid rgba(239, 68, 68, 0.25)",
        padding: "8px 16px",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.06em",
        borderRadius: "var(--radius)",
        cursor: "pointer",
      }}>
        Leave
      </DisconnectButton>
    </div>
  );
}
