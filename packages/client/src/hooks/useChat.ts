import { useState, useCallback } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import { nanoid } from "nanoid";
import type { ChatMessage } from "@w3-meet/shared";

const CHAT_TOPIC = "chat";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { localParticipant } = useLocalParticipant();

  const onMessage = useCallback((msg: { payload: Uint8Array }) => {
    const parsed: ChatMessage = JSON.parse(new TextDecoder().decode(msg.payload));
    setMessages((prev) => [...prev, parsed]);
  }, []);

  const { send } = useDataChannel(CHAT_TOPIC, onMessage);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const msg: ChatMessage = {
        id: nanoid(8),
        sender: localParticipant.identity || "Anonymous",
        text: text.trim(),
        timestamp: Date.now(),
      };
      const payload = new TextEncoder().encode(JSON.stringify(msg));
      send(payload, { reliable: true });
      setMessages((prev) => [...prev, msg]);
    },
    [send, localParticipant.identity]
  );

  return { messages, sendMessage };
}
