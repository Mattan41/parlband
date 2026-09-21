import { describe, expect, it } from "vitest";

import {
  findNameConflict,
  normalizeName,
  sameName,
  type MusicianNameRow,
} from "../functions/api/admin/musician-rules";

const rows: MusicianNameRow[] = [
  { id: 1, name: "Mats Kruskopf Eriksson" },
  { id: 2, name: "Örjan Ahnoff" },
  { id: 3, name: "Nova Kruskopf Eriksson" },
];

describe("sameName", () => {
  it("is case-insensitive for Swedish letters", () => {
    expect(sameName("Örjan Ahnoff", "örjan ahnoff")).toBe(true);
    expect(sameName("ÅSA", "åsa")).toBe(true);
    expect(sameName("Mats", "Måts")).toBe(false);
  });

  it("treats NFC and NFD spellings as the same name", () => {
    const composed = "\u00d6rjan"; // Ö
    const decomposed = "O\u0308rjan"; // O + combining diaeresis
    expect(sameName(composed, decomposed)).toBe(true);
  });
});

describe("normalizeName", () => {
  it("stores the NFC form", () => {
    expect(normalizeName("O\u0308rjan")).toBe("\u00d6rjan");
  });
});

describe("findNameConflict", () => {
  it("finds another musician with the same name", () => {
    expect(findNameConflict(rows, "örjan ahnoff", null)?.id).toBe(2);
  });

  it("allows a case-only rename of the same musician", () => {
    expect(findNameConflict(rows, "örjan ahnoff", 2)).toBeNull();
  });

  it("still blocks a name used by a different musician", () => {
    expect(findNameConflict(rows, "ÖRJAN AHNOFF", 1)?.id).toBe(2);
  });

  it("returns null for a free name", () => {
    expect(findNameConflict(rows, "Erik Walfridsson", null)).toBeNull();
  });
});
