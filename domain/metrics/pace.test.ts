import { describe, expect, it } from "vitest";
import { calculatePaceSecondsPerMile, formatDuration, formatPace } from "./pace";

describe("calculatePaceSecondsPerMile", () => {
  it("derives pace from distance and duration", () => {
    expect(calculatePaceSecondsPerMile(6, 6 * 9.25 * 60)).toBeCloseTo(555, 0);
  });
  it("returns null for zero distance", () => {
    expect(calculatePaceSecondsPerMile(0, 1000)).toBeNull();
  });
});

describe("formatPace", () => {
  it("formats seconds/mile as M:SS/mi", () => {
    expect(formatPace(555)).toBe("9:15/mi");
    expect(formatPace(60)).toBe("1:00/mi");
  });
});

describe("formatDuration", () => {
  it("formats under an hour as M:SS", () => {
    expect(formatDuration(125)).toBe("2:05");
  });
  it("formats an hour or more as H:MM:SS", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});
