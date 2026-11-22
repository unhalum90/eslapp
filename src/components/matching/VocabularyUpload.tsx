"use client";
import { useState } from "react";
import { FileUp } from "lucide-react";
import {
  MAX_VOCABULARY_FILE_BYTES,
  VOCABULARY_FILE_ACCEPT,
} from "@/lib/matching/upload";

export function VocabularyUpload({
  busy,
  onCreate,
  purpose = "matching",
}: {
  busy: string;
  purpose?: "matching" | "choose";
  onCreate: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  return (
    <section
      aria-label="Create from a vocabulary file"
      className="mt-5 rounded-2xl border border-dashed border-indigo-300 bg-white/80 p-4"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <FileUp size={18} className="text-indigo-600" />
        Or start from a file
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Upload a vocabulary image, PDF, Word (.docx), or text file.{" "}
        {purpose === "choose"
          ? "The agent extracts the vocabulary, then you choose an activity."
          : "The agent reads it and creates editable matching pairs using the settings above."}
      </p>
      <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <label className="w-full min-w-0 flex-1 text-xs font-semibold">
          Vocabulary file
          <input
            type="file"
            accept={VOCABULARY_FILE_ACCEPT}
            disabled={Boolean(busy)}
            className="mt-1 block w-full min-w-0 rounded-xl border border-slate-200 p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700"
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              if (selected && selected.size > MAX_VOCABULARY_FILE_BYTES) {
                setError("Choose a file smaller than 8 MB.");
                setFile(null);
                e.target.value = "";
              } else {
                setFile(selected);
                setError("");
              }
            }}
          />
        </label>
        <button
          disabled={!file || Boolean(busy)}
          className="w-full rounded-xl bg-indigo-600 sm:w-auto px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => {
            if (file) void onCreate(file);
          }}
        >
          {busy === "extract"
            ? "Reading vocabulary…"
            : busy === "file-generate"
              ? "Creating matching pairs…"
              : purpose === "choose"
                ? "Read file & choose activity"
                : "Extract & create matching"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Up to 8 MB · Sent to the selected AI provider for extraction; the
        original file is not saved by this app.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
