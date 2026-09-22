"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass, labelClass, secondaryButtonClass } from "./adminStyles";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Shared prefix for the field id, so a form can label the textarea. */
  idPrefix: string;
}

/**
 * Lyrics/chords editor for a song.
 *
 * Rendered inline where it fits (the song form and the "Ny låt" modal) and
 * expandable to a full-screen overlay with **Visa i stor vy**. The overlay is a
 * plain `fixed` panel rather than a second `<dialog>`: it therefore also works
 * from inside the "Ny låt" modal without nesting dialogs, and it never fights
 * AdminModal over body scroll (both save and restore the previous value).
 *
 * Kept as its own component so the planned chord tooling – extended chord
 * detection, transposition and a Swedish formatting guide (see
 * docs/local/chordUtil.md) – has a single home, while SongFields stays about
 * song metadata.
 */
export default function LyricsEditor({ value, onChange, idPrefix }: Props) {
  const [expanded, setExpanded] = useState(false);
  const inlineRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = `${idPrefix}-lyrics`;

  /**
   * Focus the large view on open; close it on Escape. Inside a modal `<dialog>`
   * Escape is deliberately left alone: the browser's close request also closes
   * the surrounding dialog (AdminModal listens for `cancel`), so handling it
   * here would fold two layers at once. There the "Stäng" button is the way out.
   *
   * The body scroll lock saves and restores the previous value, so it stacks
   * safely with AdminModal's own lock.
   */
  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlayRef.current?.focus();

    const nestedInDialog = overlayRef.current?.closest("dialog") != null;
    if (nestedInDialog) {
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  /** Returning focus to the inline field keeps "stor vy" non-disruptive. */
  function collapse() {
    setExpanded(false);
    inlineRef.current?.focus();
  }

  return (
    <>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className={labelClass} htmlFor={fieldId}>
            Text
          </label>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => setExpanded(true)}
          >
            Visa i stor vy
          </button>
        </div>
        <textarea
          id={fieldId}
          ref={inlineRef}
          className={`${inputClass} min-h-32 font-mono`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          Vanlig text – ackordrader skrivs på en egen rad ovanför den textrad de
          hör till.
        </span>
      </div>

      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Låttext"
          // Clicking the dimmed padding (only visible from `sm`) closes it.
          onClick={(event) => {
            if (event.target === event.currentTarget) collapse();
          }}
          className="fixed inset-0 z-50 flex flex-col bg-zinc-950/60 sm:p-6"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <h2 className={labelClass}>Låttext</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Ackordrader skrivs på en egen rad ovanför den textrad de hör
                  till.
                </p>
              </div>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={collapse}
              >
                Stäng
              </button>
            </div>

            <textarea
              ref={overlayRef}
              aria-label="Låttext, stor vy"
              className="min-h-0 w-full flex-1 resize-none bg-white px-4 py-3 font-mono text-sm leading-relaxed text-zinc-900 focus:outline-none dark:bg-zinc-900 dark:text-zinc-100"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
