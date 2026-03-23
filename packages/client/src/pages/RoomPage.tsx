import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useState } from "react";
import { useRoom } from "../hooks/useRoom";
import { useRecording } from "../hooks/useRecording";
import { VideoGrid } from "../components/room/VideoGrid";
import { ControlBar } from "../components/room/ControlBar";
import { ParticipantList } from "../components/room/ParticipantList";
import { RecordingIndicator } from "../components/room/RecordingIndicator";
import { ChatPanel } from "../components/room/ChatPanel";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get("name") || "Anonymous";
  const hostKey = searchParams.get("host_key") || undefined;
  const { connection, error, loading } = useRoom(roomId!, name, hostKey);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const { recording, toggleRecording, loading: recLoading } = useRecording(roomId!, connection?.isHost ?? false);

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", gap: 16,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--accent-signal)",
          animation: "signal-breathe 1.5s ease-in-out infinite",
        }} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13,
          color: "var(--text-lo)", letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>Connecting...</span>
      </div>
    );
  }

  if (error || !connection) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", gap: 16,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 13,
          color: "var(--danger)", letterSpacing: "0.04em",
        }}>Connection failed: {error}</span>
        <button className="primary" onClick={() => navigate("/")}>
          Back
        </button>
      </div>
    );
  }

  function handlePanelToggle(panel: string) {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <LiveKitRoom
      serverUrl={connection.serverUrl}
      token={connection.token}
      connect={true}
      onDisconnected={() => navigate("/")}
      style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-void)" }}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Left sidebar */}
        <div style={{
          width: 220,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}>
          <ParticipantList />
          <ChatPanel />
        </div>

        {/* Center: video grid */}
        <div style={{ flex: 1, position: "relative", background: "var(--bg-void)" }}>
          <RecordingIndicator active={recording} />
          <VideoGrid />
        </div>

        {/* Right panel: tools */}
        {activePanel && (
          <div style={{
            width: "45%",
            borderLeft: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            overflow: "hidden",
            boxShadow: "-4px 0 20px rgba(0,0,0,0.3)",
          }}>
            {activePanel === "whiteboard" && <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-lo)" }}>Whiteboard — loading...</div>}
            {activePanel === "docs" && <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-lo)" }}>Docs — loading...</div>}
            {activePanel === "code" && <div style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-lo)" }}>Code — loading...</div>}
          </div>
        )}
      </div>

      <ControlBar isHost={connection.isHost} activePanel={activePanel} onPanelToggle={handlePanelToggle} recording={recording} onRecordToggle={toggleRecording} recordingLoading={recLoading} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
