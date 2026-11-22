"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { EMOJI_GROUPS } from "@/lib/studio/emoji";
import { ICON_CATEGORIES, renderIcon } from "@/lib/studio/icons";
import { SHAPE_LABELS, SHAPE_PATHS } from "@/lib/studio/shapes";
import { SHAPE_KINDS, type ShapeKind } from "@/lib/studio/types";

export function ShapeThumb({ kind, size = 36, fill = "#285d68" }: { kind: ShapeKind; size?: number; fill?: string }) {
  if (kind === "rectangle") return <div style={{ width: size, height: size * 0.7, background: fill, borderRadius: 4 }} />;
  if (kind === "ellipse") return <div style={{ width: size, height: size * 0.7, background: fill, borderRadius: 9999 }} />;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path d={SHAPE_PATHS[kind]} fill={fill} fillRule="evenodd" />
    </svg>
  );
}

export function ShapePicker({ value, onPick, compact = false }: { value?: ShapeKind; onPick: (kind: ShapeKind) => void; compact?: boolean }) {
  return (
    <div className={`grid gap-1 ${compact ? "grid-cols-6" : "grid-cols-6 sm:grid-cols-8"}`} role="listbox" aria-label="Formes">
      {SHAPE_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          role="option"
          aria-selected={value === kind}
          title={SHAPE_LABELS[kind]}
          onClick={() => onPick(kind)}
          className={`flex aspect-square items-center justify-center rounded-lg border p-1 hover:border-[#285d68] hover:bg-[#e8f3f1] ${value === kind ? "border-[#285d68] bg-[#e8f3f1]" : "border-slate-200"}`}
        >
          <ShapeThumb kind={kind} size={compact ? 26 : 32} />
        </button>
      ))}
    </div>
  );
}

export function IconPicker({ value, onPick, allowNone = false }: { value?: string | null; onPick: (name: string | null) => void; allowNone?: boolean }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  return (
    <div>
      <input aria-label="Rechercher une icône" className="teacher-input !mt-0 text-sm" placeholder="Rechercher (ex. book, star)" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="mt-2 max-h-72 space-y-3 overflow-auto pr-1">
        {allowNone ? (
          <button type="button" onClick={() => onPick(null)} className={`rounded-lg border px-2 py-1 text-xs font-bold ${!value ? "border-[#285d68] bg-[#e8f3f1]" : "border-slate-200"}`}>Aucune</button>
        ) : null}
        {ICON_CATEGORIES.map((category) => {
          const names = category.icons.filter((name) => !needle || name.toLowerCase().includes(needle) || category.label.toLowerCase().includes(needle));
          if (names.length === 0) return null;
          return (
            <div key={category.id}>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{category.label}</p>
              <div className="mt-1 grid grid-cols-8 gap-1">
                {names.map((name) => {
                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      aria-label={name}
                      aria-pressed={value === name}
                      onClick={() => onPick(name)}
                      className={`flex aspect-square items-center justify-center rounded-lg border hover:border-[#285d68] hover:bg-[#e8f3f1] ${value === name ? "border-[#285d68] bg-[#e8f3f1]" : "border-slate-200"}`}
                    >
                      {renderIcon(name, { size: 20 })}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="max-h-72 space-y-3 overflow-auto pr-1">
      {EMOJI_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{group.label}</p>
          <div className="mt-1 grid grid-cols-8 gap-1">
            {group.emoji.map((emoji) => (
              <button key={emoji} type="button" aria-label={emoji} onClick={() => onPick(emoji)} className="flex aspect-square items-center justify-center rounded-lg border border-slate-200 text-2xl hover:border-[#285d68] hover:bg-[#e8f3f1]">
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Popover shell anchored under the insert toolbar. */
export function InsertPopover({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={`absolute left-72 top-28 ${wide ? "w-[28rem]" : "w-80"} max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
          <button type="button" aria-label="Fermer" onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
