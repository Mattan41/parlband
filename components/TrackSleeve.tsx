"use client";

import Image from "next/image";
import Link from "next/link";
import type { Song } from "@/data/songs";
import { formatSongCredits } from "./songCredits";

interface Props {
  /** Track whose details are shown; always the sticky player's current song. */
  song: Song;
  /** Closes the sleeve. Called by the close button and the /texter link. */
  onClose: () => void;
}

/** One label/value line in the recording-info list. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-zinc-800 dark:text-zinc-200">
        {value}
      </dd>
    </div>
  );
}

/**
 * Expandable "track sleeve" for the sticky player: cover, song title, credits
 * and recording metadata, the musicians with their instruments, and a link to
 * the song's lyrics/chords on /texter.
 *
 * Purely presentational and independent of playback: it renders above the
 * player bar and owns no audio state, so opening or closing it can never pause,
 * restart or otherwise interrupt the current track. The /texter link closes the
 * sleeve as it navigates, so the reader is not left with an open panel.
 */
export default function TrackSleeve({ song, onClose }: Props) {
  const recordingRows = [
    song.album ? { label: "Album", value: song.album } : null,
    song.year ? { label: "År", value: String(song.year) } : null,
    song.studio ? { label: "Studio", value: song.studio } : null,
    song.engineer ? { label: "Tekniker", value: song.engineer } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  /**
   * Only offered when the song actually has lyrics: `/texter` lists nothing else,
   * so for a song without text the link would open a page that does not contain it.
   */
  const hasLyrics =
    typeof song.lyrics === "string" && song.lyrics.trim() !== "";

  return (
    <div className="max-h-72 overflow-y-auto border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Låtinfo
          </h2>
          <button
            type="button"
            onClick={onClose}
            title="Stäng låtinfo"
            aria-label="Stäng låtinfo"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-zinc-500 transition hover:scale-105 hover:bg-zinc-200 hover:text-zinc-900 active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Large cover, only when the recording actually has one. */}
          {song.cover ? (
            <Image
              src={song.cover}
              alt={song.title}
              width={160}
              height={160}
              className="h-32 w-32 shrink-0 rounded-lg object-cover shadow-md sm:h-40 sm:w-40"
            />
          ) : null}

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h3 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {song.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatSongCredits(song)}
              </p>
            </div>

            {recordingRows.length > 0 ? (
              <dl className="space-y-1 text-xs">
                {recordingRows.map((row) => (
                  <InfoRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                  />
                ))}
              </dl>
            ) : null}

            {song.credits.length > 0 ? (
              <div className="text-xs">
                <h4 className="mb-1 font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Medverkande
                </h4>
                <ul className="space-y-0.5">
                  {song.credits.map((credit) => (
                    <li
                      key={`${credit.musician}-${credit.instrument}`}
                      className="text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="font-medium">{credit.musician}</span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {" "}
                        – {credit.instrument}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasLyrics ? (
              <Link
                href={`/texter?song=${encodeURIComponent(song.id)}`}
                onClick={(event) => {
                  // Only fold the sleeve for a plain left click. With a modifier
                  // (or a middle click) the lyric page opens in a new tab, so the
                  // current tab should keep whatever it was showing.
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  ) {
                    return;
                  }
                  onClose();
                }}
                className="inline-block text-xs font-medium text-amber-700 underline underline-offset-4 dark:text-amber-400"
              >
                Visa text
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
