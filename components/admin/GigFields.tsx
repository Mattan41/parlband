"use client";

import { normalizeGigTime, type AdminGigRow } from "@/data/gigs";
import { inputClass, labelClass } from "./adminStyles";

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
};

/** Convert an API gig into the editable draft shape. */
export function toGigDraft(gig: AdminGigRow): GigDraft {
  return {
    event_date: gig.event_date,
    start_time: gig.start_time ?? "",
    title: gig.title ?? "",
    venue: gig.venue,
    city: gig.city ?? "",
    ticket_url: gig.ticket_url ?? "",
    info: gig.info ?? "",
    internal_notes: gig.internal_notes ?? "",
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
    a.internal_notes === b.internal_notes
  );
}

/**
 * Stops Enter from submitting a gig form: only the explicit save button saves,
 * so a half-written row is never committed by a stray keypress. A `<textarea>`
 * is exempt, because there Enter has to insert a line break.
 */
export function blockEnterSubmit(
  event: React.KeyboardEvent<HTMLFormElement>
): void {
  if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
    event.preventDefault();
  }
}

interface Props {
  draft: GigDraft;
  onChange: (patch: Partial<GigDraft>) => void;
}

export default function GigFields({ draft, onChange }: Props) {
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
          placeholder="t.ex. Kilbyfesten"
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          Gör datumet lätt att känna igen i listan. Visas på sajten när den är
          ifylld.
        </span>
      </label>

      <label>
        <span className={labelClass}>Datum</span>
        <input
          type="date"
          className={inputClass}
          value={draft.event_date}
          onChange={(event) => onChange({ event_date: event.target.value })}
        />
      </label>

      <label>
        <span className={labelClass}>Tid (valfritt)</span>
        {/* A plain text field instead of `type="time"`: the native time picker
            follows the browser's own locale and shows AM/PM on an en-US machine,
            while the band wants strict 24-hour input. `normalizeGigTime` turns
            what is typed into the HH:MM the API stores. */}
        <input
          className={inputClass}
          value={draft.start_time}
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          placeholder="t.ex. 19:00"
          onChange={(event) => onChange({ start_time: event.target.value })}
          onBlur={(event) => handleTimeBlur(event.target.value)}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          24-timmarsformat (ingen AM/PM).
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
          placeholder="t.ex. med Vanten"
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
          placeholder="t.ex. boka PA, dubbelkolla lastintag"
          onChange={(event) => onChange({ internal_notes: event.target.value })}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          Sparas men visas bara här i admin – aldrig på sajten.
        </span>
      </label>
    </div>
  );
}
