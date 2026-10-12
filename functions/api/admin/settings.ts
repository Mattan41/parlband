import { parseSettingsFields } from "./settings-rules";

interface Env {
  DB: D1Database;
}

/** `site_content` key written by this endpoint (see data/settings.ts). */
const PLAYBACK_MODE_KEY = "playback_mode";

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}

/** One upsert; the table is key/value, so new settings need no migration. */
function upsert(db: D1Database, key: string, value: string) {
  return db
    .prepare(
      `INSERT INTO site_content (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .bind(key, value);
}

/**
 * PUT /api/admin/settings – save the site settings (currently just the player's
 * end-of-queue behaviour).
 *
 * Protected by functions/api/admin/_middleware.ts (Access JWT) like every other
 * route in this directory. The read side is the public GET /api/settings, so
 * there is no duplicate GET handler here.
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseSettingsFields(body);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const { fields } = parsed;

  try {
    await upsert(context.env.DB, PLAYBACK_MODE_KEY, fields.playbackMode);

    return Response.json({ success: true, ...fields });
  } catch (error) {
    console.error("Failed to save site settings", error);
    return Response.json(
      { error: "Failed to save site settings" },
      { status: 500 }
    );
  }
};
