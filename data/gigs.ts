/** A gig as returned by GET /api/gigs and GET /api/admin/gigs. */
export interface GigRow {
  id: number;
  /** ISO calendar date, `YYYY-MM-DD` (stored as text; string compare = date compare). */
  event_date: string;
  /** 24-hour start time, `HH:MM`, or null when it is not set yet. */
  start_time: string | null;
  venue: string;
  city: string | null;
  ticket_url: string | null;
  info: string | null;
}

/**
 * Swedish label for an ISO date, e.g. `"sön 4 okt. 2026"`.
 *
 * Built from the date parts instead of `new Date("2026-10-04")`: the latter is
 * parsed as UTC midnight and would render as the previous day in any timezone
 * behind UTC. The `sv-SE` short form is what Swedish sites conventionally show
 * (lowercase weekday, abbreviated month with a trailing period).
 */
export function formatGigDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;

  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

/** `HH:MM` in 24-hour form, tolerating a stored `HH:MM:SS` or a bare hour. */
const TIME_PATTERN = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/;

/**
 * `"19:00"` → `"kl. 19:00"`, or null when no usable time is set.
 *
 * Strictly 24-hour Swedish: there is no AM/PM branch anywhere, the hour is
 * zero-padded and seconds (if the value ever carries them) are dropped.
 */
export function formatGigTime(startTime: string | null): string | null {
  if (startTime === null) return null;

  const match = TIME_PATTERN.exec(startTime.trim());
  if (!match) return null;

  const [, hours, minutes] = match;
  const hour = Number(hours);
  if (hour > 23) return null;

  return `kl. ${String(hour).padStart(2, "0")}:${minutes}`;
}

/**
 * Today's date as `YYYY-MM-DD`, in `Europe/Stockholm`.
 *
 * The band is Swedish and the public API filters on the Swedish day, so the
 * admin's "Passerat" badge must use the same day boundary – a browser in
 * another timezone must not disagree with what the landing page shows. Keep
 * this in sync with `todayInStockholm` in functions/api/gigs.ts; the unit tests
 * assert that both helpers agree.
 */
export function todayIsoDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * True when a gig is in the past. Uses the same rule as the public API (which
 * filters on today's Swedish date), so the admin's "Passerat" badge matches what
 * the landing page actually shows.
 */
export function isPastGig(
  isoDate: string,
  today: string = todayIsoDate()
): boolean {
  return isoDate < today;
}
