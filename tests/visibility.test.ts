import { describe, expect, it } from "vitest";

import type { AdminSong } from "../data/admin";
import type { AdminGigRow } from "../data/gigs";
import { parseGigFields } from "../functions/api/admin/gig-rules";
import {
  emptyGigDraft,
  gigDraftEquals,
  toGigDraft,
  toGigPayload,
} from "../components/admin/GigFields";
import {
  emptySongDraft,
  toSongDraft,
  toSongPayload,
} from "../components/admin/SongFields";

/** Minimal admin song; only the fields the draft helpers read are meaningful. */
const song: AdminSong = {
  id: "fri",
  title: "Fri",
  artist: "Pärlband",
  lyrics_by: "Nova Kruskopf Eriksson",
  music_by: "Nova Kruskopf Eriksson",
  lyrics: null,
  sheet_music_path: null,
  is_published: 1,
  recordings: [],
};

/** Minimal admin gig, published by default. */
const gig: AdminGigRow = {
  id: 1,
  event_date: "2026-10-04",
  start_time: "19:00",
  title: null,
  venue: "Kaféet",
  city: null,
  ticket_url: null,
  info: null,
  internal_notes: null,
  is_published: 1,
};

describe("song publication mapping", () => {
  it("starts new songs as published", () => {
    expect(emptySongDraft.is_published).toBe(true);
  });

  it("turns is_published 1/0 into a checkbox-friendly boolean", () => {
    expect(toSongDraft(song).is_published).toBe(true);
    expect(toSongDraft({ ...song, is_published: 0 }).is_published).toBe(false);
  });

  it("sends the flag on save, including for a draft", () => {
    const draft = { ...toSongDraft(song), is_published: false };
    expect(toSongPayload(draft)).toMatchObject({ is_published: false });
  });
});

describe("gig publication mapping", () => {
  it("starts new gigs as published", () => {
    expect(emptyGigDraft.is_published).toBe(true);
  });

  it("turns is_published 1/0 into a checkbox-friendly boolean", () => {
    expect(toGigDraft(gig).is_published).toBe(true);
    expect(toGigDraft({ ...gig, is_published: 0 }).is_published).toBe(false);
  });

  it("sends the flag on save", () => {
    const draft = { ...toGigDraft(gig), is_published: false };
    expect(toGigPayload(draft)).toMatchObject({ is_published: false });
  });

  it("treats a visibility toggle as a change worth saving", () => {
    expect(
      gigDraftEquals(toGigDraft(gig), toGigDraft({ ...gig, is_published: 0 }))
    ).toBe(false);
  });
});

describe("parseGigFields publication flag", () => {
  const body = { event_date: "2026-10-04", venue: "Kaféet" };

  it("defaults a missing flag to published, for older clients", () => {
    const parsed = parseGigFields(body);
    if (!("fields" in parsed)) throw new Error("expected valid gig fields");
    expect(parsed.fields.isPublished).toBe(true);
  });

  it("keeps an explicit draft", () => {
    const parsed = parseGigFields({ ...body, is_published: false });
    if (!("fields" in parsed)) throw new Error("expected valid gig fields");
    expect(parsed.fields.isPublished).toBe(false);
  });

  it("rejects a non-boolean flag instead of guessing", () => {
    expect(parseGigFields({ ...body, is_published: "no" })).toMatchObject({
      code: "published_type",
    });
  });
});
