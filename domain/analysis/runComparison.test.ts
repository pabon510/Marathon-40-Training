import { describe, expect, it } from "vitest";
import { selectComparableRun, type ComparableRunCandidate } from "./runComparison";

const run = (patch: Partial<ComparableRunCandidate> = {}): ComparableRunCandidate => ({
  runLogId: "current", localDate: "2026-08-02", workoutKind: "long_run", runType: "outdoor", isStroller: true,
  durationSeconds: 4200, paceSecondsPerMile: 630, averageHr: 160, maximumHr: 174, effort: 8,
  averageTemperatureF: 79, immediateKnee: 0, ...patch,
});

describe("comparable run selection", () => {
  it("uses an earlier stroller aerobic run and calculates the HR gap", () => {
    const result = selectComparableRun(run(), [run({ runLogId: "prior", localDate: "2026-07-30", workoutKind: "easy_run", durationSeconds: 2100, averageHr: 146 })]);
    expect(result?.prior.runLogId).toBe("prior");
    expect(result?.differences.averageHrBpm).toBe(14);
    expect(result?.selectionReason).toContain("workout type differ");
  });

  it("never compares stroller and standard runs", () => {
    expect(selectComparableRun(run(), [run({ runLogId: "prior", localDate: "2026-07-30", isStroller: false })])).toBeNull();
  });

  it("prefers the same workout kind when contexts match", () => {
    const result = selectComparableRun(run(), [
      run({ runLogId: "easy", localDate: "2026-08-01", workoutKind: "easy_run" }),
      run({ runLogId: "long", localDate: "2026-07-20", workoutKind: "long_run" }),
    ]);
    expect(result?.prior.runLogId).toBe("long");
  });
});
