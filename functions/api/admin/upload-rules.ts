/**
 * Rules for the admin R2 upload endpoint: the per-kind size ceiling, the R2 key
 * prefixes and the content types each kind accepts.
 *
 * Kept free of Cloudflare globals so the pure parts are unit-testable in the
 * Node Vitest environment (same split as `sheet-music-rules.ts`).
 *
 * The audio ceilings are bounded by the platform, not by taste: Cloudflare caps
 * a request body at 100 MB on the Free and Pro plans (200 MB on Business, up to
 * 5 GB on Enterprise) and answers anything larger with `413` at the edge, before
 * this Function runs. Every limit below therefore stays under
 * `CLOUDFLARE_REQUEST_BODY_LIMIT_BYTES`, so the endpoint — not the edge — is the
 * one explaining the refusal. Larger masters go through the CLI, which accepts
 * up to 315 MB per object. See docs/UPLOADING.md.
 */

/** One mebibyte (1024 * 1024 bytes); every limit below is expressed in it. */
export const MB = 1024 * 1024;

/**
 * Cloudflare's own maximum request-body size on the Free and Pro plans. A larger
 * body is rejected at the edge with `413 Request entity too large`.
 */
export const CLOUDFLARE_REQUEST_BODY_LIMIT_BYTES = 100 * MB;

export type UploadKind = "mp3" | "wav" | "cover" | "pdf";

export interface UploadKindConfig {
  /** R2 key prefix, matching the existing parlband/ convention. */
  prefix: string;
  /** File extension, or null when it is derived from the content type. */
  extension: string | null;
  maxBytes: number;
  contentTypes: string[];
}

export const KIND_CONFIG: Record<UploadKind, UploadKindConfig> = {
  mp3: {
    prefix: "parlband/mp3",
    extension: "mp3",
    // The request body is streamed straight into R2, so the ceiling is the
    // platform's 100 MB request-body cap, not a memory budget of our own: a
    // 320 kbps long track or a remix runs past the old 25 MB without being an
    // outlier. 95 MiB (99.6 MB) leaves room under the cap both ways it is
    // counted.
    maxBytes: 95 * MB,
    contentTypes: [
      "audio/mpeg",
      "audio/mp3",
      "audio/x-mp3",
      "application/octet-stream",
    ],
  },
  wav: {
    prefix: "parlband/wav",
    extension: "wav",
    // A 16-bit/44.1 kHz stereo master is roughly 10 MB per minute, so 95 MB
    // covers everything short of a full-length live set. Anything longer is a
    // job for the CLI, not for a browser upload.
    maxBytes: 95 * MB,
    contentTypes: [
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/vnd.wave",
      "application/octet-stream",
    ],
  },
  cover: {
    prefix: "parlband/images",
    extension: null,
    maxBytes: 10 * MB,
    contentTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "image/gif",
    ],
  },
  pdf: {
    prefix: "parlband/pdf",
    extension: "pdf",
    // Sheet music/chords are small, print-ready documents.
    maxBytes: 20 * MB,
    contentTypes: ["application/pdf"],
  },
};

/** File extension per accepted image content type (covers have no fixed one). */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/** The ceiling for a kind in whole MB, as the `413` message reports it. */
export function uploadLimitMb(kind: UploadKind): number {
  return Math.round(KIND_CONFIG[kind].maxBytes / MB);
}

/**
 * Read a `Content-Length` header value. Returns null when the header is absent,
 * blank or not a usable non-negative number, which is the signal to skip the
 * size guard entirely — a chunked request simply arrives unmeasured.
 */
export function parseContentLength(header: string | null): number | null {
  if (header === null || header.trim() === "") return null;
  const value = Number(header);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** True when a body of `bytes` is larger than the ceiling for `kind`. */
export function exceedsUploadLimit(kind: UploadKind, bytes: number): boolean {
  return bytes > KIND_CONFIG[kind].maxBytes;
}
