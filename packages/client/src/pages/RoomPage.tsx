import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useState, useCallback } from "react";
import { useRoom } from "../hooks/useRoom";
import { useRecording } from "../hooks/useRecording";
import { VideoGrid } from "../components/room/VideoGrid";
import { ControlBar } from "../components/room/ControlBar";
import { ParticipantList } from "../components/room/ParticipantList";
import { RecordingIndicator } from "../components/room/RecordingIndicator";
import { ChatPanel } from "../components/room/ChatPanel";
import { WhiteboardPanel } from "../components/whiteboard/WhiteboardPanel";
import { DocsPanel } from "../components/docs/DocsPanel";
import { CodePanel } from "../components/code/CodePanel";

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get("name") || "Anonymous";
  const hostKey = searchParams.get("host_key") || undefined;
  const { connection, error, loading } = useRoom(roomId!, name, hostKey);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { recording, toggleRecording, loading: recLoading } = useRecording(roomId!, connection?.isHost ?? false);

  const handleDisconnected = useCallback(() => {
    console.log("[W3-Meet] Disconnected from room");
    setDisconnected(true);
  }, []);

  const handleError = useCallback((err: Error) => {
    console.error("[W3-Meet] LiveKit error:", err);
  }, []);

  function copyInviteLink() {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

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

  if (disconnected) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", gap: 20,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 15,
          color: "var(--text-hi)",
        }}>Call ended</span>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="primary" onClick={() => setDisconnected(false)}>
            Rejoin
          </button>
          <button onClick={() => navigate("/")}>
            Home
          </button>
        </div>
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
      onDisconnected={handleDisconnected}
      onError={handleError}
      style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-void)" }}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* Left sidebar */}
        <div style={{
          width: 264,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Invite link button */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            <button
              onClick={copyInviteLink}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                background: linkCopied ? "var(--success-dim)" : "var(--accent-signal-dim)",
                color: linkCopied ? "var(--success)" : "var(--accent-signal)",
                border: `1px solid ${linkCopied ? "rgba(34,197,94,0.25)" : "rgba(34,211,238,0.25)"}`,
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {linkCopied ? "Link copied!" : "Copy invite link"}
            </button>
          </div>
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
            {activePanel === "whiteboard" && <WhiteboardPanel roomId={roomId!} username={name} />}
            {activePanel === "docs" && <DocsPanel roomId={roomId!} username={name} />}
            {activePanel === "code" && <CodePanel roomId={roomId!} />}
          </div>
        )}
      </div>

      <ControlBar isHost={connection.isHost} activePanel={activePanel} onPanelToggle={handlePanelToggle} recording={recording} onRecordToggle={toggleRecording} recordingLoading={recLoading} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
