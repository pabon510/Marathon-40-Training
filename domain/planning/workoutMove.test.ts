import { describe, expect, it } from "vitest";
import { canMoveWorkout, isWorkoutMoveReason, workoutMoveSpacingNote } from "./workoutMove";

describe("workout moves", () => {
  it("allows an unlogged missed threshold run to replace today's workout", () => {
    expect(canMoveWorkout({
      sourceDate: "2026-08-12",
      targetDate: "2026-08-13",
      sourceStatus: "provisional",
      sourceKind: "threshold_run",
      hasSession: false,
      kneeScore: 0,
    })).toEqual({ allowed: true, reason: null });
  });

  it("does not move completed or already-logged workouts", () => {
    expect(canMoveWorkout({ sourceDate: "2026-08-12", targetDate: "2026-08-13", sourceStatus: "completed", sourceKind: "threshold_run", hasSession: false, kneeScore: 0 }).allowed).toBe(false);
    expect(canMoveWorkout({ sourceDate: "2026-08-12", targetDate: "2026-08-13", sourceStatus: "provisional", sourceKind: "threshold_run", hasSession: true, kneeScore: 0 }).allowed).toBe(false);
  });

  it("enforces the knee hard block for a moved run", () => {
    expect(canMoveWorkout({ sourceDate: "2026-08-12", targetDate: "2026-08-13", sourceStatus: "provisional", sourceKind: "threshold_run", hasSession: false, kneeScore: 6 })).toEqual({
      allowed: false,
      reason: "Today’s knee score blocks running and lower-body work.",
    });
  });

  it("recognizes the family-conflict reason", () => {
    expect(isWorkoutMoveReason("family_conflict")).toBe(true);
    expect(isWorkoutMoveReason("made_up_reason")).toBe(false);
  });

  it("warns when a moved threshold run lands immediately before a long run", () => {
    expect(workoutMoveSpacingNote({
      movedKind: "threshold_run",
      targetDate: "2026-08-13",
      nextWorkout: { localDate: "2026-08-14", workoutKind: "long_run" },
    })).toMatch(/immediately before the long run/);
  });
});
