interface MusicianRow {
  id: number;
  name: string;
}

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}

/** Positive integer, or undefined when the value is unusable. */
function requiredInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

/** Trimmed non-empty string, or undefined when the value is unusable. */
function requiredText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const recordingId = requiredInteger(body.recording_id);
  const musicianId = requiredInteger(body.musician_id);
  const instrument = requiredText(body.instrument);
  if (!recordingId)
    return badRequest("recording_id must be a positive integer");
  if (!musicianId) return badRequest("musician_id must be a positive integer");
  if (!instrument) return badRequest("instrument is required");

  try {
    const recording = await context.env.DB.prepare(
      `SELECT id FROM recordings WHERE id = ?`
    )
      .bind(recordingId)
      .first<{ id: number }>();
    if (!recording) {
      return Response.json({ error: "Recording not found" }, { status: 404 });
    }

    const musician = await context.env.DB.prepare(
      `SELECT id, name FROM musicians WHERE id = ?`
    )
      .bind(musicianId)
      .first<MusicianRow>();
    if (!musician) {
      return Response.json({ error: "Musician not found" }, { status: 404 });
    }

    const existing = await context.env.DB.prepare(
      `SELECT 1 AS present FROM recording_credits
       WHERE recording_id = ? AND musician_id = ? AND instrument = ?`
    )
      .bind(recordingId, musicianId, instrument)
      .first<{ present: number }>();
    if (existing) {
      return Response.json({ error: "Credit already exists" }, { status: 409 });
    }

    await context.env.DB.prepare(
      `INSERT INTO recording_credits (recording_id, musician_id, instrument)
       VALUES (?, ?, ?)`
    )
      .bind(recordingId, musicianId, instrument)
      .run();

    return Response.json(
      {
        success: true,
        credit: {
          recording_id: recordingId,
          musician_id: musicianId,
          musician: musician.name,
          instrument,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add credit", error);
    return Response.json({ error: "Failed to add credit" }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const params = new URL(context.request.url).searchParams;
  const recordingId = requiredInteger(Number(params.get("recording_id")));
  const musicianId = requiredInteger(Number(params.get("musician_id")));
  const instrument = requiredText(params.get("instrument"));
  if (!recordingId)
    return badRequest("recording_id must be a positive integer");
  if (!musicianId) return badRequest("musician_id must be a positive integer");
  if (!instrument) return badRequest("instrument is required");

  try {
    const result = await context.env.DB.prepare(
      `DELETE FROM recording_credits
       WHERE recording_id = ? AND musician_id = ? AND instrument = ?`
    )
      .bind(recordingId, musicianId, instrument)
      .run();

    if (!result.meta.changes) {
      return Response.json({ error: "Credit not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to remove credit", error);
    return Response.json({ error: "Failed to remove credit" }, { status: 500 });
  }
};
