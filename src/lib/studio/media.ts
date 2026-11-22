/** Client-side media helpers shared by the drawer and the Genially importer. */

export const MAX_IMPORT_IMAGE_WIDTH = 1600;
export const MAX_IMPORT_IMAGE_BYTES = 1_500_000;

export function probeImage(blob: Blob): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

export function probeAudio(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
}

export interface OptimizedImage {
  blob: Blob;
  mime: string;
  name: string;
  width?: number;
  height?: number;
  resized: boolean;
}

/**
 * Downscales large exported artwork (Genially ships 2000px PNGs of several MB)
 * to a classroom-friendly WebP. Falls back to the original on any failure.
 */
export async function optimizeImage(blob: Blob, mime: string, name: string): Promise<OptimizedImage> {
  try {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;
    if (width <= MAX_IMPORT_IMAGE_WIDTH && blob.size <= MAX_IMPORT_IMAGE_BYTES) {
      bitmap.close();
      return { blob, mime, name, width, height, resized: false };
    }
    const scale = Math.min(1, MAX_IMPORT_IMAGE_WIDTH / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return { blob, mime, name, width, height, resized: false };
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const encoded = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (encoded && encoded.size < blob.size) {
      return { blob: encoded, mime: "image/webp", name: `${name.replace(/\.[a-z0-9]+$/i, "")}.webp`, width: canvas.width, height: canvas.height, resized: true };
    }
    return { blob, mime, name, width, height, resized: false };
  } catch {
    return { blob, mime, name, resized: false };
  }
}

/** SVG exports are decoded as inert images and uploaded as PNGs. */
export async function rasterizeImportSvg(blob: Blob, name: string): Promise<OptimizedImage> {
  const source = await blob.text();
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (parsed.querySelector("parsererror") || parsed.documentElement.localName !== "svg") {
    throw new Error("SVG illisible");
  }
  // No active content or dependencies on remote styles/fonts/images.
  const externalCss = (value: string) => /@import|expression\s*\(/i.test(value) || Array.from(value.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)).some(match => !match[2].trim().startsWith("#"));
  for (const node of Array.from(parsed.querySelectorAll("*"))) {
    if (node.localName.toLowerCase() === "style" && externalCss(node.textContent ?? "")) throw new Error("Styles SVG externes non pris en charge");
    if (["script", "foreignobject", "iframe", "animate", "animatetransform", "set"].includes(node.localName.toLowerCase())) {
      throw new Error("SVG avec contenu actif ou styles externes non pris en charge");
    }
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.name) || (/href$/i.test(attribute.name) && !attribute.value.startsWith("#")) || externalCss(attribute.value)) {
        throw new Error("SVG avec dépendance externe non pris en charge");
      }
    }
  }
  if (/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(source)) throw new Error("Déclarations externes SVG non prises en charge");
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Rendu SVG impossible"));
      image.src = url;
    });
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height) throw new Error("Dimensions SVG invalides");
    const scale = Math.min(1, MAX_IMPORT_IMAGE_WIDTH / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Rendu SVG indisponible");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("Conversion SVG impossible");
    return { blob: png, mime: "image/png", name: name.replace(/\.svg$/i, "") + ".png", width: canvas.width, height: canvas.height, resized: scale < 1 };
  } finally { URL.revokeObjectURL(url); }
}
