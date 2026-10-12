"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  fileUrl,
  filterRecordings,
  flattenRecordings,
  type AdminMusician,
  type AdminSong,
  type AdminRecording,
  type RecordingVisibility,
} from "@/data/admin";
import RecordingCard from "./RecordingCard";
import { inputClass, labelClass } from "./adminStyles";

interface Props {
  /** Every song with its recordings (GET /api/admin/songs). */
  songs: AdminSong[];
  musicians: AdminMusician[];
  onChanged: () => Promise<void>;
  onMusiciansChanged: () => Promise<void>;
  notify: (text: string, tone: "success" | "error") => void;
}

const VISIBILITY_OPTIONS: { value: RecordingVisibility; label: string }[] = [
  { value: "all", label: "Alla" },
  { value: "public", label: "Publika" },
  { value: "hidden", label: "Dolda" },
];

/**
 * Cover thumbnail for one recording. Mirrors components/SongRow.tsx: a URL that
 * fails to load drops the image instead of showing a broken one.
 */
function RecordingCover({
  recording,
}: Readonly<{ recording: AdminRecording }>) {
  const [failed, setFailed] = useState(false);
  const src = fileUrl("cover", recording.cover_path);
  if (!src || failed) return null;

  return (
    <Image
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 rounded object-cover"
    />
  );
}

/**
 * Flat, mobile-friendly list of every recording, grouped under its song.
 *
 * Song-level fields (lyrics, sheet music, publish) stay in the Katalog view;
 * each row links there. The recording itself is edited with the shared
 * components/admin/RecordingCard.tsx, so there is a single editor.
 */
export default function RecordingList({
  songs,
  musicians,
  onChanged,
  onMusiciansChanged,
  notify,
}: Readonly<Props>) {
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<RecordingVisibility>("all");
  /** The single expanded recording card, or null when all are collapsed. */
  const [openRecordingId, setOpenRecordingId] = useState<number | null>(null);

  const entries = useMemo(() => flattenRecordings(songs), [songs]);
  const visible = useMemo(
    () => filterRecordings(entries, { query, visibility }),
    [entries, query, visibility]
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Inga inspelningar ännu. Skapa dem under Katalog.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className={labelClass}>Sök</span>
          <input
            className={inputClass}
            value={query}
            placeholder="Låt, album, studio eller musiker"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <fieldset className="flex items-center gap-1">
          <legend className="sr-only">Filter</legend>
          {VISIBILITY_OPTIONS.map((option) => {
            const active = visibility === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setVisibility(option.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-sky-400 bg-sky-50 text-sky-900 dark:border-sky-500/70 dark:bg-sky-500/10 dark:text-sky-200"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </fieldset>

        <span className="pb-1 text-xs text-zinc-500 dark:text-zinc-400">
          {visible.length} av {entries.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Inga inspelningar matchar filtret.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map(({ song, recording }) => (
            <div key={recording.id} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <RecordingCover recording={recording} />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {song.title}
                </span>
                {song.is_published === 0 ? (
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                    Utkast
                  </span>
                ) : null}
                <Link
                  href={`/admin#song-${song.id}`}
                  className="text-xs text-amber-700 underline underline-offset-4 dark:text-amber-400"
                >
                  Redigera låten i Katalog ↗
                </Link>
              </div>

              <RecordingCard
                song={song}
                recording={recording}
                musicians={musicians}
                expanded={openRecordingId === recording.id}
                onToggle={() =>
                  setOpenRecordingId((current) =>
                    current === recording.id ? null : recording.id
                  )
                }
                onMusiciansChanged={onMusiciansChanged}
                onChanged={onChanged}
                notify={notify}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
