import type { Song } from "@/data/songs";

/**
 * Sort songs alphabetically by title, Swedish-aware.
 *
 * The Texter view always lists songs alphabetically, independent of the public
 * playlist order the admin controls (`songs.sort_order`), so the two views can
 * never drift into each other. The comparison mirrors the Swedish one used for
 * recordings in data/admin.ts.
 *
 * Pure, and returns a new array – the input is not mutated.
 */
export function sortSongsByTitle<T extends Pick<Song, "title">>(
  songs: readonly T[]
): T[] {
  return songs.slice().sort((a, b) => a.title.localeCompare(b.title, "sv"));
}
