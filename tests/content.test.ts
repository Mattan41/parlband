import { describe, expect, it } from "vitest";

import { DEFAULT_ABOUT_HEADING } from "../data/content";
import {
  MAX_CONTENT_LENGTH,
  parseContentFields,
} from "../functions/api/admin/content-rules";

/** A complete, valid content payload. */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    welcomeText: "Välkommen till Pärlband!",
    aboutHeading: "Om oss",
    aboutBody: "Vi håller på att bygga upp den här sidan.",
    ...overrides,
  };
}

describe("parseContentFields", () => {
  it("keeps the three fields exactly as given", () => {
    expect(parseContentFields(payload())).toEqual({ fields: payload() });
  });

  it("allows every field to be empty", () => {
    // Empty values are meaningful: the welcome line renders nothing and an
    // empty heading falls back to DEFAULT_ABOUT_HEADING.
    expect(
      parseContentFields({ welcomeText: "", aboutHeading: "", aboutBody: "" })
    ).toEqual({
      fields: { welcomeText: "", aboutHeading: "", aboutBody: "" },
    });
  });

  it("rejects a missing or non-string field", () => {
    expect(parseContentFields({})).toEqual({
      error: "welcomeText must be a string",
    });
    expect(parseContentFields(payload({ welcomeText: 5 }))).toEqual({
      error: "welcomeText must be a string",
    });
    expect(parseContentFields(payload({ aboutHeading: null }))).toEqual({
      error: "aboutHeading must be a string",
    });
    expect(parseContentFields(payload({ aboutBody: ["x"] }))).toEqual({
      error: "aboutBody must be a string",
    });
  });

  it("rejects a field above the stored maximum but accepts the limit", () => {
    expect(
      parseContentFields(
        payload({ aboutBody: "a".repeat(MAX_CONTENT_LENGTH + 1) })
      )
    ).toEqual({
      error: `aboutBody must be at most ${MAX_CONTENT_LENGTH} characters`,
    });
    expect(
      parseContentFields(payload({ aboutBody: "a".repeat(MAX_CONTENT_LENGTH) }))
    ).toHaveProperty("fields");
  });

  it("does not trim the copy, so the editor's line breaks are kept", () => {
    const body = " rad 1\nrad 2 ";
    expect(parseContentFields(payload({ aboutBody: body }))).toEqual({
      fields: payload({ aboutBody: body }),
    });
  });
});

describe("DEFAULT_ABOUT_HEADING", () => {
  it("is the built-in fallback shown for an empty heading", () => {
    expect(DEFAULT_ABOUT_HEADING).toBe("Om oss");
  });
});
