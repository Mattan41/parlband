import { describe, expect, it } from "vitest";

import { sortSongsByTitle } from "../components/texter/sortSongsByTitle";

describe("sortSongsByTitle", () => {
  it("sorts alphabetically by title", () => {
    expect(
      sortSongsByTitle([
        { title: "Mareld" },
        { title: "Cohen" },
        { title: "Fri" },
      ])
    ).toEqual([{ title: "Cohen" }, { title: "Fri" }, { title: "Mareld" }]);
  });

  it("compares with Swedish collation, so Å and Ö sort last", () => {
    const titles = [{ title: "Örjan" }, { title: "Berg" }, { title: "Åström" }];
    expect(sortSongsByTitle(titles).map((song) => song.title)).toEqual([
      "Berg",
      "Åström",
      "Örjan",
    ]);
  });

  it("does not mutate the input array", () => {
    const songs = [{ title: "B" }, { title: "A" }];
    sortSongsByTitle(songs);
    expect(songs.map((song) => song.title)).toEqual(["B", "A"]);
  });
});
