import { beforeEach, describe, expect, it } from "vitest";

import type { Song } from "../data/songs";
import { usePlayerStore } from "../store/playerStore";

/** Minimal Song for identity-only assertions: the store only reads `id`. */
function song(id: string): Song {
  return { id } as Song;
}

const a = song("a");
const b = song("b");
const c = song("c");

/** Reset the singleton store before each test so cases stay independent. */
beforeEach(() => {
  usePlayerStore.setState({
    currentSong: null,
    queue: [],
    catalog: [],
    isPlaying: false,
    playbackId: 0,
    playbackMode: "loop",
    playedInRound: [],
  });
});

describe("playerStore playNext – `once` mode", () => {
  it("plays every catalogue song once, then stops", () => {
    const store = usePlayerStore.getState();
    store.setCatalog([a, b, c]);
    store.setPlaybackMode("once");
    store.playSong(b);

    // b -> c
    expect(usePlayerStore.getState().playNext()).toBe(true);
    expect(usePlayerStore.getState().currentSong).toBe(c);

    // c -> a (wraps around to the last unplayed song)
    expect(usePlayerStore.getState().playNext()).toBe(true);
    expect(usePlayerStore.getState().currentSong).toBe(a);

    // The round is complete: nothing left to advance to.
    expect(usePlayerStore.getState().playNext()).toBe(false);
  });
});

describe("playerStore playNext – `none` mode", () => {
  it("does not auto-advance through the catalogue", () => {
    const store = usePlayerStore.getState();
    store.setCatalog([a, b, c]);
    store.setPlaybackMode("none");
    store.playSong(a);

    expect(usePlayerStore.getState().playNext()).toBe(false);
    expect(usePlayerStore.getState().currentSong).toBe(a);
  });
});

describe("playerStore playNext – queue has priority", () => {
  it("pops the queue first, in any mode", () => {
    const store = usePlayerStore.getState();
    store.setCatalog([a, b, c]);
    store.setPlaybackMode("none");
    store.playSong(a);
    store.addToQueue(b);

    expect(usePlayerStore.getState().playNext()).toBe(true);
    expect(usePlayerStore.getState().currentSong).toBe(b);
    expect(usePlayerStore.getState().queue).toEqual([]);
  });
});
