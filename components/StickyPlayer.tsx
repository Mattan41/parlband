"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePlayerStore } from "@/store/playerStore";
import { formatSongCredits } from "./songCredits";

/**
 * Playback time (ms) that must elapse continuously before a play is counted.
 * Pausing resets the timer; switching tracks cancels it.
 */
const PLAY_THRESHOLD_MS = 5000;

/**
 * Fixed bottom player that owns the single <audio> element for the whole app.
 * It is always mounted (so the media element and its listeners stay stable for
 * the session) and hidden with `display: none` until a song has been played.
 */
export default function StickyPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);
  // Guards against counting the same listening more than once.
  const hasCountedRef = useRef(false);

  const currentSong = usePlayerStore((state) => state.currentSong);
  const queue = usePlayerStore((state) => state.queue);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playbackId = usePlayerStore((state) => state.playbackId);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const playNext = usePlayerStore((state) => state.playNext);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);

  const recordingId = currentSong?.recording_id;
  const src = currentSong?.src;

  // -------- (re)start playback whenever a track is requested ----------
  // Keyed on `playbackId` rather than the song object: a queue may contain the
  // same song twice, so the newly current entry can be reference-equal to the
  // previous one. The counter guarantees a restart in that case too, and resets
  // the play-count guard so a replay counts as a new listening.
  useEffect(() => {
    const audio = audioRef.current;
    const song = usePlayerStore.getState().currentSong;
    if (!audio || !song) return;

    hasCountedRef.current = false;
    audio.currentTime = 0;
    setCurrentTime(0);

    if (usePlayerStore.getState().isPlaying) {
      void audio.play().catch(() => {});
    }
  }, [playbackId]);

  // -------- keep the media element in sync with the intended play state ----------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // -------- event listeners ----------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => {
      if (!usePlayerStore.getState().isPlaying) {
        usePlayerStore.getState().setIsPlaying(true);
      }
    };
    const handlePause = () => {
      if (usePlayerStore.getState().isPlaying) {
        usePlayerStore.getState().setIsPlaying(false);
      }
    };
    const handleEnded = () => {
      // Replaying a finished track is a new listening.
      hasCountedRef.current = false;
      const state = usePlayerStore.getState();
      if (state.queue.length > 0) {
        state.playNext();
      } else {
        state.setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // -------- count a play after PLAY_THRESHOLD_MS of continuous playback ----------
  useEffect(() => {
    if (!isPlaying || hasCountedRef.current) return;
    if (!src || recordingId == null) return;

    const timer = setTimeout(() => {
      hasCountedRef.current = true;
      void fetch("/api/plays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: recordingId }),
      }).catch((error) => {
        console.error("Failed to register play", error);
      });
    }, PLAY_THRESHOLD_MS);

    // Pausing, switching tracks or unmounting cancels the pending count.
    return () => clearTimeout(timer);
  }, [isPlaying, playbackId, recordingId, src]);

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(event.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 ${
        currentSong ? "" : "hidden"
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* expandable queue */}
      {queueOpen && queue.length > 0 ? (
        <ul className="max-h-56 overflow-y-auto border-b border-zinc-200 dark:border-zinc-800">
          {queue.map((queued, index) => (
            <li
              key={`${queued.recording_id ?? queued.id}-${index}`}
              className="flex items-center gap-3 px-4 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-200">
                {queued.title}
              </span>
              <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
                {queued.artist}
              </span>
              <button
                onClick={() => removeFromQueue(index)}
                aria-label={`Remove ${queued.title} from queue`}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 16 16"
                >
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
        {/* cover image (only if a cover URL is provided) */}
        {currentSong?.cover ? (
          <Image
            src={currentSong.cover}
            alt={currentSong.title}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : null}

        {/* track info + controls */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-black dark:text-zinc-50">
            {currentSong?.title}
          </p>
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            {currentSong ? formatSongCredits(currentSong) : ""}
          </p>

          <div className="mt-1 flex items-center gap-2">
            {/* play/pause button */}
            <button
              onClick={togglePlay}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                // pause icon
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <rect x="2" y="2" width="4" height="12" rx="1" />
                  <rect x="10" y="2" width="4" height="12" rx="1" />
                </svg>
              ) : (
                // play icon
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <polygon points="4,2 14,8 4,14" />
                </svg>
              )}
            </button>

            {/* seek bar */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={seek}
              aria-label="Seek"
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-300 dark:bg-zinc-600"
            />

            {/* time display */}
            <span className="w-16 shrink-0 text-right text-xs text-zinc-500 dark:text-zinc-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* skip to next queued track */}
        <button
          onClick={playNext}
          disabled={queue.length === 0}
          aria-label="Next"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
            <polygon points="3,2 11,8 3,14" />
            <rect x="12" y="2" width="2" height="12" rx="1" />
          </svg>
        </button>

        {/* queue toggle */}
        <button
          onClick={() => setQueueOpen((open) => !open)}
          aria-label="Queue"
          aria-expanded={queueOpen}
          className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            viewBox="0 0 16 16"
          >
            <path d="M2 4h12M2 8h12M2 12h8" strokeLinecap="round" />
          </svg>
          {queue.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
              {queue.length}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
