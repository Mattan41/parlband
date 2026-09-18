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
}

interface CreditRow {
  song_id: string;
  musician: string;
  instrument: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // One canonical recording per song: the most recently added one.
    const songsResult = await context.env.DB.prepare(
      `SELECT s.id, s.title, s.artist, s.lyrics_by, s.music_by, s.lyrics, s.sheet_music_path,
              r.id AS recording_id,
              r.album, r.studio, r.year, r.engineer, r.mp3_path, r.wav_path, r.cover_path, r.play_count
       FROM songs s
       LEFT JOIN recordings r ON r.id = (
         SELECT r2.id FROM recordings r2 WHERE r2.song_id = s.id ORDER BY r2.id DESC LIMIT 1
       )
       ORDER BY r.year DESC, s.title COLLATE NOCASE`
    ).all<SongRow>();

    const creditsResult = await context.env.DB.prepare(
      `SELECT r.song_id AS song_id, m.name AS musician, rc.instrument AS instrument
       FROM recording_credits rc
       JOIN recordings r ON r.id = rc.recording_id
       JOIN musicians m ON m.id = rc.musician_id
       ORDER BY r.song_id, m.name, rc.instrument`
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
