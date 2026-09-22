"use client";

import { useRef, useState } from "react";
import { normalizeGigTime, type AdminGigRow } from "@/data/gigs";
import TimePickerPopover from "./TimePickerPopover";
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "./adminStyles";

/** Editable gig fields, shared by the "new date" modal and the inline editor. */
export interface GigDraft {
  event_date: string;
  start_time: string;
  title: string;
  venue: string;
  city: string;
  ticket_url: string;
  info: string;
  internal_notes: string;
  /** False keeps the gig out of "Kommande spelningar" on the landing page. */
  is_published: boolean;
}

export const emptyGigDraft: GigDraft = {
  event_date: "",
  start_time: "",
  title: "",
  venue: "",
  city: "",
  ticket_url: "",
  info: "",
  internal_notes: "",
  is_published: true,
};

/** Convert an API gig into the editable draft shape. */
export function toGigDraft(gig: AdminGigRow): GigDraft {
  return {
    event_date: gig.event_date,
    // Normalised on load so the text field – and the picker's highlighted
    // selection – always start from a clean HH:MM, even for legacy values such
    // as `9:05` or `19:00:00`.
    start_time: normalizeGigTime(gig.start_time ?? ""),
    title: gig.title ?? "",
    venue: gig.venue,
    city: gig.city ?? "",
    ticket_url: gig.ticket_url ?? "",
    info: gig.info ?? "",
    internal_notes: gig.internal_notes ?? "",
    is_published: gig.is_published === 1,
  };
}

/** The JSON body sent to POST/PUT /api/admin/gigs. */
export function toGigPayload(draft: GigDraft): Record<string, unknown> {
  return {
    event_date: draft.event_date,
    start_time: draft.start_time,
    title: draft.title,
    venue: draft.venue,
    city: draft.city,
    ticket_url: draft.ticket_url,
    info: draft.info,
    internal_notes: draft.internal_notes,
    is_published: draft.is_published,
  };
}

/** Field-by-field compare, used for the dirty check before saving/closing. */
export function gigDraftEquals(a: GigDraft, b: GigDraft): boolean {
  return (
    a.event_date === b.event_date &&
    a.start_time === b.start_time &&
    a.title === b.title &&
    a.venue === b.venue &&
    a.city === b.city &&
    a.ticket_url === b.ticket_url &&
    a.info === b.info &&
    a.internal_notes === b.internal_notes &&
    a.is_published === b.is_published
  );
}

interface Props {
  draft: GigDraft;
  onChange: (patch: Partial<GigDraft>) => void;
  /**
   * Renders the "Synlighet" fieldset with the **Publicerad** checkbox. Passed
   * `false` by the "Nytt datum" modal: a new date is always created published,
   * and the publish toggle belongs to the editor so there is exactly one control
   * in exactly one place.
   */
  showVisibility?: boolean;
}

export default function GigFields({
  draft,
  onChange,
  showVisibility = true,
}: Props) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  /**
   * The visible Datum field is plain text, so the browser's locale never leaks
   * into what is stored. The calendar button opens a hidden native `type="date"`
   * input instead; its picker writes the same ISO value back through `onChange`.
   */
  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Not allowed (or no picker); fall through to focus().
      }
    }
    input.focus();
  }

  // A `type="date"` input only accepts a strict YYYY-MM-DD value, so free text
  // mid-typing is passed as empty to keep React from warning about it.
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(draft.event_date)
    ? draft.event_date
    : "";

  /**
   * Tidy the time up once the field loses focus (`9:05` → `09:05`). An unusable
   * value is left exactly as typed, so the API rejects it and the Swedish error
   * message is shown instead of the field silently emptying itself.
   */
  function handleTimeBlur(value: string) {
    const normalized = normalizeGigTime(value);
    if (normalized !== "") onChange({ start_time: normalized });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={labelClass}>Titel (valfritt)</span>
        <input
          className={inputClass}
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          Gör datumet lätt att känna igen i listan. Visas på sajten när den är
          ifylld.
        </span>
      </label>

      <label>
        <span className={labelClass}>Datum (ÅÅÅÅ-MM-DD)</span>
        {/* A plain text field instead of `type="date"`: the native picker renders
            in the browser's own locale (e.g. `mm/dd/yyyy`). The value is free text
            and `parseGigFields` validates the YYYY-MM-DD form server-side; the
            Kalender button opens the hidden native picker for convenience. */}
        <div className="flex gap-2">
          <input
            type="text"
            className={inputClass}
            value={draft.event_date}
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder="ÅÅÅÅ-MM-DD"
            onChange={(event) => onChange({ event_date: event.target.value })}
          />
          <button
            type="button"
            onClick={openDatePicker}
            title="Öppna kalendern"
            aria-label="Öppna kalendern"
            className={`${secondaryButtonClass} shrink-0`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <rect x="2" y="3.25" width="12" height="11" rx="1.5" />
              <path
                d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {/* Hidden native input: only the picker UI, never the displayed value. */}
          <input
            ref={dateInputRef}
            type="date"
            className="sr-only"
            tabIndex={-1}
            value={isoDate}
            onChange={(event) => onChange({ event_date: event.target.value })}
          />
        </div>
      </label>

      <label>
        <span className={labelClass}>Tid (valfritt)</span>
        {/* A plain text field instead of `type="time"`: the native widget follows
            the browser's locale (AM/PM on an en-US machine) and cannot be styled
            to match the admin surface. The text input stays authoritative and
            `normalizeGigTime` tidies what is typed; the clock button toggles the
            custom 24-hour TimePickerPopover. */}
        <div className="relative flex gap-2">
          <input
            type="text"
            className={inputClass}
            value={draft.start_time}
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            placeholder="t.ex. 19:00"
            onChange={(event) => onChange({ start_time: event.target.value })}
            onBlur={(event) => handleTimeBlur(event.target.value)}
          />
          <button
            ref={timeButtonRef}
            type="button"
            onClick={() => setTimePickerOpen((open) => !open)}
            title="Välj tid"
            aria-label="Välj tid"
            aria-haspopup="dialog"
            aria-expanded={timePickerOpen}
            className={`${secondaryButtonClass} shrink-0`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.25" />
              <path d="M8 4.25V8l2.5 1.75" strokeLinecap="round" />
            </svg>
          </button>
          {timePickerOpen ? (
            <TimePickerPopover
              value={draft.start_time}
              onChange={(startTime) => onChange({ start_time: startTime })}
              onClose={() => setTimePickerOpen(false)}
              anchorRef={timeButtonRef}
            />
          ) : null}
        </div>
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          Skriv tiden i 24-timmarsformat, t.ex. 19:00. Fyra siffror går också bra
          (1930).
        </span>
      </label>

      <label>
        <span className={labelClass}>Spelställe</span>
        <input
          className={inputClass}
          value={draft.venue}
          onChange={(event) => onChange({ venue: event.target.value })}
        />
      </label>

      <label>
        <span className={labelClass}>Ort</span>
        <input
          className={inputClass}
          value={draft.city}
          onChange={(event) => onChange({ city: event.target.value })}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={labelClass}>Biljettlänk (valfritt)</span>
        <input
          className={inputClass}
          value={draft.ticket_url}
          placeholder="https://..."
          onChange={(event) => onChange({ ticket_url: event.target.value })}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={labelClass}>Info (valfritt)</span>
        <textarea
          className={`${inputClass} min-h-20`}
          value={draft.info}
          placeholder="t.ex. ta med filt, parkering 800 m bort"
          onChange={(event) => onChange({ info: event.target.value })}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          Visas på sajten. Radbrytningar sparas.
        </span>
      </label>

      <label className="sm:col-span-2">
        <span className={labelClass}>Interna anteckningar (valfritt)</span>
        <textarea
          className={`${inputClass} min-h-20`}
          value={draft.internal_notes}
          placeholder="t.ex. ta med telekablar, tfn nr till ljudtekniker: 070-123 45 67"
          onChange={(event) => onChange({ internal_notes: event.target.value })}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          Sparas men visas bara här i admin – aldrig på sajten.
        </span>
      </label>

      {showVisibility ? (
        <fieldset className="sm:col-span-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          <legend className={labelClass}>Synlighet</legend>

          <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
              checked={draft.is_published}
              onChange={(event) =>
                onChange({ is_published: event.target.checked })
              }
            />
            <span>
              Publicerad (visas på hemsidan)
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                Avmarkera för att spara datumet som utkast – det visas då inte
                under Kommande spelningar på startsidan.
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}
    </div>
  );
}
