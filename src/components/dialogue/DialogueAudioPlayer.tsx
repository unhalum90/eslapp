"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import toWav from "audiobuffer-to-wav";
import { audioBlobFromBase64, mp3BlobFromBase64Segments } from "@/lib/dialogue/domain";
import { downloadBlob } from "@/lib/dialogue/library";
import type {
  DialogueAudioSegment,
  DialogueLine,
  DialogueSpeakerLabels,
} from "@/lib/dialogue/types";

interface DialogueAudioPlayerProps {
  segments: DialogueAudioSegment[];
  lines: DialogueLine[];
  labels: DialogueSpeakerLabels;
  /** File name without extension, e.g. `ordering-at-a-restaurant`. */
  baseName: string;
}

export function DialogueAudioPlayer({
  segments,
  lines,
  labels,
  baseName,
}: DialogueAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [wavError, setWavError] = useState("");

  const segmentUrls = useMemo(
    () =>
      segments.map((segment) =>
        URL.createObjectURL(audioBlobFromBase64(segment.base64, segment.mime)),
      ),
    [segments],
  );

  const combinedBlob = useMemo(
    () => mp3BlobFromBase64Segments(segments.map((segment) => segment.base64)),
    [segments],
  );

  /** Guards against a stale index when a new script is synthesised. */
  const currentIndex = segmentUrls.length
    ? Math.min(activeIndex, segmentUrls.length - 1)
    : 0;

  useEffect(
    () => () => {
      segmentUrls.forEach((url) => URL.revokeObjectURL(url));
    },
    [segmentUrls],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    const url = segmentUrls[currentIndex];
    if (!url) return;
    if (audio.src !== url) audio.src = url;
    void audio.play().catch(() => setIsPlaying(false));
  }, [currentIndex, isPlaying, segmentUrls]);

  const playLine = useCallback((index: number) => {
    setActiveIndex(index);
    setIsPlaying(true);
  }, []);

  const playFromStart = () => {
    setActiveIndex(0);
    setIsPlaying(true);
  };

  const handleEnded = () => {
    if (currentIndex + 1 < segmentUrls.length) setActiveIndex(currentIndex + 1);
    else {
      setIsPlaying(false);
      setActiveIndex(0);
    }
  };

  const downloadWav = async () => {
    setWavError("");
    try {
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(await combinedBlob.arrayBuffer());
      const wav = toWav(decoded);
      await context.close();
      downloadBlob(new Blob([wav], { type: "audio/wav" }), `${baseName}.wav`);
    } catch (error) {
      console.error("[dialogue] wav export failed", error);
      setWavError("WAV export is not available in this browser. The MP3 download still works.");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Volume2 size={18} className="text-indigo-600" /> Listen
          </h3>
          <p className="text-xs font-medium text-slate-500">
            {lines.length} lines · {labels.A} and {labels.B}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((playing) => !playing)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? "Pause" : "Play dialogue"}
          </button>
          <button
            type="button"
            onClick={playFromStart}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-700"
          >
            <RotateCcw size={14} /> From the start
          </button>
          <button
            type="button"
            onClick={() => downloadBlob(combinedBlob, `${baseName}.mp3`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            <Download size={14} /> Download MP3
          </button>
          <button
            type="button"
            onClick={() => void downloadWav()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:text-indigo-700"
          >
            <Download size={14} /> WAV
          </button>
        </div>
      </div>

      {wavError ? <p className="mt-3 text-xs font-semibold text-amber-700">{wavError}</p> : null}

      <ol className="mt-4 space-y-2">
        {lines.map((line, index) => {
          const isActive = index === currentIndex;
          return (
            <li key={line.id}>
              <button
                type="button"
                onClick={() => playLine(index)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  isActive
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[10px] font-black uppercase tracking-wide ${
                    line.speaker === "A"
                      ? "bg-[#e8f3f1] text-[#285d68]"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {labels[line.speaker]}
                </span>
                <span className="text-sm font-medium text-slate-700">{line.text}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <audio ref={audioRef} onEnded={handleEnded} className="hidden" />
    </section>
  );
}
