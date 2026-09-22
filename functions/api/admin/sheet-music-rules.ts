/**
 * Validation and R2 checks for a song's sheet-music PDF.
 *
 * Mirrors `recording-rules.ts` for the mp3. The upload flow
 * (functions/api/admin/upload.ts) always points `songs.sheet_music_path` at a
 * real object named `<song-id>.pdf`; the manual "Noter (R2-sökväg, manuell)"
 * field in the admin is an escape hatch for legacy documents, so a hand-typed
 * value must be a plausible file name *and* point at an existing object.
 *
 * Kept free of Cloudflare globals so the pure parts are unit-testable in the
 * Node Vitest environment.
 */

/** R2 prefix for sheet music, matching the existing `parlband/` convention. */
export const PDF_PREFIX = "parlband/pdf";

/**
 * A usable sheet_music_path is a bare PDF file name: ASCII letters, digits,
 * dots, underscores and hyphens only. The `..` guard rejects any
 * traversal-looking value even though the pattern already forbids slashes.
 */
export const PDF_FILE_PATTERN = /^[A-Za-z0-9._-]+\.pdf$/;

export function isValidPdfFileName(path: string): boolean {
  return PDF_FILE_PATTERN.test(path) && !path.includes("..");
}

/** R2 object key for a stored sheet_music_path. */
export function pdfObjectKey(path: string): string {
  return `${PDF_PREFIX}/${path}`;
}

/** Minimal CDN slice used for the existence check (keeps the helper testable). */
export interface PdfCdn {
  head(key: string): Promise<unknown>;
}

/** True when the PDF object for `path` exists in the CDN bucket. */
export async function pdfExistsInCdn(
  cdn: PdfCdn,
  path: string
): Promise<boolean> {
  const object = await cdn.head(pdfObjectKey(path));
  return object !== null && object !== undefined;
}
