import { describe, expect, it } from "vitest";
import { evaluateStrengthProgression, type StrengthExposure } from "./strength";

function goodExposure(overrides: Partial<StrengthExposure> = {}): StrengthExposure {
  return {
    completedAsPrescribed: true,
    repsAtTopOfRange: false,
    difficulty: 7,
    painIncreased: false,
    formFailed: false,
    recoveryAcceptable: true,
    ...overrides,
  };
}

describe("evaluateStrengthProgression", () => {
  it("requires two exposures; a single good exposure does not progress", () => {
    const result = evaluateStrengthProgression([goodExposure()], "gym", true);
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("NO_CHANGE");
  });

  it("progresses reps first when not yet at the top of the range", () => {
    const result = evaluateStrengthProgression(
      [goodExposure(), goodExposure()],
      "gym",
      true,
    );
    expect(result.eligible).toBe(true);
    expect(result.method).toBe("reps");
  });

  it("progresses load at the gym once at the top of the rep range", () => {
    const result = evaluateStrengthProgression(
      [goodExposure({ repsAtTopOfRange: true }), goodExposure({ repsAtTopOfRange: true })],
      "gym",
      true,
    );
    expect(result.method).toBe("load");
  });

  it("at home without heavier equipment, uses tempo/pause/range/unilateral before requiring new equipment", () => {
    const result = evaluateStrengthProgression(
      [goodExposure({ repsAtTopOfRange: true }), goodExposure({ repsAtTopOfRange: true })],
      "home",
      false,
    );
    expect(result.method).toBe("home_variable");
  });

  it("excessive difficulty prevents progression", () => {
    const result = evaluateStrengthProgression(
      [goodExposure({ difficulty: 9 }), goodExposure()],
      "gym",
      true,
    );
    expect(result.eligible).toBe(false);
  });

  it("form failure prevents progression", () => {
    const result = evaluateStrengthProgression(
      [goodExposure({ formFailed: true }), goodExposure()],
      "gym",
      true,
    );
    expect(result.eligible).toBe(false);
  });

  it("pain increase prevents progression", () => {
    const result = evaluateStrengthProgression(
      [goodExposure({ painIncreased: true }), goodExposure()],
      "gym",
      true,
    );
    expect(result.eligible).toBe(false);
  });

  it("incomplete prescribed work prevents progression", () => {
    const result = evaluateStrengthProgression(
      [goodExposure({ completedAsPrescribed: false }), goodExposure()],
      "gym",
      true,
    );
    expect(result.eligible).toBe(false);
  });

  it("failed recovery criteria prevents progression", () => {
    const result = evaluateStrengthProgression(
      [goodExposure({ recoveryAcceptable: false }), goodExposure()],
      "gym",
      true,
    );
    expect(result.eligible).toBe(false);
  });
});
