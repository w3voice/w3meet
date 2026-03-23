import { useEffect, useRef, useState } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { useYjsProvider } from "../../hooks/useYjsProvider";
import { uploadArtifact } from "../../api/client";

interface WhiteboardPanelProps {
  roomId: string;
  username: string;
}

export function WhiteboardPanel({ roomId, username }: WhiteboardPanelProps) {
  const { ydoc, provider } = useYjsProvider(`wb:${roomId}`, username);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const isRemoteUpdate = useRef(false);
  const yElementsMap = ydoc.getMap<any>("elements-map");

  // Suppress unused warning — provider is kept alive for awareness/sync
  void provider;

  // Sync Yjs → Excalidraw
  useEffect(() => {
    const observer = () => {
      if (isRemoteUpdate.current) return;
      if (api) {
        isRemoteUpdate.current = true;
        const elements = Array.from(yElementsMap.values());
        api.updateScene({ elements });
        isRemoteUpdate.current = false;
      }
    };
    yElementsMap.observe(observer);
    return () => yElementsMap.unobserve(observer);
  }, [api, yElementsMap]);

  // Sync Excalidraw → Yjs (element-level diffing via Y.Map keyed by element ID)
  function handleChange(elements: readonly any[]) {
    if (isRemoteUpdate.current) return;
    isRemoteUpdate.current = true;
    ydoc.transact(() => {
      const currentIds = new Set(elements.map((e) => e.id));
      // Remove deleted elements
      for (const key of yElementsMap.keys()) {
        if (!currentIds.has(key)) yElementsMap.delete(key);
      }
      // Upsert changed elements
      for (const el of elements) {
        const existing = yElementsMap.get(el.id);
        if (!existing || existing.version !== el.version) {
          yElementsMap.set(el.id, { ...el });
        }
      }
    });
    isRemoteUpdate.current = false;
  }

  async function handleSave() {
    if (!api) return;
    const blob = await exportToBlob({
      elements: api.getSceneElements(),
      files: api.getFiles(),
      mimeType: "image/png",
    });
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    await uploadArtifact(roomId, "whiteboard", "whiteboard.png", base64, "image/png");
    alert("Whiteboard saved!");
  }

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
        }}>Whiteboard</span>
        <button onClick={handleSave} style={{
          background: "var(--bg-elevated)", color: "var(--text-mid)",
          border: "1px solid var(--border-subtle)", fontSize: 11,
          padding: "5px 12px", fontFamily: "var(--font-mono)",
          borderRadius: "var(--radius-sm)", cursor: "pointer",
          letterSpacing: "0.04em",
        }}>
          Save PNG
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <Excalidraw
          excalidrawAPI={(apiInstance) => setApi(apiInstance)}
          onChange={handleChange}
          theme="dark"
          UIOptions={{ canvasActions: { saveAsImage: false, loadScene: false } }}
        />
      </div>
    </div>
  );
}
