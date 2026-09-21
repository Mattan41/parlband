"use client";

import type { GigRow } from "@/data/gigs";
import { inputClass, labelClass } from "./adminStyles";

/** Editable gig fields, shared by the "new date" modal and the inline editor. */
export interface GigDraft {
  event_date: string;
  start_time: string;
  venue: string;
  city: string;
  ticket_url: string;
  info: string;
}

export const emptyGigDraft: GigDraft = {
  event_date: "",
  start_time: "",
  venue: "",
  city: "",
  ticket_url: "",
  info: "",
};

/** Convert an API gig into the editable draft shape. */
export function toGigDraft(gig: GigRow): GigDraft {
  return {
    event_date: gig.event_date,
    start_time: gig.start_time ?? "",
    venue: gig.venue,
    city: gig.city ?? "",
    ticket_url: gig.ticket_url ?? "",
    info: gig.info ?? "",
  };
}

/** The JSON body sent to POST/PUT /api/admin/gigs. */
export function toGigPayload(draft: GigDraft): Record<string, unknown> {
  return {
    event_date: draft.event_date,
    start_time: draft.start_time,
    venue: draft.venue,
    city: draft.city,
    ticket_url: draft.ticket_url,
    info: draft.info,
  };
}

/** Field-by-field compare, used for the dirty check before saving/closing. */
export function gigDraftEquals(a: GigDraft, b: GigDraft): boolean {
  return (
    a.event_date === b.event_date &&
    a.start_time === b.start_time &&
    a.venue === b.venue &&
    a.city === b.city &&
    a.ticket_url === b.ticket_url &&
    a.info === b.info
  );
}

interface Props {
  draft: GigDraft;
  onChange: (patch: Partial<GigDraft>) => void;
}

export default function GigFields({ draft, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        {/* `type="time"` ignores `placeholder` in most browsers and always
            renders 24-hour input here (no AM/PM), so the format is hinted in
            the copy instead. */}
        <input
          type="time"
          className={inputClass}
          value={draft.start_time}
          onChange={(event) => onChange({ start_time: event.target.value })}
        />
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          24-timmarsformat, t.ex. 19:00
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
        <input
          className={inputClass}
          value={draft.info}
          placeholder="t.ex. med Vanten"
          onChange={(event) => onChange({ info: event.target.value })}
        />
      </label>
    </div>
  );
}
