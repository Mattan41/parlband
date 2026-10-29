import { assignPlaylistPositions, parsePlaylistOrder } from "./playlist-rules";
import { badRequest, errorResponse, readJsonBody } from "./request";

interface Env {
  DB: D1Database;
}

interface SongIdRow {
  id: string;
}

/**
 * PUT /api/admin/playlist – save the order songs are listed and played in.
 *
 * The body is `{ "order": ["id-1", "id-2", …] }`: the complete list of song ids
 * in the wanted order. The server renumbers `songs.sort_order` to 1..N in a
 * single batch, so the public GET /api/songs (and therefore the player's
 * auto-advance) follows the admin's order and a reorder is atomic – either
 * every song gets its new position or none does.
 *
 * A list that does not match the songs in the database is a stale client and is
 * refused with `409 { code: "playlist_mismatch" }` before anything is written.
 * Validation lives in the pure playlist-rules.ts module.
 *
 * Protected by functions/api/admin/_middleware.ts (Access JWT) like every other
 * route in this directory. The order is read back through GET /api/admin/songs,
 * so there is no duplicate GET handler here.
 */
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const parsed = parsePlaylistOrder(body);
  if ("error" in parsed) return badRequest(parsed.error, parsed.code);

  try {
    const existing =
      await context.env.DB.prepare(`SELECT id FROM songs`).all<SongIdRow>();

    const assigned = assignPlaylistPositions(
      parsed.order.ids,
      existing.results.map((row) => row.id)
    );
    if ("error" in assigned) {
      return errorResponse(assigned.error, 409, assigned.code);
    }

    await context.env.DB.batch(
      assigned.positions.map(({ id, position }) =>
        context.env.DB.prepare(
          `UPDATE songs SET sort_order = ? WHERE id = ?`
        ).bind(position, id)
      )
    );

    return Response.json({
      success: true,
      order: assigned.positions.map(({ id }) => id),
    });
  } catch (error) {
    console.error("Failed to save playlist order", error);
    return Response.json(
      { error: "Failed to save playlist order" },
      { status: 500 }
    );
  }
};
