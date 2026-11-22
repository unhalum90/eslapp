"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, Download, FolderOpen, Loader2, Pause, Play, Trash2 } from "lucide-react";
import { dialogueFileName, formatDialogueDuration } from "@/lib/dialogue/domain";
import {
  currentLibraryOwner,
  deleteRemoteDialogue,
  downloadBlob,
  fetchRemoteDialogues,
  readCachedDialogueAudio,
  readDialogueAudio,
  removeCachedDialogueAudio,
  syncLocalDialogue,
} from "@/lib/dialogue/library";
import type { DialogueRecord } from "@/lib/dialogue/types";

interface DialogueLibraryProps {
  dialogues: DialogueRecord[];
  onLoadScript: (record: DialogueRecord) => void;
  onDelete: (record: DialogueRecord) => void;
  onRename: (record: DialogueRecord, title: string) => void;
  onSynced: (record: DialogueRecord, syncState: DialogueRecord["syncState"]) => void;
}

const SYNC_BADGES: Record<DialogueRecord["syncState"], { label: string; className: string }> = {
  synced: { label: "Synced", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Sync failed", className: "bg-amber-100 text-amber-800" },
  local: { label: "This device", className: "bg-slate-100 text-slate-600" },
};

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DialogueLibrary({
  dialogues,
  onLoadScript,
  onDelete,
  onRename,
  onSynced,
}: DialogueLibraryProps) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [remoteDialogues, setRemoteDialogues] = useState<DialogueRecord[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const owner = await currentLibraryOwner();
      if (!active) return;
      setOwnerId(owner);
      if (!owner) return;
      try {
        const remote = await fetchRemoteDialogues(owner);
        if (active) setRemoteDialogues(remote);
      } catch (error) {
        console.error("[dialogue] could not load the Supabase library", error);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const merged = useMemo(() => {
    const known = new Set(dialogues.map((record) => record.id));
    return [...dialogues, ...remoteDialogues.filter((record) => !known.has(record.id))];
  }, [dialogues, remoteDialogues]);

  const playRecord = async (record: DialogueRecord) => {
    setMessage("");
    if (playingId === record.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    const blob = await readDialogueAudio(record, ownerId);
    if (!blob) {
      setMessage(`Audio for "${record.title}" is not on this device. Open it and create the audio again.`);
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = url;
    setPlayingId(record.id);
    void audio.play().catch(() => {
      setPlayingId(null);
      setMessage("This browser blocked playback. Download the MP3 instead.");
    });
  };

  const downloadRecord = async (record: DialogueRecord) => {
    setMessage("");
    const blob = await readDialogueAudio(record, ownerId);
    if (!blob) {
      setMessage(`Audio for "${record.title}" is not on this device. Open it and create the audio again.`);
      return;
    }
    downloadBlob(blob, dialogueFileName(record.title));
  };

  const syncRecord = async (record: DialogueRecord) => {
    setMessage("");
    if (!ownerId) {
      setMessage("Sign in with the teacher account to sync this dialogue across devices.");
      return;
    }
    setBusyId(record.id);
    try {
      const blob = await readCachedDialogueAudio(record.id);
      if (!blob) {
        setMessage(
          `"${record.title}" has no local audio copy. Open its script and create the audio again before syncing.`,
        );
        return;
      }
      const ok = await syncLocalDialogue(record, blob, ownerId);
      onSynced(record, ok ? "synced" : "pending");
      setMessage(
        ok
          ? `"${record.title}" is now available on your other devices.`
          : "Sync failed. The dialogue stays on this device for now.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteRecord = async (record: DialogueRecord) => {
    setBusyId(record.id);
    try {
      if (ownerId) await deleteRemoteDialogue(record, ownerId);
      await removeCachedDialogueAudio(record.id);
      setRemoteDialogues((current) => current.filter((item) => item.id !== record.id));
      onDelete(record);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <FolderOpen size={18} className="text-indigo-600" /> My dialogue library
        </h3>
        <span className="text-xs font-bold text-slate-500">
          {ownerId ? "Supabase sync on" : "Saved on this device · sign in to sync"}
        </span>
      </div>

      {message ? (
        <p className="mt-3 rounded-xl border border-[#cfe3e0] bg-[#e8f3f1] p-3 text-xs font-semibold text-[#285d68]">
          {message}
        </p>
      ) : null}

      {merged.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Nothing saved yet. Create the audio for a dialogue, then choose “Save to library”.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {merged.map((record) => {
            const badge = SYNC_BADGES[record.syncState] ?? SYNC_BADGES.local;
            const isPlaying = playingId === record.id;
            return (
              <li
                key={record.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <input
                    defaultValue={record.title}
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next && next !== record.title) onRename(record, next);
                    }}
                    aria-label="Dialogue title"
                    className="w-full border-0 bg-transparent p-0 text-base font-black text-slate-900 outline-none"
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span>CECRL {record.level}</span>
                    <span>{record.lines.length} lines</span>
                    <span>{formatDialogueDuration(record.durationSeconds)}</span>
                    <span>{formatSize(record.audioBytes)}</span>
                    <span>
                      {record.speakerLabels.A} / {record.speakerLabels.B}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void playRecord(record)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadRecord(record)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    <Download size={14} /> MP3
                  </button>
                  <button
                    type="button"
                    onClick={() => onLoadScript(record)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
                  >
                    <FolderOpen size={14} /> Open script
                  </button>
                  {record.syncState !== "synced" ? (
                    <button
                      type="button"
                      onClick={() => void syncRecord(record)}
                      disabled={busyId === record.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {busyId === record.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CloudUpload size={14} />
                      )}
                      Sync
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void deleteRecord(record)}
                    disabled={busyId === record.id}
                    title="Delete this dialogue"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
    </section>
  );
}
