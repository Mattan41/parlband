import { create } from "zustand";
import type { Song } from "@/data/songs";

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
   * the manual queue is empty: playback then advances through the catalog in a
   * continuous loop. Kept in sync by components/home/SongList.tsx.
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
   * not empty, otherwise falls back to the next song in `catalog` (looping
   * around at the end). A no-op when neither is available.
   */
  playNext: () => void;
  /** Reconcile the intended play state from the underlying media element. */
  setIsPlaying: (value: boolean) => void;
  /** Replace the active catalog that playback loops through when idle. */
  setCatalog: (songs: Song[]) => void;
}

/**
 * Next song after `current` in `catalog`, wrapping around at the end so the
 * catalog plays as a continuous loop. Matches on `id` (unique per list, the same
 * key the song list uses). Returns null when there is nothing to advance to:
 * no current song, a catalog of fewer than two songs, or a current song that is
 * not part of the catalog.
 *
 * Pure and store-independent so it can be unit-tested and reused by the skip
 * action and the `ended` handler alike.
 */
export function nextCatalogSong(
  catalog: Song[],
  current: Song | null
): Song | null {
  if (!current || catalog.length < 2) return null;
  const index = catalog.findIndex((song) => song.id === current.id);
  if (index === -1) return null;
  return catalog[(index + 1) % catalog.length];
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  queue: [],
  catalog: [],
  isPlaying: false,
  playbackId: 0,

  playSong: (song) =>
    set((state) => ({
      currentSong: song,
      isPlaying: true,
      playbackId: state.playbackId + 1,
    })),

  togglePlay: () =>
    set((state) =>
      state.currentSong ? { isPlaying: !state.isPlaying } : state
    ),

  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),

  removeFromQueue: (index) =>
    set((state) => ({ queue: state.queue.filter((_, i) => i !== index) })),

  playNext: () =>
    set((state) => {
      if (state.queue.length > 0) {
        const [next, ...rest] = state.queue;
        return {
          currentSong: next,
          queue: rest,
          isPlaying: true,
          playbackId: state.playbackId + 1,
        };
      }

      // Empty queue: fall back to the catalog, looping around at the end.
      const next = nextCatalogSong(state.catalog, state.currentSong);
      if (!next) return state;
      return {
        currentSong: next,
        isPlaying: true,
        playbackId: state.playbackId + 1,
      };
    }),

  setIsPlaying: (value) => set({ isPlaying: value }),

  setCatalog: (songs) => set({ catalog: songs }),
}));
