"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Song } from "@/data/songs";
import { formatSongCredits } from "./songCredits";

interface Props {
  /** Track whose details are shown; always the sticky player's current song. */
  song: Song;
  /**
   * Closes the sleeve. Called by the close button, the "Visa text" button, and
   * by the player bar's background click handler that wraps this component.
   */
  onClose: () => void;
}

/** Backdrop shown when the recording has no cover image of its own. */
const FALLBACK_COVER = "/icons/icon-512x512.png";

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
 * Expandable "track sleeve" for the sticky player: a full-bleed cover backdrop
 * with the song title, credits and recording metadata, the musicians with their
 * instruments, and a way to open the song's lyrics/chords in the "Texter" view.
 *
 * Purely presentational and independent of playback: it renders above the
 * player bar and owns no audio state, so opening or closing it can never pause,
 * restart or otherwise interrupt the current track. The sleeve carries no
 * dismiss logic of its own – the player bar wraps it in a background click
 * handler, so a tap on the artwork, the text or the bar around the controls
 * folds it, and the × here is the explicit shortcut. The "Visa text" button
 * closes the sleeve as it switches view, so the reader is not left with an open
 * panel.
 */
export default function TrackSleeve({ song, onClose }: Props) {
  const router = useRouter();

  const recordingRows = [
    song.album ? { label: "Album", value: song.album } : null,
    song.year ? { label: "År", value: String(song.year) } : null,
    song.studio ? { label: "Studio", value: song.studio } : null,
    song.engineer ? { label: "Tekniker", value: song.engineer } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  /**
   * Only offered when the song actually has lyrics: the "Texter" view lists
   * nothing else, so for a song without text the button would open a view that
   * does not contain it.
   */
  const hasLyrics =
    typeof song.lyrics === "string" && song.lyrics.trim() !== "";

  /**
   * Remember a cover URL that failed to load so the backdrop can fall back to
   * the app icon (for example a cover that only exists in the local dev R2, not
   * on the deployed CDN). Keyed by URL, so a later song with a different cover
   * tries its own artwork again.
   */
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const backdropSrc =
    song.cover && song.cover !== failedCover ? song.cover : FALLBACK_COVER;

  /**
   * Group credits per musician – a player can appear on several instruments, so
   * list each name once with its instruments joined ("… – Gitarr, Kör"). Keeps
   * the order the credits arrive in.
   */
  const creditsByMusician = Array.from(
    song.credits.reduce((groups, credit) => {
      const instruments = groups.get(credit.musician) ?? [];
      instruments.push(credit.instrument);
      groups.set(credit.musician, instruments);
      return groups;
    }, new Map<string, string[]>()),
    ([musician, instruments]) => ({ musician, instruments })
  );

  return (
    <div className="relative overflow-hidden border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Full-bleed backdrop: the recording's cover, or the app icon when it has
          none. Blurred and slightly over-scaled so it reads as a backdrop (and
          the blur never leaves a hard edge at the sleeve border) rather than a
          sharp thumbnail. Decorative, hence the empty alt text. */}
      <Image
        src={backdropSrc}
        alt=""
        fill
        sizes="100vw"
        onError={() => {
          if (song.cover) setFailedCover(song.cover);
        }}
        className="pointer-events-none select-none scale-125 object-cover blur-xl"
      />
      {/* Semi-transparent scrim between the image and the text – white-based in
          light mode, black-based in dark mode – so the existing text stays
          legible whatever the cover looks like. */}
      <div className="absolute inset-0 bg-white/70 dark:bg-black/60" />

      {/* Scroll fallback for unusually long content. Capping the scroller at
          "viewport height minus the playback row" lets the sleeve use almost the
          whole screen while the controls below stay on-screen. */}
      <div className="relative z-10 mx-auto max-h-[calc(100dvh_-_8rem)] w-full max-w-2xl overflow-y-auto px-4 py-4">
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
          {/* The cover is rendered as the sleeve's full-bleed backdrop above, so
              this row now holds just the details column. */}
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
                  {creditsByMusician.map(({ musician, instruments }) => (
                    <li
                      key={musician}
                      className="text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="font-medium">{musician}</span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {" "}
                        – {instruments.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasLyrics ? (
              <button
                type="button"
                onClick={() => {
                  // Same-page view switch: `?song=<id>` makes app/page.tsx show
                  // the "Texter" view with this song, without a route change.
                  onClose();
                  router.replace(`/?song=${encodeURIComponent(song.id)}`, {
                    scroll: false,
                  });
                }}
                className="text-xs font-medium text-amber-700 underline underline-offset-4 dark:text-amber-400"
              >
                Visa text
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
