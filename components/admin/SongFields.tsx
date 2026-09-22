"use client";

import type { AdminSong } from "@/data/admin";
import LyricsEditor from "./LyricsEditor";
import { inputClass, labelClass } from "./adminStyles";

/** Editable song fields, shared by the "new song" form and the inline editor. */
export interface SongDraft {
  title: string;
  artist: string;
  lyrics_by: string;
  music_by: string;
  lyrics: string;
  sheet_music_path: string;
  /** False keeps the song out of the public song list and /texter. */
  is_published: boolean;
}

export const emptySongDraft: SongDraft = {
  title: "",
  artist: "Pärlband",
  lyrics_by: "",
  music_by: "",
  lyrics: "",
  sheet_music_path: "",
  is_published: true,
};

/** Convert an API song into the editable draft shape. */
export function toSongDraft(song: AdminSong): SongDraft {
  return {
    title: song.title,
    artist: song.artist,
    lyrics_by: song.lyrics_by,
    music_by: song.music_by,
    lyrics: song.lyrics ?? "",
    sheet_music_path: song.sheet_music_path ?? "",
    is_published: song.is_published === 1,
  };
}

/** The JSON body sent to POST/PUT /api/admin/songs. */
export function toSongPayload(draft: SongDraft): Record<string, unknown> {
  return {
    title: draft.title,
    artist: draft.artist,
    lyrics_by: draft.lyrics_by,
    music_by: draft.music_by,
    lyrics: draft.lyrics,
    sheet_music_path: draft.sheet_music_path,
    is_published: draft.is_published,
  };
}

interface Props {
  draft: SongDraft;
  onChange: (patch: Partial<SongDraft>) => void;
  idPrefix: string;
}

export default function SongFields({ draft, onChange, idPrefix }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={labelClass}>Titel</span>
        <input
          id={`${idPrefix}-title`}
          className={inputClass}
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>

      <label>
        <span className={labelClass}>Artist</span>
        <input
          className={inputClass}
          value={draft.artist}
          onChange={(event) => onChange({ artist: event.target.value })}
        />
      </label>

      <label>
        <span className={labelClass}>Text av</span>
        <input
          className={inputClass}
          value={draft.lyrics_by}
          onChange={(event) => onChange({ lyrics_by: event.target.value })}
        />
      </label>

      <label>
        <span className={labelClass}>Musik av</span>
        <input
          className={inputClass}
          value={draft.music_by}
          onChange={(event) => onChange({ music_by: event.target.value })}
        />
      </label>

      <label>
        <span className={labelClass}>Noter (R2-sökväg, manuell)</span>
        <input
          className={inputClass}
          value={draft.sheet_music_path}
          placeholder="t.ex. ny-lat-noter.pdf"
          onChange={(event) =>
            onChange({ sheet_music_path: event.target.value })
          }
        />
      </label>

      <div className="sm:col-span-2">
        <LyricsEditor
          value={draft.lyrics}
          onChange={(lyrics) => onChange({ lyrics })}
          idPrefix={idPrefix}
        />
      </div>

      <fieldset className="sm:col-span-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
        <legend className={labelClass}>Synlighet</legend>

        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
            checked={draft.is_published}
            onChange={(event) =>
              onChange({ is_published: event.target.checked })
            }
          />
          <span>
            Publicerad (visas på hemsidan)
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Avmarkera för att spara låten som utkast – den visas då varken i
              låtlistan eller under Texter.
            </span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
