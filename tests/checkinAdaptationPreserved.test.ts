import { describe, expect, it } from "vitest";
import { evaluateDailyAdaptation, type DailyAdaptationInput } from "@/domain/adaptation/evaluate";
import { evaluateGeneralRecovery, type RecoveryInputs } from "@/domain/adaptation/recovery";

/**
 * The check-in redesign changed how readiness is *collected*, not how it is
 * *judged*. These tests pin the agreed adaptation rules so a future change to
 * the form can never quietly move a threshold.
 */

function recovery(overrides: Partial<RecoveryInputs> = {}): RecoveryInputs {
  return {
    energy: 3,
    soreness: 2,
    fatigue: 3,
    hoursSlept: 7.5,
    ouraScore: null,
    recentOuraAverage: null,
    poorRecoveryYesterday: false,
    ...overrides,
  };
}

function day(overrides: Partial<DailyAdaptationInput> = {}): DailyAdaptationInput {
  return {
    plannedWorkoutKind: "easy_run",
    plannedDurationMinutes: 45,
    morningKnee: 1,
    priorDailyKnee: 1,
    recovery: recovery(),
    availableTime: "90_plus",
    localDate: "2026-07-29",
    ...overrides,
  };
}

describe("requirement 7: stress alone never reduces a workout", () => {
  it("is not an input to the recovery signal set at all", () => {
    // Stress is collected and stored, but deliberately absent from RecoveryInputs.
    expect(Object.keys(recovery())).not.toContain("stress");
  });

  it("leaves the workout untouched when only stress is high", () => {
    const result = evaluateDailyAdaptation(day());

    expect(result.chosenWorkoutKind).toBe("easy_run");
    expect(result.category).toBe("full");
    expect(result.blocked).toBe(false);
  });

  it("leaves the workout untouched with high stress and high fatigue but no other poor signal", () => {
    const result = evaluateDailyAdaptation(day({ recovery: recovery({ fatigue: 5 }) }));

    expect(result.chosenWorkoutKind).toBe("easy_run");
    expect(result.category).toBe("full");
  });
});

describe("requirement 8: two poor signals plus fatigue 4-5 can reduce a workout", () => {
  it("reduces on low energy + high soreness + fatigue 4", () => {
    const result = evaluateGeneralRecovery(recovery({ energy: 2, soreness: 4, fatigue: 4 }));

    expect(result.category).not.toBe("full");
    expect(result.reasonCode).toBe("RECOVERY_MULTI_SIGNAL");
    expect(result.progressionAllowed).toBe(false);
  });

  it("reduces on low energy + poor sleep + fatigue 5", () => {
    const result = evaluateGeneralRecovery(recovery({ energy: 1, hoursSlept: 5, fatigue: 5 }));

    expect(result.category).not.toBe("full");
  });

  it("does NOT reduce with two poor signals but fatigue only 3", () => {
    const result = evaluateGeneralRecovery(recovery({ energy: 2, soreness: 4, fatigue: 3 }));

    expect(result.category).toBe("full");
  });

  it("does NOT reduce with one poor signal and fatigue 5", () => {
    const result = evaluateGeneralRecovery(recovery({ energy: 2, fatigue: 5 }));

    expect(result.category).toBe("full");
  });

  it("counts an Oura score 12+ below the recent average as a poor signal", () => {
    const result = evaluateGeneralRecovery(
      recovery({ energy: 2, ouraScore: 78, recentOuraAverage: 91, fatigue: 4 }),
    );

    expect(result.category).not.toBe("full");
  });
});

describe("the knee rules are unchanged by the check-in redesign", () => {
  it("0-2 stable keeps the plan", () => {
    const result = evaluateDailyAdaptation(day({ morningKnee: 2, priorDailyKnee: 2 }));

    expect(result.chosenWorkoutKind).toBe("easy_run");
    expect(result.category).toBe("full");
  });

  it("3-5 stable downgrades threshold work to easy", () => {
    const result = evaluateDailyAdaptation(
      day({ plannedWorkoutKind: "threshold_run", morningKnee: 4, priorDailyKnee: 4 }),
    );

    expect(result.chosenWorkoutKind).toBe("easy_run");
    expect(result.progressionAllowed).toBe(false);
  });

  it("3-5 improving allows easy work but no progression", () => {
    const result = evaluateDailyAdaptation(day({ morningKnee: 3, priorDailyKnee: 5 }));

    expect(result.chosenWorkoutKind).toBe("easy_run");
    expect(result.progressionAllowed).toBe(false);
  });

  it("3-5 worsening replaces running and lower-body strength", () => {
    const result = evaluateDailyAdaptation(day({ morningKnee: 4, priorDailyKnee: 2 }));

    expect(result.chosenWorkoutKind).toBe("upper_core_safety");
  });

  it("6 or higher blocks running and lower-body strength", () => {
    const result = evaluateDailyAdaptation(day({ morningKnee: 6, priorDailyKnee: 6 }));

    expect(result.chosenWorkoutKind).toBe("upper_core_safety");
    expect(result.blocked).toBe(true);
  });

  it("an unanswered knee score falls back to the conservative non-running option", () => {
    const result = evaluateDailyAdaptation(day({ morningKnee: null, priorDailyKnee: 1 }));

    expect(result.chosenWorkoutKind).toBe("upper_core_safety");
    expect(result.reasonCode).toBe("CHECKIN_KNEE_UNKNOWN");
    expect(result.progressionAllowed).toBe(false);
  });

  it("an unanswered knee score is not treated as 0", () => {
    const unanswered = evaluateDailyAdaptation(day({ morningKnee: null, priorDailyKnee: 1 }));
    const explicitZero = evaluateDailyAdaptation(day({ morningKnee: 0, priorDailyKnee: 1 }));

    expect(unanswered.chosenWorkoutKind).toBe("upper_core_safety");
    expect(explicitZero.chosenWorkoutKind).toBe("easy_run");
  });
});
