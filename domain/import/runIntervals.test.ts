import { describe, expect, it } from "vitest";
import { includedWorkIntervals, paceSpreadSeconds } from "./runIntervals";

const step = (ordinal: number, pace: number | null, included = true) => ({
  ordinal,
  stepType: "work" as const,
  repetitionNumber: ordinal,
  durationSeconds: 300,
  distanceMiles: 0.62,
  averagePaceSecondsPerMile: pace,
  averageHeartRate: null,
  maximumHeartRate: null,
  included,
  confidence: "high" as const,
  evidence: "printed interval row",
  sourceImageIndex: 1,
});

describe("reviewed run intervals", () => {
  it("excludes user-rejected artifacts from interval analysis", () => {
    const rows = [step(1, 489), step(2, 474), step(3, 472), step(4, 484), step(5, 516, false)];
    expect(includedWorkIntervals(rows)).toHaveLength(4);
    expect(paceSpreadSeconds(rows)).toBe(17);
  });
});
