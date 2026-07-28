import { describe, expect, it } from "vitest";
import {
  evaluateRunProgressionEligibility,
  isThresholdWeek,
  maxProgressedValue,
  type RunQualification,
} from "./running";

function goodRun(overrides: Partial<RunQualification> = {}): RunQualification {
  return {
    completedAsPlanned: true,
    effort: 5,
    nextMorningKneeIncreased: false,
    recoveryAcceptable: true,
    ...overrides,
  };
}

describe("evaluateRunProgressionEligibility", () => {
  it("no progression during calibration weeks regardless of run quality", () => {
    const result = evaluateRunProgressionEligibility([goodRun()], true);
    expect(result.eligible).toBe(false);
    expect(result.reasonCode).toBe("CALIBRATION_NO_PROGRESSION");
  });

  it("progresses only when every run qualifies on all four criteria", () => {
    expect(evaluateRunProgressionEligibility([goodRun()], false).eligible).toBe(true);
    expect(
      evaluateRunProgressionEligibility([goodRun({ completedAsPlanned: false })], false).eligible,
    ).toBe(false);
    expect(evaluateRunProgressionEligibility([goodRun({ effort: 8 })], false).eligible).toBe(false);
    expect(
      evaluateRunProgressionEligibility([goodRun({ nextMorningKneeIncreased: true })], false).eligible,
    ).toBe(false);
    expect(
      evaluateRunProgressionEligibility([goodRun({ recoveryAcceptable: false })], false).eligible,
    ).toBe(false);
  });

  it("one failing run in the week blocks progression even if others qualify", () => {
    const result = evaluateRunProgressionEligibility(
      [goodRun(), goodRun({ effort: 9 })],
      false,
    );
    expect(result.eligible).toBe(false);
  });

  it("effort exactly 7 still qualifies (threshold is <= 7)", () => {
    expect(evaluateRunProgressionEligibility([goodRun({ effort: 7 })], false).eligible).toBe(true);
  });
});

describe("maxProgressedValue", () => {
  it("caps the increase at roughly 5% as a ceiling", () => {
    expect(maxProgressedValue(100)).toBeCloseTo(105, 5);
  });
});

describe("isThresholdWeek", () => {
  it("weeks 1-2 (calibration) are never threshold weeks", () => {
    expect(isThresholdWeek(1)).toBe(false);
    expect(isThresholdWeek(2)).toBe(false);
  });

  it("threshold appears every other week starting week 3", () => {
    expect(isThresholdWeek(3)).toBe(true);
    expect(isThresholdWeek(4)).toBe(false);
    expect(isThresholdWeek(5)).toBe(true);
  });
});
