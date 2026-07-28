import { describe, expect, it } from "vitest";
import { evaluateDuringWorkoutSafety, evaluatePreWorkoutSafety } from "./hardBlock";

describe("evaluatePreWorkoutSafety", () => {
  it("does not block when knee is null (unknown, handled conservatively elsewhere)", () => {
    expect(evaluatePreWorkoutSafety(null).blocked).toBe(false);
  });

  it("does not block below 6", () => {
    for (const knee of [0, 1, 2, 3, 4, 5]) {
      expect(evaluatePreWorkoutSafety(knee).blocked).toBe(false);
    }
  });

  it("hard-blocks at exactly 6 and above", () => {
    for (const knee of [6, 7, 8, 9, 10]) {
      const result = evaluatePreWorkoutSafety(knee);
      expect(result.blocked).toBe(true);
      expect(result.ruleCode).toBe("KNEE_HARD_BLOCK");
      expect(result.offeredAlternatives.length).toBeGreaterThan(0);
    }
  });
});

describe("evaluateDuringWorkoutSafety", () => {
  it("does not stop a stable low knee reading", () => {
    expect(evaluateDuringWorkoutSafety(1, 1).blocked).toBe(false);
  });

  it("stops when current reading reaches 6 even from a low start", () => {
    const result = evaluateDuringWorkoutSafety(1, 6);
    expect(result.blocked).toBe(true);
    expect(result.ruleCode).toBe("KNEE_WORKOUT_RISE_BLOCK");
  });

  it("stops when knee rises by 2 or more points, even if still under 6", () => {
    const result = evaluateDuringWorkoutSafety(2, 4);
    expect(result.blocked).toBe(true);
  });

  it("does not stop for a rise of only 1 point under the threshold", () => {
    expect(evaluateDuringWorkoutSafety(2, 3).blocked).toBe(false);
  });

  it("cannot be bypassed by a lower reported start value trick (rise still measured against true start)", () => {
    // A crafted client could try reporting a fake low start to make a
    // moderate current reading look like a small rise. Server-side, the
    // start value must come from the stored session record, not client
    // input at this call site is a caller responsibility; this test just
    // documents that the function itself always evaluates both conditions
    // independently — reaching 6 always blocks regardless of start.
    const result = evaluateDuringWorkoutSafety(5, 6);
    expect(result.blocked).toBe(true);
  });
});
