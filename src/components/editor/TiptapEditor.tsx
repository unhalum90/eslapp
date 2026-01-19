"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Toolbar } from "./Toolbar";
import { useEffect } from "react";

interface TiptapEditorProps {
    initialContent?: string;
    onChange?: (content: string) => void;
}

export function TiptapEditor({ initialContent, onChange }: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: "Start typing or use the chat to generate content...",
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[500px] text-slate-900",
            },
        },
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
        immediatelyRender: false,
    });

    // SYNC: When initialContent changes externally (e.g., from AI or PDF ingestion),
    // update the Tiptap editor's content.
    useEffect(() => {
        if (editor && initialContent !== undefined) {
            // Only update if the content is actually different to avoid cursor jumps during typing
            const currentHTML = editor.getHTML();
            if (currentHTML !== initialContent) {
                editor.commands.setContent(initialContent);
            }
        }
    }, [initialContent, editor]);

    return (
        <div className="bg-white border rounded-lg shadow-sm flex flex-col min-h-[calc(100vh-8rem)]">
            <Toolbar editor={editor} />
            <div className="flex-1 p-8 cursor-text" onClick={() => editor?.chain().focus().run()}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
