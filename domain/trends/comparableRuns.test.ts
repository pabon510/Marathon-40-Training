import { describe, expect, it } from "vitest";
import { findComparableTrend, type ComparableRunCandidate } from "./comparableRuns";

function run(overrides: Partial<ComparableRunCandidate> & { id: string; localDate: string }): ComparableRunCandidate {
  return {
    isThreshold: false,
    runType: "outdoor",
    durationSeconds: 30 * 60,
    paceSecondsPerMile: 9 * 60 + 15,
    averageHr: 148,
    effort: 5,
    kneeNextMorning: 1,
    ...overrides,
  };
}

describe("findComparableTrend", () => {
  it("returns null with fewer than two runs", () => {
    expect(findComparableTrend([run({ id: "1", localDate: "2026-07-01" })])).toBeNull();
  });

  it("detects faster pace at similar HR as improvement", () => {
    const result = findComparableTrend([
      run({ id: "1", localDate: "2026-07-01", paceSecondsPerMile: 9 * 60 + 15, averageHr: 148 }),
      run({ id: "2", localDate: "2026-07-08", paceSecondsPerMile: 9 * 60, averageHr: 147 }),
    ]);
    expect(result?.improved).toBe(true);
    expect(result?.basis).toBe("faster_pace_similar_hr");
  });

  it("detects lower HR at similar pace as improvement", () => {
    const result = findComparableTrend([
      run({ id: "1", localDate: "2026-07-01", paceSecondsPerMile: 555, averageHr: 150 }),
      run({ id: "2", localDate: "2026-07-08", paceSecondsPerMile: 553, averageHr: 143 }),
    ]);
    expect(result?.improved).toBe(true);
    expect(result?.basis).toBe("lower_hr_similar_pace");
  });

  it("detects longer duration without higher effort or next-morning knee as improvement", () => {
    const result = findComparableTrend([
      run({ id: "1", localDate: "2026-07-01", durationSeconds: 25 * 60, effort: 5, kneeNextMorning: 1 }),
      run({
        id: "2",
        localDate: "2026-07-08",
        durationSeconds: 33 * 60,
        effort: 5,
        kneeNextMorning: 1,
        paceSecondsPerMile: 9 * 60 + 20,
        averageHr: 149,
      }),
    ]);
    expect(result?.improved).toBe(true);
    expect(result?.basis).toBe("longer_duration_same_effort");
  });

  it("does not treat a longer run as improvement if effort or knee got worse", () => {
    const result = findComparableTrend([
      run({ id: "1", localDate: "2026-07-01", durationSeconds: 25 * 60, effort: 5, kneeNextMorning: 1 }),
      run({
        id: "2",
        localDate: "2026-07-08",
        durationSeconds: 33 * 60,
        effort: 8,
        kneeNextMorning: 3,
        paceSecondsPerMile: 9 * 60 + 20,
        averageHr: 149,
      }),
    ]);
    expect(result?.improved).toBe(false);
  });

  it("excludes threshold runs from comparison entirely", () => {
    const result = findComparableTrend([
      run({ id: "1", localDate: "2026-07-01", isThreshold: true, paceSecondsPerMile: 480 }),
      run({ id: "2", localDate: "2026-07-08", paceSecondsPerMile: 9 * 60 }),
    ]);
    // Only one non-threshold run remains, so no pair is comparable.
    expect(result).toBeNull();
  });

  it("keeps outdoor and treadmill runs separate", () => {
    const result = findComparableTrend([
      run({ id: "1", localDate: "2026-07-01", runType: "treadmill", paceSecondsPerMile: 9 * 60 }),
      run({ id: "2", localDate: "2026-07-08", runType: "outdoor", paceSecondsPerMile: 9 * 60 }),
    ]);
    expect(result).toBeNull();
  });

  it("excludes runs whose duration differs by more than ~10 minutes", () => {
    const result = findComparableTrend([
      run({ id: "1", localDate: "2026-07-01", durationSeconds: 20 * 60 }),
      run({ id: "2", localDate: "2026-07-08", durationSeconds: 45 * 60 }),
    ]);
    expect(result).toBeNull();
  });

  it("finds the nearest comparable predecessor, skipping a non-comparable run in between", () => {
    const result = findComparableTrend([
      run({ id: "1", localDate: "2026-07-01", durationSeconds: 30 * 60, paceSecondsPerMile: 9 * 60 + 15 }),
      run({ id: "2", localDate: "2026-07-05", durationSeconds: 70 * 60 }), // not comparable (long run)
      run({ id: "3", localDate: "2026-07-08", durationSeconds: 30 * 60, paceSecondsPerMile: 9 * 60 }),
    ]);
    expect(result?.earlier.id).toBe("1");
    expect(result?.later.id).toBe("3");
  });
});
