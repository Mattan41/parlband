import { describe, expect, it } from "vitest";

import {
  CLOUDFLARE_REQUEST_BODY_LIMIT_BYTES,
  KIND_CONFIG,
  MB,
  exceedsUploadLimit,
  parseContentLength,
  uploadLimitMb,
  type UploadKind,
} from "../functions/api/admin/upload-rules";

const KINDS = Object.keys(KIND_CONFIG) as UploadKind[];

describe("upload size limits", () => {
  it("lets a 54 MB audio upload through", () => {
    // The size that used to be refused by the old 25 MB mp3 / 50 MB wav caps.
    expect(exceedsUploadLimit("mp3", 54 * MB)).toBe(false);
    expect(exceedsUploadLimit("wav", 54 * MB)).toBe(false);
  });

  it("refuses the first byte over a ceiling and accepts the ceiling itself", () => {
    for (const kind of KINDS) {
      const { maxBytes } = KIND_CONFIG[kind];
      expect(exceedsUploadLimit(kind, maxBytes)).toBe(false);
      expect(exceedsUploadLimit(kind, maxBytes + 1)).toBe(true);
    }
  });

  it("reports the ceiling in whole MB for the 413 message", () => {
    expect(uploadLimitMb("mp3")).toBe(95);
    expect(uploadLimitMb("wav")).toBe(95);
    expect(uploadLimitMb("cover")).toBe(10);
    expect(uploadLimitMb("pdf")).toBe(20);
  });

  it("keeps every kind under Cloudflare's request-body cap", () => {
    // Deliberately below the edge limit: a body over it never reaches this
    // Function, so the endpoint's own error message would be unreachable.
    for (const kind of KINDS) {
      expect(KIND_CONFIG[kind].maxBytes).toBeLessThan(
        CLOUDFLARE_REQUEST_BODY_LIMIT_BYTES
      );
    }
  });
});

describe("parseContentLength", () => {
  it("reads a non-negative byte count", () => {
    expect(parseContentLength("0")).toBe(0);
    expect(parseContentLength("1048576")).toBe(1048576);
    expect(parseContentLength(" 123 ")).toBe(123);
  });

  it("returns null for anything that cannot be measured", () => {
    expect(parseContentLength(null)).toBeNull();
    expect(parseContentLength("")).toBeNull();
    expect(parseContentLength("   ")).toBeNull();
    expect(parseContentLength("not-a-number")).toBeNull();
    expect(parseContentLength("-1")).toBeNull();
  });
});
