import { create } from "zustand";
import type { Song } from "@/data/songs";
import { DEFAULT_PLAYBACK_MODE, type PlaybackMode } from "@/data/settings";

/**
 * Global playback state for the sticky player.
 *
 * Playback progress (currentTime/duration/seek) intentionally does NOT live
 * here: `timeupdate` fires several times per second and would re-render every
 * subscriber, including the whole song list. That state stays local to
 * components/StickyPlayer.tsx against its single <audio> element.
 */
interface PlayerState {
  /** Track currently loaded in the sticky player, or null before first play. */
  currentSong: Song | null;
  /** Upcoming tracks, in order. May contain duplicates. */
  queue: Song[];
  /**
   * The active catalog (the landing-page song list), used as the fallback when
   * the manual queue is empty: playback then advances through the catalog
   * according to `playbackMode`. Kept in sync by components/home/SongList.tsx.
   */
  catalog: Song[];
  /** Whether playback is intended to be running. */
  isPlaying: boolean;
  /**
   * Internal restart counter, incremented every time a track should start from
   * the beginning. The sticky player keys its (re)start effect on this instead
   * of the song object, so playback restarts even when a queued entry is the
   * very same object as the current one (a queue may hold duplicates). It also
   * acts as the trigger that resets the play-count guard.
   */
  playbackId: number;
  /** End-of-queue behaviour, synced from GET /api/settings. */
  playbackMode: PlaybackMode;
  /**
   * Song ids already played in the current "once" round. Only meaningful while
   * `playbackMode === "once"`; reset when playback starts over or the mode or
   * catalogue changes.
   */
  playedInRound: string[];

  /** Play a song immediately, independent of the queue (jump the line). */
  playSong: (song: Song) => void;
  /** Toggle play/pause for the current song. No-op when nothing is loaded. */
  togglePlay: () => void;
  /** Append a song to the queue (no dedup; duplicates are allowed). */
  addToQueue: (song: Song) => void;
  /** Remove the queued entry at `index` (position-based, duplicates-safe). */
  removeFromQueue: (index: number) => void;
  /**
   * Advance to the next track. Pops the first queued entry when the queue is
   * not empty; otherwise falls back to the catalogue according to
   * `playbackMode` (see nextCatalogSong). Returns whether playback advanced, so
   * the `ended` handler can stop the player when there is nowhere to go.
   */
  playNext: () => boolean;
  /** Reconcile the intended play state from the underlying media element. */
  setIsPlaying: (value: boolean) => void;
  /** Replace the active catalog that playback loops through when idle. */
  setCatalog: (songs: Song[]) => void;
  /** Change the end-of-queue behaviour and start a fresh "once" round. */
  setPlaybackMode: (mode: PlaybackMode) => void;
}

/** Options for nextCatalogSong; both are optional so the default is `loop`. */
export interface NextCatalogOptions {
  /** End-of-queue behaviour. Defaults to `loop`. */
  mode?: PlaybackMode;
  /**
   * Song ids already played in the current round, used by `once` to skip tracks
   * that have already had their turn. Ignored in the other modes.
   */
  played?: readonly string[];
}

/**
 * Next song after `current` in `catalog`, according to the playback mode.
 * Matches on `id` (unique per list, the same key the song list uses).
 *
 * - `loop` – the following song, wrapping around at the end so the catalogue
 *   plays as a continuous loop.
 * - `once` – the next song not yet played this round, wrapping around to reach
 *   it; null once every song has had its turn.
 * - `none` – always null (no catalogue fallback).
 *
 * Returns null when there is nothing to advance to: `none`, no current song, a
 * catalogue of fewer than two songs, a current song that is not part of the
 * catalogue, or (in `once`) a completed round.
 *
 * Pure and store-independent so it can be unit-tested and reused by the skip
 * action and the `ended` handler alike.
 */
export function nextCatalogSong(
  catalog: Song[],
  current: Song | null,
  options: NextCatalogOptions = {}
): Song | null {
  const mode = options.mode ?? "loop";
  if (mode === "none") return null;
  if (!current || catalog.length < 2) return null;
  const index = catalog.findIndex((song) => song.id === current.id);
  if (index === -1) return null;

  if (mode === "loop") {
    return catalog[(index + 1) % catalog.length];
  }

  // `once`: scan forward (wrapping) for the next song not yet played this round.
  const played = new Set(options.played ?? []);
  for (let step = 1; step < catalog.length; step += 1) {
    const candidate = catalog[(index + step) % catalog.length];
    if (!played.has(candidate.id)) return candidate;
  }
  return null;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  catalog: [],
  isPlaying: false,
  playbackId: 0,
  playbackMode: DEFAULT_PLAYBACK_MODE,
  playedInRound: [],

  playSong: (song) =>
    set((state) => ({
      currentSong: song,
      isPlaying: true,
      playbackId: state.playbackId + 1,
      // A manual pick starts a fresh "once" round seeded with that song.
      playedInRound: [song.id],
    })),

  togglePlay: () =>
    set((state) =>
      state.currentSong ? { isPlaying: !state.isPlaying } : state
    ),

  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),

  removeFromQueue: (index) =>
    set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),

  playNext: () => {
    const state = get();

    if (state.queue.length > 0) {
      const [next, ...rest] = state.queue;
      set({
        currentSong: next,
        queue: rest,
        isPlaying: true,
        playbackId: state.playbackId + 1,
        playedInRound: [next.id],
      });
      return true;
    }

    // Empty queue: fall back to the catalogue according to the playback mode.
    // In `once`, the track that just ended counts as played for this round too.
    const played =
      state.playbackMode === "once"
        ? Array.from(
            new Set([
              ...state.playedInRound,
              ...(state.currentSong ? [state.currentSong.id] : []),
            ])
          )
        : state.playedInRound;

    const next = nextCatalogSong(state.catalog, state.currentSong, {
      mode: state.playbackMode,
      played,
    });
    if (!next) return false;

    set({
      currentSong: next,
      isPlaying: true,
      playbackId: state.playbackId + 1,
      playedInRound:
        state.playbackMode === "once"
          ? [...played, next.id]
          : state.playedInRound,
    });
    return true;
  },

  setIsPlaying: (value) => set({ isPlaying: value }),

  setCatalog: (songs) =>
    set({
      catalog: songs,
      // A changed catalogue starts a fresh "once" round.
      playedInRound: [],
    }),

  setPlaybackMode: (mode) => set({ playbackMode: mode, playedInRound: [] }),
}));
