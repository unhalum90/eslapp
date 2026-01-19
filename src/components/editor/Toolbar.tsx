"use client";

import { type Editor } from "@tiptap/react";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarProps {
    editor: Editor | null;
}

export function Toolbar({ editor }: ToolbarProps) {
    if (!editor) {
        return null;
    }

    return (
        <div className="border-b bg-white p-2 flex items-center gap-1 sticky top-0 z-10">
            <Toggle
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                title="Bold"
            >
                <Bold size={16} />
            </Toggle>

            <Toggle
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                title="Italic"
            >
                <Italic size={16} />
            </Toggle>

            <div className="h-4 w-px bg-slate-200 mx-2" />

            <Toggle
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive("heading", { level: 1 })}
                title="Heading 1"
            >
                <Heading1 size={16} />
            </Toggle>

            <Toggle
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
            >
                <Heading2 size={16} />
            </Toggle>

            <div className="h-4 w-px bg-slate-200 mx-2" />

            <Toggle
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive("bulletList")}
                title="Bullet List"
            >
                <List size={16} />
            </Toggle>

            <Toggle
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive("orderedList")}
                title="Ordered List"
            >
                <ListOrdered size={16} />
            </Toggle>

            <Toggle
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive("blockquote")}
                title="Quote"
            >
                <Quote size={16} />
            </Toggle>
        </div>
    );
}

function Toggle({
    children,
    isActive,
    onClick,
    title,
}: {
    children: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    title: string;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "p-2 rounded hover:bg-slate-100 transition-colors text-slate-600",
                isActive && "bg-indigo-50 text-indigo-600"
            )}
        >
            {children}
        </button>
    );
}
