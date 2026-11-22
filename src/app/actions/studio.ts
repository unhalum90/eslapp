"use server";

import { buildTemplate } from "@/lib/studio/templates";
import {
  createAssetUpload,
  createLesson,
  deleteAssetObject,
  deleteLesson,
  duplicateLesson,
  listLessons,
  loadLesson,
  publishLesson,
  requireStudioUser,
  saveLesson,
  signAssetUrls,
  StudioError,
  studioUserId,
  unpublishLesson,
  type AssetUploadTicket,
  type PublishResult,
  type SaveResult,
} from "@/lib/studio/storage";
import type { Id, LessonRecord, LessonSummary, StudioAsset, StudioDocument } from "@/lib/studio/types";

type Failure = { ok: false; message: string; needsSignIn?: boolean };

function fail(error: unknown): Failure {
  if (error instanceof StudioError) {
    return { ok: false, message: error.message, needsSignIn: error.status === 401 };
  }
  console.error("[studio] action failed", error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError");
  return { ok: false, message: "Une erreur inattendue s'est produite dans le Studio." };
}

export async function getStudioIdentity(): Promise<{ signedIn: boolean; userId: string | null }> {
  const userId = await studioUserId();
  return { signedIn: Boolean(userId), userId };
}

export async function listStudioLessons(): Promise<{ ok: true; lessons: LessonSummary[] } | Failure> {
  try {
    const uid = await requireStudioUser();
    return { ok: true, lessons: await listLessons(uid) };
  } catch (error) {
    return fail(error);
  }
}

export async function createStudioLesson(templateId: string): Promise<{ ok: true; lessonId: Id } | Failure> {
  try {
    const uid = await requireStudioUser();
    const record = await createLesson(uid, buildTemplate(templateId));
    return { ok: true, lessonId: record.id };
  } catch (error) {
    return fail(error);
  }
}

export async function importStudioLesson(document: unknown): Promise<{ ok: true; lessonId: Id } | Failure> {
  try {
    const uid = await requireStudioUser();
    const record = await createLesson(uid, document as StudioDocument);
    return { ok: true, lessonId: record.id };
  } catch (error) {
    return fail(error);
  }
}

export async function loadStudioLesson(
  lessonId: string,
): Promise<{ ok: true; lesson: LessonRecord; assetUrls: Record<Id, string> } | Failure> {
  try {
    const uid = await requireStudioUser();
    const lesson = await loadLesson(uid, lessonId);
    if (!lesson) return { ok: false, message: "Cette leçon est introuvable." };
    const assetUrls = await signAssetUrls(uid, Object.values(lesson.document.assets));
    return { ok: true, lesson, assetUrls };
  } catch (error) {
    return fail(error);
  }
}

export async function saveStudioLesson(
  lessonId: string,
  document: unknown,
  teacherNotes: string,
  baseRevision: number,
): Promise<SaveResult | Failure> {
  try {
    const uid = await requireStudioUser();
    return await saveLesson(uid, lessonId, document, typeof teacherNotes === "string" ? teacherNotes : "", baseRevision);
  } catch (error) {
    return fail(error);
  }
}

export async function duplicateStudioLesson(lessonId: string): Promise<{ ok: true; lessonId: Id } | Failure> {
  try {
    const uid = await requireStudioUser();
    const record = await duplicateLesson(uid, lessonId);
    return { ok: true, lessonId: record.id };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteStudioLesson(lessonId: string): Promise<{ ok: true } | Failure> {
  try {
    const uid = await requireStudioUser();
    await deleteLesson(uid, lessonId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createStudioAssetUpload(
  lessonId: string,
  input: { name: string; mime: string; bytes: number },
): Promise<({ ok: true } & AssetUploadTicket) | Failure> {
  try {
    const uid = await requireStudioUser();
    const ticket = await createAssetUpload(uid, lessonId, {
      name: String(input.name).slice(0, 200),
      mime: String(input.mime),
      bytes: Number(input.bytes),
    });
    return { ok: true, ...ticket };
  } catch (error) {
    return fail(error);
  }
}

export async function getStudioAssetUrls(
  assets: Pick<StudioAsset, "id" | "path">[],
): Promise<{ ok: true; urls: Record<Id, string> } | Failure> {
  try {
    const uid = await requireStudioUser();
    const safe = assets.slice(0, 500).map((asset) => ({ id: String(asset.id), path: String(asset.path) }));
    return { ok: true, urls: await signAssetUrls(uid, safe) };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteStudioAsset(path: string): Promise<{ ok: true } | Failure> {
  try {
    const uid = await requireStudioUser();
    await deleteAssetObject(uid, String(path));
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function publishStudioLesson(lessonId: string): Promise<PublishResult | Failure> {
  try {
    const uid = await requireStudioUser();
    return await publishLesson(uid, lessonId);
  } catch (error) {
    return fail(error);
  }
}

export async function unpublishStudioLesson(lessonId: string): Promise<{ ok: true } | Failure> {
  try {
    const uid = await requireStudioUser();
    await unpublishLesson(uid, lessonId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
