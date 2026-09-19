"use client";

import { useState } from "react";
import { adminJson, type AdminMusician, type AdminSong } from "@/data/admin";
import RecordingCard from "./RecordingCard";
import SheetMusicUpload from "./SheetMusicUpload";
import SongFields, {
  toSongDraft,
  toSongPayload,
  type SongDraft,
} from "./SongFields";
import { primaryButtonClass, secondaryButtonClass } from "./adminStyles";

interface Props {
  song: AdminSong;
  musicians: AdminMusician[];
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

export default function SongSection({
  song,
  musicians,
  expanded,
  onToggle,
  onChanged,
  notify,
}: Props) {
  // Seeded once. The parent remounts this section after every reload (the
  // version-based key in app/admin/page.tsx), so the draft picks up fresh
  // server data without a prop-to-state syncing effect.
  const [draft, setDraft] = useState<SongDraft>(() => toSongDraft(song));
  const [saving, setSaving] = useState(false);
  const [addingRecording, setAddingRecording] = useState(false);

  function updateDraft(patch: Partial<SongDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminJson("/api/admin/songs", "PUT", {
        id: song.id,
        ...toSongPayload(draft),
      });
      notify(`"${draft.title}" sparades.`, "success");
      await onChanged();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Kunde inte spara låten",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  // Summary recording: a public primary when one exists, otherwise any public
  // recording, so a hidden take never represents the song in the header.
  const primary =
    song.recordings.find(
      (recording) => recording.is_public === 1 && recording.is_primary === 1
    ) ??
    song.recordings.find((recording) => recording.is_public === 1) ??
    song.recordings[0];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {song.title}
          </span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {song.id} · {song.recordings.length} inspelning(ar)
            {primary?.year ? ` · ${primary.year}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-xs text-zinc-400">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <form onSubmit={handleSave}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Låtinfo
            </h3>
            <SongFields
              draft={draft}
              onChange={updateDraft}
              idPrefix={`song-${song.id}`}
            />

            <SheetMusicUpload
              songId={song.id}
              path={draft.sheet_music_path}
              onChange={(path) => updateDraft({ sheet_music_path: path })}
              onChanged={onChanged}
              notify={notify}
            />

            <div className="mt-3">
              <button
                type="submit"
                className={primaryButtonClass}
                disabled={saving}
              >
                {saving ? "Sparar…" : "Spara låt"}
              </button>
            </div>
          </form>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Inspelningar
              </h3>
              {!addingRecording ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setAddingRecording(true)}
                >
                  + Ny inspelning
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              {song.recordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  song={song}
                  recording={recording}
                  musicians={musicians}
                  onChanged={onChanged}
                  notify={notify}
                />
              ))}

              {addingRecording ? (
                <RecordingCard
                  song={song}
                  recording={null}
                  musicians={musicians}
                  onChanged={onChanged}
                  notify={notify}
                  onCancel={() => setAddingRecording(false)}
                />
              ) : null}

              {song.recordings.length === 0 && !addingRecording ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Inga inspelningar ännu. Lägg till en för att låten ska synas
                  publikt.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
