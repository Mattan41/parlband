"use client";

import { useEffect, useId, useRef } from "react";

interface Props {
  open: boolean;
  /** Heading shown at the top of the modal. */
  title: string;
  /** Short Swedish help text explaining what happens and what comes next. */
  help: string;
  /** While true, Esc and backdrop clicks are ignored (a save/upload is running). */
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Modal shell for the admin surface, built on the native <dialog> element.
 *
 * showModal() is what makes this accessible without extra code: the browser
 * moves focus into the dialog, traps Tab/Shift+Tab there, makes the page behind
 * it inert and renders a ::backdrop. Escape fires the dialog's `cancel` event,
 * which is intercepted so `busy` can block closing mid-request.
 */
export default function AdminModal({
  open,
  title,
  help,
  busy = false,
  onClose,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      previouslyFocused.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      // Never let the browser close the dialog directly: `onClose` owns the
      // open state so a cancellation can be blocked while busy.
      event.preventDefault();
      if (!busy) onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClick={(event) => {
        // With the native backdrop, a click outside the panel reports the
        // dialog as target. Everything visible lives in the inner wrapper, so
        // clicks on panel padding/borders never match this condition.
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      className="mt-auto mb-0 w-full max-w-3xl bg-transparent p-0 outline-none backdrop:bg-zinc-950/60 sm:m-auto"
    >
      <div className="flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id={headingId}
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {help}
            </p>
          </div>
          <button
            type="button"
            aria-label="Stäng"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg leading-none text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </dialog>
  );
}
