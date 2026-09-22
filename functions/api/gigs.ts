interface Env {
  DB: D1Database;
}

/** A gig row as stored; the public API only returns upcoming ones. */
interface GigRow {
  id: number;
  event_date: string;
  start_time: string | null;
  title: string | null;
  venue: string;
  city: string | null;
  ticket_url: string | null;
  info: string | null;
}

/**
 * Today's calendar date in Sweden, `YYYY-MM-DD`.
 *
 * SQLite's `date('now')` is UTC, and CET/CEST runs one or two hours ahead of it,
 * so between 22:00/23:00 UTC and local midnight UTC would already report
 * *tomorrow* and hide a gig that is still happening today. The Swedish date is
 * therefore computed here and bound into the query instead.
 *
 * Workers ship full ICU, so `timeZone` is supported. Keep this in sync with
 * `todayIsoDate` in data/gigs.ts (used by the admin's "Passerat" badge); the
 * unit tests assert that both helpers agree.
 */
const STOCKHOLM_DATE_FORMAT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date as `YYYY-MM-DD` in `Europe/Stockholm`. */
export function todayInStockholm(now: Date = new Date()): string {
  return STOCKHOLM_DATE_FORMAT.format(now);
}

/**
 * GET /api/gigs – public list of upcoming gigs ("Kommande spelningar").
 *
 * Only today and later (Swedish local time) is returned, so a gig stays visible
 * for the whole day of the event until 23:59:59 regardless of the UTC offset.
 * Past rows stay in the table for the admin and disappear from the site on their
 * own once the Swedish day has rolled over.
 *
 * `internal_notes` is deliberately never selected: those notes are for the band
 * and only the admin endpoint (functions/api/admin/gigs.ts) returns them.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const result = await context.env.DB.prepare(
      `SELECT id, event_date, start_time, title, venue, city, ticket_url, info
       FROM gigs
       WHERE event_date >= ?
       ORDER BY event_date, start_time`
    )
      .bind(todayInStockholm())
      .all<GigRow>();

    return Response.json({ gigs: result.results });
  } catch (error) {
    console.error("Failed to load gigs", error);
    return Response.json({ error: "Failed to load gigs" }, { status: 500 });
  }
};
