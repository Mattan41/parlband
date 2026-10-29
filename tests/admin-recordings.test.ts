import { describe, expect, it } from "vitest";

import {
  filterRecordings,
  flattenRecordings,
  type AdminRecording,
  type AdminSong,
  type RecordingEntry,
} from "../data/admin";

/** A recording with sensible defaults; only `id` is required. */
function recording(
  id: number,
  overrides: Partial<AdminRecording> = {}
): AdminRecording {
  return {
    id,
    album: null,
    studio: null,
    year: null,
    engineer: null,
    notes: null,
    mp3_path: `rec-${id}.mp3`,
    wav_path: null,
    cover_path: null,
    play_count: 0,
    download_count: 0,
    is_primary: 0,
    is_public: 1,
    credits: [],
    ...overrides,
  };
}

/** A song with the given recordings. */
function song(
  id: string,
  title: string,
  recordings: AdminRecording[],
  overrides: Partial<AdminSong> = {}
): AdminSong {
  return {
    id,
    title,
    artist: "Pärlband",
    lyrics_by: "",
    music_by: "",
    lyrics: null,
    sheet_music_path: null,
    is_published: 1,
    sort_order: 0,
    recordings,
    ...overrides,
  };
}

/** "songId#recordingId" for readable order assertions. */
function ids(entries: RecordingEntry[]): string[] {
  return entries.map((entry) => `${entry.song.id}#${entry.recording.id}`);
}

describe("flattenRecordings", () => {
  it("orders by song title, then primary/public/newest within a song", () => {
    const songs = [
      song("beta", "Beta", [
        recording(1, { year: 2019 }),
        recording(2, { year: 2020, is_primary: 1 }),
      ]),
      song("alpha", "Alpha", [recording(3, { is_public: 0 })]),
    ];

    // Alpha (title order) first, then Beta: primary 2 before 1.
    expect(ids(flattenRecordings(songs))).toEqual([
      "alpha#3",
      "beta#2",
      "beta#1",
    ]);
  });

  it("puts public takes before hidden ones when neither is primary", () => {
    const songs = [
      song("s", "Song", [
        recording(1, { is_public: 0 }),
        recording(2, { is_public: 1 }),
      ]),
    ];

    expect(ids(flattenRecordings(songs))).toEqual(["s#2", "s#1"]);
  });

  it("returns an empty list for songs without recordings", () => {
    expect(flattenRecordings([song("s", "Song", [])])).toEqual([]);
  });
});

describe("filterRecordings", () => {
  const entries = flattenRecordings([
    song("alpha", "Alpha", [
      recording(1, {
        is_public: 0,
        album: "Demos",
        credits: [{ musician_id: 1, musician: "Nova", instrument: "Sång" }],
      }),
    ]),
    song("beta", "Beta", [
      recording(2, { is_public: 1, studio: "Hemmastudio" }),
    ]),
  ]);

  it("keeps everything by default", () => {
    expect(ids(filterRecordings(entries))).toEqual(["alpha#1", "beta#2"]);
  });

  it("filters to public or hidden takes", () => {
    expect(ids(filterRecordings(entries, { visibility: "public" }))).toEqual([
      "beta#2",
    ]);
    expect(ids(filterRecordings(entries, { visibility: "hidden" }))).toEqual([
      "alpha#1",
    ]);
  });

  it("matches the query against title, album, studio and musicians", () => {
    expect(ids(filterRecordings(entries, { query: "beta" }))).toEqual([
      "beta#2",
    ]);
    expect(ids(filterRecordings(entries, { query: "demos" }))).toEqual([
      "alpha#1",
    ]);
    expect(ids(filterRecordings(entries, { query: "hemma" }))).toEqual([
      "beta#2",
    ]);
    expect(ids(filterRecordings(entries, { query: "NOVA" }))).toEqual([
      "alpha#1",
    ]);
  });

  it("combines the query with the visibility filter", () => {
    expect(
      ids(filterRecordings(entries, { query: "beta", visibility: "hidden" }))
    ).toEqual([]);
  });
});
