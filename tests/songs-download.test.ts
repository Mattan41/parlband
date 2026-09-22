import { describe, expect, it } from "vitest";

import { toSong, type SongRow } from "../data/songs";

/** Minimal API row covering every field `toSong` reads. */
function row(overrides: Partial<SongRow> = {}): SongRow {
  return {
    id: "fri",
    recording_id: 1,
    title: "Fri",
    artist: "Pärlband",
    lyrics_by: "Nova Kruskopf Eriksson",
    music_by: "Nova Kruskopf Eriksson",
    lyrics: null,
    sheet_music_path: null,
    album: null,
    studio: null,
    year: 2023,
    engineer: null,
    mp3_path: "fri.mp3",
    wav_path: "fri.wav",
    cover_path: null,
    play_count: 0,
    download_count: 0,
    credits: [],
    ...overrides,
  };
}

describe("toSong downloadSrc", () => {
  it("routes the WAV through the counting endpoint", () => {
    expect(toSong(row()).downloadSrc).toBe("/api/downloads?id=1");
  });

  it("omits downloadSrc when there is no wav_path", () => {
    expect(toSong(row({ wav_path: null })).downloadSrc).toBeUndefined();
  });

  it("omits downloadSrc when the recording id is missing", () => {
    expect(toSong(row({ recording_id: null })).downloadSrc).toBeUndefined();
  });
});
