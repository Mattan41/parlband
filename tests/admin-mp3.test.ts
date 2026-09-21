import { describe, expect, it } from "vitest";

import {
  isValidMp3FileName,
  mp3ExistsInCdn,
  mp3ObjectKey,
} from "../functions/api/admin/recording-rules";

describe("isValidMp3FileName", () => {
  it("accepts plain mp3 file names", () => {
    expect(isValidMp3FileName("fri.mp3")).toBe(true);
    expect(isValidMp3FileName("test-lat-1a2b3c4d.mp3")).toBe(true);
    expect(isValidMp3FileName("A_b-1.mp3")).toBe(true);
  });

  it("rejects anything that is not a bare mp3 file name", () => {
    expect(isValidMp3FileName("")).toBe(false);
    expect(isValidMp3FileName("fri.wav")).toBe(false);
    expect(isValidMp3FileName("dir/fri.mp3")).toBe(false);
    expect(isValidMp3FileName("../fri.mp3")).toBe(false);
    expect(isValidMp3FileName("a..b.mp3")).toBe(false);
    expect(isValidMp3FileName("fri.mp3 ")).toBe(false);
    expect(isValidMp3FileName("fri.MP3")).toBe(false);
  });
});

describe("mp3ObjectKey", () => {
  it("builds the parlband/mp3 key", () => {
    expect(mp3ObjectKey("fri.mp3")).toBe("parlband/mp3/fri.mp3");
  });
});

describe("mp3ExistsInCdn", () => {
  it("heads the right key and reports a hit", async () => {
    const seen: string[] = [];
    const cdn = {
      head: async (key: string) => {
        seen.push(key);
        return { size: 1 };
      },
    };

    expect(await mp3ExistsInCdn(cdn, "fri.mp3")).toBe(true);
    expect(seen).toEqual(["parlband/mp3/fri.mp3"]);
  });

  it("reports a miss when head returns null", async () => {
    const cdn = { head: async () => null };
    expect(await mp3ExistsInCdn(cdn, "missing.mp3")).toBe(false);
  });
});
