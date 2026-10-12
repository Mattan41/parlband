import { describe, expect, it } from "vitest";

import { nextCatalogSong } from "../store/playerStore";
import type { Song } from "../data/songs";

/**
 * Minimal Song for identity-only assertions: `nextCatalogSong` only reads `id`.
 */
function song(id: string): Song {
  return { id } as Song;
}

describe("nextCatalogSong", () => {
  const a = song("a");
  const b = song("b");
  const c = song("c");

  it("returns the following song in the catalog", () => {
    expect(nextCatalogSong([a, b, c], a)).toBe(b);
  });

  it("wraps around from the last song to the first (endless loop)", () => {
    expect(nextCatalogSong([a, b, c], c)).toBe(a);
  });

  it("returns null when the current song is not part of the catalog", () => {
    expect(nextCatalogSong([a, b], song("d"))).toBeNull();
  });

  it("returns null for a single-song catalog (no next to advance to)", () => {
    expect(nextCatalogSong([a], a)).toBeNull();
  });

  it("returns null for an empty catalog", () => {
    expect(nextCatalogSong([], a)).toBeNull();
  });

  it("returns null when there is no current song", () => {
    expect(nextCatalogSong([a, b], null)).toBeNull();
  });

  it("returns null in `none` mode, whatever the position", () => {
    expect(nextCatalogSong([a, b, c], a, { mode: "none" })).toBeNull();
    expect(nextCatalogSong([a, b, c], c, { mode: "none" })).toBeNull();
  });

  it("advances to the next unplayed song in `once` mode", () => {
    expect(
      nextCatalogSong([a, b, c], b, { mode: "once", played: ["a", "b"] })
    ).toBe(c);
  });

  it("wraps around in `once` mode to reach an unplayed song", () => {
    expect(
      nextCatalogSong([a, b, c], c, { mode: "once", played: ["b", "c"] })
    ).toBe(a);
  });

  it("returns null in `once` mode once every song has played", () => {
    expect(
      nextCatalogSong([a, b, c], c, { mode: "once", played: ["a", "b", "c"] })
    ).toBeNull();
  });
});
