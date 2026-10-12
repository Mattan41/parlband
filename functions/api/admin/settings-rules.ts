/**
 * Validation for the site-settings payload. Kept free of Cloudflare globals so
 * it can be unit-tested in the plain Node Vitest environment.
 *
 * The valid modes mirror data/settings.ts; the Functions bundle has no imports
 * from the app, so the small list is repeated here on purpose.
 */
export const PLAYBACK_MODES = ["none", "once", "loop"] as const;

export type PlaybackMode = (typeof PLAYBACK_MODES)[number];

/** Validated settings in the shape the SQL statements bind. */
export interface SettingsFields {
  playbackMode: PlaybackMode;
}

function isPlaybackMode(value: unknown): value is PlaybackMode {
  return (
    typeof value === "string" &&
    (PLAYBACK_MODES as readonly string[]).includes(value)
  );
}

/**
 * Validate a settings payload. Returns a ready error message instead of
 * throwing. PUT is the only writer, so this has no other caller.
 */
export function parseSettingsFields(
  body: Record<string, unknown>
): { fields: SettingsFields } | { error: string } {
  const { playbackMode } = body;
  if (!isPlaybackMode(playbackMode)) {
    return {
      error: `playbackMode must be one of: ${PLAYBACK_MODES.join(", ")}`,
    };
  }
  return { fields: { playbackMode } };
}
