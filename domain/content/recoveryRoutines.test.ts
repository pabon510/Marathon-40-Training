import { describe, expect, it } from "vitest";
import { RECOVERY_ROUTINES, getRecoveryRoutine } from "@/domain/content/recoveryRoutines";

describe("recovery routines", () => {
  it("have unique slugs and movement time matching the advertised duration", () => {
    expect(new Set(RECOVERY_ROUTINES.map((routine) => routine.slug)).size).toBe(RECOVERY_ROUTINES.length);
    for (const routine of RECOVERY_ROUTINES) {
      expect(routine.movements.reduce((total, movement) => total + movement.minutes, 0)).toBe(routine.durationMinutes);
      expect(getRecoveryRoutine(routine.slug)).toEqual(routine);
    }
  });
});
