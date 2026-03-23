import { useState, useRef, useEffect } from "react";
import { useChat } from "../../hooks/useChat";

export function ChatPanel() {
  const { messages, sendMessage } = useChat();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
    setInput("");
  }

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      borderTop: "1px solid var(--border-subtle)",
      minHeight: 0, maxHeight: "50%",
    }}>
      <h3 style={{
        fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-lo)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        padding: "12px 16px",
      }}>Chat</h3>

      <div style={{
        flex: 1, overflowY: "auto", padding: "0 16px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ fontSize: 13 }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontWeight: 600,
              color: "var(--accent-signal)", fontSize: 12,
            }}>{msg.sender}</span>
            <span style={{ color: "var(--text-lo)", margin: "0 6px" }}>//</span>
            <span style={{ color: "var(--text-hi)", fontFamily: "var(--font-body)" }}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{
        padding: 10, display: "flex", gap: 6,
        borderTop: "1px solid var(--border-subtle)",
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="message..."
          style={{
            flex: 1, fontSize: 13, padding: "8px 10px",
            fontFamily: "var(--font-body)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-hi)",
          }}
        />
        <button type="submit" style={{
          padding: "8px 14px", fontSize: 11,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          background: "var(--accent-signal-dim)",
          color: "var(--accent-signal)",
          border: "1px solid rgba(34,211,238,0.2)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
        }}>
          Send
        </button>
      </form>
    </div>
  );
}
