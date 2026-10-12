import { describe, expect, it } from "vitest";

import {
  PLAYBACK_MODES,
  parseSettingsFields,
} from "../functions/api/admin/settings-rules";

/** The validation error shared by every rejected value. */
const ERROR = `playbackMode must be one of: ${PLAYBACK_MODES.join(", ")}`;

describe("parseSettingsFields", () => {
  it("accepts every valid playback mode", () => {
    for (const mode of PLAYBACK_MODES) {
      expect(parseSettingsFields({ playbackMode: mode })).toEqual({
        fields: { playbackMode: mode },
      });
    }
  });

  it("rejects a missing mode", () => {
    expect(parseSettingsFields({})).toEqual({ error: ERROR });
  });

  it("rejects an unknown mode", () => {
    expect(parseSettingsFields({ playbackMode: "shuffle" })).toEqual({
      error: ERROR,
    });
  });

  it("rejects a non-string mode", () => {
    expect(parseSettingsFields({ playbackMode: 5 })).toEqual({ error: ERROR });
    expect(parseSettingsFields({ playbackMode: null })).toEqual({
      error: ERROR,
    });
  });
});
