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
  /** Opens the parent-owned "new recording" modal for this song. */
  onAddRecording: () => void;
  onChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

export default function SongSection({
  song,
  musicians,
  expanded,
  onToggle,
  onAddRecording,
  onChanged,
  notify,
}: Props) {
  // Seeded once. The parent remounts this section after every reload (the
  // version-based key in app/admin/page.tsx), so the draft picks up fresh
  // server data without a prop-to-state syncing effect.
  const [draft, setDraft] = useState<SongDraft>(() => toSongDraft(song));
  const [saving, setSaving] = useState(false);

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
    <section className="overflow-hidden rounded-lg border border-l-4 border-zinc-200 border-l-amber-500 bg-white shadow-sm dark:border-zinc-800 dark:border-l-amber-500 dark:bg-zinc-900/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
          expanded
            ? "bg-amber-50/70 dark:bg-amber-950/20"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        }`}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Låt
            </span>
            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {song.title}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {song.id} · {song.recordings.length} inspelning(ar)
            {primary?.year ? ` · ${primary.year}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-xs text-zinc-400">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <form onSubmit={handleSave}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Låtinfo
                <span className="ml-1 normal-case tracking-normal text-amber-700 dark:text-amber-400">
                  · {song.title}
                </span>
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

            <div className="lg:border-l lg:border-zinc-200 lg:pl-6 dark:lg:border-zinc-800">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Inspelningar
                </h3>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={onAddRecording}
                >
                  + Ny inspelning
                </button>
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

                {song.recordings.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Inga inspelningar ännu. Lägg till en för att låten ska synas
                    publikt.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
