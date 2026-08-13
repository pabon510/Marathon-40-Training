import { describe, expect, it } from "vitest";
import { structuredRunDurationMatchesHeadline, structuredRunDurationMinutes } from "./structuredRun";

describe("structured run duration", () => {
  it("accounts for warmup, work, between-repetition recovery, and cooldown", () => {
    const prescription = {
      durationMinutes: 35,
      isThreshold: true,
      isCalibration: false,
      walkBreakGuidance: "Pace guided.",
      warmupMinutes: 5,
      cooldownMinutes: 4,
      intervals: [{ workMinutes: 5, restMinutes: 2, repeats: 4, recoveryRepeats: 3 }],
    };
    expect(structuredRunDurationMinutes(prescription)).toBe(35);
    expect(structuredRunDurationMatchesHeadline(prescription)).toBe(true);
  });
});
