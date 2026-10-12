/**
 * Site-wide settings edited at /admin/settings and read at runtime by the
 * sticky player. Stored as key/value rows in the `site_content` table and
 * served by the public GET /api/settings (saved through PUT /api/admin/settings).
 */

/**
 * What the player does when its queue is empty and the current track ends.
 *
 * - `none` – stop after the current track.
 * - `once` – play through the whole catalogue once, then stop.
 * - `loop` – keep advancing and start over at the end.
 */
export type PlaybackMode = "none" | "once" | "loop";

/** Every valid `PlaybackMode`, in the order shown in the admin UI. */
export const PLAYBACK_MODES: readonly PlaybackMode[] = ["none", "once", "loop"];

/** Mode used when the setting is missing (matches the pre-feature behaviour). */
export const DEFAULT_PLAYBACK_MODE: PlaybackMode = "loop";

/** Site-wide settings returned by GET /api/settings. */
export interface SiteSettings {
  playbackMode: PlaybackMode;
}

/** Load the site settings. Shared by the player and the admin editor. */
export function fetchSiteSettings(): Promise<SiteSettings> {
  return fetch("/api/settings").then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load site settings: ${response.status}`);
    }
    return response.json() as Promise<SiteSettings>;
  });
}
