"use client";

import { useEffect, useRef, type RefObject } from "react";

interface Props {
  /** Current value as `HH:MM`, or "" when unset. */
  value: string;
  /** Called with the new `HH:MM` for every pick. */
  onChange: (value: string) => void;
  /** Closes the popover (outside press, Escape outside a modal, or a minute pick). */
  onClose: () => void;
  /**
   * The trigger button. A pointer press there must not count as "outside",
   * otherwise the outside-close handler would fight the button's own toggle.
   */
  anchorRef?: RefObject<HTMLElement | null>;
}

/** Minutes are offered in this step, plus the current minute when it differs. */
const MINUTE_STEP = 5;

const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);

/** `00, 05, … 55`, plus `currentMinute` when the stored value is off-step. */
function minuteOptions(currentMinute: string): string[] {
  const minutes = Array.from({ length: 60 / MINUTE_STEP }, (_, index) =>
    String(index * MINUTE_STEP).padStart(2, "0")
  );
  if (/^\d{2}$/.test(currentMinute) && !minutes.includes(currentMinute)) {
    minutes.push(currentMinute);
    minutes.sort();
  }
  return minutes;
}

const COLUMN_CLASS =
  "flex max-h-48 w-14 flex-col overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 dark:border-zinc-700 dark:bg-zinc-900";

function optionClass(selected: boolean): string {
  return `px-2 py-1 text-center text-sm tabular-nums transition ${
    selected
      ? "bg-amber-100 font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
  }`;
}

/**
 * Lightweight 24-hour time picker: two scrollable columns in a popover anchored
 * to the clock button.
 *
 * Exists because the native `type="time"` widget follows the browser locale
 * (AM/PM on an en-US machine) and cannot be styled to match the admin surface.
 * The caller's text field stays authoritative; this only produces `HH:MM`.
 *
 * Picking an hour applies it at once and keeps the popover open so a minute can
 * follow; picking a minute applies it and closes. A pointer press outside (or
 * Escape, when not inside a modal `<dialog>`) also closes.
 */
export default function TimePickerPopover({
  value,
  onChange,
  onClose,
  anchorRef,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const [currentHour = "", currentMinute = ""] = /^\d{2}:\d{2}$/.test(value)
    ? value.split(":")
    : [];

  // Centre the selected entries, scrolling the columns only (never the page).
  useEffect(() => {
    const popover = popoverRef.current;
    const selected = popover?.querySelector<HTMLElement>(
      '[data-selected="true"]'
    );
    const column = selected?.parentElement;
    if (!selected || !column) return;

    column.scrollTop =
      selected.offsetTop - column.clientHeight / 2 + selected.clientHeight / 2;
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    // Inside a modal <dialog>, Escape would also close the whole dialog (the
    // browser's close request), so it is left to the dialog – the same rule as
    // components/admin/LyricsEditor.tsx.
    const nestedInDialog = popoverRef.current?.closest("dialog") != null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (!nestedInDialog) document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      if (!nestedInDialog) {
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [anchorRef, onClose]);

  function pickHour(hour: string) {
    onChange(`${hour}:${currentMinute || "00"}`);
  }

  function pickMinute(minute: string) {
    onChange(`${currentHour || "00"}:${minute}`);
    onClose();
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Välj tid"
      className="absolute right-0 top-full z-10 mt-1 flex gap-2 rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div role="group" aria-label="Timme" className={COLUMN_CLASS}>
        {HOURS.map((hour) => (
          <button
            key={hour}
            type="button"
            aria-pressed={hour === currentHour}
            data-selected={hour === currentHour}
            onClick={() => pickHour(hour)}
            className={optionClass(hour === currentHour)}
          >
            {hour}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Minut" className={COLUMN_CLASS}>
        {minuteOptions(currentMinute).map((minute) => (
          <button
            key={minute}
            type="button"
            aria-pressed={minute === currentMinute}
            data-selected={minute === currentMinute}
            onClick={() => pickMinute(minute)}
            className={optionClass(minute === currentMinute)}
          >
            {minute}
          </button>
        ))}
      </div>
    </div>
  );
}
