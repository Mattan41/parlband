import { parseGigFields, requiredInteger } from "./gig-rules";

interface Env {
  DB: D1Database;
}

/**
 * Columns returned for a single gig. `internal_notes` is included here and only
 * here: the public GET /api/gigs never selects it, so band-only notes cannot
 * leak to the site.
 */
const GIG_FIELDS = `id, event_date, start_time, title, venue, city, ticket_url, info, internal_notes, is_published`;

interface GigRow {
  id: number;
  event_date: string;
  start_time: string | null;
  title: string | null;
  venue: string;
  city: string | null;
  ticket_url: string | null;
  info: string | null;
  internal_notes: string | null;
  /** 1 when the gig is visible on the public site, 0 when it is a draft. */
  is_published: number;
}

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}

/**
 * `code` is optional, but every validation failure from gig-rules.ts carries a
 * stable one so components/admin/GigsSection.tsx can render Swedish copy
 * instead of the English API message.
 */
function badRequest(error: string, code?: string): Response {
  return Response.json(code ? { error, code } : { error }, { status: 400 });
}

/** A row that no longer exists; the UI reloads and says so in Swedish. */
function notFound(): Response {
  return Response.json(
    { error: "Gig not found", code: "gig_not_found" },
    { status: 404 }
  );
}

/** Read a gig row by id (null when it does not exist). */
async function findGig(db: D1Database, id: number): Promise<GigRow | null> {
  return await db
    .prepare(`SELECT ${GIG_FIELDS} FROM gigs WHERE id = ?`)
    .bind(id)
    .first<GigRow>();
}

/**
 * GET /api/admin/gigs – every gig, including past ones.
 *
 * Unlike the public endpoint (which filters on today) the admin needs to see
 * what has already happened so a date can be corrected or removed; the UI marks
 * those rows as "Passerat".
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const result = await context.env.DB.prepare(
      `SELECT ${GIG_FIELDS} FROM gigs ORDER BY event_date DESC, start_time DESC, id DESC`
    ).all<GigRow>();

    return Response.json({ gigs: result.results });
  } catch (error) {
    console.error("Failed to load gigs", error);
    return Response.json({ error: "Failed to load gigs" }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const parsed = parseGigFields(body);
  if ("error" in parsed) return badRequest(parsed.error, parsed.code);
  const { fields } = parsed;

  try {
    const result = await context.env.DB.prepare(
      `INSERT INTO gigs (event_date, start_time, title, venue, city, ticket_url, info, internal_notes, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        fields.eventDate,
        fields.startTime,
        fields.title,
        fields.venue,
        fields.city,
        fields.ticketUrl,
        fields.info,
        fields.internalNotes,
        fields.isPublished ? 1 : 0
      )
      .run();

    const gig = await findGig(context.env.DB, result.meta.last_row_id);
    return Response.json({ success: true, gig }, { status: 201 });
  } catch (error) {
    console.error("Failed to create gig", error);
    return Response.json({ error: "Failed to create gig" }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const id = requiredInteger(body.id);
  if (!id) return badRequest("id must be a positive integer");

  const parsed = parseGigFields(body);
  if ("error" in parsed) return badRequest(parsed.error, parsed.code);
  const { fields } = parsed;

  try {
    const updateResult = await context.env.DB.prepare(
      `UPDATE gigs
       SET event_date = ?, start_time = ?, title = ?, venue = ?, city = ?, ticket_url = ?, info = ?, internal_notes = ?,
           is_published = ?
       WHERE id = ?`
    )
      .bind(
        fields.eventDate,
        fields.startTime,
        fields.title,
        fields.venue,
        fields.city,
        fields.ticketUrl,
        fields.info,
        fields.internalNotes,
        fields.isPublished ? 1 : 0,
        id
      )
      .run();

    if (!updateResult.meta.changes) {
      return notFound();
    }

    const gig = await findGig(context.env.DB, id);
    return Response.json({ success: true, gig });
  } catch (error) {
    console.error("Failed to update gig", error);
    return Response.json({ error: "Failed to update gig" }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const idParam = new URL(context.request.url).searchParams.get("id");
  const id = requiredInteger(idParam === null ? undefined : Number(idParam));
  if (!id) {
    return badRequest("id query parameter must be a positive integer");
  }

  try {
    const deleteResult = await context.env.DB.prepare(
      `DELETE FROM gigs WHERE id = ?`
    )
      .bind(id)
      .run();

    if (!deleteResult.meta.changes) {
      return notFound();
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete gig", error);
    return Response.json({ error: "Failed to delete gig" }, { status: 500 });
  }
};
