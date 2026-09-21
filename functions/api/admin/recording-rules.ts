/**
 * Validation and R2 checks for a recording's mp3 file. Kept in its own module
 * (no Cloudflare globals) so the logic can be unit-tested in the Node Vitest
 * environment.
 */

/** R2 prefix for the streaming audio. */
export const MP3_PREFIX = "parlband/mp3";

/**
 * A usable mp3_path is a bare file name ending in `.mp3`: ASCII letters,
 * digits, dots, underscores and hyphens only. The `..` guard below rejects any
 * traversal-looking value even though the pattern already forbids slashes.
 */
export const MP3_FILE_PATTERN = /^[A-Za-z0-9._-]+\.mp3$/;

export function isValidMp3FileName(path: string): boolean {
  return MP3_FILE_PATTERN.test(path) && !path.includes("..");
}

/** R2 object key for a stored mp3_path. */
export function mp3ObjectKey(path: string): string {
  return `${MP3_PREFIX}/${path}`;
}

/** Minimal CDN slice used for the existence check (keeps the helper testable). */
export interface Mp3Cdn {
  head(key: string): Promise<unknown>;
}

/** True when the mp3 object for `path` exists in the CDN bucket. */
export async function mp3ExistsInCdn(
  cdn: Mp3Cdn,
  path: string
): Promise<boolean> {
  const object = await cdn.head(mp3ObjectKey(path));
  return object !== null && object !== undefined;
}
