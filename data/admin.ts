/** A single musician+instrument credit on a recording. */
export interface AdminCredit {
  musician_id: number;
  musician: string;
  instrument: string;
}

/** A recording as returned by GET /api/admin/songs (all recordings, not just the primary). */
export interface AdminRecording {
  id: number;
  album: string | null;
  studio: string | null;
  year: number | null;
  engineer: string | null;
  notes: string | null;
  mp3_path: string;
  wav_path: string | null;
  cover_path: string | null;
  play_count: number | null;
  /** 1 when this is the recording the public API serves for the song. */
  is_primary: number;
  credits: AdminCredit[];
}

/** A song with every recording and its credits. */
export interface AdminSong {
  id: string;
  title: string;
  artist: string;
  lyrics_by: string;
  music_by: string;
  lyrics: string | null;
  sheet_music_path: string | null;
  recordings: AdminRecording[];
}

export interface AdminMusician {
  id: number;
  name: string;
}

export type AdminUploadKind = "mp3" | "wav" | "cover";

/** CDN base URL, e.g. https://cdn.kruskopf.org. */
export const AUDIO_BASE_URL = process.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? "";

/** Build the public CDN URL for a stored R2 file path, or "" when absent. */
export function fileUrl(kind: AdminUploadKind, path: string | null): string {
  if (!path) return "";
  const prefix = kind === "cover" ? "images" : kind;
  return `${AUDIO_BASE_URL}/parlband/${prefix}/${path}`;
}

const TRANSLITERATION: Record<string, string> = {
  å: "a",
  ä: "a",
  ö: "o",
  æ: "ae",
  ø: "o",
  é: "e",
  è: "e",
  ê: "e",
  ü: "u",
  ç: "c",
};

/** Turn a title into a song-id slug (lowercase ASCII words, hyphen separated). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((char) => TRANSLITERATION[char] ?? char)
    .join("")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Shared response handling for the admin endpoints. */
async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Begäran misslyckades (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function adminGet<T>(url: string): Promise<T> {
  return fetch(url).then((response) => readResponse<T>(response));
}

export function adminJson<T>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: Record<string, unknown>
): Promise<T> {
  return fetch(url, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((response) => readResponse<T>(response));
}

export interface UploadResult {
  success: true;
  path: string;
  key: string;
  size: number | null;
  url: string;
}

export interface AdminData {
  songs: AdminSong[];
  musicians: AdminMusician[];
}

/**
 * Load everything the admin page needs in one go.
 *
 * Kept as a module-level function so the page can call it both from an effect
 * (initial load) and from mutation handlers (reload).
 */
export async function fetchAdminData(): Promise<AdminData> {
  const [songsData, musiciansData] = await Promise.all([
    adminGet<{ songs: AdminSong[] }>("/api/admin/songs"),
    adminGet<{ musicians: AdminMusician[] }>("/api/admin/musicians"),
  ]);

  return { songs: songsData.songs, musicians: musiciansData.musicians };
}

/**
 * Upload a file as the raw request body (streamed straight into R2 by the
 * Worker). When `recordingId` is given the endpoint also points the matching
 * recording column at the stored file.
 */
export function uploadAdminFile(
  kind: AdminUploadKind,
  songId: string,
  recordingId: number | null,
  file: File
): Promise<UploadResult> {
  const params = new URLSearchParams({ kind, song_id: songId });
  if (recordingId !== null) params.set("recording_id", String(recordingId));

  return fetch(`/api/admin/upload?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  }).then((response) => readResponse<UploadResult>(response));
}
