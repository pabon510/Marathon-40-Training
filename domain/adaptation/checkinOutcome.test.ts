import { describe, expect, it } from "vitest";
import { buildCheckInOutcome, type CheckInOutcomeInput } from "./checkinOutcome";

function baseInput(overrides: Partial<CheckInOutcomeInput> = {}): CheckInOutcomeInput {
  return {
    changed: false,
    before: { workoutKind: "strength_b", durationMinutes: 45, locationChoice: "home" },
    after: { workoutKind: "strength_b", durationMinutes: 45, locationChoice: "home" },
    blocked: false,
    reasonCode: "NO_CHANGE",
    fallbackExplanation: "Knee discomfort is low and stable or improving, so today's planned workout is kept.",
    values: {
      knee: 1,
      priorDailyKnee: 1,
      energy: 4,
      soreness: 2,
      fatigue: 2,
      hoursSlept: 7.5,
      ouraScore: null,
      availableMinutes: 45,
    },
    ...overrides,
  };
}

describe("buildCheckInOutcome — requirement 10: the result explains whether the workout changed", () => {
  it("states the workout was confirmed and unchanged", () => {
    const outcome = buildCheckInOutcome(baseInput());

    expect(outcome.changed).toBe(false);
    expect(outcome.headline).toBe("Workout confirmed: Home Strength B, 45 minutes");
    expect(outcome.detail).toBe("No change was made. Recovery and knee scores were within the allowed range.");
    expect(outcome.reason).toBeNull();
  });

  it("names both the before and after workout when recovery shortened it", () => {
    const outcome = buildCheckInOutcome(
      baseInput({
        changed: true,
        before: { workoutKind: "strength_b", durationMinutes: 50, locationChoice: "home" },
        after: { workoutKind: "strength_b", durationMinutes: 30, locationChoice: "home" },
        reasonCode: "RECOVERY_MULTI_SIGNAL",
        values: {
          knee: 1,
          priorDailyKnee: 1,
          energy: 2,
          soreness: 2,
          fatigue: 4,
          hoursSlept: 7,
          ouraScore: null,
          availableMinutes: 30,
        },
      }),
    );

    expect(outcome.changed).toBe(true);
    expect(outcome.headline).toBe(
      "Workout adjusted: 50-minute Strength B changed to a 30-minute home workout.",
    );
    expect(outcome.reason).toBe("Reason: Energy was low (2/5) and fatigue was 4/5.");
  });

  it("explains a knee-driven replacement using the actual before/after knee scores", () => {
    const outcome = buildCheckInOutcome(
      baseInput({
        changed: true,
        before: { workoutKind: "easy_run", durationMinutes: 40, locationChoice: null },
        after: { workoutKind: "upper_core_safety", durationMinutes: 35, locationChoice: null },
        reasonCode: "KNEE_WORSENING_3_5",
        values: {
          knee: 4,
          priorDailyKnee: 2,
          energy: 4,
          soreness: 2,
          fatigue: 2,
          hoursSlept: 7.5,
          ouraScore: null,
          availableMinutes: null,
        },
      }),
    );

    expect(outcome.headline).toBe("Today's run was replaced with upper-body and core work.");
    expect(outcome.reason).toBe("Reason: Knee discomfort increased from 2 to 4.");
  });

  it("describes replacing lower-body strength differently from replacing a run", () => {
    const outcome = buildCheckInOutcome(
      baseInput({
        changed: true,
        before: { workoutKind: "strength_a", durationMinutes: 45, locationChoice: "gym" },
        after: { workoutKind: "upper_core_safety", durationMinutes: 35, locationChoice: "gym" },
        reasonCode: "KNEE_HARD_BLOCK",
        blocked: true,
        values: {
          knee: 7,
          priorDailyKnee: 3,
          energy: 4,
          soreness: 2,
          fatigue: 2,
          hoursSlept: 7.5,
          ouraScore: null,
          availableMinutes: null,
        },
      }),
    );

    expect(outcome.headline).toBe("Today's lower-body work was replaced with upper-body and core work.");
    expect(outcome.blocked).toBe(true);
    expect(outcome.detail).toContain("blocked today");
    expect(outcome.reason).toBe("Reason: Knee discomfort increased from 3 to 7.");
  });

  it("requirement 5: a skipped knee score is explained as the conservative fallback", () => {
    const outcome = buildCheckInOutcome(
      baseInput({
        changed: true,
        before: { workoutKind: "easy_run", durationMinutes: 40, locationChoice: null },
        after: { workoutKind: "upper_core_safety", durationMinutes: 35, locationChoice: null },
        reasonCode: "CHECKIN_KNEE_UNKNOWN",
        values: {
          knee: null,
          priorDailyKnee: 2,
          energy: 4,
          soreness: 2,
          fatigue: 2,
          hoursSlept: 7.5,
          ouraScore: null,
          availableMinutes: null,
        },
      }),
    );

    expect(outcome.reason).toBe(
      "Reason: Knee discomfort was not answered, so today uses the conservative non-running option until it's confirmed.",
    );
  });

  it("attributes a pure time cap to available time rather than to readiness", () => {
    const outcome = buildCheckInOutcome(
      baseInput({
        changed: true,
        before: { workoutKind: "easy_run", durationMinutes: 60, locationChoice: null },
        after: { workoutKind: "easy_run", durationMinutes: 30, locationChoice: null },
        reasonCode: "NO_CHANGE",
        values: {
          knee: 1,
          priorDailyKnee: 1,
          energy: 4,
          soreness: 2,
          fatigue: 2,
          hoursSlept: 7.5,
          ouraScore: null,
          availableMinutes: 30,
        },
      }),
    );

    expect(outcome.reason).toBe("Reason: Available time today was 30 minutes.");
  });

  it("does not label a run with a gym/home location", () => {
    const outcome = buildCheckInOutcome(
      baseInput({
        before: { workoutKind: "easy_run", durationMinutes: 40, locationChoice: "home" },
        after: { workoutKind: "easy_run", durationMinutes: 40, locationChoice: "home" },
      }),
    );

    expect(outcome.headline).toBe("Workout confirmed: Easy run, 40 minutes");
  });
});
