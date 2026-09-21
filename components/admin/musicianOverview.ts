/**
 * Pure, import-free shaping of the admin data into a read-only musician
 * overview. Keeping it free of aliases/imports makes it directly unit-testable
 * in the plain Node Vitest environment.
 */

/** The minimal song shape the overview needs (structurally matches AdminSong). */
export interface OverviewSong {
  id: string;
  title: string;
  recordings: OverviewRecording[];
}

export interface OverviewRecording {
  id: number;
  year: number | null;
  album: string | null;
  credits: OverviewCredit[];
}

export interface OverviewCredit {
  musician_id: number;
  musician: string;
  instrument: string;
}

export interface OverviewMusician {
  id: number;
  name: string;
}

/** One musician's credits on one recording, with instruments grouped. */
export interface MusicianCreditLine {
  songId: string;
  songTitle: string;
  recordingId: number;
  year: number | null;
  album: string | null;
  instruments: string[];
}

export interface MusicianOverviewEntry {
  id: number;
  name: string;
  credits: MusicianCreditLine[];
}

export interface RecordingWithoutCredits {
  recordingId: number;
  songId: string;
  songTitle: string;
  year: number | null;
  album: string | null;
}

export interface MusicianOverviewData {
  entries: MusicianOverviewEntry[];
  recordingsWithoutCredits: RecordingWithoutCredits[];
}

/** Build the overview from the songs/musicians already loaded by the admin page. */
export function buildMusicianOverview(
  songs: OverviewSong[],
  musicians: OverviewMusician[]
): MusicianOverviewData {
  const creditsByMusician = new Map<number, MusicianCreditLine[]>();
  for (const musician of musicians) creditsByMusician.set(musician.id, []);

  const recordingsWithoutCredits: RecordingWithoutCredits[] = [];

  for (const song of songs) {
    for (const recording of song.recordings) {
      if (recording.credits.length === 0) {
        recordingsWithoutCredits.push({
          recordingId: recording.id,
          songId: song.id,
          songTitle: song.title,
          year: recording.year,
          album: recording.album,
        });
      }

      // One line per musician per recording, with all their instruments.
      const instrumentsByMusician = new Map<number, string[]>();
      for (const credit of recording.credits) {
        const instruments = instrumentsByMusician.get(credit.musician_id) ?? [];
        instruments.push(credit.instrument);
        instrumentsByMusician.set(credit.musician_id, instruments);
      }

      for (const [musicianId, instruments] of instrumentsByMusician) {
        const lines = creditsByMusician.get(musicianId);
        if (!lines) continue; // credit for a musician that is no longer registered
        lines.push({
          songId: song.id,
          songTitle: song.title,
          recordingId: recording.id,
          year: recording.year,
          album: recording.album,
          instruments,
        });
      }
    }
  }

  const entries = musicians.map((musician) => ({
    id: musician.id,
    name: musician.name,
    credits: creditsByMusician.get(musician.id) ?? [],
  }));

  return { entries, recordingsWithoutCredits };
}
