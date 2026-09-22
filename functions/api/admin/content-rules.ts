/** Upper bound per field; the editor is a plain input/textarea. */
export const MAX_CONTENT_LENGTH = 20000;

/** Validated page copy in the shape the SQL statements bind. */
export interface ContentFields {
  welcomeText: string;
  aboutHeading: string;
  aboutBody: string;
}

/** A text field may be empty (it hides the line / falls back to a default). */
function requiredString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Validate a content payload, shared by nothing else – PUT is the only writer.
 * Returns a ready error message instead of throwing.
 */
export function parseContentFields(
  body: Record<string, unknown>
): { fields: ContentFields } | { error: string } {
  const fields: ContentFields = {
    welcomeText: "",
    aboutHeading: "",
    aboutBody: "",
  };

  for (const key of [
    "welcomeText",
    "aboutHeading",
    "aboutBody",
  ] as const satisfies readonly (keyof ContentFields)[]) {
    const value = requiredString(body[key]);
    if (value === undefined) return { error: `${key} must be a string` };
    if (value.length > MAX_CONTENT_LENGTH) {
      return {
        error: `${key} must be at most ${MAX_CONTENT_LENGTH} characters`,
      };
    }
    fields[key] = value;
  }

  return { fields };
}
