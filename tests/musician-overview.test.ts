import { describe, expect, it } from "vitest";

import {
  buildMusicianOverview,
  type OverviewMusician,
  type OverviewSong,
} from "../components/admin/musicianOverview";

const songs: OverviewSong[] = [
  {
    id: "fri",
    title: "Fri",
    recordings: [
      {
        id: 1,
        year: 2023,
        album: "Studio",
        credits: [
          { musician_id: 1, musician: "Anna", instrument: "Sång" },
          { musician_id: 1, musician: "Anna", instrument: "Gitarr" },
          { musician_id: 2, musician: "Bo", instrument: "Bas" },
        ],
      },
      { id: 2, year: null, album: null, credits: [] },
    ],
  },
  {
    id: "tva",
    title: "Två",
    recordings: [{ id: 3, year: 2020, album: null, credits: [] }],
  },
];

const musicians: OverviewMusician[] = [
  { id: 1, name: "Anna" },
  { id: 2, name: "Bo" },
  { id: 3, name: "Cissi" },
];

describe("buildMusicianOverview", () => {
  it("groups a musician's instruments per recording", () => {
    const { entries } = buildMusicianOverview(songs, musicians);
    const anna = entries.find((entry) => entry.id === 1);

    expect(anna?.credits).toHaveLength(1);
    expect(anna?.credits[0]).toMatchObject({
      songId: "fri",
      songTitle: "Fri",
      recordingId: 1,
      year: 2023,
      album: "Studio",
    });
    expect(anna?.credits[0].instruments).toEqual(["Sång", "Gitarr"]);
  });

  it("lists recordings without credits", () => {
    const { recordingsWithoutCredits } = buildMusicianOverview(
      songs,
      musicians
    );

    expect(recordingsWithoutCredits.map((entry) => entry.recordingId)).toEqual([
      2, 3,
    ]);
    expect(recordingsWithoutCredits[1]).toMatchObject({
      songId: "tva",
      songTitle: "Två",
    });
  });

  it("keeps registered musicians with no credits", () => {
    const { entries } = buildMusicianOverview(songs, musicians);
    expect(entries.find((entry) => entry.id === 3)?.credits).toEqual([]);
  });

  it("ignores credits for musicians that are not registered", () => {
    const ghost: OverviewSong[] = [
      {
        id: "x",
        title: "X",
        recordings: [
          {
            id: 9,
            year: null,
            album: null,
            credits: [
              { musician_id: 99, musician: "Ghost", instrument: "Bas" },
            ],
          },
        ],
      },
    ];

    const { entries, recordingsWithoutCredits } = buildMusicianOverview(
      ghost,
      musicians
    );

    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.credits.length === 0)).toBe(true);
    expect(recordingsWithoutCredits).toEqual([]);
  });
});
