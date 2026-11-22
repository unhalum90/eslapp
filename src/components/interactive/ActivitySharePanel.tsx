"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { revokeInteractive } from "@/app/actions/interactive";
export function ActivitySharePanel({
  code,
  title,
  path,
  onRevoked,
}: {
  code: string;
  title: string;
  path: "grouping" | "matching" | "ordering";
  onRevoked: () => void;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/${path}/${code}`
      : "";
  const embed =
    typeof window !== "undefined"
      ? `<iframe src="${window.location.origin}/embed/${path}/${code}" title="Interactive activity" width="100%" height="800" style="border:0" allow="fullscreen"></iframe>`
      : "";
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied.");
    } catch {
      setNotice("Select and copy the text manually.");
    }
  }
  return (
    <section
      aria-label="Share activity"
      className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
    >
      <h2 className="font-bold">Share “{title}”</h2>
      <p className="mt-1 text-sm text-slate-500">
        Unlisted snapshot · anyone with the link can play · no learner login
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <label className="text-xs font-bold">
            Learner link
            <input
              readOnly
              value={url}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              onFocus={(e) => e.target.select()}
            />
          </label>
          <div className="mt-2 flex gap-3 text-sm">
            <button className="underline" onClick={() => copy(url)}>
              Copy link
            </button>
            <a
              className="underline"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              Open learner view
            </a>
          </div>
          <label className="mt-4 block text-xs font-bold">
            Embed
            <textarea
              readOnly
              value={embed}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
              onFocus={(e) => e.target.select()}
            />
          </label>
          <button
            className="mt-2 text-sm underline"
            onClick={() => copy(embed)}
          >
            Copy embed
          </button>
        </div>
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG value={url} size={180} marginSize={2} />
        </div>
      </div>
      <p role="status" className="mt-2 text-sm">
        {notice}
      </p>
      <button
        disabled={busy}
        className="mt-4 text-sm text-rose-700 underline"
        onClick={async () => {
          if (
            !confirm(
              "Revoke this learner link? New attempts will no longer be available.",
            )
          )
            return;
          setBusy(true);
          try {
            const r = await revokeInteractive(code);
            if (r.ok) onRevoked();
            else setNotice(r.message);
          } catch {
            setNotice("Could not revoke the link.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Revoke this link
      </button>
    </section>
  );
}
