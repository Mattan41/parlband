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
    // Normalised so legacy values (`9:05`, `19:00:00`) actually populate the
    // `type="time"` input, which only accepts a strict HH:MM.
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
        <input
          type="date"
          className={inputClass}
          value={draft.event_date}
          onChange={(event) => onChange({ event_date: event.target.value })}
        />
        {/* The native picker renders in the browser's own locale, so the stored
            ISO form is echoed here to keep ÅÅÅÅ-MM-DD unambiguous. */}
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          {draft.event_date ? draft.event_date : "Inget datum valt"}
        </span>
      </label>

      <label>
        <span className={labelClass}>Tid (valfritt)</span>
        {/* `type="time"` gives the native clock picker. Its value is always
            24-hour HH:MM whatever the browser displays, and the picker refuses
            invalid clock times; `normalizeGigTime` on blur is the safety net for
            pasted or legacy values (`930` → `09:30`). */}
        <input
          type="time"
          className={inputClass}
          value={draft.start_time}
          autoComplete="off"
          onChange={(event) => onChange({ start_time: event.target.value })}
          onBlur={(event) => handleTimeBlur(event.target.value)}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          24-timmarsformat. Fyra siffror går också bra, t.ex. 1930.
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
