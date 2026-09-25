"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import PlayingIndicator from "./PlayingIndicator";
import { iconButtonActiveClass, iconButtonClass } from "./iconButton";
import type { Song } from "@/data/songs";
import { usePlayerStore } from "@/store/playerStore";

/**
 * How long the "added to queue" confirmation stays on the button before it
 * morphs back to the queue icon.
 */
const ADDED_FEEDBACK_MS = 1200;

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
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  /**
   * The row shows the recording's own cover only. A URL that fails to load
   * (for example a cover that exists in the local dev R2 but not on the
   * deployed CDN) simply drops the thumbnail instead of showing a broken image.
   */
  const [coverFailed, setCoverFailed] = useState(false);
  /**
   * Momentary confirmation after tapping "Lägg till i spellista": the button
   * morphs into an amber check mark for a moment so the tap is unmistakable,
   * which helps on touch devices where there is no hover cue.
   */
  const [addedToQueue, setAddedToQueue] = useState(false);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending confirmation timer if the row unmounts mid-animation.
  useEffect(
    () => () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    },
    []
  );

  const handleAddToQueue = () => {
    addToQueue(song);
    setAddedToQueue(true);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(
      () => setAddedToQueue(false),
      ADDED_FEEDBACK_MS
    );
  };

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
          {isActive && isPlaying ? <PlayingIndicator className="mr-2" /> : null}
          {song.title}
        </h3>
        {/* Credits are intentionally left out of the row – they are a tap away
            in the player's "Låtinfo" (components/TrackSleeve.tsx), and dropping
            the line keeps the card readable on a phone. The year stays as the
            one compact bit of recording context. */}
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

        {/* add to queue button – a distinct note-with-plus icon (rather than
            the menu-like list icon) plus a momentary amber check mark so the
            action and its result are both obvious on touch devices. */}
        <button
          onClick={handleAddToQueue}
          title={
            addedToQueue ? "Tillagd i spellistan" : "Lägg till i spellista"
          }
          aria-label={
            addedToQueue ? "Tillagd i spellistan" : "Lägg till i spellista"
          }
          className={addedToQueue ? iconButtonActiveClass : iconButtonClass}
        >
          {addedToQueue ? (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              viewBox="0 0 16 16"
            >
              <path
                d="M3 8.5l3.2 3.2L13 4.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              viewBox="0 0 16 16"
            >
              <circle cx="4" cy="11.5" r="2" />
              <path
                d="M6 11.5V3l3.2.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M12.5 9.5v5" strokeLinecap="round" />
              <path d="M10 12h5" strokeLinecap="round" />
            </svg>
          )}
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
