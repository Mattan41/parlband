import type { AdminSong } from "@/data/admin";

/**
 * Pure helpers for the /admin/playlist editor. Kept in their own module (next to
 * PlaylistOrder.tsx, like musicianOverview.ts) so the ordering logic can be
 * unit-tested without rendering the component.
 */

/** The song fields the ordering helpers read. */
export type PlaylistSong = Pick<AdminSong, "id" | "title" | "sort_order">;

/**
 * The playlist order as song ids, derived from `sort_order` (title as a stable
 * tiebreak, Swedish-aware, matching the comparison used in data/admin.ts).
 */
export function toPlaylistOrder(songs: readonly PlaylistSong[]): string[] {
  return songs
    .slice()
    .sort((a, b) =>
      a.sort_order !== b.sort_order
        ? a.sort_order - b.sort_order
        : a.title.localeCompare(b.title, "sv")
    )
    .map((song) => song.id);
}

/** True when two orders are identical (same ids, same positions). */
export function samePlaylistOrder(
  a: readonly string[],
  b: readonly string[]
): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Move the entry at `index` one step in `direction` (-1 up, +1 down) and return
 * the new order. Out-of-range moves are a no-op, so the ends need no special
 * casing in the caller.
 */
export function moveInPlaylist(
  order: readonly string[],
  index: number,
  direction: -1 | 1
): string[] {
  const target = index + direction;
  if (target < 0 || target >= order.length) return order.slice();
  const next = order.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
