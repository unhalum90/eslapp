import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SpeakingApiError } from "./mistral";

const BUCKET = "speaking-temp";
export const MAX_SPEAKING_BYTES = 50_000_000;
const TICKET_AGE_MS = 2 * 60 * 60 * 1000;

function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value) throw new SpeakingApiError("Supabase storage is not configured on the server.", 503);
  return value;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new SpeakingApiError("Supabase storage is not configured on the server.", 503);
  return createClient(url, secret(), { auth: { persistSession: false, autoRefreshToken: false } });
}

function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
function path(id: string) { return `temp/${id}.mp3`; }

export async function ensureSpeakingBucket() {
  const storage = admin().storage;
  const { data, error } = await storage.getBucket(BUCKET);
  if (data) return;
  if (error && !/not found/i.test(error.message) && error.status !== 404) {
    throw new SpeakingApiError("Could not access temporary audio storage.", 502);
  }
  const created = await storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_SPEAKING_BYTES,
    allowedMimeTypes: ["audio/mpeg"],
  });
  if (created.error && !/already exists/i.test(created.error.message)) {
    throw new SpeakingApiError("Could not create temporary audio storage.", 502);
  }
}

export async function createSpeakingUpload(size: number) {
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_SPEAKING_BYTES) {
    throw new SpeakingApiError("Choose an MP3 smaller than 50 MB.", 413);
  }
  await ensureSpeakingBucket();
  // Clear interrupted uploads when the workspace is used again.
  const bucket = admin().storage.from(BUCKET);
  const { data: oldFiles } = await bucket.list("temp", { limit: 100, sortBy: { column: "created_at", order: "asc" } });
  const stale = oldFiles?.filter((file) => file.created_at && Date.now() - Date.parse(file.created_at) > 24 * 60 * 60 * 1000)
    .map((file) => `temp/${file.name}`) || [];
  if (stale.length) await bucket.remove(stale);
  const id = randomBytes(16).toString("hex");
  const { data, error } = await bucket.createSignedUploadUrl(path(id));
  if (error || !data) throw new SpeakingApiError("Could not prepare the audio upload.", 502);
  const body = `${id}.${size}.${Date.now()}`;
  return { ticket: `${body}.${sign(body)}`, path: path(id), uploadToken: data.token };
}

export function verifySpeakingUpload(ticket: string) {
  const match = /^([a-f0-9]{32})\.(\d{1,8})\.(\d{13})\.([a-f0-9]{64})$/.exec(ticket);
  if (!match) throw new SpeakingApiError("Invalid audio upload session.", 400);
  const body = `${match[1]}.${match[2]}.${match[3]}`;
  if (!timingSafeEqual(Buffer.from(sign(body), "hex"), Buffer.from(match[4], "hex")) ||
      Date.now() - Number(match[3]) > TICKET_AGE_MS || Number(match[3]) > Date.now() + 60_000) {
    throw new SpeakingApiError("Audio upload session expired. Please upload again.", 400);
  }
  return { id: match[1], size: Number(match[2]), path: path(match[1]) };
}

export async function signedSpeakingSource(ticket: string) {
  const upload = verifySpeakingUpload(ticket);
  const storage = admin().storage.from(BUCKET);
  const { data: files, error: listError } = await storage.list("temp", { search: `${upload.id}.mp3`, limit: 1 });
  const found = files?.find((file) => file.name === `${upload.id}.mp3`);
  if (listError || !found || Number(found.metadata?.size) !== upload.size) {
    throw new SpeakingApiError("The full recording has not finished uploading.", 409);
  }
  const { data, error } = await storage.createSignedUrl(upload.path, 7200);
  if (error || !data?.signedUrl) throw new SpeakingApiError("Could not access the uploaded recording.", 502);
  return { ...upload, url: data.signedUrl };
}

export async function getSpeakingSource(ticket: string) {
  const upload = verifySpeakingUpload(ticket);
  const { data, error } = await admin().storage.from(BUCKET).download(upload.path);
  if (error || !data || data.size !== upload.size) {
    throw new SpeakingApiError("Could not read the complete uploaded recording.", 409);
  }
  return { id: upload.id, audio: data };
}

export async function deleteSpeakingSource(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) return;
  const { error } = await admin().storage.from(BUCKET).remove([path(id)]);
  if (error) console.error("[speaking] temporary audio cleanup failed", error.name);
}
