import { describe, expect, it } from "vitest";
import { addDays, mondayOfWeek, nextWeekday, weekdayName } from "./date";

describe("mondayOfWeek", () => {
  it("returns the same date if already Monday", () => {
    expect(mondayOfWeek("2026-08-03")).toBe("2026-08-03");
  });
  it("returns the prior Monday for a mid-week date", () => {
    expect(mondayOfWeek("2026-08-07")).toBe("2026-08-03"); // Friday
  });
  it("handles Sunday correctly (belongs to the week that just ended)", () => {
    expect(mondayOfWeek("2026-08-09")).toBe("2026-08-03");
  });
});

describe("weekdayName / addDays / nextWeekday", () => {
  it("computes weekday name", () => {
    expect(weekdayName("2026-08-03")).toBe("monday");
    expect(weekdayName("2026-08-08")).toBe("saturday");
  });
  it("adds days across month boundaries", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
  });
  it("finds the next occurrence of a weekday, inclusive", () => {
    expect(nextWeekday("2026-08-03", "monday")).toBe("2026-08-03");
    expect(nextWeekday("2026-08-03", "friday")).toBe("2026-08-07");
    expect(nextWeekday("2026-08-08", "tuesday")).toBe("2026-08-11");
  });
});
