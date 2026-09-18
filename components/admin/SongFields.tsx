"use client";

import type { AdminSong } from "@/data/admin";
import { inputClass, labelClass } from "./adminStyles";

/** Editable song fields, shared by the "new song" form and the inline editor. */
export interface SongDraft {
  title: string;
  artist: string;
  lyrics_by: string;
  music_by: string;
  lyrics: string;
  sheet_music_path: string;
}

export const emptySongDraft: SongDraft = {
  title: "",
  artist: "Pärlband",
  lyrics_by: "",
  music_by: "",
  lyrics: "",
  sheet_music_path: "",
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
  };
}

interface Props {
  draft: SongDraft;
  onChange: (patch: Partial<SongDraft>) => void;
  idPrefix: string;
}

export default function SongFields({ draft, onChange, idPrefix }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
        <span className={labelClass}>Noter (R2-sökväg)</span>
        <input
          className={inputClass}
          value={draft.sheet_music_path}
          placeholder="t.ex. fri-noter.pdf"
          onChange={(event) =>
            onChange({ sheet_music_path: event.target.value })
          }
        />
      </label>

      <label className="sm:col-span-2">
        <span className={labelClass}>Text</span>
        <textarea
          className={`${inputClass} min-h-32 font-mono`}
          value={draft.lyrics}
          onChange={(event) => onChange({ lyrics: event.target.value })}
        />
      </label>
    </div>
  );
}
