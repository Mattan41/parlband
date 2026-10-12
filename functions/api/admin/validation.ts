/**
 * Shared field validators for the admin payloads. Kept free of Cloudflare
 * globals so they can be unit-tested in the plain Node Vitest environment.
 */

/** Trimmed non-empty string, or undefined when the value is unusable. */
export function requiredText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Optional text: null for missing/empty, undefined when the type is wrong. */
export function nullableText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Positive integer, or undefined when the value is unusable. */
export function requiredInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

/** Optional integer: null for missing/empty, undefined when not an integer. */
export function nullableInteger(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  return value;
}

/**
 * Optional boolean with a fallback for missing values. Returns undefined only
 * when a value is present but has the wrong type, so a bad payload is rejected
 * instead of silently falling back.
 */
export function optionalBoolean(
  value: unknown,
  fallback: boolean
): boolean | undefined {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") return undefined;
  return value;
}
