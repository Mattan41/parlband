import { describe, expect, it } from "vitest";

import {
  isValidPdfFileName,
  pdfExistsInCdn,
  pdfObjectKey,
} from "../functions/api/admin/sheet-music-rules";

describe("isValidPdfFileName", () => {
  it("accepts a bare PDF file name", () => {
    expect(isValidPdfFileName("ny-lat.pdf")).toBe(true);
    expect(isValidPdfFileName("fri_v2.pdf")).toBe(true);
    expect(isValidPdfFileName("fri.PDF")).toBe(false);
  });

  it("rejects paths, other extensions and traversal", () => {
    expect(isValidPdfFileName("parlband/pdf/fri.pdf")).toBe(false);
    expect(isValidPdfFileName("pdf/fri.pdf")).toBe(false);
    expect(isValidPdfFileName("fri.mp3")).toBe(false);
    expect(isValidPdfFileName("../fri.pdf")).toBe(false);
    expect(isValidPdfFileName("fri..pdf")).toBe(false);
    expect(isValidPdfFileName("noter 2026.pdf")).toBe(false);
    expect(isValidPdfFileName("")).toBe(false);
  });
});

describe("pdfObjectKey / pdfExistsInCdn", () => {
  it("builds the bucket key under parlband/pdf", () => {
    expect(pdfObjectKey("fri.pdf")).toBe("parlband/pdf/fri.pdf");
  });

  it("is true only when the object exists", async () => {
    const found = { head: async () => ({ size: 1 }) };
    const missing = { head: async () => null };

    await expect(pdfExistsInCdn(found, "fri.pdf")).resolves.toBe(true);
    await expect(pdfExistsInCdn(missing, "fri.pdf")).resolves.toBe(false);
  });
});
