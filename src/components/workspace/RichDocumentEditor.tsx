"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Table2,
  Undo2,
} from "lucide-react";
import { toRichHtml } from "@/lib/materials/richText";

interface RichDocumentEditorProps {
  value: string;
  onChange: (html: string) => void;
  onCommit: (html: string) => void;
  label: string;
  tone?: "default" | "teacher";
}

export function RichDocumentEditor({
  value,
  onChange,
  onCommit,
  label,
  tone = "default",
}: RichDocumentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: toRichHtml(value),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": label,
        class:
          "ProseMirror min-h-72 px-5 py-5 text-[15px] leading-7 text-slate-800 outline-none " +
          "[&_h1]:mb-4 [&_h1]:mt-2 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-slate-950 " +
          "[&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-indigo-950 " +
          "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 " +
          "[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-7 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-7 " +
          "[&_li]:my-1 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-200 " +
          "[&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_hr]:my-6 [&_hr]:border-slate-200 " +
          "[&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2 [&_th]:text-left " +
          "[&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_.answer]:font-bold [&_.answer]:text-red-700",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
    onBlur: ({ editor: currentEditor }) => onCommit(currentEditor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const next = toRichHtml(value);
    if (editor.getHTML() !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return <div className="min-h-72 animate-pulse rounded-xl bg-slate-50" />;
  }

  const toolbar = [
    { label: "Heading 1", icon: Heading1, active: editor.isActive("heading", { level: 1 }), run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: Heading2, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Bold", icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Bulleted list", icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Insert table", icon: Table2, active: editor.isActive("table"), run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { label: "Undo", icon: Undo2, active: false, run: () => editor.chain().focus().undo().run() },
    { label: "Redo", icon: Redo2, active: false, run: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white focus-within:ring-2 ${
        tone === "teacher"
          ? "border-amber-200 focus-within:border-amber-400 focus-within:ring-amber-100"
          : "border-slate-200 focus-within:border-indigo-400 focus-within:ring-indigo-100"
      }`}
    >
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2" aria-label={`${label} formatting`}>
        {toolbar.map(({ label: itemLabel, icon: Icon, active, run }) => (
          <button
            key={itemLabel}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={run}
            aria-label={itemLabel}
            aria-pressed={active}
            className={`rounded-lg p-2 transition-colors ${
              active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white hover:text-slate-950"
            }`}
          >
            <Icon size={16} />
          </button>
        ))}
        <span className="ml-auto self-center pr-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Rich document
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
