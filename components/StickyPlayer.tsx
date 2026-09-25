"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { iconButtonClass, iconButtonDisabledClass } from "./iconButton";
import TrackSleeve from "./TrackSleeve";

/**
 * Playback time (ms) that must elapse continuously before a play is counted.
 * Pausing resets the timer; switching tracks cancels it.
 */
const PLAY_THRESHOLD_MS = 5000;

/**
 * Parts of the player bar that own their click behaviour. A press inside one of
 * these – the transport buttons, the /texter link and the time block (the two
 * labels and the seek slider) – must never fold the sleeve; every other spot in
 * the bar or on the sleeve itself does.
 */
const PLAYER_CONTROL_SELECTOR = "button, input, a, [data-player-time]";

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
  /**
   * Whether the expandable track sleeve is showing. Pure UI state: it never
   * touches the media element or any of the effects below, so opening and
   * closing the sleeve cannot pause or restart playback.
   */
  const [sleeveOpen, setSleeveOpen] = useState(false);
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

  /**
   * The queue and the track sleeve both expand out of the same bar, so opening
   * one folds the other instead of stacking two panels. Reading the current
   * value here (rather than mutating other state inside a state updater) keeps
   * the updates plain and StrictMode-safe.
   */
  const toggleQueue = () => {
    const next = !queueOpen;
    setQueueOpen(next);
    if (next) setSleeveOpen(false);
  };

  const toggleSleeve = () => {
    const next = !sleeveOpen;
    setSleeveOpen(next);
    if (next) setQueueOpen(false);
  };

  /**
   * Folds the sleeve when a tap lands anywhere in the player bar or on the
   * sleeve itself – its backdrop, its text, the padding around the transport
   * strip – but leaves the controls alone. `closest` walks up from the event
   * target, so a press on an icon inside a button still counts as that button.
   * A modifier-click is left to the /texter link, which decides for itself
   * whether to fold the sleeve when it opens a new tab. Only UI state is
   * touched, so dismissing the sleeve can never interrupt playback.
   */
  const dismissSleeveOnBackgroundClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!sleeveOpen || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest(PLAYER_CONTROL_SELECTOR)) return;
    // A drag that selected text is a read, not a tap.
    if (!window.getSelection()?.isCollapsed) return;
    setSleeveOpen(false);
  };

  // One transport strip is shared by both states, so play/pause and skip keep
  // the same size and order whether or not the sleeve is open.
  const playButton = (
    <button
      onClick={togglePlay}
      title={isPlaying ? "Pausa" : "Spela upp"}
      aria-label={isPlaying ? "Pausa" : "Spela upp"}
      className={`${iconButtonClass} sm:order-2 h-12! w-12! shrink-0`}
    >
      {isPlaying ? (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 16 16">
          <rect x="2" y="2" width="4" height="12" rx="1" />
          <rect x="10" y="2" width="4" height="12" rx="1" />
        </svg>
      ) : (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 16 16">
          <polygon points="4,2 14,8 4,14" />
        </svg>
      )}
    </button>
  );

  const seekBar = (
    <input
      type="range"
      min={0}
      max={duration || 0}
      value={currentTime}
      onChange={seek}
      title="Position"
      aria-label="Position"
      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-300 sm:order-5 dark:bg-zinc-600"
    />
  );

  const skipButton = (
    <button
      onClick={playNext}
      disabled={queue.length === 0}
      title="Spela nästa"
      aria-label="Spela nästa"
      className={`${iconButtonClass} ${iconButtonDisabledClass} sm:order-3 h-12! w-12! shrink-0`}
    >
      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 16 16">
        <polygon points="3,2 11,8 3,14" />
        <rect x="12" y="2" width="2" height="12" rx="1" />
      </svg>
    </button>
  );

  const queueButton = (
    <button
      onClick={toggleQueue}
      title="Spellista"
      aria-label="Spellista"
      aria-expanded={queueOpen}
      className={`${iconButtonClass} sm:order-7 h-10! w-10! relative shrink-0`}
    >
      <svg
        className="h-5 w-5"
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
  );

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900 ${
        currentSong ? "" : "hidden"
      }`}
      onClick={dismissSleeveOnBackgroundClick}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* expandable track sleeve – separate from the media element, so it can
          be opened and closed without interrupting playback. A click anywhere on
          the sleeve or on the bar around the controls folds it again, so the
          close button is a shortcut rather than the only way out. */}
      {sleeveOpen && currentSong ? (
        <TrackSleeve song={currentSong} onClose={() => setSleeveOpen(false)} />
      ) : null}

      {/* Expandable queue: a floating panel anchored directly above the bar
          instead of a block that pushes the bar (and the page) upwards. The
          outer wrapper is click-through, so only the panel itself takes pointer
          events and the page underneath stays reachable right up to its edge.
          The near-opaque background plus the crisp border and the deep shadow
          are what keep it readable on top of the song cards behind it. */}
      {queueOpen && queue.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-full px-4 pb-3">
          <div className="pointer-events-auto mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-300 bg-white/98 shadow-2xl backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-800/98">
            <ul className="max-h-[min(60vh,20rem)] overflow-y-auto p-2">
              {queue.map((queued, index) => (
                <li
                  key={`${queued.recording_id ?? queued.id}-${index}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-200">
                    {queued.title}
                  </span>
                  <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
                    {queued.artist}
                  </span>
                  <button
                    onClick={() => removeFromQueue(index)}
                    title="Ta bort från spellistan"
                    aria-label={`Ta bort ${queued.title} från spellistan`}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:scale-105 hover:bg-zinc-200 hover:text-zinc-900 active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
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
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-2xl px-4 py-3">
        {/* Tappable title and the only way to open the sleeve. Hidden while the
            sleeve is open, since the sleeve already shows the title. */}
        {!sleeveOpen ? (
          <button
            type="button"
            onClick={toggleSleeve}
            aria-expanded={sleeveOpen}
            title="Visa låtinfo"
            aria-label="Visa låtinfo"
            className="mb-2 block w-full min-w-0 text-left"
          >
            <p className="truncate text-sm font-semibold text-black dark:text-zinc-50">
              {currentSong?.title}
            </p>
          </button>
        ) : null}

        {/* Two rows on phones, one row from `sm` up. The column splits the bar
            into a full-width timeline – elapsed, slider, duration – and a
            transport row underneath: the info button on the left, play/skip
            centred in the middle and the queue toggle on the right. At `sm` both
            wrappers switch to `display: contents`, so their children become
            items of the single row again, and the `sm:order-*` utilities lay
            them out left to right as info, play, skip, elapsed, slider,
            duration, queue. The time labels keep
            `data-player-time`, so they stay part of the time control (and do not
            fold the sleeve) together with the slider. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Row 1 on phones: the timeline across the full width */}
          <div className="flex items-center gap-2 sm:contents">
            <span
              data-player-time
              className="w-10 shrink-0 text-right text-xs text-zinc-500 sm:order-4 sm:w-12 sm:text-sm dark:text-zinc-400"
            >
              {formatTime(currentTime)}
            </span>
            {seekBar}
            <span
              data-player-time
              className="w-10 shrink-0 text-left text-xs text-zinc-500 sm:order-6 sm:w-12 sm:text-sm dark:text-zinc-400"
            >
              {formatTime(duration)}
            </span>
          </div>

          {/* Row 2 on phones: the info button on the left, play/skip centred in
              the middle and the queue toggle on the right, so the two edge
              buttons balance the row. From `sm` up this wrapper dissolves as
              well and the same items join the single row, where the info button
              leads it, ahead of the transport controls. */}
          <div className="flex items-center gap-2 sm:contents">
            {/* Permanent sleeve toggle: it balances the queue button on phones
                and is the first item of the row from `sm` up. */}
            <button
              type="button"
              onClick={toggleSleeve}
              title="Visa låtinfo"
              aria-label="Visa låtinfo"
              aria-expanded={sleeveOpen}
              className={`${iconButtonClass} sm:order-1 h-10! w-10! shrink-0`}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                viewBox="0 0 16 16"
              >
                <circle cx="8" cy="8" r="6.4" />
                <path d="M8 7.3v4.1" strokeLinecap="round" />
                <path d="M8 4.8h.01" strokeLinecap="round" strokeWidth={2.2} />
              </svg>
            </button>

            {/* The middle zone grows so play and skip sit centred between the
                two edge buttons; on `sm` it dissolves like its parent. */}
            <div className="flex flex-1 items-center justify-center gap-2 sm:contents">
              {playButton}
              {skipButton}
            </div>

            {queueButton}
          </div>
        </div>
      </div>
    </div>
  );
}
