"use client";

import { useRef, useState, useEffect } from "react";
import type { Song } from "@/data/songs";
import Image from "next/image";

let currentlyPlayingAudio: HTMLAudioElement | null = null;

/**
 * Playback time (ms) that must elapse continuously before a play is counted.
 * Pausing resets the timer; switching tracks cancels it.
 */
const PLAY_THRESHOLD_MS = 5000;

export default function AudioPlayer({ song }: { song: Song }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [prevSrc, setPrevSrc] = useState(song.src);
  // Guards against counting the same listening more than once.
  const hasCountedRef = useRef(false);

  // Reset the playback UI when the track changes. Adjusting state during
  // render (instead of in an effect) is the pattern recommended by the React
  // docs: React discards the current output and re-renders immediately, so no
  // extra commit or cascading render is triggered.
  if (prevSrc !== song.src) {
    setPrevSrc(song.src);
    setIsPlaying(false);
    setCurrentTime(0);
  }

  // -------- play / pause ----------
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      // Pause any other currently playing audio
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audioRef.current) {
        currentlyPlayingAudio.pause();
      }
      void audioRef.current.play();
      currentlyPlayingAudio = audioRef.current;
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // -------- time update ----------
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    // Replaying a finished track is a new listening.
    hasCountedRef.current = false;
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // -------- event listeners ----------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
    };
  }, [song.src]);

  // -------- keep the media element in sync with the current track ----------
  useEffect(() => {
    audioRef.current?.load();
  }, [song.src]);

  // -------- reset the play counter guard when the track changes ----------
  useEffect(() => {
    hasCountedRef.current = false;
  }, [song.src]);

  // -------- count a play after PLAY_THRESHOLD_MS of continuous playback ----------
  useEffect(() => {
    if (!isPlaying || hasCountedRef.current) return;
    if (!song.src || song.recording_id == null) return;

    const recordingId = song.recording_id;
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
  }, [isPlaying, song.src, song.recording_id]);

  // -------- formatting ----------
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-md dark:bg-zinc-900">
      {/* hidden audio element */}
      <audio ref={audioRef} src={song.src} preload="metadata" />

      {/* cover image (only if a cover URL is provided) */}
      {song.cover ? (
        <Image
          src={song.cover}
          alt={song.title}
          className="h-16 w-16 rounded-lg object-cover"
        />
      ) : null}

      {/* track info + controls */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-lg font-semibold text-black dark:text-zinc-50">
          {song.title}
        </h3>
        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
          {[
            song.text === song.music
              ? song.text && `Text & musik: ${song.text}`
              : [
                  song.text && `Text: ${song.text}`,
                  song.music && `Musik: ${song.music}`,
                ]
                  .filter(Boolean)
                  .join(" · "),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="mt-2 flex items-center gap-2">
          {/* play/pause button */}
          <button
            onClick={togglePlay}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              // pause icon
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                <rect x="2" y="2" width="4" height="12" rx="1" />
                <rect x="10" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              // play icon
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
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
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-300 dark:bg-zinc-600"
          />

          {/* time display */}
          <span className="w-16 text-right text-xs text-zinc-500 dark:text-zinc-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* download button */}
      {song.downloadSrc && (
        <a
          href={song.downloadSrc}
          download
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          aria-label="Download"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M7.293 11.293a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L9 8.086V2.005a1 1 0 00-2 0v6.08L5.707 6.88a1 1 0 10-1.414 1.414l3 3z" />
            <path d="M2 14a1 1 0 100 2h12a1 1 0 100-2H2z" />
          </svg>
        </a>
      )}
    </div>
  );
}
