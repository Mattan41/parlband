import type { Song } from "@/data/songs";

/**
 * Human-readable credits line for a song, e.g. "Text: X · Musik: Y".
 * Returns an empty string when neither field is set.
 */
export function formatSongCredits(song: Song): string {
  if (song.text === song.music) {
    return song.text ? `Text & musik: ${song.text}` : "";
  }

  return [
    song.text && `Text: ${song.text}`,
    song.music && `Musik: ${song.music}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
