"use client";

import { useState } from "react";
import Image from "next/image";
import type { Song } from "@/data/songs";
import { usePlayerStore } from "@/store/playerStore";
import { formatSongCredits } from "./songCredits";
import { iconButtonClass } from "./iconButton";

/**
 * A single song in the landing-page list. It does not play audio itself: the
 * actions hand the song to the global store and components/StickyPlayer.tsx
 * does the actual playback.
 */
export default function SongRow({ song }: { song: Song }) {
  const playSong = usePlayerStore((state) => state.playSong);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const isActive = usePlayerStore(
    (state) => state.currentSong?.recording_id === song.recording_id
  );
  /**
   * The row shows the recording's own cover only. A URL that fails to load
   * (for example a cover that exists in the local dev R2 but not on the
   * deployed CDN) simply drops the thumbnail instead of showing a broken image.
   */
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-4 shadow-md transition ${
        isActive
          ? "border-amber-400 bg-amber-50 dark:border-amber-500/70 dark:bg-amber-500/10"
          : "border-transparent bg-white dark:bg-zinc-900"
      }`}
    >
      {/* cover image (only if a cover URL is provided and it loads) */}
      {song.cover && !coverFailed ? (
        <Image
          src={song.cover}
          alt={song.title}
          onError={() => setCoverFailed(true)}
          className="h-16 w-16 rounded-lg object-cover"
        />
      ) : null}

      {/* track info */}
      <div className="min-w-0 flex-1">
        <h3
          className={`truncate text-lg font-semibold ${
            isActive
              ? "text-amber-900 dark:text-amber-200"
              : "text-black dark:text-zinc-50"
          }`}
        >
          {song.title}
        </h3>
        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
          {formatSongCredits(song)}
        </p>
        {/* Play/download counts are admin-only now, so the public row shows just
            the year. The download button below still routes through
            GET /api/downloads, so downloads keep being counted server-side. */}
        {song.year ? (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {song.year}
          </p>
        ) : null}
      </div>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* play button */}
        <button
          onClick={() => playSong(song)}
          title="Spela upp"
          aria-label="Spela upp"
          className={iconButtonClass}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
            <polygon points="4,2 14,8 4,14" />
          </svg>
        </button>

        {/* add to queue button */}
        <button
          onClick={() => addToQueue(song)}
          title="Lägg till i spellista"
          aria-label="Lägg till i spellista"
          className={iconButtonClass}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            viewBox="0 0 16 16"
          >
            <path d="M2 4h12M2 8h12M2 12h8" strokeLinecap="round" />
            <path d="M13 10v4M11 12h4" strokeLinecap="round" />
          </svg>
        </button>

        {/* download button – deliberately no `download` attribute:
            GET /api/downloads redirects to R2, whose
            `content-disposition: attachment` triggers the download */}
        {song.downloadSrc && (
          <a
            href={song.downloadSrc}
            title="Ladda ned"
            aria-label="Ladda ned"
            className={iconButtonClass}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M7.293 11.293a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L9 8.086V2.005a1 1 0 00-2 0v6.08L5.707 6.88a1 1 0 10-1.414 1.414l3 3z" />
              <path d="M2 14a1 1 0 100 2h12a1 1 0 100-2H2z" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
