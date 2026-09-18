/** Song id slug: lowercase ASCII words separated by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface SongRow {
  id: string;
  title: string;
  artist: string;
  lyrics_by: string;
  music_by: string;
  lyrics: string | null;
  sheet_music_path: string | null;
}

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
}

interface CreditRow {
  recording_id: number;
  musician_id: number;
  musician: string;
  instrument: string;
}

interface AdminCredit {
  musician_id: number;
  musician: string;
  instrument: string;
}

/** A recording as returned by the admin API (every recording, not just the primary). */
type AdminRecording = Omit<RecordingRow, "song_id"> & {
  credits: AdminCredit[];
};

/**
 * Read the JSON body, returning null when it is missing or malformed.
 * Mirrors the defensive parsing used by functions/api/plays.ts.
 */
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

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const songsResult = await context.env.DB.prepare(
      `SELECT id, title, artist, lyrics_by, music_by, lyrics, sheet_music_path
       FROM songs
       ORDER BY title COLLATE NOCASE`
    ).all<SongRow>();

    const recordingsResult = await context.env.DB.prepare(
      `SELECT id, song_id, album, studio, year, engineer, notes, mp3_path, wav_path, cover_path, play_count, is_primary
       FROM recordings
       ORDER BY song_id, is_primary DESC, id`
    ).all<RecordingRow>();

    const creditsResult = await context.env.DB.prepare(
      `SELECT rc.recording_id, rc.musician_id, m.name AS musician, rc.instrument
       FROM recording_credits rc
       JOIN musicians m ON m.id = rc.musician_id
       ORDER BY m.name COLLATE NOCASE, rc.instrument`
    ).all<CreditRow>();

    const creditsByRecording = new Map<number, AdminCredit[]>();
    for (const credit of creditsResult.results) {
      const credits = creditsByRecording.get(credit.recording_id) ?? [];
      credits.push({
        musician_id: credit.musician_id,
        musician: credit.musician,
        instrument: credit.instrument,
      });
      creditsByRecording.set(credit.recording_id, credits);
    }

    const recordingsBySong = new Map<string, AdminRecording[]>();
    for (const recording of recordingsResult.results) {
      const { song_id, ...fields } = recording;
      const recordings = recordingsBySong.get(song_id) ?? [];
      recordings.push({
        ...fields,
        credits: creditsByRecording.get(recording.id) ?? [],
      });
      recordingsBySong.set(song_id, recordings);
    }

    const songs = songsResult.results.map((song) => ({
      ...song,
      recordings: recordingsBySong.get(song.id) ?? [],
    }));

    return Response.json({ songs });
  } catch (error) {
    console.error("Failed to load admin songs", error);
    return Response.json({ error: "Failed to load songs" }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const id = requiredText(body.id);
  if (!id || !SLUG_PATTERN.test(id)) {
    return badRequest("id must be a slug (lowercase a-z, 0-9 and hyphens)");
  }

  const title = requiredText(body.title);
  const artist = requiredText(body.artist);
  const lyricsBy = requiredText(body.lyrics_by);
  const musicBy = requiredText(body.music_by);
  if (!title || !artist || !lyricsBy || !musicBy) {
    return badRequest("title, artist, lyrics_by and music_by are required");
  }

  const lyrics = nullableText(body.lyrics);
  const sheetMusicPath = nullableText(body.sheet_music_path);
  if (lyrics === undefined)
    return badRequest("lyrics must be a string or null");
  if (sheetMusicPath === undefined) {
    return badRequest("sheet_music_path must be a string or null");
  }

  try {
    const existing = await context.env.DB.prepare(
      `SELECT id FROM songs WHERE id = ?`
    )
      .bind(id)
      .first<{ id: string }>();
    if (existing) {
      return Response.json(
        { error: `Song '${id}' already exists` },
        { status: 409 }
      );
    }

    await context.env.DB.prepare(
      `INSERT INTO songs (id, title, artist, lyrics_by, music_by, lyrics, sheet_music_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, title, artist, lyricsBy, musicBy, lyrics, sheetMusicPath)
      .run();

    const song = await context.env.DB.prepare(
      `SELECT id, title, artist, lyrics_by, music_by, lyrics, sheet_music_path
       FROM songs WHERE id = ?`
    )
      .bind(id)
      .first<SongRow>();

    return Response.json({ success: true, song }, { status: 201 });
  } catch (error) {
    console.error("Failed to create song", error);
    return Response.json({ error: "Failed to create song" }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await readJsonBody<Record<string, unknown>>(context.request);
  if (!body) return badRequest("Invalid JSON body");

  const id = requiredText(body.id);
  if (!id || !SLUG_PATTERN.test(id)) {
    return badRequest("id must be a slug (lowercase a-z, 0-9 and hyphens)");
  }

  const title = requiredText(body.title);
  const artist = requiredText(body.artist);
  const lyricsBy = requiredText(body.lyrics_by);
  const musicBy = requiredText(body.music_by);
  if (!title || !artist || !lyricsBy || !musicBy) {
    return badRequest("title, artist, lyrics_by and music_by are required");
  }

  const lyrics = nullableText(body.lyrics);
  const sheetMusicPath = nullableText(body.sheet_music_path);
  if (lyrics === undefined)
    return badRequest("lyrics must be a string or null");
  if (sheetMusicPath === undefined) {
    return badRequest("sheet_music_path must be a string or null");
  }

  try {
    const updateResult = await context.env.DB.prepare(
      `UPDATE songs
       SET title = ?, artist = ?, lyrics_by = ?, music_by = ?, lyrics = ?, sheet_music_path = ?
       WHERE id = ?`
    )
      .bind(title, artist, lyricsBy, musicBy, lyrics, sheetMusicPath, id)
      .run();

    if (!updateResult.meta.changes) {
      return Response.json({ error: "Song not found" }, { status: 404 });
    }

    const song = await context.env.DB.prepare(
      `SELECT id, title, artist, lyrics_by, music_by, lyrics, sheet_music_path
       FROM songs WHERE id = ?`
    )
      .bind(id)
      .first<SongRow>();

    return Response.json({ success: true, song });
  } catch (error) {
    console.error("Failed to update song", error);
    return Response.json({ error: "Failed to update song" }, { status: 500 });
  }
};
