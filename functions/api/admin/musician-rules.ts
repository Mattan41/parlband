/**
 * Musician name normalization/comparison. Kept free of Cloudflare globals so it
 * can be unit-tested in the Node Vitest environment.
 *
 * Names are compared in JS rather than with SQLite's `COLLATE NOCASE`, which is
 * ASCII-only and would treat "Örjan" and "örjan" as different names.
 */

/** Canonical stored form of a musician name. */
export function normalizeName(name: string): string {
  return name.normalize("NFC");
}

/** Case-insensitive, Swedish-aware comparison of two musician names. */
export function sameName(a: string, b: string): boolean {
  return (
    normalizeName(a).toLocaleLowerCase("sv") ===
    normalizeName(b).toLocaleLowerCase("sv")
  );
}

export interface MusicianNameRow {
  id: number;
  name: string;
}

/**
 * First musician other than `excludeId` whose name matches, or null. Passing
 * `excludeId` lets a musician change only the case of their own name.
 */
export function findNameConflict(
  rows: MusicianNameRow[],
  name: string,
  excludeId: number | null
): MusicianNameRow | null {
  for (const row of rows) {
    if (excludeId !== null && row.id === excludeId) continue;
    if (sameName(row.name, name)) return row;
  }
  return null;
}
