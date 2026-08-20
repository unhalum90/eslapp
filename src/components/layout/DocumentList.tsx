"use client";

import { createClient } from "@/lib/supabase/client";
import { useEditorStore } from "@/lib/store/useEditorStore";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface RecentDocument {
    id: string;
    title: string;
    updated_at: string;
}

export function DocumentList() {
    const [documents, setDocuments] = useState<RecentDocument[]>([]);
    const { setContent, setHeading } = useEditorStore();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        // In a real app we'd fetch for the current user.
        // Since this is a demo/MVP and RLS might block without a real logged-in session for now (unless using anon),
        // we'll assume the user is authenticated or policies accept anon for demo purposes if modified.
        // For now, let's just fetch everything.
        const fetchDocs = async () => {
            if (!supabase) return;
            const { data } = await supabase.from('documents').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(5);
            if (data) setDocuments(data);
        };

        fetchDocs();

        // Subscribe to realtime changes? Would be nice.
    }, [supabase]);

    const loadDoc = async (id: string) => {
        if (!supabase) return;
        const { data } = await supabase.from('documents').select('*').eq('id', id).single();
        if (data) {
            setContent(data.content || '');
            setHeading(data.title);
            router.push('/editor');
        }
    };

    return (
        <div className="mt-8 px-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Recent Files</h3>
            <div className="space-y-2 text-sm text-slate-500">
                {documents.length === 0 && <p className="text-xs italic pl-2">No documents yet</p>}

                {documents.map((doc) => (
                    <div
                        key={doc.id}
                        onClick={() => loadDoc(doc.id)}
                        className="flex items-center gap-2 py-1 px-2 hover:bg-slate-100 rounded cursor-pointer"
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="truncate">{doc.title}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
