import { parseContentFields } from "./content-rules";

interface Env {
  DB: D1Database;
}

/** `site_content` keys written by this endpoint. */
const CONTENT_KEYS = {
  welcomeText: "welcome_text",
  aboutHeading: "about_heading",
  aboutBody: "about_body",
} as const;

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}

/** One upsert per key; the table is key/value, so new copy needs no migration. */
function upsert(db: D1Database, key: string, value: string) {
  return db
    .prepare(
      `INSERT INTO site_content (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .bind(key, value);
}

/**
 * PUT /api/admin/content – save the landing-page welcome line and the /about
 * heading + body.
 *
 * Protected by functions/api/admin/_middleware.ts (Access JWT) like every other
 * route in this directory. The read side is the public GET /api/content, so
 * there is no duplicate GET handler here.
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseContentFields(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { fields } = parsed;

  try {
    await context.env.DB.batch([
      upsert(context.env.DB, CONTENT_KEYS.welcomeText, fields.welcomeText),
      upsert(context.env.DB, CONTENT_KEYS.aboutHeading, fields.aboutHeading),
      upsert(context.env.DB, CONTENT_KEYS.aboutBody, fields.aboutBody),
    ]);

    return Response.json({ success: true, ...fields });
  } catch (error) {
    console.error("Failed to save site content", error);
    return Response.json(
      { error: "Failed to save site content" },
      { status: 500 }
    );
  }
};
