"use client";

import { useRef, useState } from "react";
import { FileAudio, Image as ImageIcon, Loader2, Trash2, Upload, X } from "lucide-react";
import { createStudioAssetUpload, deleteStudioAsset, getStudioAssetUrls } from "@/app/actions/studio";
import { createClient } from "@/lib/supabase/client";
import { usedAssetIds } from "@/lib/studio/document";
import type { AssetKind, StudioAsset } from "@/lib/studio/types";
import { useStudioEditorStore } from "@/lib/store/useStudioEditorStore";

async function probeImage(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
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

async function probeAudio(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
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

export function AssetDrawer() {
  const open = useStudioEditorStore((state) => state.drawerOpen);
  const purpose = useStudioEditorStore((state) => state.drawerPurpose);
  const target = useStudioEditorStore((state) => state.drawerTarget);
  const document = useStudioEditorStore((state) => state.document);
  const lessonId = useStudioEditorStore((state) => state.lessonId);
  const assetUrls = useStudioEditorStore((state) => state.assetUrls);
  const { closeDrawer, update, mergeAssetUrls } = useStudioEditorStore.getState();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open || !document || !lessonId) return null;

  const wantedKind: AssetKind | null = purpose === "audio" ? "audio" : purpose === "image" || purpose === "background" ? "image" : null;
  const used = usedAssetIds(document);
  const assets = Object.values(document.assets).filter((asset) => !wantedKind || asset.kind === wantedKind);

  const choose = (asset: StudioAsset) => {
    if (target) target(asset.id);
    closeDrawer();
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase n'est pas configuré dans le navigateur.");
      return;
    }
    setError(null);
    let firstUploaded: StudioAsset | null = null;
    for (const file of Array.from(files)) {
      setBusy(file.name);
      const mime = file.type || (file.name.match(/\.(mp3)$/i) ? "audio/mpeg" : "");
      const ticket = await createStudioAssetUpload(lessonId, { name: file.name, mime, bytes: file.size });
      if (!ticket.ok) {
        setError(`${file.name} : ${ticket.message}`);
        continue;
      }
      const { error: uploadError } = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: mime, upsert: true });
      if (uploadError) {
        setError(`${file.name} : ${uploadError.message}`);
        continue;
      }
      const kind: AssetKind = mime.startsWith("image/") ? "image" : "audio";
      const asset: StudioAsset = { id: ticket.assetId, kind, name: file.name, mime, bytes: file.size, path: ticket.path };
      if (kind === "image") {
        const dimensions = await probeImage(file);
        if (dimensions) {
          asset.width = dimensions.width;
          asset.height = dimensions.height;
        }
      } else {
        const duration = await probeAudio(file);
        if (duration) asset.duration = Math.round(duration * 10) / 10;
      }
      update((doc) => {
        doc.assets[asset.id] = asset;
      });
      const urls = await getStudioAssetUrls([{ id: asset.id, path: asset.path }]);
      if (urls.ok) mergeAssetUrls(urls.urls);
      if (!firstUploaded && (!wantedKind || kind === wantedKind)) firstUploaded = asset;
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
    if (firstUploaded && target) choose(firstUploaded);
  };

  const removeAsset = async (asset: StudioAsset) => {
    if (used.has(asset.id)) return;
    if (!window.confirm(`Supprimer « ${asset.name} » ?`)) return;
    const result = await deleteStudioAsset(asset.path);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    update((doc) => {
      delete doc.assets[asset.id];
    });
  };

  const accept = wantedKind === "image" ? "image/png,image/jpeg,image/webp,image/gif" : wantedKind === "audio" ? "audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/webm,.mp3,.m4a" : "image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,.mp3,.m4a";
  const title = purpose === "background" ? "Choisir un fond de page" : purpose === "image" ? "Choisir une image" : purpose === "audio" ? "Choisir un audio" : "Médias de la leçon";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[#18282b]/40" onClick={closeDrawer}>
      <div role="dialog" aria-modal="true" aria-labelledby="asset-drawer-title" className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#d8d5ca] px-4 py-3">
          <h2 id="asset-drawer-title" className="text-base font-black">{title}</h2>
          <button type="button" aria-label="Fermer" onClick={closeDrawer} className="rounded-full border border-slate-300 p-2 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="border-b border-[#d8d5ca] p-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-6 text-center hover:border-[#285d68] hover:bg-[#e8f3f1]">
            {busy ? <Loader2 className="animate-spin text-[#285d68]" /> : <Upload className="text-[#285d68]" />}
            <span className="text-sm font-bold text-[#18282b]">{busy ? `Téléversement : ${busy}` : "Importer des fichiers"}</span>
            <span className="text-xs text-slate-500">PNG, JPG, WebP, GIF (8 Mo) · MP3, WAV, OGG, M4A (25 Mo)</span>
            <input ref={inputRef} type="file" multiple accept={accept} className="sr-only" disabled={Boolean(busy)} onChange={(event) => void uploadFiles(event.target.files)} />
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Astuce : l&apos;outil « Audio Trimmer » exporte un WAV découpé que vous pouvez importer ici. Vérifiez les droits de diffusion avant de publier.
          </p>
          {error ? <p role="alert" className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-[#a33d25]">{error}</p> : null}
        </div>
        <ul className="min-h-0 flex-1 overflow-auto p-4">
          {assets.length === 0 ? <li className="text-sm text-slate-500">Aucun média pour l&apos;instant.</li> : null}
          {assets.map((asset) => {
            const url = assetUrls[asset.id];
            const inUse = used.has(asset.id);
            return (
              <li key={asset.id} className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 p-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500">
                  {asset.kind === "image" && url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  ) : asset.kind === "image" ? <ImageIcon /> : <FileAudio />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#18282b]">{asset.name}</p>
                  <p className="text-xs text-slate-500">
                    {asset.kind === "image" ? `${asset.width ?? "?"} × ${asset.height ?? "?"}` : asset.duration ? `${Math.round(asset.duration)} s` : "Audio"} · {Math.max(1, Math.round(asset.bytes / 1024))} Ko{inUse ? " · utilisé" : ""}
                  </p>
                  {asset.kind === "audio" && url ? <audio controls preload="none" src={url} className="mt-1 h-8 w-full" /> : null}
                </div>
                <div className="flex flex-col gap-1">
                  {target ? (
                    <button type="button" className="rounded-lg bg-[#285d68] px-3 py-1.5 text-xs font-bold text-white" onClick={() => choose(asset)}>
                      Utiliser
                    </button>
                  ) : null}
                  <button type="button" aria-label={`Supprimer ${asset.name}`} disabled={inUse} title={inUse ? "Utilisé dans la leçon" : "Supprimer"} className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:text-[#d45b3f] disabled:opacity-30" onClick={() => void removeAsset(asset)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
