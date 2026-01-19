"use client";

import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { useEditorStore } from "@/lib/store/useEditorStore";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { ChatSidebar } from "@/components/layout/ChatSidebar";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function EditorPage() {
    const { heading, setHeading, canvasJSON } = useEditorStore();
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            if (!userId) {
                alert("You are not logged in. Changes will not be saved to the database (Demo Mode).");
                return;
            }

            const { error } = await supabase.from('documents').upsert({
                owner_id: userId,
                title: heading,
                content: JSON.stringify(canvasJSON), // Store canvas as JSON string
                updated_at: new Date().toISOString(),
            });

            if (error) throw error;
            alert("Document saved!");
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save document.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-full gap-6">
            <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                            <ChevronLeft size={20} />
                        </Link>
                        <input
                            value={heading}
                            onChange={(e) => setHeading(e.target.value)}
                            className="text-2xl font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-slate-300 w-full"
                            placeholder="Untitled Document"
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm whitespace-nowrap disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Snapshot
                    </button>
                </div>

                <CanvasEditor />
            </div>

            <ChatSidebar />
        </div>
    );
}
