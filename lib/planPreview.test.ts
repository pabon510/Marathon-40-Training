import { describe, expect, it } from "vitest";
import { isValidLocalDate, previewNote, relationToToday } from "./planPreview";

describe("relationToToday", () => {
  it("classifies a date before today as past", () => {
    expect(relationToToday("2026-07-27", "2026-07-29")).toBe("past");
  });

  it("classifies today exactly as today", () => {
    expect(relationToToday("2026-07-29", "2026-07-29")).toBe("today");
  });

  it("classifies a date after today as future", () => {
    expect(relationToToday("2026-07-31", "2026-07-29")).toBe("future");
  });
});

describe("previewNote", () => {
  it("shows the subject-to-change note only for future days", () => {
    expect(previewNote("future")).toMatch(/may still change/);
  });

  it("shows no note for today or past days", () => {
    expect(previewNote("today")).toBeNull();
    expect(previewNote("past")).toBeNull();
  });
});

describe("isValidLocalDate", () => {
  it("accepts well-formed real calendar dates", () => {
    expect(isValidLocalDate("2026-07-29")).toBe(true);
    expect(isValidLocalDate("2026-01-01")).toBe(true);
    expect(isValidLocalDate("2024-02-29")).toBe(true); // leap day
  });

  it("rejects malformed strings", () => {
    expect(isValidLocalDate("not-a-date")).toBe(false);
    expect(isValidLocalDate("2026-7-29")).toBe(false);
    expect(isValidLocalDate("2026/07/29")).toBe(false);
    expect(isValidLocalDate("")).toBe(false);
  });

  it("rejects calendar dates that don't exist", () => {
    expect(isValidLocalDate("2026-02-30")).toBe(false);
    expect(isValidLocalDate("2025-02-29")).toBe(false); // not a leap year
    expect(isValidLocalDate("2026-13-01")).toBe(false);
  });
});
