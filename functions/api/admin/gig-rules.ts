/** ISO calendar date, e.g. `2026-10-04`. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 24-hour time on the hour or minute, e.g. `19:00`. */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Trimmed non-empty string, or undefined when the value is unusable. */
export function requiredText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Optional text: null for missing/empty, undefined when the type is wrong. */
export function nullableText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Positive integer, or undefined when the value is unusable. */
export function requiredInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

/** True for a real calendar date in `YYYY-MM-DD` form (rejects `2026-02-31`). */
export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** True for `HH:MM` within a day. */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** True for an absolute http(s) URL. */
export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Optional boolean with a fallback for missing values, mirroring
 * functions/api/admin/recordings.ts. Returns undefined only when a value is
 * present but has the wrong type, so a bad payload is rejected instead of
 * silently falling back.
 */
function optionalBoolean(
  value: unknown,
  fallback: boolean
): boolean | undefined {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") return undefined;
  return value;
}

/** Validated gig payload in the shape the SQL statements bind. */
export interface GigFields {
  eventDate: string;
  startTime: string | null;
  title: string | null;
  venue: string;
  city: string | null;
  ticketUrl: string | null;
  info: string | null;
  internalNotes: string | null;
  /** Whether the gig may be shown on the public site. */
  isPublished: boolean;
}

/**
 * Stable, machine-readable codes for the field errors below.
 *
 * The messages are English because they are API errors; the admin UI
 * (components/admin/GigsSection.tsx) maps the codes to Swedish copy, the same
 * way `mp3_missing` is handled in the recording editor.
 */
export type GigErrorCode =
  | "date_required"
  | "date_invalid"
  | "venue_required"
  | "time_type"
  | "time_invalid"
  | "title_type"
  | "city_type"
  | "ticket_url_type"
  | "ticket_url_invalid"
  | "info_type"
  | "internal_notes_type"
  | "published_type";

export interface GigFieldError {
  error: string;
  code: GigErrorCode;
}

/**
 * Validate and normalise a gig payload, shared by POST and PUT.
 * Returns a ready error message + code instead of throwing.
 */
export function parseGigFields(
  body: Record<string, unknown>
): { fields: GigFields } | GigFieldError {
  const eventDate = requiredText(body.event_date);
  if (!eventDate) {
    return { error: "event_date is required", code: "date_required" };
  }
  if (!isValidDate(eventDate)) {
    return {
      error: "event_date must be a valid date (YYYY-MM-DD)",
      code: "date_invalid",
    };
  }

  const title = nullableText(body.title);
  if (title === undefined) {
    return { error: "title must be a string or null", code: "title_type" };
  }

  const venue = requiredText(body.venue);
  if (!venue) {
    return { error: "venue is required", code: "venue_required" };
  }

  const startTime = nullableText(body.start_time);
  if (startTime === undefined) {
    return { error: "start_time must be a string or null", code: "time_type" };
  }
  if (startTime !== null && !isValidTime(startTime)) {
    return { error: "start_time must be HH:MM", code: "time_invalid" };
  }

  const city = nullableText(body.city);
  if (city === undefined) {
    return { error: "city must be a string or null", code: "city_type" };
  }

  const ticketUrl = nullableText(body.ticket_url);
  if (ticketUrl === undefined) {
    return {
      error: "ticket_url must be a string or null",
      code: "ticket_url_type",
    };
  }
  if (ticketUrl !== null && !isValidHttpUrl(ticketUrl)) {
    return {
      error: "ticket_url must be an http(s) URL",
      code: "ticket_url_invalid",
    };
  }

  const info = nullableText(body.info);
  if (info === undefined) {
    return { error: "info must be a string or null", code: "info_type" };
  }

  const internalNotes = nullableText(body.internal_notes);
  if (internalNotes === undefined) {
    return {
      error: "internal_notes must be a string or null",
      code: "internal_notes_type",
    };
  }

  // Missing means "publish", so an older client that does not send the flag
  // keeps creating visible gigs. Only a wrong type is rejected.
  const isPublished = optionalBoolean(body.is_published, true);
  if (isPublished === undefined) {
    return {
      error: "is_published must be a boolean",
      code: "published_type",
    };
  }

  return {
    fields: {
      eventDate,
      startTime,
      title,
      venue,
      city,
      ticketUrl,
      info,
      internalNotes,
      isPublished,
    },
  };
}
