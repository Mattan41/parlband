"use client";

import { useEffect } from "react";

export interface AdminToast {
  id: number;
  text: string;
  tone: "success" | "error";
}

interface ItemProps {
  toast: AdminToast;
  onDismiss: (id: number) => void;
}

/** How long a success toast stays on screen before dismissing itself. */
const SUCCESS_TIMEOUT_MS = 4000;

function ToastItem({ toast, onDismiss }: ItemProps) {
  useEffect(() => {
    if (toast.tone !== "success") return;
    const timer = window.setTimeout(
      () => onDismiss(toast.id),
      SUCCESS_TIMEOUT_MS
    );
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.tone, onDismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-3 py-2 text-sm shadow-lg ${
        toast.tone === "error"
          ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      }`}
    >
      <span className="min-w-0 flex-1">{toast.text}</span>
      <button
        type="button"
        aria-label="Stäng"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded px-1 text-base leading-none opacity-70 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Fixed toast stack for the admin surface, visible wherever the page is
 * scrolled. Success toasts dismiss themselves, errors stay until closed.
 *
 * Modals use the native top layer, which paints above any z-index, so feedback
 * that must be seen inside an open modal is rendered inline in the modal itself
 * instead of through a toast.
 */
export default function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: AdminToast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
