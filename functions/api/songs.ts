interface Env {
  DB: D1Database;
}

/** Raw song row joined with its recording details. */
interface SongRow {
  id: string;
  recording_id: number | null;
  title: string;
  artist: string;
  lyrics_by: string;
  music_by: string;
  lyrics: string | null;
  sheet_music_path: string | null;
  album: string | null;
  studio: string | null;
  year: number | null;
  engineer: string | null;
  mp3_path: string | null;
  wav_path: string | null;
  cover_path: string | null;
  play_count: number | null;
  download_count: number | null;
}

interface CreditRow {
  song_id: string;
  musician: string;
  instrument: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // One canonical recording per song: the explicit primary recording when one
    // is flagged, otherwise the most recently added one. Hidden recordings
    // (`is_public = 0`) are excluded first, so a song whose only recording is
    // hidden simply joins to nothing and gets no playable src.
    const songsResult = await context.env.DB.prepare(
      `SELECT s.id, s.title, s.artist, s.lyrics_by, s.music_by, s.lyrics, s.sheet_music_path,
              r.id AS recording_id,
              r.album, r.studio, r.year, r.engineer, r.mp3_path, r.wav_path, r.cover_path,
              r.play_count, r.download_count
       FROM songs s
       LEFT JOIN recordings r ON r.id = (
         SELECT r2.id FROM recordings r2 WHERE r2.song_id = s.id AND r2.is_public = 1
         ORDER BY r2.is_primary DESC, r2.id DESC LIMIT 1
       )
       WHERE s.is_published = 1
       ORDER BY r.year DESC, s.title COLLATE NOCASE`
    ).all<SongRow>();

    // Credits are scoped to the same canonical public recording as the file
    // paths, so the list always describes the recording that is actually
    // played. The canonical-recording rule must stay identical to the one in
    // the song query above.
    const creditsResult = await context.env.DB.prepare(
      `SELECT r.song_id AS song_id, m.name AS musician, rc.instrument AS instrument
       FROM recording_credits rc
       JOIN recordings r ON r.id = rc.recording_id
       JOIN musicians m ON m.id = rc.musician_id
       WHERE r.is_public = 1
         AND r.song_id IN (SELECT id FROM songs WHERE is_published = 1)
         AND r.id = (
         SELECT r2.id FROM recordings r2 WHERE r2.song_id = r.song_id AND r2.is_public = 1
         ORDER BY r2.is_primary DESC, r2.id DESC LIMIT 1
       )
       ORDER BY r.song_id, m.name COLLATE NOCASE, rc.instrument`
    ).all<CreditRow>();

    const creditsBySong = new Map<
      string,
      { musician: string; instrument: string }[]
    >();
    for (const credit of creditsResult.results) {
      const credits = creditsBySong.get(credit.song_id) ?? [];
      credits.push({
        musician: credit.musician,
        instrument: credit.instrument,
      });
      creditsBySong.set(credit.song_id, credits);
    }

    const songs = songsResult.results.map((song) => ({
      ...song,
      credits: creditsBySong.get(song.id) ?? [],
    }));

    return Response.json(songs);
  } catch (error) {
    console.error("Failed to load songs", error);
    return Response.json({ error: "Failed to load songs" }, { status: 500 });
  }
};
