import { describe, expect, it } from "vitest";

import {
  assignPlaylistPositions,
  parsePlaylistOrder,
} from "../functions/api/admin/playlist-rules";

describe("parsePlaylistOrder", () => {
  it("accepts a valid order and keeps it in order", () => {
    expect(parsePlaylistOrder({ order: ["fri", "mareld-i-natt"] })).toEqual({
      order: { ids: ["fri", "mareld-i-natt"] },
    });
  });

  it("trims surrounding whitespace from each id", () => {
    expect(parsePlaylistOrder({ order: ["  fri  "] })).toEqual({
      order: { ids: ["fri"] },
    });
  });

  it("rejects a missing or non-array order", () => {
    expect(parsePlaylistOrder({})).toEqual({
      error: "order must be a non-empty array of song ids",
      code: "order_invalid",
    });
    expect(parsePlaylistOrder({ order: "fri" })).toMatchObject({
      code: "order_invalid",
    });
  });

  it("rejects an empty array", () => {
    expect(parsePlaylistOrder({ order: [] })).toMatchObject({
      code: "order_invalid",
    });
  });

  it("rejects non-string entries", () => {
    expect(parsePlaylistOrder({ order: [1] })).toMatchObject({
      code: "order_invalid",
    });
  });

  it("rejects an id that is not a slug", () => {
    expect(parsePlaylistOrder({ order: ["Fri"] })).toMatchObject({
      code: "order_invalid",
    });
    expect(parsePlaylistOrder({ order: ["not a slug"] })).toMatchObject({
      code: "order_invalid",
    });
  });

  it("rejects the same id twice", () => {
    expect(parsePlaylistOrder({ order: ["fri", "fri"] })).toMatchObject({
      code: "order_duplicate",
    });
  });
});

describe("assignPlaylistPositions", () => {
  const existing = ["fri", "mareld-i-natt", "klockan-12"];

  it("numbers the submitted order 1..N", () => {
    expect(
      assignPlaylistPositions(["klockan-12", "fri", "mareld-i-natt"], existing)
    ).toEqual({
      positions: [
        { id: "klockan-12", position: 1 },
        { id: "fri", position: 2 },
        { id: "mareld-i-natt", position: 3 },
      ],
    });
  });

  it("refuses an order that forgets a song", () => {
    expect(assignPlaylistPositions(["fri"], existing)).toMatchObject({
      code: "playlist_mismatch",
    });
  });

  it("refuses an order that names an unknown song", () => {
    expect(
      assignPlaylistPositions(["fri", "mareld-i-natt", "inte-en-lat"], existing)
    ).toMatchObject({ code: "playlist_mismatch" });
  });

  it("accepts any order of the complete set", () => {
    expect(
      assignPlaylistPositions(["mareld-i-natt", "klockan-12", "fri"], existing)
    ).toEqual({
      positions: [
        { id: "mareld-i-natt", position: 1 },
        { id: "klockan-12", position: 2 },
        { id: "fri", position: 3 },
      ],
    });
  });
});
