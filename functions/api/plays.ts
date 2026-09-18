interface Env {
  DB: D1Database;
}

/** Request body for POST /api/plays. */
interface PlayRequest {
  recording_id?: unknown;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: PlayRequest;
  try {
    body = await context.request.json<PlayRequest>();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const recordingId = body?.recording_id;
  if (
    typeof recordingId !== "number" ||
    !Number.isInteger(recordingId) ||
    recordingId <= 0
  ) {
    return Response.json(
      { error: "recording_id must be a positive integer" },
      { status: 400 }
    );
  }

  try {
    // COALESCE guards against rows inserted without play_count.
    const updateResult = await context.env.DB.prepare(
      `UPDATE recordings
       SET play_count = COALESCE(play_count, 0) + 1
       WHERE id = ?`
    )
      .bind(recordingId)
      .run();

    if (!updateResult.meta.changes) {
      return Response.json({ error: "Recording not found" }, { status: 404 });
    }

    const row = await context.env.DB.prepare(
      `SELECT play_count FROM recordings WHERE id = ?`
    )
      .bind(recordingId)
      .first<{ play_count: number }>();

    return Response.json({ success: true, play_count: row?.play_count ?? 0 });
  } catch (error) {
    console.error("Failed to register play", error);
    return Response.json({ error: "Failed to register play" }, { status: 500 });
  }
};
