/** Columns returned for a single recording. */
const RECORDING_FIELDS = `id, song_id, album, studio, year, engineer, notes,
  mp3_path, wav_path, cover_path, play_count, is_primary, is_public`;

interface RecordingRow {
  id: number;
  song_id: string;
  album: string | null;
  studio: string | null;
  year: number | null;
  engineer: string | null;
  notes: string | null;
  mp3_path: string;
  wav_path: string | null;
  cover_path: string | null;
  play_count: number | null;
  is_primary: number;
  is_public: number;
}

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}

/** Trimmed non-empty string, or undefined when the value is unusable. */
function requiredText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Optional text: null for missing/empty, undefined when the type is wrong. */
function nullableText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Optional integer: null for missing/empty, undefined when not an integer. */
function nullableInteger(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  return value;
}

/** Positive integer, or undefined when the value is unusable. */
function requiredInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

/**
 * Optional boolean with a fallback for missing values. Returns undefined only
 * when a value is present but has the wrong type.
 */
function optionalBoolean(
  value: unknown,
  fallback: boolean
): boolean | undefined {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") return undefined;
  return value;
}

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

/** Read a recording row by id (null when it does not exist). */
async function findRecording(
  db: D1Database,
  id: number
): Promise<RecordingRow | null> {
  return await db
    .prepare(`SELECT ${RECORDING_FIELDS} FROM recordings WHERE id = ?`)
    .bind(id)
    .first<RecordingRow>();
}

interface RecordingFields {
  album: string | null;
  studio: string | null;
  year: number | null;
  engineer: string | null;
  notes: string | null;
  mp3Path: string;
  wavPath: string | null;
  coverPath: string | null;
  isPrimary: boolean;
  isPublic: boolean;
}

/** Validate the editable recording fields shared by POST and PUT. */
function parseRecordingFields(
  body: Record<string, unknown>
): { fields: RecordingFields } | { error: string } {
  const mp3Path = requiredText(body.mp3_path);
  if (!mp3Path) return { error: "mp3_path is required" };

  const album = nullableText(body.album);
  const studio = nullableText(body.studio);
  const engineer = nullableText(body.engineer);
  const notes = nullableText(body.notes);
  const wavPath = nullableText(body.wav_path);
  const coverPath = nullableText(body.cover_path);
  if (album === undefined) return { error: "album must be a string or null" };
  if (studio === undefined) return { error: "studio must be a string or null" };
  if (engineer === undefined)
    return { error: "engineer must be a string or null" };
  if (notes === undefined) return { error: "notes must be a string or null" };
  if (wavPath === undefined)
    return { error: "wav_path must be a string or null" };
  if (coverPath === undefined) {
    return { error: "cover_path must be a string or null" };
  }

  const year = nullableInteger(body.year);
  if (year === undefined) return { error: "year must be an integer or null" };

  // Missing is_public defaults to public (the opposite of is_primary's
  // default). That way a client which does not send the flag can never
  // silently hide a recording from the public site.
  const isPublic = optionalBoolean(body.is_public, true);
  if (isPublic === undefined) {
    return { error: "is_public must be a boolean" };
  }

  return {
    fields: {
      album,
      studio,
      year,
      engineer,
      notes,
      mp3Path,
      wavPath,
      coverPath,
      isPrimary: body.is_primary === true,
      isPublic,
    },
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const songId = requiredText(body.song_id);
  if (!songId) return badRequest("song_id is required");

  const parsed = parseRecordingFields(body);
  if ("error" in parsed) return badRequest(parsed.error);
  const { fields } = parsed;

  try {
    const song = await context.env.DB.prepare(
      `SELECT id FROM songs WHERE id = ?`
    )
      .bind(songId)
      .first<{ id: string }>();
    if (!song) {
      return Response.json({ error: "Song not found" }, { status: 404 });
    }

    const countRow = await context.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM recordings WHERE song_id = ?`
    )
      .bind(songId)
      .first<{ count: number }>();
    // The first recording of a song is always primary.
    const isPrimary = fields.isPrimary || (countRow?.count ?? 0) === 0;

    const insertStatement = context.env.DB.prepare(
      `INSERT INTO recordings (song_id, album, studio, year, engineer, notes, mp3_path, wav_path, cover_path, play_count, is_primary, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).bind(
      songId,
      fields.album,
      fields.studio,
      fields.year,
      fields.engineer,
      fields.notes,
      fields.mp3Path,
      fields.wavPath,
      fields.coverPath,
      isPrimary ? 1 : 0,
      fields.isPublic ? 1 : 0
    );

    let newId: number;
    if (isPrimary) {
      // Clear the previous primary in the same batch so a song never has two.
      const results = await context.env.DB.batch([
        context.env.DB.prepare(
          `UPDATE recordings SET is_primary = 0 WHERE song_id = ?`
        ).bind(songId),
        insertStatement,
      ]);
      newId = results[1].meta.last_row_id;
    } else {
      const result = await insertStatement.run();
      newId = result.meta.last_row_id;
    }

    const recording = await findRecording(context.env.DB, newId);
    return Response.json({ success: true, recording }, { status: 201 });
  } catch (error) {
    console.error("Failed to create recording", error);
    return Response.json(
      { error: "Failed to create recording" },
      { status: 500 }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const id = requiredInteger(body.id);
  if (!id) return badRequest("id must be a positive integer");

  const parsed = parseRecordingFields(body);
  if ("error" in parsed) return badRequest(parsed.error);
  const { fields } = parsed;

  try {
    const existing = await context.env.DB.prepare(
      `SELECT id, song_id FROM recordings WHERE id = ?`
    )
      .bind(id)
      .first<{ id: number; song_id: string }>();
    if (!existing) {
      return Response.json({ error: "Recording not found" }, { status: 404 });
    }

    const updateStatement = context.env.DB.prepare(
      `UPDATE recordings
       SET album = ?, studio = ?, year = ?, engineer = ?, notes = ?,
           mp3_path = ?, wav_path = ?, cover_path = ?, is_primary = ?,
           is_public = ?
       WHERE id = ?`
    ).bind(
      fields.album,
      fields.studio,
      fields.year,
      fields.engineer,
      fields.notes,
      fields.mp3Path,
      fields.wavPath,
      fields.coverPath,
      fields.isPrimary ? 1 : 0,
      fields.isPublic ? 1 : 0,
      id
    );

    if (fields.isPrimary) {
      // Exactly one primary per song.
      await context.env.DB.batch([
        context.env.DB.prepare(
          `UPDATE recordings SET is_primary = 0 WHERE song_id = ?`
        ).bind(existing.song_id),
        updateStatement,
      ]);
    } else {
      await updateStatement.run();
    }

    const recording = await findRecording(context.env.DB, id);
    return Response.json({ success: true, recording });
  } catch (error) {
    console.error("Failed to update recording", error);
    return Response.json(
      { error: "Failed to update recording" },
      { status: 500 }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const idParam = new URL(context.request.url).searchParams.get("id");
  const id = requiredInteger(idParam === null ? undefined : Number(idParam));
  if (!id) {
    return badRequest("id query parameter must be a positive integer");
  }

  try {
    const existing = await context.env.DB.prepare(
      `SELECT id FROM recordings WHERE id = ?`
    )
      .bind(id)
      .first<{ id: number }>();
    if (!existing) {
      return Response.json({ error: "Recording not found" }, { status: 404 });
    }

    // The R2 files are intentionally left in the bucket (orphaned) on delete.
    await context.env.DB.batch([
      context.env.DB.prepare(
        `DELETE FROM recording_credits WHERE recording_id = ?`
      ).bind(id),
      context.env.DB.prepare(`DELETE FROM recordings WHERE id = ?`).bind(id),
    ]);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete recording", error);
    return Response.json(
      { error: "Failed to delete recording" },
      { status: 500 }
    );
  }
};
