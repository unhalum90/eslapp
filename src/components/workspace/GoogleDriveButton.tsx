"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, HardDriveUpload, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadGoogleDoc, GoogleDriveUploadError } from "@/lib/google-drive/uploadGoogleDoc";

interface GoogleDriveButtonProps {
  materialId: string;
  documentName: string;
  getHtml: () => string;
}

export function GoogleDriveButton({ materialId, documentName, getHtml }: GoogleDriveButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const resumed = useRef(false);

  const connectGoogle = useCallback(async () => {
    if (!supabase) {
      setMessage("Google Drive needs Supabase authentication to be configured first.");
      return;
    }
    const next = `/workspace?driveMaterial=${encodeURIComponent(materialId)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "openid email profile https://www.googleapis.com/auth/drive.file",
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setBusy(false);
      setMessage(`Google Drive connection failed: ${error.message}`);
    }
  }, [materialId, supabase]);

  const saveWithToken = useCallback(async (token: string) => {
    setBusy(true);
    setMessage("Creating a Google Doc…");
    setDocumentUrl("");
    try {
      const file = await uploadGoogleDoc(token, documentName, getHtml());
      setDocumentUrl(file.webViewLink ?? `https://docs.google.com/document/d/${file.id}/edit`);
      setMessage(`Saved “${file.name}” to Google Drive.`);
      const url = new URL(window.location.href);
      url.searchParams.delete("driveMaterial");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (error) {
      if (error instanceof GoogleDriveUploadError && (error.status === 401 || error.status === 403)) {
        setMessage("Google Drive permission expired. Reconnecting…");
        await connectGoogle();
        return;
      }
      setMessage(error instanceof Error ? error.message : "Google Drive could not create the document.");
    } finally {
      setBusy(false);
    }
  }, [connectGoogle, documentName, getHtml]);

  const saveToDrive = async () => {
    if (!supabase) {
      setMessage("Google Drive needs Supabase authentication to be configured first.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }
    const token = data.session?.provider_token;
    if (!token) {
      setMessage("Connecting Google Drive…");
      await connectGoogle();
      return;
    }
    await saveWithToken(token);
  };

  useEffect(() => {
    if (!supabase || resumed.current) return;
    const pendingMaterial = new URLSearchParams(window.location.search).get("driveMaterial");
    if (pendingMaterial !== materialId) return;
    resumed.current = true;
    void supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.provider_token;
      if (token) void saveWithToken(token);
      else setMessage("Google connected, but Drive permission was not returned. Click the button to retry.");
    });
  }, [materialId, saveWithToken, supabase]);

  return (
    <div className="flex max-w-sm flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => void saveToDrive()}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <HardDriveUpload size={15} />}
        Save to Google Drive
      </button>
      {message ? <p className="text-right text-[11px] leading-4 text-slate-500">{message}</p> : null}
      {documentUrl ? (
        <a
          href={documentUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline"
        >
          Open in Google Docs <ExternalLink size={12} />
        </a>
      ) : null}
    </div>
  );
}
