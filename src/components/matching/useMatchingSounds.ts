"use client";
import { scheduleMatchingSound } from "@/lib/matching/sound";
import { useEffect, useRef, useState } from "react";

export function useMatchingSounds() {
  const [enabled, setEnabled] = useState(true);
  const context = useRef<AudioContext | null>(null);
  function unlock() {
    if (!enabled || typeof AudioContext === "undefined") return;
    try {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => {});
    } catch {
      /* Sound is optional if unavailable. */
    }
  }
  function play(correct: boolean) {
    if (!enabled) return;
    unlock();
    const audio = context.current;
    if (!audio) return;
    try {
      scheduleMatchingSound(audio, correct);
    } catch {
      /* Feedback remains visual if audio fails. */
    }
  }
  useEffect(
    () => () => {
      void context.current?.close().catch(() => {});
    },
    [],
  );
  return {
    enabled,
    unlock,
    play,
    toggle: () => {
      if (!enabled) {
        setEnabled(true);
      } else setEnabled(false);
    },
  };
}
