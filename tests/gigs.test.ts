import { describe, expect, it } from "vitest";

import {
  formatGigDate,
  formatGigTime,
  isPastGig,
  todayIsoDate,
} from "../data/gigs";
import {
  isValidDate,
  isValidHttpUrl,
  isValidTime,
  parseGigFields,
} from "../functions/api/admin/gig-rules";

/** A complete, valid gig payload. */
function payload(overrides: Record<string, unknown> = {}) {
  return {
    event_date: "2026-10-04",
    start_time: "19:00",
    venue: "Boganeberget",
    city: "Kil",
    ticket_url: "https://tickets.example.com/parlband",
    info: "med Vanten",
    ...overrides,
  };
}

describe("formatGigDate", () => {
  it("formats an ISO date in Swedish without shifting the day", () => {
    expect(formatGigDate("2026-10-04")).toBe("sön 4 okt. 2026");
    expect(formatGigDate("2026-01-01")).toBe("tors 1 jan. 2026");
    expect(formatGigDate("2027-12-31")).toBe("fre 31 dec. 2027");
  });

  it("passes an unparseable value through unchanged", () => {
    expect(formatGigDate("inte-ett-datum")).toBe("inte-ett-datum");
  });
});

describe("formatGigTime", () => {
  it("prefixes a set time and hides an empty one", () => {
    expect(formatGigTime("19:00")).toBe("kl. 19:00");
    expect(formatGigTime(null)).toBeNull();
  });
});

describe("todayIsoDate / isPastGig", () => {
  it("zero-pads the local date", () => {
    expect(todayIsoDate(new Date(2026, 0, 4, 23, 30))).toBe("2026-01-04");
  });

  it("treats today as upcoming and yesterday as past", () => {
    const today = "2026-10-04";
    expect(isPastGig("2026-10-04", today)).toBe(false);
    expect(isPastGig("2026-10-05", today)).toBe(false);
    expect(isPastGig("2026-10-03", today)).toBe(true);
  });
});

describe("isValidDate", () => {
  it("accepts real ISO dates", () => {
    expect(isValidDate("2026-10-04")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true);
  });

  it("rejects wrong shapes and impossible dates", () => {
    expect(isValidDate("2026-2-4")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-02-31")).toBe(false);
    expect(isValidDate("2025-02-29")).toBe(false);
  });
});

describe("isValidTime", () => {
  it("accepts HH:MM within a day only", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("19:60")).toBe(false);
    expect(isValidTime("7:05")).toBe(false);
  });
});

describe("isValidHttpUrl", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(isValidHttpUrl("https://example.com/x")).toBe(true);
    expect(isValidHttpUrl("http://example.com")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isValidHttpUrl("example.com")).toBe(false);
    expect(isValidHttpUrl("mailto:parlbandet@gmail.com")).toBe(false);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("parseGigFields", () => {
  it("normalises a complete payload", () => {
    const parsed = parseGigFields(payload());
    expect(parsed).toEqual({
      fields: {
        eventDate: "2026-10-04",
        startTime: "19:00",
        venue: "Boganeberget",
        city: "Kil",
        ticketUrl: "https://tickets.example.com/parlband",
        info: "med Vanten",
      },
    });
  });

  it("turns empty optional fields into null", () => {
    const parsed = parseGigFields(
      payload({ start_time: "", city: "", ticket_url: "", info: "" })
    );
    expect(parsed).toEqual({
      fields: {
        eventDate: "2026-10-04",
        startTime: null,
        venue: "Boganeberget",
        city: null,
        ticketUrl: null,
        info: null,
      },
    });
  });

  it("requires a date and a venue", () => {
    expect(parseGigFields(payload({ event_date: "" }))).toEqual({
      error: "event_date is required",
      code: "date_required",
    });
    expect(parseGigFields(payload({ venue: "  " }))).toEqual({
      error: "venue is required",
      code: "venue_required",
    });
  });

  it("rejects bad dates, times, urls and types", () => {
    // The codes are what components/admin/GigsSection.tsx maps to Swedish copy,
    // so they are part of the contract and asserted here.
    expect(parseGigFields(payload({ event_date: "2026-02-31" }))).toEqual({
      error: "event_date must be a valid date (YYYY-MM-DD)",
      code: "date_invalid",
    });
    expect(parseGigFields(payload({ start_time: "25:00" }))).toEqual({
      error: "start_time must be HH:MM",
      code: "time_invalid",
    });
    expect(parseGigFields(payload({ start_time: 5 }))).toEqual({
      error: "start_time must be a string or null",
      code: "time_type",
    });
    expect(parseGigFields(payload({ ticket_url: "example.com" }))).toEqual({
      error: "ticket_url must be an http(s) URL",
      code: "ticket_url_invalid",
    });
    expect(parseGigFields(payload({ city: 5 }))).toEqual({
      error: "city must be a string or null",
      code: "city_type",
    });
    expect(parseGigFields(payload({ info: 5 }))).toEqual({
      error: "info must be a string or null",
      code: "info_type",
    });
  });
});
