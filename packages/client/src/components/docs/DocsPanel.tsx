import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useYjsProvider } from "../../hooks/useYjsProvider";
import { uploadArtifact } from "../../api/client";

const lowlight = createLowlight(common);

interface DocsPanelProps {
  roomId: string;
  username: string;
}

export function DocsPanel({ roomId, username }: DocsPanelProps) {
  const { ydoc, provider } = useYjsProvider(`doc:${roomId}`, username);

  const userColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: { name: username, color: userColor },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      CodeBlockLowlight.configure({ lowlight }),
    ],
  });

  async function handleSave() {
    if (!editor) return;
    const html = editor.getHTML();
    const base64 = btoa(unescape(encodeURIComponent(html)));
    await uploadArtifact(roomId, "document", "document.html", base64, "text/html");
    alert("Document saved!");
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
        }}>Document</span>
        <button onClick={handleSave} style={{
          background: "var(--bg-elevated)", color: "var(--text-mid)",
          border: "1px solid var(--border-subtle)", fontSize: 11,
          padding: "5px 12px", fontFamily: "var(--font-mono)",
          borderRadius: "var(--radius-sm)", cursor: "pointer",
          letterSpacing: "0.04em",
        }}>
          Save
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <EditorContent
          editor={editor}
          style={{
            minHeight: "100%",
            outline: "none",
            fontFamily: "var(--font-body)",
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--text-hi)",
          }}
        />
      </div>
    </div>
  );
}
