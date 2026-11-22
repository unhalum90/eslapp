import type { DialogueLine, DialogueRecord, DialogueSpeakerLabels } from "@/lib/dialogue/types";
import { createClient } from "@/lib/supabase/client";

/**
 * Dialogue library storage.
 *
 * Supabase Storage + `dialogue_library` are the cross-device source of truth
 * (see `supabase/migrations/202609200001_dialogue_library.sql`). IndexedDB keeps
 * a local copy so playback is instant and a save is never lost while the teacher
 * is signed out.
 */
const AUDIO_BUCKET = "dialogue-audio";
const DIALOGUE_TABLE = "dialogue_library";
const CACHE_DB_NAME = "esl-architect-dialogue-audio";
const CACHE_STORE_NAME = "audio";
const CACHE_VERSION = 1;

export const LOCAL_ONLY_MESSAGE =
  "Saved on this device. Sign in before syncing your dialogue library across devices.";

interface DialogueRow {
  id: string;
  owner_id: string;
  title: string;
  scenario: string | null;
  level: string | null;
  source: string | null;
  speaker_labels: unknown;
  voices: unknown;
  lines: unknown;
  audio_path: string | null;
  audio_mime: string | null;
  audio_bytes: number | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

function supabaseClient() {
  return createClient();
}

export async function currentLibraryOwner(): Promise<string | null> {
  const supabase = supabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

let cacheDatabase: Promise<IDBDatabase> | null = null;

function openCacheDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }
  if (!cacheDatabase) {
    cacheDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(CACHE_STORE_NAME)) {
          database.createObjectStore(CACHE_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Could not open the audio cache."));
    });
  }
  return cacheDatabase;
}

function runCacheRequest<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openCacheDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(CACHE_STORE_NAME, mode);
        const request = run(transaction.objectStore(CACHE_STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Audio cache request failed."));
      }),
  );
}

export async function cacheDialogueAudio(id: string, blob: Blob): Promise<void> {
  await runCacheRequest("readwrite", (store) => store.put(blob, id));
}

export async function readCachedDialogueAudio(id: string): Promise<Blob | null> {
  try {
    const value = await runCacheRequest<Blob | undefined>("readonly", (store) => store.get(id));
    return value instanceof Blob ? value : null;
  } catch {
    return null;
  }
}

export async function removeCachedDialogueAudio(id: string): Promise<void> {
  try {
    await runCacheRequest("readwrite", (store) => store.delete(id));
  } catch {
    // A missing cache entry is not an error.
  }
}

export function dialogueAudioPath(ownerId: string, dialogueId: string, extension = "mp3"): string {
  return `${ownerId}/${dialogueId}.${extension}`;
}

function asSpeakerLabels(value: unknown): DialogueSpeakerLabels {
  const record = (value ?? {}) as Partial<DialogueSpeakerLabels>;
  return {
    A: typeof record.A === "string" && record.A.trim() ? record.A : "Speaker A",
    B: typeof record.B === "string" && record.B.trim() ? record.B : "Speaker B",
  };
}

function asLines(value: unknown): DialogueLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is DialogueLine => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => ({
      id: typeof entry.id === "string" && entry.id ? entry.id : `line_${index}`,
      speaker: entry.speaker === "B" ? ("B" as const) : ("A" as const),
      text: typeof entry.text === "string" ? entry.text : "",
    }))
    .filter((line) => line.text.length > 0);
}

function asVoices(value: unknown): { A: string; B: string; model: string } {
  const record = (value ?? {}) as { A?: string; B?: string; model?: string };
  return {
    A: typeof record.A === "string" ? record.A : "",
    B: typeof record.B === "string" ? record.B : "",
    model: typeof record.model === "string" ? record.model : "",
  };
}

function rowToDialogueRecord(row: DialogueRow): DialogueRecord {
  return {
    id: row.id,
    title: row.title,
    scenario: row.scenario ?? "",
    level: row.level === "A2" || row.level === "B1" || row.level === "B2" ? row.level : "A1",
    source: row.source === "generated" ? "generated" : "text",
    speakerLabels: asSpeakerLabels(row.speaker_labels),
    voices: asVoices(row.voices),
    lines: asLines(row.lines),
    audioMime: row.audio_mime || "audio/mpeg",
    audioBytes: row.audio_bytes ?? 0,
    durationSeconds: row.duration_seconds ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncState: "synced",
  };
}

export async function uploadDialogueAudio(
  ownerId: string,
  dialogueId: string,
  blob: Blob,
): Promise<string> {
  const supabase = supabaseClient();
  if (!supabase) throw new Error("Supabase is not configured for this deployment.");

  const path = dialogueAudioPath(ownerId, dialogueId);
  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, blob, { contentType: blob.type || "audio/mpeg", upsert: true });
  if (error) throw error;
  return path;
}

export async function upsertDialogueRecord(
  record: DialogueRecord,
  ownerId: string,
  audioPath: string,
): Promise<void> {
  const supabase = supabaseClient();
  if (!supabase) throw new Error("Supabase is not configured for this deployment.");

  const { error } = await supabase.from(DIALOGUE_TABLE).upsert(
    {
      id: record.id,
      owner_id: ownerId,
      title: record.title,
      scenario: record.scenario,
      level: record.level,
      source: record.source,
      speaker_labels: record.speakerLabels,
      voices: record.voices,
      lines: record.lines,
      audio_path: audioPath,
      audio_mime: record.audioMime,
      audio_bytes: record.audioBytes,
      duration_seconds: record.durationSeconds,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function fetchRemoteDialogues(ownerId: string): Promise<DialogueRecord[]> {
  const supabase = supabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(DIALOGUE_TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => rowToDialogueRecord(row as DialogueRow));
}

export async function downloadDialogueAudio(
  ownerId: string,
  dialogueId: string,
): Promise<Blob | null> {
  const supabase = supabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .download(dialogueAudioPath(ownerId, dialogueId));
  if (error || !data) return null;
  return data;
}

export async function deleteRemoteDialogue(record: DialogueRecord, ownerId: string): Promise<void> {
  const supabase = supabaseClient();
  if (!supabase) return;
  await supabase.storage.from(AUDIO_BUCKET).remove([dialogueAudioPath(ownerId, record.id)]);
  await supabase.from(DIALOGUE_TABLE).delete().eq("id", record.id).eq("owner_id", ownerId);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export interface SaveDialogueResult {
  syncState: DialogueRecord["syncState"];
  message: string;
}

/**
 * Always caches locally, then mirrors to Supabase when a teacher is signed in.
 * Mirrors the graceful degradation used by the existing delivery panel.
 */
export async function persistDialogue(
  record: DialogueRecord,
  audio: Blob,
): Promise<SaveDialogueResult> {
  await cacheDialogueAudio(record.id, audio);

  const ownerId = await currentLibraryOwner();
  if (!ownerId) return { syncState: "local", message: LOCAL_ONLY_MESSAGE };

  try {
    const path = await uploadDialogueAudio(ownerId, record.id, audio);
    await upsertDialogueRecord(record, ownerId, path);
    return { syncState: "synced", message: "Saved to the library and synced." };
  } catch (error) {
    console.error("[dialogue] library sync failed", error);
    return {
      syncState: "pending",
      message: "Saved on this device. Supabase sync failed and will be retried.",
    };
  }
}

export async function syncLocalDialogue(
  record: DialogueRecord,
  audio: Blob,
  ownerId: string,
): Promise<boolean> {
  try {
    const path = await uploadDialogueAudio(ownerId, record.id, audio);
    await upsertDialogueRecord(record, ownerId, path);
    return true;
  } catch (error) {
    console.error("[dialogue] deferred sync failed", error);
    return false;
  }
}

export async function readDialogueAudio(
  record: DialogueRecord,
  ownerId: string | null,
): Promise<Blob | null> {
  const cached = await readCachedDialogueAudio(record.id);
  if (cached) return cached;
  if (!ownerId) return null;

  const remote = await downloadDialogueAudio(ownerId, record.id);
  if (remote) await cacheDialogueAudio(record.id, remote);
  return remote;
}
