import { describe, expect, it } from "vitest";
import { evaluateDailyAdaptation, type DailyAdaptationInput } from "./evaluate";
import type { RecoveryInputs } from "./recovery";

function goodRecovery(): RecoveryInputs {
  return {
    energy: 4,
    soreness: 2,
    fatigue: 2,
    hoursSlept: 8,
    ouraScore: null,
    recentOuraAverage: null,
    poorRecoveryYesterday: false,
  };
}

function baseInput(overrides: Partial<DailyAdaptationInput> = {}): DailyAdaptationInput {
  return {
    plannedWorkoutKind: "threshold_run",
    plannedDurationMinutes: 40,
    morningKnee: 1,
    priorDailyKnee: 1,
    recovery: goodRecovery(),
    availableTime: "60",
    localDate: "2026-07-28",
    ...overrides,
  };
}

describe("evaluateDailyAdaptation", () => {
  it("a good check-in never increases today's prescription (keeps planned kind, full duration)", () => {
    const result = evaluateDailyAdaptation(baseInput());
    expect(result.chosenWorkoutKind).toBe("threshold_run");
    expect(result.blocked).toBe(false);
    expect(result.cappedDurationMinutes).toBe(40);
    expect(result.category).toBe("full");
  });

  it("case 5: knee 6 hard-blocks running and downgrades to upper_core_safety", () => {
    const result = evaluateDailyAdaptation(baseInput({ morningKnee: 6 }));
    expect(result.blocked).toBe(true);
    expect(result.chosenWorkoutKind).toBe("upper_core_safety");
    expect(result.reasonCode).toBe("KNEE_HARD_BLOCK");
  });

  it("case 3: knee 3-5 stable downgrades threshold run to easy run", () => {
    const result = evaluateDailyAdaptation(
      baseInput({ morningKnee: 4, priorDailyKnee: 4 }),
    );
    expect(result.chosenWorkoutKind).toBe("easy_run");
    expect(result.blocked).toBe(false);
    expect(result.progressionAllowed).toBe(false);
  });

  it("case 4: knee 3-5 worsening removes running entirely for the day", () => {
    const result = evaluateDailyAdaptation(
      baseInput({ morningKnee: 4, priorDailyKnee: 2 }),
    );
    expect(result.chosenWorkoutKind).toBe("upper_core_safety");
    expect(result.reasonCode).toBe("KNEE_WORSENING_3_5");
  });

  it("lower-body strength is downgraded the same way running is under upper_core_only", () => {
    const result = evaluateDailyAdaptation(
      baseInput({ plannedWorkoutKind: "strength_a", morningKnee: 4, priorDailyKnee: 2 }),
    );
    expect(result.chosenWorkoutKind).toBe("upper_core_safety");
  });

  it("time compression: available time well below planned duration triggers short version", () => {
    const result = evaluateDailyAdaptation(baseInput({ availableTime: "15" }));
    expect(result.cappedDurationMinutes).toBe(15);
    expect(result.useShortVersion).toBe(true);
  });

  it("does not use short version when available time comfortably covers the plan", () => {
    const result = evaluateDailyAdaptation(baseInput({ availableTime: "75" }));
    expect(result.useShortVersion).toBe(false);
    expect(result.cappedDurationMinutes).toBe(40);
  });

  it("recovery downgrade cannot be weakened by a fine knee score, and vice versa (most restrictive wins)", () => {
    const result = evaluateDailyAdaptation(
      baseInput({
        morningKnee: 1,
        priorDailyKnee: 1,
        recovery: {
          energy: 1,
          soreness: 5,
          fatigue: 5,
          hoursSlept: 4,
          ouraScore: null,
          recentOuraAverage: null,
          poorRecoveryYesterday: false,
        },
      }),
    );
    expect(result.category).toBe("upper_core_only");
    expect(result.chosenWorkoutKind).toBe("upper_core_safety");
    expect(result.reasonCode).toBe("RECOVERY_MULTI_SIGNAL");
  });

  it("is a pure function: identical inputs always produce an identical result (no hidden state/duplication)", () => {
    const input = baseInput({ morningKnee: 4, priorDailyKnee: 2 });
    const first = evaluateDailyAdaptation(input);
    const second = evaluateDailyAdaptation(input);
    expect(second).toEqual(first);
  });

  it("missing morning knee is handled conservatively (upper/core only) without claiming a hard block", () => {
    const result = evaluateDailyAdaptation(baseInput({ morningKnee: null }));
    expect(result.blocked).toBe(false);
    expect(result.chosenWorkoutKind).toBe("upper_core_safety");
    expect(result.reasonCode).toBe("CHECKIN_KNEE_UNKNOWN");
  });
});
