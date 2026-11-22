import "server-only";

import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseStudioDocument } from "./schema";
import { assetExtension, clone, duplicateDocument, lintDocument, usedAssetIds } from "./document";
import {
  STUDIO_LIMITS,
  STUDIO_RUNTIME_VERSION,
  STUDIO_SCHEMA_VERSION,
  type Id,
  type LessonRecord,
  type LessonSummary,
  type LintIssue,
  type PublishedSnapshot,
  type StudioAsset,
  type StudioDocument,
} from "./types";

/**
 * Storage-backed persistence for Interactive Studio.
 *
 * Everything lives in Supabase Storage so the feature needs no SQL migration:
 *
 *   studio-library (private, service role only)
 *     {ownerId}/lessons/_index.json              lesson summaries
 *     {ownerId}/lessons/{lessonId}.json          LessonRecord (draft, authoritative)
 *     {ownerId}/assets/{lessonId}/{assetId}.ext  uploaded media
 *     {ownerId}/publications/{lessonId}/v{n}.json immutable snapshots
 *     codes/{CODE}.json                          public pointer: lesson, owner, active version
 *
 *   studio-public (public)
 *     {CODE}/v{n}/{assetId}.ext                  pinned copies of published media only
 */

export const LIBRARY_BUCKET = "studio-library";
export const PUBLIC_BUCKET = "studio-public";
const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const AUDIO_MIMES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/webm"];

export class StudioError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

let bucketsReady: Promise<void> | null = null;

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new StudioError("Le Studio n'est pas configuré sur le serveur (Supabase).", 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function ensureBucket(client: SupabaseClient, name: string, options: { public: boolean; fileSizeLimit: number; allowedMimeTypes: string[] }) {
  const { data, error } = await client.storage.getBucket(name);
  if (data) return;
  if (error && !/not found/i.test(error.message) && (error as { status?: number }).status !== 404 && (error as { statusCode?: string }).statusCode !== "404") {
    throw new StudioError(`Impossible d'accéder au stockage « ${name} ».`, 502);
  }
  const created = await client.storage.createBucket(name, options);
  if (created.error && !/already exists/i.test(created.error.message)) {
    throw new StudioError(`Impossible de créer le stockage « ${name} » : ${created.error.message}`, 502);
  }
}

async function storage(): Promise<SupabaseClient> {
  const client = admin();
  if (!bucketsReady) {
    bucketsReady = (async () => {
      await ensureBucket(client, LIBRARY_BUCKET, {
        public: false,
        fileSizeLimit: STUDIO_LIMITS.maxAudioBytes,
        allowedMimeTypes: [...IMAGE_MIMES, ...AUDIO_MIMES, "application/json"],
      });
      await ensureBucket(client, PUBLIC_BUCKET, {
        public: true,
        fileSizeLimit: STUDIO_LIMITS.maxAudioBytes,
        allowedMimeTypes: [...IMAGE_MIMES, ...AUDIO_MIMES],
      });
    })().catch((error) => {
      bucketsReady = null;
      throw error;
    });
  }
  await bucketsReady;
  return client;
}

export async function studioUserId(): Promise<string | null> {
  // Local development only: lets `npm run dev` exercise the Studio without a
  // magic-link session. Mirrors the AI_REQUIRE_AUTH convention used elsewhere.
  const devOwner = process.env.STUDIO_DEV_OWNER_ID?.trim();
  if (devOwner && process.env.NODE_ENV === "development") return devOwner;
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user?.id ?? null;
}

export async function requireStudioUser(): Promise<string> {
  const userId = await studioUserId();
  if (!userId) throw new StudioError("Connectez-vous avec le compte enseignant pour utiliser le Studio.", 401);
  return userId;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function assertId(value: string, label: string) {
  if (!SAFE_ID.test(value)) throw new StudioError(`Identifiant ${label} invalide.`, 400);
}

const lessonPath = (uid: string, lessonId: string) => `${uid}/lessons/${lessonId}.json`;
const indexPath = (uid: string) => `${uid}/lessons/_index.json`;
const assetFolder = (uid: string, lessonId: string) => `${uid}/assets/${lessonId}`;
const publicationPath = (uid: string, lessonId: string, version: number) => `${uid}/publications/${lessonId}/v${version}.json`;
const codePath = (code: string) => `codes/${code}.json`;
const publicAssetPath = (code: string, version: number, asset: StudioAsset) => `${code}/v${version}/${asset.id}.${assetExtension(asset)}`;

interface CodePointer {
  code: string;
  lessonId: Id;
  ownerId: Id;
  activeVersion: number | null;
  latestVersion: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------

async function readJson<T>(bucket: string, path: string): Promise<T | null> {
  const client = await storage();
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) {
    const status = (error as { status?: number } | null)?.status;
    const message = error?.message ?? "";
    if (status === 404 || /not found|object not found/i.test(message)) return null;
    throw new StudioError(`Lecture impossible (${path.split("/").pop()}) : ${message}`, 502);
  }
  try {
    return JSON.parse(await data.text()) as T;
  } catch {
    throw new StudioError("Fichier de leçon illisible.", 500);
  }
}

async function writeJson(bucket: string, path: string, value: unknown) {
  const client = await storage();
  const body = new Blob([JSON.stringify(value)], { type: "application/json" });
  const { error } = await client.storage.from(bucket).upload(path, body, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "0",
  });
  if (error) throw new StudioError(`Enregistrement impossible : ${error.message}`, 502);
}

async function removePrefix(bucket: string, prefix: string) {
  const client = await storage();
  const { data } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  const names = (data ?? []).filter((item) => item.id).map((item) => `${prefix}/${item.name}`);
  if (names.length) await client.storage.from(bucket).remove(names);
  // Recurse into folders (one level is enough for our layout, but be safe).
  for (const folder of (data ?? []).filter((item) => !item.id)) {
    await removePrefix(bucket, `${prefix}/${folder.name}`);
  }
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

function summarize(record: LessonRecord): LessonSummary {
  return {
    id: record.id,
    title: record.document.title,
    level: record.document.level,
    pageCount: record.document.pages.length,
    updatedAt: record.updatedAt,
    revision: record.revision,
    publication: record.publication,
  };
}

async function readIndex(uid: string): Promise<LessonSummary[] | null> {
  return readJson<LessonSummary[]>(LIBRARY_BUCKET, indexPath(uid));
}

async function rebuildIndex(uid: string): Promise<LessonSummary[]> {
  const client = await storage();
  const { data } = await client.storage.from(LIBRARY_BUCKET).list(`${uid}/lessons`, { limit: 1000 });
  const files = (data ?? []).filter((item) => item.name.endsWith(".json") && item.name !== "_index.json");
  const records = await Promise.all(
    files.map((file) => readJson<LessonRecord>(LIBRARY_BUCKET, `${uid}/lessons/${file.name}`).catch(() => null)),
  );
  const summaries = records.filter((record): record is LessonRecord => Boolean(record && record.document)).map(summarize);
  await writeJson(LIBRARY_BUCKET, indexPath(uid), summaries);
  return summaries;
}

async function updateIndex(uid: string, mutate: (index: LessonSummary[]) => LessonSummary[]) {
  const current = (await readIndex(uid)) ?? (await rebuildIndex(uid));
  await writeJson(LIBRARY_BUCKET, indexPath(uid), mutate(current));
}

export async function listLessons(uid: string): Promise<LessonSummary[]> {
  const index = (await readIndex(uid)) ?? (await rebuildIndex(uid));
  return [...index].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createLesson(uid: string, document: StudioDocument): Promise<LessonRecord> {
  const parsed = parseStudioDocument(document);
  if (!parsed.ok) throw new StudioError(parsed.message, 400);
  const now = new Date().toISOString();
  const record: LessonRecord = {
    id: parsed.document.id,
    ownerId: uid,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    teacherNotes: "",
    document: parsed.document,
    publication: null,
  };
  await writeJson(LIBRARY_BUCKET, lessonPath(uid, record.id), record);
  await updateIndex(uid, (index) => [summarize(record), ...index.filter((item) => item.id !== record.id)]);
  return record;
}

export async function loadLesson(uid: string, lessonId: string): Promise<LessonRecord | null> {
  assertId(lessonId, "de leçon");
  const record = await readJson<LessonRecord>(LIBRARY_BUCKET, lessonPath(uid, lessonId));
  if (!record) return null;
  if (record.ownerId !== uid) return null;
  const parsed = parseStudioDocument(record.document);
  if (!parsed.ok) throw new StudioError(parsed.message, 422);
  return { ...record, document: parsed.document };
}

export type SaveResult =
  | { ok: true; revision: number; updatedAt: string }
  | { ok: false; conflict: true; serverRevision: number; serverUpdatedAt: string };

export async function saveLesson(
  uid: string,
  lessonId: string,
  document: unknown,
  teacherNotes: string,
  baseRevision: number,
): Promise<SaveResult> {
  const current = await loadLesson(uid, lessonId);
  if (!current) throw new StudioError("Cette leçon n'existe plus.", 404);
  if (current.revision !== baseRevision) {
    return { ok: false, conflict: true, serverRevision: current.revision, serverUpdatedAt: current.updatedAt };
  }
  const parsed = parseStudioDocument(document);
  if (!parsed.ok) throw new StudioError(parsed.message, 400);
  if (parsed.document.id !== lessonId) throw new StudioError("Le document ne correspond pas à la leçon.", 400);
  const next: LessonRecord = {
    ...current,
    document: parsed.document,
    teacherNotes: teacherNotes.slice(0, STUDIO_LIMITS.maxTextLength),
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(LIBRARY_BUCKET, lessonPath(uid, lessonId), next);
  await updateIndex(uid, (index) => [summarize(next), ...index.filter((item) => item.id !== lessonId)]);
  return { ok: true, revision: next.revision, updatedAt: next.updatedAt };
}

export async function deleteLesson(uid: string, lessonId: string): Promise<void> {
  const current = await loadLesson(uid, lessonId);
  if (!current) return;
  if (current.publication) await unpublishLesson(uid, lessonId, current);
  await removePrefix(LIBRARY_BUCKET, assetFolder(uid, lessonId));
  await removePrefix(LIBRARY_BUCKET, `${uid}/publications/${lessonId}`);
  if (current.publication?.code) {
    await removePrefix(PUBLIC_BUCKET, current.publication.code);
    const client = await storage();
    await client.storage.from(LIBRARY_BUCKET).remove([codePath(current.publication.code)]);
  }
  const client = await storage();
  await client.storage.from(LIBRARY_BUCKET).remove([lessonPath(uid, lessonId)]);
  await updateIndex(uid, (index) => index.filter((item) => item.id !== lessonId));
}

export async function duplicateLesson(uid: string, lessonId: string): Promise<LessonRecord> {
  const current = await loadLesson(uid, lessonId);
  if (!current) throw new StudioError("Cette leçon n'existe plus.", 404);
  const document = duplicateDocument(current.document, `${current.document.title} (copie)`);
  const client = await storage();
  const used = usedAssetIds(document);
  const assets: Record<Id, StudioAsset> = {};
  for (const [assetId, asset] of Object.entries(document.assets)) {
    if (!used.has(assetId)) continue;
    const target = `${assetFolder(uid, document.id)}/${assetId}.${assetExtension(asset)}`;
    const { error } = await client.storage.from(LIBRARY_BUCKET).copy(asset.path, target);
    if (error) continue; // Missing source media: drop the reference, lint will flag it.
    assets[assetId] = { ...asset, path: target };
  }
  document.assets = assets;
  const record = await createLesson(uid, document);
  return record;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export interface AssetUploadTicket {
  assetId: Id;
  path: string;
  token: string;
  bucket: string;
}

export async function createAssetUpload(
  uid: string,
  lessonId: string,
  input: { name: string; mime: string; bytes: number },
): Promise<AssetUploadTicket> {
  assertId(lessonId, "de leçon");
  const mime = input.mime.toLowerCase();
  const isImage = IMAGE_MIMES.includes(mime);
  const isAudio = AUDIO_MIMES.includes(mime);
  if (!isImage && !isAudio) throw new StudioError("Format non pris en charge. Utilisez PNG, JPG, WebP, GIF, MP3, WAV, OGG ou M4A.", 415);
  const limit = isImage ? STUDIO_LIMITS.maxImageBytes : STUDIO_LIMITS.maxAudioBytes;
  if (!Number.isSafeInteger(input.bytes) || input.bytes <= 0 || input.bytes > limit) {
    throw new StudioError(`Fichier trop volumineux (max ${Math.round(limit / 1024 / 1024)} Mo).`, 413);
  }
  const assetId = `asset_${randomBytes(8).toString("hex")}`;
  const path = `${assetFolder(uid, lessonId)}/${assetId}.${assetExtension({ mime, name: input.name })}`;
  const client = await storage();
  const { data, error } = await client.storage.from(LIBRARY_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new StudioError(`Préparation du téléversement impossible : ${error?.message ?? ""}`, 502);
  return { assetId, path, token: data.token, bucket: LIBRARY_BUCKET };
}

export async function signAssetUrls(uid: string, assets: Pick<StudioAsset, "id" | "path">[]): Promise<Record<Id, string>> {
  const own = assets.filter((asset) => asset.path.startsWith(`${uid}/assets/`));
  if (own.length === 0) return {};
  const client = await storage();
  const { data, error } = await client.storage.from(LIBRARY_BUCKET).createSignedUrls(own.map((asset) => asset.path), 60 * 60);
  if (error || !data) throw new StudioError("Impossible de préparer les médias.", 502);
  const urls: Record<Id, string> = {};
  data.forEach((entry, index) => {
    if (entry.signedUrl && !entry.error) urls[own[index].id] = entry.signedUrl;
  });
  return urls;
}

export async function deleteAssetObject(uid: string, path: string): Promise<void> {
  if (!path.startsWith(`${uid}/assets/`)) throw new StudioError("Chemin de média refusé.", 403);
  const client = await storage();
  await client.storage.from(LIBRARY_BUCKET).remove([path]);
}

// ---------------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return code;
}

export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(code);
}

async function allocateCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomCode();
    const existing = await readJson<CodePointer>(LIBRARY_BUCKET, codePath(code));
    if (!existing) return code;
  }
  throw new StudioError("Impossible d'attribuer un code de partage, réessayez.", 500);
}

export type PublishResult =
  | { ok: true; code: string; version: number; issues: LintIssue[] }
  | { ok: false; issues: LintIssue[]; message: string };

export async function publishLesson(uid: string, lessonId: string): Promise<PublishResult> {
  const current = await loadLesson(uid, lessonId);
  if (!current) throw new StudioError("Cette leçon n'existe plus.", 404);
  const issues = lintDocument(current.document);
  if (issues.some((issue) => issue.severity === "error")) {
    return { ok: false, issues, message: "Corrigez les erreurs bloquantes avant de publier." };
  }

  const client = await storage();
  const used = usedAssetIds(current.document);
  const assetList = Object.values(current.document.assets).filter((asset) => used.has(asset.id));

  // Verify every referenced media file exists before copying anything.
  const { data: files } = await client.storage.from(LIBRARY_BUCKET).list(assetFolder(uid, lessonId), { limit: 1000 });
  const present = new Set((files ?? []).map((file) => `${assetFolder(uid, lessonId)}/${file.name}`));
  const missing = assetList.filter((asset) => !present.has(asset.path));
  if (missing.length) {
    return {
      ok: false,
      issues: [
        ...issues,
        ...missing.map<LintIssue>((asset) => ({ severity: "error", code: "asset-file-missing", message: `Le fichier « ${asset.name} » est introuvable dans le stockage.` })),
      ],
      message: "Certains médias sont introuvables.",
    };
  }

  const code = current.publication?.code ?? (await allocateCode());
  const pointer = (await readJson<CodePointer>(LIBRARY_BUCKET, codePath(code))) ?? null;
  if (pointer && (pointer.ownerId !== uid || pointer.lessonId !== lessonId)) {
    throw new StudioError("Ce code de partage appartient à une autre leçon.", 409);
  }
  const version = Math.max(pointer?.latestVersion ?? 0, current.publication?.version ?? 0) + 1;

  // Pin media: copy referenced files into the public bucket under this version.
  const snapshotDoc = clone(current.document);
  const manifest: PublishedSnapshot["assetManifest"] = [];
  for (const asset of assetList) {
    const target = publicAssetPath(code, version, asset);
    const { error } = await client.storage.from(LIBRARY_BUCKET).copy(asset.path, target, { destinationBucket: PUBLIC_BUCKET });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      await removePrefix(PUBLIC_BUCKET, `${code}/v${version}`);
      throw new StudioError(`Copie du média « ${asset.name} » impossible : ${error.message}`, 502);
    }
    const { data } = client.storage.from(PUBLIC_BUCKET).getPublicUrl(target);
    snapshotDoc.assets[asset.id] = { ...asset, path: target, url: data.publicUrl };
    manifest.push({ assetId: asset.id, path: target, mime: asset.mime, bytes: asset.bytes });
  }
  for (const assetId of Object.keys(snapshotDoc.assets)) if (!used.has(assetId)) delete snapshotDoc.assets[assetId];
  for (const page of snapshotDoc.pages) page.notes = "";

  const now = new Date().toISOString();
  const snapshot: PublishedSnapshot = {
    publicationId: `pub_${randomBytes(8).toString("hex")}`,
    lessonId,
    code,
    version,
    schemaVersion: STUDIO_SCHEMA_VERSION,
    runtimeVersion: STUDIO_RUNTIME_VERSION,
    createdAt: now,
    document: snapshotDoc,
    assetManifest: manifest,
  };
  await writeJson(LIBRARY_BUCKET, publicationPath(uid, lessonId, version), snapshot);

  // The pointer flip is the last step: a failure before it leaves the previous publication intact.
  const nextPointer: CodePointer = { code, lessonId, ownerId: uid, activeVersion: version, latestVersion: version, updatedAt: now };
  await writeJson(LIBRARY_BUCKET, codePath(code), nextPointer);

  const record: LessonRecord = {
    ...current,
    publication: { code, version, publishedAt: now, active: true, publishedRevision: current.revision },
  };
  await writeJson(LIBRARY_BUCKET, lessonPath(uid, lessonId), record);
  await updateIndex(uid, (index) => [summarize(record), ...index.filter((item) => item.id !== lessonId)]);
  return { ok: true, code, version, issues };
}

export async function unpublishLesson(uid: string, lessonId: string, preloaded?: LessonRecord): Promise<void> {
  const current = preloaded ?? (await loadLesson(uid, lessonId));
  if (!current?.publication) return;
  const { code } = current.publication;
  const pointer = await readJson<CodePointer>(LIBRARY_BUCKET, codePath(code));
  if (pointer && pointer.ownerId === uid) {
    await writeJson(LIBRARY_BUCKET, codePath(code), { ...pointer, activeVersion: null, updatedAt: new Date().toISOString() });
  }
  // Pinned public media copies are removed so the link stops serving content.
  await removePrefix(PUBLIC_BUCKET, code);
  const record: LessonRecord = { ...current, publication: { ...current.publication, active: false } };
  await writeJson(LIBRARY_BUCKET, lessonPath(uid, lessonId), record);
  await updateIndex(uid, (index) => [summarize(record), ...index.filter((item) => item.id !== lessonId)]);
}

export interface ResolvedPublication {
  snapshot: PublishedSnapshot;
  ownerId: Id;
  activeVersion: number;
  pinned: boolean;
}

/** Public lookup used by the anonymous player. Unpublished lessons resolve to null. */
export async function resolvePublication(codeInput: string, requestedVersion?: number): Promise<ResolvedPublication | null> {
  const code = codeInput.toUpperCase();
  if (!isValidCode(code)) return null;
  const pointer = await readJson<CodePointer>(LIBRARY_BUCKET, codePath(code));
  if (!pointer || pointer.activeVersion === null) return null;
  const version = requestedVersion && requestedVersion > 0 && requestedVersion <= pointer.latestVersion ? requestedVersion : pointer.activeVersion;
  const snapshot = await readJson<PublishedSnapshot>(LIBRARY_BUCKET, publicationPath(pointer.ownerId, pointer.lessonId, version));
  if (!snapshot) return null;
  if (snapshot.schemaVersion > STUDIO_SCHEMA_VERSION) {
    throw new StudioError("Cette leçon a été publiée avec une version plus récente du Studio.", 426);
  }
  return { snapshot, ownerId: pointer.ownerId, activeVersion: pointer.activeVersion, pinned: version !== pointer.activeVersion };
}
