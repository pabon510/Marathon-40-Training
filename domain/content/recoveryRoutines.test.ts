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

  it("links every recovery block to complete illustrated guidance", () => {
    for (const routine of RECOVERY_ROUTINES) {
      for (const movement of routine.movements) {
        const libraryMovement = getRecoveryMovement(movement.exerciseSlug);
        expect(libraryMovement?.setup.length, movement.name).toBeGreaterThan(20);
        expect(libraryMovement?.execution.length, movement.name).toBeGreaterThan(20);
        expect(libraryMovement?.cues, movement.name).toHaveLength(3);
        expect(libraryMovement?.mistakes, movement.name).toHaveLength(3);
        expect(libraryMovement?.imagePath, movement.name).toMatch(/^\/exercises\/yoga\/.+\.png$/);
      }
    }
  });
});
