"use client";

import { Upload, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { parsePdf } from "@/app/actions/ingest";
import { useEditorStore } from "@/lib/store/useEditorStore";
import { useRouter } from "next/navigation";

export default function IngestPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { setContent, setHeading } = useEditorStore();
    const router = useRouter();

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const processFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const text = await parsePdf(formData);

            // Simple formatting to make it HTML-friendly for Tiptap
            const formattedText = text.replace(/\n/g, "<br />");

            setContent(formattedText);
            setHeading(file.name.replace(".pdf", ""));
            router.push("/editor");
        } catch (error) {
            console.error("Ingestion failed:", error);
            alert("Failed to ingest PDF");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Ingest Resource</h1>
                <p className="text-slate-600">Upload a PDF to extract text and start working.</p>
            </div>

            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        setFile(e.target.files[0]);
                    }
                }}
            />
            <label
                htmlFor="file-upload"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
          cursor-pointer block border-2 border-dashed rounded-xl p-12 text-center transition-colors
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'}
          ${file ? 'bg-slate-50' : ''}
        `}
            >
                {file ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-white rounded-full shadow-sm">
                            <FileText size={48} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900">{file.name}</p>
                            <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                            onClick={(e) => { e.preventDefault(); setFile(null); }}
                            className="text-sm text-red-500 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-indigo-50 rounded-full text-indigo-600">
                            <Upload size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-slate-900">Click to upload or drag and drop</p>
                            <p className="text-sm text-slate-500">PDF, JPG, PNG (max 10MB)</p>
                        </div>
                    </div>
                )}
            </label>

            {file && (
                <button
                    onClick={processFile}
                    disabled={isProcessing}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Processing...
                        </>
                    ) : (
                        "Extract & Create Workspace"
                    )}
                </button>
            )}
        </div>
    );
}
