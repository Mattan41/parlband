/**
 * Validation for the admin playlist order. Kept free of Cloudflare globals so
 * it can be unit-tested in the plain Node Vitest environment.
 *
 * The playlist is the order songs are listed and played in on the landing page
 * (`songs.sort_order`). The admin sends the complete ordered list of song ids
 * and the server renumbers it 1..N, which is why the set of ids has to match
 * the database exactly – see assignPlaylistPositions.
 */

/** Song id slug: lowercase ASCII words separated by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validated playlist order, in the shape the route consumes. */
export interface PlaylistOrder {
  /** Song ids, first to last. */
  ids: string[];
}

/** A ready error: the message is the API text, the code is the stable contract. */
export interface PlaylistOrderError {
  error: string;
  code: string;
}

/**
 * Validate a playlist payload. Returns a ready error instead of throwing; PUT
 * is the only writer, so this has no other caller.
 *
 * The payload must be a non-empty array of song ids, each a slug, with no
 * duplicates. Everything else (whether the ids exist, and whether the list is
 * complete) is decided against the database by assignPlaylistPositions.
 */
export function parsePlaylistOrder(
  body: Record<string, unknown>
): { order: PlaylistOrder } | PlaylistOrderError {
  const { order } = body;
  if (!Array.isArray(order) || order.length === 0) {
    return {
      error: "order must be a non-empty array of song ids",
      code: "order_invalid",
    };
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of order) {
    if (typeof value !== "string") {
      return {
        error: "order must contain only song ids",
        code: "order_invalid",
      };
    }
    const id = value.trim();
    if (!SLUG_PATTERN.test(id)) {
      return {
        error: `'${value}' is not a valid song id`,
        code: "order_invalid",
      };
    }
    if (seen.has(id)) {
      return {
        error: `'${id}' appears more than once in the order`,
        code: "order_duplicate",
      };
    }
    seen.add(id);
    ids.push(id);
  }

  return { order: { ids } };
}

/** One song's new position: 1 = first. */
export interface PlaylistPosition {
  id: string;
  position: number;
}

/**
 * Reconcile the submitted order with the song ids that actually exist.
 *
 * The submitted order has to be the complete set: an unknown id, or a song the
 * list forgot, means the client is working from a stale list and renumbering
 * would silently lose a song's position. That is refused with `playlist_mismatch`
 * before anything is written. Otherwise every song gets a contiguous 1..N
 * position, in the submitted order.
 */
export function assignPlaylistPositions(
  submitted: readonly string[],
  existing: readonly string[]
): { positions: PlaylistPosition[] } | PlaylistOrderError {
  const existingIds = new Set(existing);
  const submittedIds = new Set(submitted);

  if (submittedIds.size !== existingIds.size) {
    return {
      error: "order must list every song exactly once",
      code: "playlist_mismatch",
    };
  }
  for (const id of submittedIds) {
    if (!existingIds.has(id)) {
      return { error: `'${id}' is not a song`, code: "playlist_mismatch" };
    }
  }

  return {
    positions: submitted.map((id, index) => ({ id, position: index + 1 })),
  };
}
