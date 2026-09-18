export interface SongCredit {
  musician: string;
  instrument: string;
}

/**
 * Raw song shape returned by GET /api/songs.
 * Mirrors the D1 schema (songs + recordings) with nested recording credits.
 */
export interface SongRow {
  id: string;
  /**
   * Id of the specific recording the `src`/`downloadSrc` URLs were built from.
   * Sent to POST /api/plays so the counter lands on the recording that is
   * actually played. Note: if a Song ever exposes multiple recordings (e.g.
   * studio + live at the same time), a single `recording_id` per Song is no
   * longer sufficient.
   */
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
  credits: SongCredit[];
}

/**
 * UI-facing song model consumed by the song list (components/SongRow.tsx) and
 * the sticky player (components/StickyPlayer.tsx).
 * Adds helper URLs derived from the stored R2 paths.
 */
export interface Song extends SongRow {
  /** Songwriter, mapped from `lyrics_by` for the player UI. */
  text: string;
  /** Composer, mapped from `music_by` for the player UI. */
  music: string;
  /** Streaming MP3 URL. */
  src: string;
  /** High-quality WAV download URL, only present when `wav_path` exists. */
  downloadSrc?: string;
  /** Cover image URL, or "" when `cover_path` is missing. */
  cover: string;
}

const AUDIO_BASE_URL = process.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? "";

/** Build the streaming/download/cover URLs and UI aliases from an API row. */
export function toSong(row: SongRow): Song {
  return {
    ...row,
    text: row.lyrics_by,
    music: row.music_by,
    src: row.mp3_path ? `${AUDIO_BASE_URL}/parlband/mp3/${row.mp3_path}` : "",
    downloadSrc: row.wav_path
      ? `${AUDIO_BASE_URL}/parlband/wav/${row.wav_path}`
      : undefined,
    cover: row.cover_path
      ? `${AUDIO_BASE_URL}/parlband/images/${row.cover_path}`
      : "",
  };
}
