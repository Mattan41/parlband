interface Env {
  DB: D1Database;
}

/** A gig row as stored; the public API only returns upcoming ones. */
interface GigRow {
  id: number;
  event_date: string;
  start_time: string | null;
  venue: string;
  city: string | null;
  ticket_url: string | null;
  info: string | null;
}

/**
 * GET /api/gigs – public list of upcoming gigs ("Kommande spelningar").
 *
 * Only today and later is returned. `date('now')` is UTC, which can keep a gig
 * visible for a couple of hours past local midnight – deliberate: showing it
 * slightly too long beats hiding it too early. Past rows stay in the table for
 * the admin and disappear from the site on their own.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const result = await context.env.DB.prepare(
      `SELECT id, event_date, start_time, venue, city, ticket_url, info
       FROM gigs
       WHERE event_date >= date('now')
       ORDER BY event_date, start_time`
    ).all<GigRow>();

    return Response.json({ gigs: result.results });
  } catch (error) {
    console.error("Failed to load gigs", error);
    return Response.json({ error: "Failed to load gigs" }, { status: 500 });
  }
};
