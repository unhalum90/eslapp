/**
 * Single narration channel shared by preview and player.
 * Starting a new clip stops the current one; page changes call `stop()`.
 */
import type { Id } from "./types";

export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface AudioState {
  assetId: Id | null;
  elementId: Id | null;
  status: AudioStatus;
  message: string | null;
  progress: number;
  duration: number;
}

const IDLE: AudioState = { assetId: null, elementId: null, status: "idle", message: null, progress: 0, duration: 0 };

export class NarrationChannel {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<() => void>();
  private current: AudioState = IDLE;
  private lastUrl: string | null = null;

  getState = (): AudioState => this.current;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private set(patch: Partial<AudioState>) {
    this.current = { ...this.current, ...patch };
    for (const listener of this.listeners) listener();
  }

  private element(): HTMLAudioElement {
    if (!this.audio) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.addEventListener("ended", () => this.set({ status: "idle", progress: 0 }));
      audio.addEventListener("pause", () => {
        if (this.current.status === "playing" && !audio.ended) this.set({ status: "paused" });
      });
      audio.addEventListener("play", () => this.set({ status: "playing", message: null }));
      audio.addEventListener("timeupdate", () => this.set({ progress: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : 0 }));
      audio.addEventListener("error", () => this.set({ status: "error", message: "Le fichier audio n'a pas pu être lu." }));
      this.audio = audio;
    }
    return this.audio;
  }

  /** Starts a clip; resolves true once playback has begun, false on failure. */
  async play(assetId: Id, url: string | undefined, elementId: Id | null): Promise<boolean> {
    if (!url) {
      this.set({ assetId, elementId, status: "error", message: "Audio indisponible." });
      return false;
    }
    const audio = this.element();
    try {
      if (this.lastUrl !== url || audio.error) {
        audio.src = url;
        this.lastUrl = url;
      }
      audio.currentTime = 0;
      this.set({ assetId, elementId, status: "loading", message: null, progress: 0 });
      await audio.play();
      this.set({ status: "playing" });
      return true;
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const message = name === "NotAllowedError"
        ? "Touchez le bouton une fois de plus pour autoriser le son."
        : "Le fichier audio n'a pas pu être lu.";
      this.set({ assetId, elementId, status: "error", message });
      return false;
    }
  }

  async toggle(assetId: Id, url: string | undefined, elementId: Id | null): Promise<boolean> {
    const audio = this.audio;
    if (audio && this.current.assetId === assetId && this.current.elementId === elementId) {
      if (this.current.status === "playing") {
        audio.pause();
        this.set({ status: "paused" });
        return true;
      }
      if (this.current.status === "paused") {
        try {
          await audio.play();
          return true;
        } catch {
          /* fall through to a fresh start */
        }
      }
    }
    return this.play(assetId, url, elementId);
  }

  replay(): void {
    if (!this.audio || !this.current.assetId) return;
    this.audio.currentTime = 0;
    void this.audio.play().catch(() => this.set({ status: "error", message: "Le fichier audio n'a pas pu être lu." }));
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      try {
        this.audio.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
    this.set({ ...IDLE });
  }

  dispose(): void {
    this.stop();
    if (this.audio) {
      this.audio.src = "";
      this.audio = null;
      this.lastUrl = null;
    }
  }
}

/** Short confirmation tone for the classroom "test audio" button (no asset needed). */
export async function playTestTone(): Promise<boolean> {
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return false;
    const context = new AudioContextCtor();
    await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.65);
    window.setTimeout(() => void context.close(), 900);
    return true;
  } catch {
    return false;
  }
}
