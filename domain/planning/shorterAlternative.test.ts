import { describe, expect, it } from "vitest";
import { canUseShorterAlternative, shorterAlternativeMinutes } from "@/domain/planning/shorterAlternative";

describe("shorter alternatives", () => {
  it("compresses to 60 percent with a 15-minute floor", () => {
    expect(shorterAlternativeMinutes(35)).toBe(21);
    expect(shorterAlternativeMinutes(20)).toBe(15);
  });

  it("is available only for eligible, incomplete workouts", () => {
    expect(canUseShorterAlternative({ kind: "easy_run", status: "confirmed", plannedMinutes: 35 })).toBe(true);
    expect(canUseShorterAlternative({ kind: "active_recovery", status: "confirmed", plannedMinutes: 35 })).toBe(false);
    expect(canUseShorterAlternative({ kind: "strength_a", status: "completed", plannedMinutes: 50 })).toBe(false);
    expect(canUseShorterAlternative({ kind: "easy_run", status: "blocked", plannedMinutes: 35 })).toBe(false);
  });
});
