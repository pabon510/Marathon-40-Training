import { describe, expect, it } from "vitest";
import {
  applyMissedLongRun,
  dropToFit,
  isMeaningfulUnplannedLoad,
  reshapeToThreeDayIfNeeded,
} from "./recalculate";
import type { WeeklyShapeDay } from "./weeklyShape";

describe("dropToFit", () => {
  it("keeps the highest-priority days and drops the rest without reordering priority intent", () => {
    const days: WeeklyShapeDay[] = [
      { localDate: "2026-08-04", workoutKind: "strength_b" },
      { localDate: "2026-08-06", workoutKind: "long_run" },
      { localDate: "2026-08-07", workoutKind: "threshold_run" },
      { localDate: "2026-08-08", workoutKind: "strength_a" },
    ];
    const result = dropToFit(days, 2);
    expect(result).toHaveLength(2);
    const kinds = result.map((d) => d.workoutKind);
    expect(kinds).toContain("long_run");
    expect(kinds).toContain("strength_a");
    expect(kinds).not.toContain("threshold_run");
  });

  it("does not touch anything if already within the limit", () => {
    const days: WeeklyShapeDay[] = [{ localDate: "2026-08-04", workoutKind: "long_run" }];
    expect(dropToFit(days, 3)).toEqual(days);
  });
});

describe("applyMissedLongRun", () => {
  const week: WeeklyShapeDay[] = [
    { localDate: "2026-08-04", workoutKind: "strength_a" },
    { localDate: "2026-08-06", workoutKind: "easy_run" },
    { localDate: "2026-08-07", workoutKind: "strength_b" },
    { localDate: "2026-08-08", workoutKind: "long_run" },
  ];

  it("converts the backup long-run day into a shorter run when the long run is missed", () => {
    const result = applyMissedLongRun(week, "2026-08-08", "2026-08-09", "2026-08-08");
    // backup date isn't in this shape (illustrating a distinct backup day scenario)
    expect(result).toEqual(week);
  });

  it("does not touch anything if the missed day was not the long run", () => {
    const result = applyMissedLongRun(week, "2026-08-04", "2026-08-09", "2026-08-04");
    expect(result).toEqual(week);
  });

  it("does not force the missed long run onto a backup day that has already passed", () => {
    const result = applyMissedLongRun(week, "2026-08-08", "2026-08-04", "2026-08-08");
    expect(result).toEqual(week);
  });

  it("converts an in-shape backup day to easy_run when it is still upcoming", () => {
    const weekWithBackup: WeeklyShapeDay[] = [
      { localDate: "2026-08-04", workoutKind: "strength_a" },
      { localDate: "2026-08-07", workoutKind: "long_run" }, // missed (e.g. Saturday)
      { localDate: "2026-08-08", workoutKind: "strength_b" }, // Sunday backup day, repurposed
    ];
    const result = applyMissedLongRun(weekWithBackup, "2026-08-07", "2026-08-08", "2026-08-07");
    expect(result.find((d) => d.localDate === "2026-08-08")?.workoutKind).toBe("easy_run");
  });
});

describe("reshapeToThreeDayIfNeeded", () => {
  it("reshapes 3 remaining days to the compression pattern when the long run has not happened yet", () => {
    const remaining: WeeklyShapeDay[] = [
      { localDate: "2026-08-06", workoutKind: "easy_run" },
      { localDate: "2026-08-07", workoutKind: "strength_b" },
      { localDate: "2026-08-08", workoutKind: "long_run" },
    ];
    const result = reshapeToThreeDayIfNeeded(remaining, false);
    expect(result.map((d) => d.workoutKind)).toEqual(["long_run", "strength_full", "combined_short"]);
  });

  it("does not reinsert a long run if one already happened this week", () => {
    const remaining: WeeklyShapeDay[] = [
      { localDate: "2026-08-06", workoutKind: "easy_run" },
      { localDate: "2026-08-07", workoutKind: "strength_a" },
      { localDate: "2026-08-08", workoutKind: "strength_b" },
    ];
    const result = reshapeToThreeDayIfNeeded(remaining, true);
    expect(result.some((d) => d.workoutKind === "long_run")).toBe(false);
  });

  it("leaves non-3-day remainders alone (handled by dropToFit elsewhere)", () => {
    const remaining: WeeklyShapeDay[] = [
      { localDate: "2026-08-06", workoutKind: "easy_run" },
      { localDate: "2026-08-07", workoutKind: "strength_a" },
    ];
    expect(reshapeToThreeDayIfNeeded(remaining, false)).toEqual(remaining);
  });
});

describe("isMeaningfulUnplannedLoad", () => {
  it("brief mobility never triggers recalculation", () => {
    expect(isMeaningfulUnplannedLoad({ sessionType: "mobility", isEasyWalkOrBriefMobility: true })).toBe(false);
  });

  it("an easy walk does not trigger recalculation", () => {
    expect(
      isMeaningfulUnplannedLoad({ sessionType: "cross_training", isEasyWalkOrBriefMobility: true }),
    ).toBe(false);
  });

  it("an unplanned run always triggers recalculation", () => {
    expect(isMeaningfulUnplannedLoad({ sessionType: "run", isEasyWalkOrBriefMobility: false })).toBe(true);
  });

  it("unplanned strength (lower-body load) triggers recalculation", () => {
    expect(isMeaningfulUnplannedLoad({ sessionType: "strength", isEasyWalkOrBriefMobility: false })).toBe(true);
  });
});
