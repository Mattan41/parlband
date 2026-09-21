import { findNameConflict, normalizeName } from "./musician-rules";

interface MusicianRow {
  id: number;
  name: string;
}

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}

/** Trimmed non-empty string, or undefined when the value is unusable. */
function requiredText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function badRequest(error: string, code?: string): Response {
  return Response.json(code ? { error, code } : { error }, { status: 400 });
}

function badRequestCode(error: string, code: string, status: number): Response {
  return Response.json({ error, code }, { status });
}

/** Positive integer, or undefined when the value is unusable. */
function requiredInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const result = await context.env.DB.prepare(
      `SELECT id, name FROM musicians ORDER BY name COLLATE NOCASE`
    ).all<MusicianRow>();

    return Response.json({ musicians: result.results });
  } catch (error) {
    console.error("Failed to load musicians", error);
    return Response.json(
      { error: "Failed to load musicians" },
      { status: 500 }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const name = requiredText(body.name);
  if (!name) return badRequest("name is required");

  const normalized = normalizeName(name);

  try {
    // Case-insensitive, Swedish-aware lookup keeps repeated additions
    // idempotent. There is no unique constraint on musicians.name, so the check
    // lives in JS (SQLite COLLATE NOCASE is ASCII-only and would treat
    // "Örjan" and "örjan" as different names).
    const all = await context.env.DB.prepare(
      `SELECT id, name FROM musicians`
    ).all<MusicianRow>();
    const existing = findNameConflict(all.results, normalized, null);
    if (existing) {
      return Response.json({ success: true, musician: existing });
    }

    const result = await context.env.DB.prepare(
      `INSERT INTO musicians (name) VALUES (?)`
    )
      .bind(normalized)
      .run();

    const musician = await context.env.DB.prepare(
      `SELECT id, name FROM musicians WHERE id = ?`
    )
      .bind(result.meta.last_row_id)
      .first<MusicianRow>();

    return Response.json({ success: true, musician }, { status: 201 });
  } catch (error) {
    console.error("Failed to create musician", error);
    return Response.json(
      { error: "Failed to create musician" },
      { status: 500 }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const id = requiredInteger(body.id);
  const name = requiredText(body.name);
  if (!id) return badRequest("id must be a positive integer");
  if (!name) return badRequest("name is required");

  const normalized = normalizeName(name);

  try {
    const existing = await context.env.DB.prepare(
      `SELECT id, name FROM musicians WHERE id = ?`
    )
      .bind(id)
      .first<MusicianRow>();
    if (!existing) {
      return Response.json({ error: "Musician not found" }, { status: 404 });
    }

    const all = await context.env.DB.prepare(
      `SELECT id, name FROM musicians`
    ).all<MusicianRow>();
    // Excludes the row itself, so changing only the case of a musician's own
    // name is allowed.
    const conflict = findNameConflict(all.results, normalized, id);
    if (conflict) {
      return badRequestCode("Name already in use", "name_conflict", 409);
    }

    await context.env.DB.prepare(`UPDATE musicians SET name = ? WHERE id = ?`)
      .bind(normalized, id)
      .run();

    const musician = await context.env.DB.prepare(
      `SELECT id, name FROM musicians WHERE id = ?`
    )
      .bind(id)
      .first<MusicianRow>();

    return Response.json({ success: true, musician });
  } catch (error) {
    console.error("Failed to rename musician", error);
    return Response.json(
      { error: "Failed to rename musician" },
      { status: 500 }
    );
  }
};
