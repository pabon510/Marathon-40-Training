import { describe, expect, it } from "vitest";
import { activeMidweekVariant, downgradeToStandardEasy, resizeRunPrescription, RUN_VARIETY_TAXONOMY } from "./runVariety";
import { structuredRunDurationMinutes } from "./structuredRun";

describe("run variety", () => {
  it("keeps calibration easy and rotates the four active midweek formats afterward", () => {
    expect(activeMidweekVariant(1, true)).toBe("easy_standard");
    expect([3, 4, 5, 6, 7].map((week) => activeMidweekVariant(week, false))).toEqual([
      "threshold_intervals",
      "easy_strides",
      "aerobic_fartlek",
      "progression_lite",
      "threshold_intervals",
    ]);
  });

  it("keeps future hill and speed formats locked", () => {
    expect(RUN_VARIETY_TAXONOMY.find((item) => item.variant === "hill_repeats")?.status).toBe("future");
    expect(RUN_VARIETY_TAXONOMY.find((item) => item.variant === "short_intervals")?.status).toBe("future");
  });

  it("compresses a structured workout without creating a duration mismatch", () => {
    const shortened = resizeRunPrescription({
      durationMinutes: 35,
      variant: "easy_strides",
      displayName: "Easy run + strides",
      intensityClass: "easy",
      strollerEligible: false,
      hrGuidanceScope: "easy_segments",
      hrTarget: 140,
      hrCeiling: 150,
      isThreshold: false,
      isCalibration: false,
      walkBreakGuidance: "Walk as needed.",
      segments: [],
    }, 21);
    expect(structuredRunDurationMinutes(shortened)).toBe(21);
  });

  it("removes faster segments when adaptation calls for easy-only running", () => {
    const downgraded = downgradeToStandardEasy({
      durationMinutes: 35,
      variant: "aerobic_fartlek",
      displayName: "Aerobic fartlek",
      intensityClass: "quality",
      strollerEligible: false,
      hrGuidanceScope: "easy_segments",
      hrTarget: 140,
      hrCeiling: 150,
      isThreshold: false,
      isCalibration: false,
      walkBreakGuidance: "Recover easily.",
    }, 30);
    expect(downgraded).toEqual(expect.objectContaining({
      variant: "easy_standard",
      durationMinutes: 30,
      strollerEligible: true,
      hrGuidanceScope: "whole_run",
    }));
    expect(downgraded.segments).toBeUndefined();
  });
});
