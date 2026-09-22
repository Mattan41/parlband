interface Env {
  DB: D1Database;
}

/** `site_content` keys holding the editable page copy. */
const CONTENT_KEYS = {
  welcomeText: "welcome_text",
  aboutHeading: "about_heading",
  aboutBody: "about_body",
} as const;

interface ContentRow {
  key: string;
  value: string;
}

/**
 * GET /api/content – public read of the editable page copy.
 *
 * A missing key resolves to an empty string so the pages fall back to their
 * built-in defaults (or render nothing) instead of failing.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const result = await context.env.DB.prepare(
      `SELECT key, value FROM site_content WHERE key IN (?, ?, ?)`
    )
      .bind(
        CONTENT_KEYS.welcomeText,
        CONTENT_KEYS.aboutHeading,
        CONTENT_KEYS.aboutBody
      )
      .all<ContentRow>();

    const byKey = new Map(result.results.map((row) => [row.key, row.value]));

    return Response.json({
      welcomeText: byKey.get(CONTENT_KEYS.welcomeText) ?? "",
      aboutHeading: byKey.get(CONTENT_KEYS.aboutHeading) ?? "",
      aboutBody: byKey.get(CONTENT_KEYS.aboutBody) ?? "",
    });
  } catch (error) {
    console.error("Failed to load site content", error);
    return Response.json(
      { error: "Failed to load site content" },
      { status: 500 }
    );
  }
};
