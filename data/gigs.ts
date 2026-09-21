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
 * behind UTC.
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

/** `"19:00"` → `"kl. 19:00"`, or null when no time is set. */
export function formatGigTime(startTime: string | null): string | null {
  return startTime ? `kl. ${startTime}` : null;
}

/** Today's date as `YYYY-MM-DD` in the visitor's timezone. */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * True when a gig is in the past. Uses the same rule as the public API (which
 * filters on `date('now')`), so the admin's "Passerat" badge matches what the
 * landing page actually shows.
 */
export function isPastGig(
  isoDate: string,
  today: string = todayIsoDate()
): boolean {
  return isoDate < today;
}
