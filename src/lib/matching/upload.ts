import { unzipSync } from "fflate";

export const MAX_VOCABULARY_FILE_BYTES = 8 * 1024 * 1024;
export const VOCABULARY_FILE_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.csv,.md";
export class VocabularyUploadError extends Error {}
export function inspectVocabularyFile(name: string, bytes: Uint8Array) {
  if (!bytes.length)
    throw new VocabularyUploadError(
      "This file is empty. Choose a vocabulary document or image.",
    );
  if (bytes.length > MAX_VOCABULARY_FILE_BYTES)
    throw new VocabularyUploadError("Choose a file smaller than 8 MB.");
  const extension = name.toLowerCase().split(".").pop();
  const starts = (...signature: number[]) =>
    signature.every((b, i) => bytes[i] === b);
  if (["jpg", "jpeg"].includes(extension ?? "") && starts(255, 216, 255))
    return { kind: "image" as const, mediaType: "image/jpeg" };
  if (extension === "png" && starts(137, 80, 78, 71, 13, 10, 26, 10))
    return { kind: "image" as const, mediaType: "image/png" };
  const decoder = new TextDecoder();
  if (
    extension === "webp" &&
    decoder.decode(bytes.slice(0, 4)) === "RIFF" &&
    decoder.decode(bytes.slice(8, 12)) === "WEBP"
  )
    return { kind: "image" as const, mediaType: "image/webp" };
  if (extension === "pdf" && decoder.decode(bytes.slice(0, 5)) === "%PDF-")
    return { kind: "pdf" as const, mediaType: "application/pdf" };
  if (extension === "docx" && starts(80, 75, 3, 4)) {
    let total = 0;
    let hasDocument = false;
    try {
      unzipSync(bytes, {
        filter: (entry) => {
          total += entry.originalSize;
          if (total > 24 * 1024 * 1024)
            throw new Error("Expanded document too large");
          if (entry.name === "word/document.xml") hasDocument = true;
          return false;
        },
      });
    } catch {
      throw new VocabularyUploadError(
        "This Word file is damaged or too large when expanded. Try a smaller DOCX or export it as PDF.",
      );
    }
    if (hasDocument)
      return {
        kind: "docx" as const,
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
  }
  if (["txt", "csv", "md"].includes(extension ?? "")) {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\0")) throw new Error();
      return { kind: "text" as const, mediaType: "text/plain" };
    } catch {
      throw new VocabularyUploadError(
        "Save this text file as UTF-8 and try again.",
      );
    }
  }
  throw new VocabularyUploadError(
    "Choose a PNG, JPEG, WebP, PDF, Word (.docx), or UTF-8 text file. The file contents must match its extension.",
  );
}
