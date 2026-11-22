"use client";
import { useEffect, useRef } from "react";
export function ConfirmActivityChange({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="replace-activity-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(92vw,28rem)] rounded-3xl border border-slate-200 bg-white p-7 text-slate-800 shadow-2xl backdrop:bg-slate-950/40"
    >
      <h2 id="replace-activity-title" className="text-xl font-bold">
        Replace unsaved edits?
      </h2>
      <p className="mt-3 text-sm text-slate-500">
        The current activity has unsaved changes. Save them in the editor first,
        or replace them with the next activity.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          autoFocus
          className="rounded-xl border border-slate-200 px-4 py-2 font-semibold"
          onClick={onCancel}
        >
          Keep editing
        </button>
        <button
          className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white"
          onClick={onConfirm}
        >
          Replace unsaved edits
        </button>
      </div>
    </dialog>
  );
}
