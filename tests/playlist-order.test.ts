import { describe, expect, it } from "vitest";

import {
  moveInPlaylist,
  samePlaylistOrder,
  toPlaylistOrder,
  type PlaylistSong,
} from "../components/admin/playlistOrder";

/** Minimal song for the ordering helpers. */
function song(id: string, title: string, sort_order: number): PlaylistSong {
  return { id, title, sort_order };
}

describe("toPlaylistOrder", () => {
  it("orders by sort_order, not by the input order", () => {
    const songs = [song("c", "C", 3), song("a", "A", 1), song("b", "B", 2)];
    expect(toPlaylistOrder(songs)).toEqual(["a", "b", "c"]);
  });

  it("falls back to Swedish title order for equal positions", () => {
    const songs = [
      song("z", "Örjan", 0),
      song("a", "Åström", 0),
      song("b", "Berg", 0),
    ];
    expect(toPlaylistOrder(songs)).toEqual(["b", "a", "z"]);
  });

  it("does not mutate the input", () => {
    const songs = [song("c", "C", 3), song("a", "A", 1)];
    const before = songs.map((s) => s.id);
    toPlaylistOrder(songs);
    expect(songs.map((s) => s.id)).toEqual(before);
  });
});

describe("samePlaylistOrder", () => {
  it("is true for identical orders", () => {
    expect(samePlaylistOrder(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("is false when a position differs", () => {
    expect(samePlaylistOrder(["a", "b"], ["b", "a"])).toBe(false);
  });

  it("is false for different lengths", () => {
    expect(samePlaylistOrder(["a"], ["a", "b"])).toBe(false);
  });
});

describe("moveInPlaylist", () => {
  const order = ["a", "b", "c"];

  it("moves an entry up", () => {
    expect(moveInPlaylist(order, 1, -1)).toEqual(["b", "a", "c"]);
  });

  it("moves an entry down", () => {
    expect(moveInPlaylist(order, 0, 1)).toEqual(["b", "a", "c"]);
  });

  it("is a no-op at the ends", () => {
    expect(moveInPlaylist(order, 0, -1)).toEqual(order);
    expect(moveInPlaylist(order, 2, 1)).toEqual(order);
  });

  it("does not mutate the input", () => {
    moveInPlaylist(order, 0, 1);
    expect(order).toEqual(["a", "b", "c"]);
  });
});
