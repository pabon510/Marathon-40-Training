import { describe, expect, it } from "vitest";
import { RECOVERY_ROUTINES, getRecoveryRoutine } from "@/domain/content/recoveryRoutines";
import { getRecoveryMovement } from "@/domain/content/recoveryMovementLibrary";

describe("recovery routines", () => {
  it("have unique slugs and movement time matching the advertised duration", () => {
    expect(new Set(RECOVERY_ROUTINES.map((routine) => routine.slug)).size).toBe(RECOVERY_ROUTINES.length);
    for (const routine of RECOVERY_ROUTINES) {
      expect(routine.movements.reduce((total, movement) => total + movement.minutes, 0)).toBe(routine.durationMinutes);
      expect(getRecoveryRoutine(routine.slug)).toEqual(routine);
    }
  });

  it("links every gentle-yoga block to complete illustrated guidance", () => {
    const gentleYoga = getRecoveryRoutine("gentle_yoga_20")!;
    for (const movement of gentleYoga.movements) {
      const libraryMovement = getRecoveryMovement(movement.exerciseSlug);
      expect(libraryMovement?.setup.length).toBeGreaterThan(20);
      expect(libraryMovement?.execution.length).toBeGreaterThan(20);
      expect(libraryMovement?.cues).toHaveLength(3);
      expect(libraryMovement?.mistakes).toHaveLength(3);
      expect(libraryMovement?.imagePath).toMatch(/^\/exercises\/yoga\/.+\.png$/);
    }
  });
});
