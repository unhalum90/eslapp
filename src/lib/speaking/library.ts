import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCleanedAudio, verifyAuphonicToken } from "./auphonic";
import { SpeakingApiError } from "./mistral";
import { deleteSpeakingSource, getSpeakingSource } from "./storage";
import type { SavedSpeakingRecord, SavedSpeakingSummary, SpeakingFolder } from "./types";

const BUCKET = "speaking-library";
const MAX_AUDIO_BYTES = 50_000_000;

export type SpeakingRecordInput = Pick<SavedSpeakingRecord,
  "filename" | "transcription" | "turns" | "speakerNames" | "level" | "task" | "feedback" | "folderId">;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new SpeakingApiError("The speaking library is not configured on the server.", 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function libraryUserId() {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user?.id || null;
}

async function bucket() {
  const storage = admin().storage;
  const { data, error } = await storage.getBucket(BUCKET);
  if (!data) {
    if (error && !/not found/i.test(error.message) && error.status !== 404) {
      throw new SpeakingApiError("Could not access the speaking library.", 502);
    }
    const created = await storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_AUDIO_BYTES,
      allowedMimeTypes: ["audio/mpeg", "application/json"],
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new SpeakingApiError("Could not create the speaking library.", 502);
    }
  }
  return storage.from(BUCKET);
}

function recordPath(userId: string, id: string) { return `${userId}/${id}.json`; }
function audioPath(userId: string, id: string) { return `${userId}/${id}.mp3`; }
function foldersPath(userId: string) { return `${userId}/_folders.json`; }
function validId(id: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id); }

function summary(record: SavedSpeakingRecord): SavedSpeakingSummary {
  return {
    id: record.id,
    folderId: record.folderId ?? null,
    filename: record.filename,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    hasFeedback: !!record.feedback,
  };
}

async function readRecord(userId: string, id: string): Promise<SavedSpeakingRecord> {
  if (!validId(id)) throw new SpeakingApiError("Invalid saved recording.", 400);
  const { data, error } = await (await bucket()).download(recordPath(userId, id));
  if (error || !data) throw new SpeakingApiError("Saved recording not found.", 404);
  const record = JSON.parse(await data.text()) as SavedSpeakingRecord;
  if (record.id !== id) throw new SpeakingApiError("Saved recording is invalid.", 502);
  return record;
}

export async function listSpeakingRecords(userId: string, offset: number) {
  const store = await bucket();
  const { data, error } = await store.list(userId, {
    limit: 101,
    offset,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new SpeakingApiError("Could not load the speaking library.", 502);
  const page = (data || []).slice(0, 100);
  const manifests = page.filter((file) => file.name.endsWith(".json") && validId(file.name.slice(0, -5)));
  const records = await Promise.all(manifests.map(async (file) => {
    try {
      const id = file.name.slice(0, -5);
      return summary(await readRecord(userId, id));
    } catch { return null; }
  }));
  return {
    records: records.filter((record): record is SavedSpeakingSummary => !!record),
    hasMore: (data || []).length > 100,
    nextOffset: offset + page.length,
  };
}

export async function listSpeakingFolders(userId: string): Promise<SpeakingFolder[]> {
  const { data, error } = await (await bucket()).download(foldersPath(userId));
  if (error || !data) return [];
  const parsed: unknown = JSON.parse(await data.text());
  if (!Array.isArray(parsed)) throw new SpeakingApiError("Saved folders are invalid.", 502);
  return parsed.filter((item): item is SpeakingFolder =>
    typeof item === "object" && item !== null &&
    typeof item.id === "string" && validId(item.id) &&
    typeof item.name === "string" && typeof item.createdAt === "string");
}

async function writeFolders(userId: string, folders: SpeakingFolder[]) {
  const { error } = await (await bucket()).upload(
    foldersPath(userId), new Blob([JSON.stringify(folders)], { type: "application/json" }),
    { contentType: "application/json", upsert: true },
  );
  if (error) throw new SpeakingApiError("Could not save speaking folders.", 502);
}

export async function createSpeakingFolder(userId: string, name: string) {
  const folders = await listSpeakingFolders(userId);
  if (folders.some((folder) => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new SpeakingApiError("A folder with this name already exists.", 409);
  }
  const folder: SpeakingFolder = { id: randomUUID(), name, createdAt: new Date().toISOString() };
  await writeFolders(userId, [...folders, folder]);
  return folder;
}

export async function renameSpeakingFolder(userId: string, id: string, name: string) {
  const folders = await listSpeakingFolders(userId);
  const folder = folders.find((item) => item.id === id);
  if (!folder) throw new SpeakingApiError("Speaking folder not found.", 404);
  if (folders.some((item) => item.id !== id && item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new SpeakingApiError("A folder with this name already exists.", 409);
  }
  const renamed = { ...folder, name };
  await writeFolders(userId, folders.map((item) => item.id === id ? renamed : item));
  return renamed;
}

async function assertFolder(userId: string, folderId: string | null | undefined) {
  if (folderId == null) return;
  if (!validId(folderId) || !(await listSpeakingFolders(userId)).some((folder) => folder.id === folderId)) {
    throw new SpeakingApiError("Speaking folder not found.", 404);
  }
}

export async function moveSpeakingRecord(userId: string, id: string, folderId: string | null) {
  await assertFolder(userId, folderId);
  const existing = await readRecord(userId, id);
  const record = { ...existing, folderId, updatedAt: new Date().toISOString() };
  const { error } = await (await bucket()).upload(recordPath(userId, id), new Blob([JSON.stringify(record)], { type: "application/json" }), {
    contentType: "application/json", upsert: true,
  });
  if (error) throw new SpeakingApiError("Could not move the recording.", 502);
  return summary(record);
}

export async function getSpeakingRecord(userId: string, id: string) {
  const record = await readRecord(userId, id);
  const { data, error } = await (await bucket()).createSignedUrl(audioPath(userId, id), 3600);
  if (error || !data?.signedUrl) throw new SpeakingApiError("Could not open the saved audio.", 502);
  return { ...record, audioUrl: data.signedUrl };
}

export async function getSpeakingTranscriptRecord(userId: string, id: string) {
  return readRecord(userId, id);
}

export async function createSpeakingRecord(userId: string, source: { token?: string; ticket?: string }, input: SpeakingRecordInput) {
  await assertFolder(userId, input.folderId);
  let audio: Blob;
  let temporarySourceId: string | null = null;
  if (source.ticket) {
    const original = await getSpeakingSource(source.ticket);
    audio = original.audio;
    temporarySourceId = original.id;
  } else {
    const { uuid } = verifyAuphonicToken(source.token || "");
    audio = await getCleanedAudio(uuid);
  }
  if (audio.size > MAX_AUDIO_BYTES) throw new SpeakingApiError("The MP3 exceeds the library's 50 MB limit.", 413);
  const id = randomUUID();
  const now = new Date().toISOString();
  const record: SavedSpeakingRecord = { id, createdAt: now, updatedAt: now, ...input, folderId: input.folderId ?? null };
  const store = await bucket();
  const savedAudio = await store.upload(audioPath(userId, id), audio, { contentType: "audio/mpeg", upsert: false });
  if (savedAudio.error) throw new SpeakingApiError("Could not save the MP3.", 502);
  const metadata = await store.upload(recordPath(userId, id), new Blob([JSON.stringify(record)], { type: "application/json" }), {
    contentType: "application/json",
    upsert: false,
  });
  if (metadata.error) {
    await store.remove([audioPath(userId, id)]);
    throw new SpeakingApiError("Could not save the transcript.", 502);
  }
  if (temporarySourceId) await deleteSpeakingSource(temporarySourceId);
  return summary(record);
}

export async function updateSpeakingRecord(userId: string, id: string, input: SpeakingRecordInput) {
  const existing = await readRecord(userId, id);
  await assertFolder(userId, input.folderId);
  const record: SavedSpeakingRecord = {
    ...existing,
    ...input,
    folderId: input.folderId === undefined ? existing.folderId ?? null : input.folderId,
    // The original recognition result remains unchanged for the learner export.
    transcription: existing.transcription,
    updatedAt: new Date().toISOString(),
  };
  const { error } = await (await bucket()).upload(recordPath(userId, id), new Blob([JSON.stringify(record)], { type: "application/json" }), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new SpeakingApiError("Could not update the saved analysis.", 502);
  return summary(record);
}
