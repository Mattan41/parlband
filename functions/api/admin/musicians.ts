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

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
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

  try {
    // Case-insensitive lookup keeps repeated additions idempotent. There is no
    // unique constraint on musicians.name, so the check lives here instead.
    const existing = await context.env.DB.prepare(
      `SELECT id, name FROM musicians WHERE name = ? COLLATE NOCASE`
    )
      .bind(name)
      .first<MusicianRow>();
    if (existing) {
      return Response.json({ success: true, musician: existing });
    }

    const result = await context.env.DB.prepare(
      `INSERT INTO musicians (name) VALUES (?)`
    )
      .bind(name)
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
