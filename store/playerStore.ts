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
  /** Start the first queued song, if any, and remove it from the queue. */
  playNext: () => void;
  /** Reconcile the intended play state from the underlying media element. */
  setIsPlaying: (value: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  queue: [],
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
      if (state.queue.length === 0) return state;
      const [next, ...rest] = state.queue;
      return {
        currentSong: next,
        queue: rest,
        isPlaying: true,
        playbackId: state.playbackId + 1,
      };
    }),

  setIsPlaying: (value) => set({ isPlaying: value }),
}));
