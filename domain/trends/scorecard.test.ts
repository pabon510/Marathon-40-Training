import { describe, expect, it } from "vitest";
import { evaluateScorecard, type ScorecardInputs } from "./scorecard";

function baseInputs(overrides: Partial<ScorecardInputs> = {}): ScorecardInputs {
  return {
    strengthSessionsCompleted: 7,
    weeklyAdaptedPlanCompletionRates: [0.8, 0.8, 0.8, 0.8],
    hasQualifyingComparableRun: true,
    weeklyMaxKnee: [2, 2, 1, 1],
    checkedInWorkoutDays: 16,
    totalWorkoutDays: 18,
    fourWeekWindowComplete: true,
    ...overrides,
  };
}

describe("evaluateScorecard", () => {
  it("succeeds when all 5 criteria are met", () => {
    const result = evaluateScorecard(baseInputs());
    expect(result.metCount).toBe(5);
    expect(result.success).toBe(true);
  });

  it("succeeds at exactly 4 of 5", () => {
    const result = evaluateScorecard(baseInputs({ strengthSessionsCompleted: 5 }));
    expect(result.metCount).toBe(4);
    expect(result.success).toBe(true);
  });

  it("fails at 3 of 5", () => {
    const result = evaluateScorecard(
      baseInputs({ strengthSessionsCompleted: 5, hasQualifyingComparableRun: false }),
    );
    expect(result.metCount).toBe(3);
    expect(result.success).toBe(false);
  });

  it("computes the 75%-in-3-of-4-weeks criterion correctly", () => {
    const result = evaluateScorecard(
      baseInputs({ weeklyAdaptedPlanCompletionRates: [0.8, 0.5, 0.8, 0.4] }),
    );
    const criterion = result.criteria.find((c) => c.id === "adapted_plan_completion");
    expect(criterion?.met).toBe(false); // only 2 of 4 weeks >= 75%
  });

  it("knee trend criterion fails if week 4 max is higher than week 1 max", () => {
    const result = evaluateScorecard(baseInputs({ weeklyMaxKnee: [1, 2, 3, 4] }));
    const criterion = result.criteria.find((c) => c.id === "knee_trend");
    expect(criterion?.met).toBe(false);
  });

  it("does not award the knee trend goal before the four-week window is complete", () => {
    const result = evaluateScorecard(baseInputs({ fourWeekWindowComplete: false }));
    const criterion = result.criteria.find((c) => c.id === "knee_trend");
    expect(criterion?.met).toBe(false);
  });

  it("checkin completion uses the 80% threshold on workout days", () => {
    const result = evaluateScorecard(baseInputs({ checkedInWorkoutDays: 14, totalWorkoutDays: 18 }));
    const criterion = result.criteria.find((c) => c.id === "checkin_completion");
    expect(criterion?.met).toBe(false); // 14/18 = 77.8%
  });
});
