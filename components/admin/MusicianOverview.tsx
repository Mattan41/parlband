"use client";

import { useMemo, useState } from "react";
import type { AdminMusician, AdminSong } from "@/data/admin";
import { buildMusicianOverview } from "./musicianOverview";

interface Props {
  songs: AdminSong[];
  musicians: AdminMusician[];
}

function recordingLabel(year: number | null, album: string | null): string {
  const parts = [year, album].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "utan år/album";
}

/**
 * Read-only overview of every registered musician and where they appear.
 * Derived entirely from the songs/musicians already loaded by the page – no
 * extra API call.
 */
export default function MusicianOverview({ songs, musicians }: Props) {
  const [open, setOpen] = useState(false);
  const overview = useMemo(
    () => buildMusicianOverview(songs, musicians),
    [songs, musicians]
  );

  const withoutCredits = overview.recordingsWithoutCredits.length;

  return (
    <section className="mt-8 overflow-hidden rounded-lg border border-l-4 border-zinc-200 border-l-sky-500 bg-white shadow-sm dark:border-zinc-800 dark:border-l-sky-500 dark:bg-zinc-900/60">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
          open
            ? "bg-sky-50/60 dark:bg-sky-950/20"
            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        }`}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
              Musiker
            </span>
            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Översikt
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {overview.entries.length} registrerade · {withoutCredits}{" "}
            inspelning(ar) utan medverkande
          </span>
        </span>
        <span className="shrink-0 text-xs text-zinc-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            Läsvy – uppgifterna kommer från inspelningarnas medverkande och
            ändras på inspelningskorten.
          </p>

          <div className="space-y-4">
            {overview.entries.map((entry) => (
              <div key={entry.id}>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {entry.name}
                </h3>
                {entry.credits.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Inga medverkande registrerade ännu.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {entry.credits.map((credit) => (
                      <li
                        key={`${credit.recordingId}-${credit.instruments.join(",")}`}
                        className="text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="font-medium">{credit.songTitle}</span>{" "}
                        <span className="text-zinc-500 dark:text-zinc-400">
                          ({recordingLabel(credit.year, credit.album)})
                        </span>{" "}
                        – {credit.instruments.join(", ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Inspelningar utan medverkande
            </h3>
            {withoutCredits === 0 ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Alla inspelningar har medverkande.
              </p>
            ) : (
              <ul className="mt-1 space-y-1">
                {overview.recordingsWithoutCredits.map((recording) => (
                  <li
                    key={recording.recordingId}
                    className="text-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <span className="font-medium">{recording.songTitle}</span>{" "}
                    <span className="text-zinc-500 dark:text-zinc-400">
                      ({recordingLabel(recording.year, recording.album)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
