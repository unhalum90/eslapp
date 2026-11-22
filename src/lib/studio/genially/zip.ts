/**
 * Finds the zip entry for a media path referenced by the Genially JSON.
 *
 * Exports are not always self-consistent: tooltip screenshots are referenced
 * with one content hash but stored with another, and file names can carry a
 * narrow no-break space that different unzippers decode differently. We match
 * exactly first, then by folder + normalized base name with the hash removed.
 */

function normalizeKey(path: string): string {
  const base = path.split("/").pop() ?? path;
  const withoutExt = base.replace(/\.[a-z0-9]{1,5}$/i, "");
  const withoutHash = withoutExt.replace(/-[0-9a-f]{8}$/i, "");
  return withoutHash.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function folderOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index >= 0 ? path.slice(0, index + 1).toLowerCase() : "";
}

export function matchZipEntry(entryNames: string[], root: string, zipPath: string): string | null {
  const direct = `${root}${zipPath}`;
  if (entryNames.includes(direct)) return direct;
  let decoded = zipPath;
  try {
    decoded = decodeURIComponent(zipPath);
  } catch {
    /* keep raw */
  }
  if (entryNames.includes(`${root}${decoded}`)) return `${root}${decoded}`;

  const wantedFolder = folderOf(`${root}${zipPath}`);
  const wantedKey = normalizeKey(decoded);
  const wantedExt = (zipPath.split(".").pop() ?? "").toLowerCase();
  const candidates = entryNames.filter((name) => folderOf(name) === wantedFolder && (name.split(".").pop() ?? "").toLowerCase() === wantedExt);
  const matches = candidates.filter((name) => normalizeKey(name) === wantedKey);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return null;
  // Last resort: same timestamp prefix (Genially prefixes uploads with epoch millis).
  const stamp = /^(\d{13})-/.exec(decoded.split("/").pop() ?? "")?.[1];
  if (stamp) {
    const byStamp = candidates.filter((name) => (name.split("/").pop() ?? "").startsWith(`${stamp}-`));
    if (byStamp.length === 1) return byStamp[0];
  }
  return null;
}
