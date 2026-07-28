import { describe, expect, it } from "vitest";
import { generateWeeklyShape } from "./weeklyShape";

describe("generateWeeklyShape", () => {
  it("4-day default: two strength and two runs, long run on the chosen day", () => {
    const days = generateWeeklyShape(
      ["2026-08-04", "2026-08-06", "2026-08-07", "2026-08-08"], // Tue Thu Fri Sat
      "2026-08-08",
      1,
    );
    expect(days).toHaveLength(4);
    const kinds = days.map((d) => d.workoutKind).sort();
    expect(kinds).toEqual(["easy_run", "long_run", "strength_a", "strength_b"].sort());
    expect(days.find((d) => d.localDate === "2026-08-08")?.workoutKind).toBe("long_run");
  });

  it("4-day default avoids scheduling the two strength sessions on calendar-adjacent days when possible", () => {
    const days = generateWeeklyShape(
      ["2026-08-04", "2026-08-06", "2026-08-07", "2026-08-08"], // Tue Thu Fri Sat
      "2026-08-08",
      1,
    );
    const strengthDates = days
      .filter((d) => d.workoutKind === "strength_a" || d.workoutKind === "strength_b")
      .map((d) => d.localDate)
      .sort();
    const [a, b] = strengthDates;
    const diffDays = Math.abs(
      (new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000,
    );
    expect(diffDays).toBeGreaterThan(1);
  });

  it("5-day default: two strength and three runs", () => {
    const days = generateWeeklyShape(
      ["2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"],
      "2026-08-08",
      1,
    );
    expect(days).toHaveLength(5);
    const runCount = days.filter((d) =>
      ["long_run", "easy_run", "threshold_run"].includes(d.workoutKind),
    ).length;
    const strengthCount = days.filter((d) => ["strength_a", "strength_b"].includes(d.workoutKind)).length;
    expect(runCount).toBe(3);
    expect(strengthCount).toBe(2);
  });

  it("3-day compression: long run, full-body strength, combined short run+strength", () => {
    const days = generateWeeklyShape(["2026-08-04", "2026-08-07", "2026-08-08"], "2026-08-08", 1);
    expect(days).toHaveLength(3);
    const kinds = days.map((d) => d.workoutKind).sort();
    expect(kinds).toEqual(["combined_short", "long_run", "strength_full"].sort());
  });

  it("threshold replaces a short easy run only on a threshold week", () => {
    const calibrationWeek = generateWeeklyShape(
      ["2026-08-04", "2026-08-06", "2026-08-07", "2026-08-08"],
      "2026-08-08",
      1,
    );
    expect(calibrationWeek.some((d) => d.workoutKind === "threshold_run")).toBe(false);

    const thresholdWeek = generateWeeklyShape(
      ["2026-08-18", "2026-08-20", "2026-08-21", "2026-08-22"],
      "2026-08-22",
      3,
    );
    expect(thresholdWeek.some((d) => d.workoutKind === "threshold_run")).toBe(true);
    expect(thresholdWeek.some((d) => d.workoutKind === "long_run")).toBe(true);
  });

  it("throws if the long run date is not one of the available dates", () => {
    expect(() => generateWeeklyShape(["2026-08-04", "2026-08-06"], "2026-08-08", 1)).toThrow();
  });
});
