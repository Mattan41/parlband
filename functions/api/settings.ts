interface Env {
  DB: D1Database;
}

/** `site_content` key for the player's end-of-queue behaviour. */
const PLAYBACK_MODE_KEY = "playback_mode";

/**
 * Valid modes, mirroring data/settings.ts. The Functions bundle has no imports
 * from the app, so the small list is repeated here on purpose.
 */
const PLAYBACK_MODES = ["none", "once", "loop"] as const;

/** Fallback used when the row is missing or holds an unknown value. */
const DEFAULT_PLAYBACK_MODE = "loop";

function isPlaybackMode(value: string): boolean {
  return (PLAYBACK_MODES as readonly string[]).includes(value);
}

/**
 * GET /api/settings – public read of the site settings.
 *
 * A missing or invalid `playback_mode` resolves to the default (endless loop),
 * so the player keeps its pre-feature behaviour instead of failing.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const row = await context.env.DB.prepare(
      `SELECT value FROM site_content WHERE key = ?`
    )
      .bind(PLAYBACK_MODE_KEY)
      .first<{ value: string }>();

    const value = row?.value;
    return Response.json({
      playbackMode:
        value && isPlaybackMode(value) ? value : DEFAULT_PLAYBACK_MODE,
    });
  } catch (error) {
    console.error("Failed to load site settings", error);
    return Response.json(
      { error: "Failed to load site settings" },
      { status: 500 }
    );
  }
};
