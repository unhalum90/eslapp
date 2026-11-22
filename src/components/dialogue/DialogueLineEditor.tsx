"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { createDialogueLineId, DIALOGUE_LIMITS } from "@/lib/dialogue/domain";
import type { DialogueLine, DialogueSpeakerLabels } from "@/lib/dialogue/types";

interface DialogueLineEditorProps {
  lines: DialogueLine[];
  labels: DialogueSpeakerLabels;
  onLinesChange: (lines: DialogueLine[]) => void;
  onLabelsChange: (labels: DialogueSpeakerLabels) => void;
}

export function DialogueLineEditor({
  lines,
  labels,
  onLinesChange,
  onLabelsChange,
}: DialogueLineEditorProps) {
  const updateLine = (id: string, patch: Partial<DialogueLine>) => {
    onLinesChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const moveLine = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onLinesChange(next);
  };

  const removeLine = (id: string) => {
    onLinesChange(lines.filter((line) => line.id !== id));
  };

  const addLine = () => {
    const speaker = lines.length % 2 === 0 ? "A" : "B";
    onLinesChange([...lines, { id: createDialogueLineId(), speaker, text: "" }]);
  };

  const swapSpeakers = () => {
    onLinesChange(lines.map((line) => ({ ...line, speaker: line.speaker === "A" ? "B" : "A" })));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="speaker-a-label" className="field-label">
              Voice A name
            </label>
            <input
              id="speaker-a-label"
              value={labels.A}
              onChange={(event) => onLabelsChange({ ...labels, A: event.target.value })}
              className="teacher-input w-40"
              placeholder="Waiter"
            />
          </div>
          <div>
            <label htmlFor="speaker-b-label" className="field-label">
              Voice B name
            </label>
            <input
              id="speaker-b-label"
              value={labels.B}
              onChange={(event) => onLabelsChange({ ...labels, B: event.target.value })}
              className="teacher-input w-40"
              placeholder="Customer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          <button
            type="button"
            onClick={swapSpeakers}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
          >
            Swap A and B
          </button>
          <button
            type="button"
            onClick={addLine}
            disabled={lines.length >= DIALOGUE_LIMITS.maxLines}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={14} /> Add line
          </button>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {lines.map((line, index) => (
          <li key={line.id} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => updateLine(line.id, { speaker: line.speaker === "A" ? "B" : "A" })}
              title="Switch this line to the other voice"
              className={`mt-1 inline-flex h-9 w-16 shrink-0 items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-wide transition-colors ${
                line.speaker === "A"
                  ? "bg-[#e8f3f1] text-[#285d68] hover:bg-[#d7ebe7]"
                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
              }`}
            >
              {line.speaker === "A" ? labels.A || "A" : labels.B || "B"}
            </button>

            <textarea
              value={line.text}
              onChange={(event) => updateLine(line.id, { text: event.target.value })}
              rows={2}
              maxLength={DIALOGUE_LIMITS.maxCharsPerLine}
              placeholder={
                index % 2 === 0 ? "Good evening, a table for two?" : "Of course, this way please."
              }
              className="teacher-input min-w-0 flex-1 resize-y"
            />

            <div className="mt-1 flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => moveLine(index, -1)}
                disabled={index === 0}
                title="Move up"
                className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-40"
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => moveLine(index, 1)}
                disabled={index === lines.length - 1}
                title="Move down"
                className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-40"
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                title="Delete line"
                className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </li>
        ))}
      </ol>

      {lines.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Paste a script or generate one from a situation, then fine-tune every line here.
        </p>
      ) : null}
    </section>
  );
}
