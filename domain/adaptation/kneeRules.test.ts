import { describe, expect, it } from "vitest";
import { computeKneeTrend, evaluateKneeAdaptation } from "./kneeRules";

describe("computeKneeTrend", () => {
  it("is unknown with no prior score", () => {
    expect(computeKneeTrend(2, null)).toBe("unknown");
  });
  it("is worsening when higher than prior", () => {
    expect(computeKneeTrend(3, 2)).toBe("worsening");
  });
  it("is improving when lower than prior", () => {
    expect(computeKneeTrend(1, 2)).toBe("improving");
  });
  it("is stable when equal to prior", () => {
    expect(computeKneeTrend(2, 2)).toBe("stable");
  });
});

describe("evaluateKneeAdaptation", () => {
  it("case 1: 0-2 stable keeps plan and allows progression", () => {
    const result = evaluateKneeAdaptation(1, "stable");
    expect(result.category).toBe("full");
    expect(result.progressionAllowed).toBe(true);
  });

  it("0-2 improving keeps plan and allows progression", () => {
    const result = evaluateKneeAdaptation(0, "improving");
    expect(result.category).toBe("full");
    expect(result.progressionAllowed).toBe(true);
  });

  it("0-2 worsening keeps the workout kind but blocks progression", () => {
    const result = evaluateKneeAdaptation(2, "worsening");
    expect(result.category).toBe("full");
    expect(result.progressionAllowed).toBe(false);
    expect(result.reasonCode).toBe("KNEE_WORSENING_0_2");
  });

  it("case 2: 3-5 improving permits easy running with no increase", () => {
    const result = evaluateKneeAdaptation(4, "improving");
    expect(result.category).toBe("easy_cap");
    expect(result.progressionAllowed).toBe(false);
    expect(result.requiresPainNeutralLowerBody).toBe(false);
  });

  it("case 3: 3-5 stable downgrades threshold work and requires pain-neutral strength", () => {
    const result = evaluateKneeAdaptation(3, "stable");
    expect(result.category).toBe("easy_cap");
    expect(result.requiresPainNeutralLowerBody).toBe(true);
    expect(result.reasonCode).toBe("KNEE_STABLE_3_5_THRESHOLD_DOWNGRADE");
  });

  it("3-5 with unknown trend is treated at least as conservatively as stable", () => {
    const result = evaluateKneeAdaptation(5, "unknown");
    expect(result.category).toBe("easy_cap");
    expect(result.progressionAllowed).toBe(false);
  });

  it("case 4: 3-5 worsening removes running/lower-body strength", () => {
    const result = evaluateKneeAdaptation(5, "worsening");
    expect(result.category).toBe("upper_core_only");
    expect(result.reasonCode).toBe("KNEE_WORSENING_3_5");
  });

  it("case 5: 6-10 hard-blocks regardless of trend", () => {
    for (const trend of ["improving", "stable", "worsening", "unknown"] as const) {
      const result = evaluateKneeAdaptation(6, trend);
      expect(result.category).toBe("blocked");
      expect(result.progressionAllowed).toBe(false);
    }
    expect(evaluateKneeAdaptation(10, "stable").category).toBe("blocked");
  });

  it("never allows progression outside the 0-2 stable/improving case", () => {
    const nonProgressingCases = [
      evaluateKneeAdaptation(2, "worsening"),
      evaluateKneeAdaptation(4, "improving"),
      evaluateKneeAdaptation(3, "stable"),
      evaluateKneeAdaptation(5, "worsening"),
      evaluateKneeAdaptation(7, "improving"),
    ];
    for (const result of nonProgressingCases) {
      expect(result.progressionAllowed).toBe(false);
    }
  });
});
