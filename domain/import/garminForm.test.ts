import { describe, expect, it } from "vitest";
import { extractionToFormValues } from "./garminForm";
import { garminExtractionSchema } from "./garminScreenshot";

const field = (value: number | null) => ({
  value,
  confidence: value === null ? null : ("high" as const),
  evidence: value === null ? null : String(value),
  sourceImageIndex: value === null ? null : 1,
});

describe("Garmin screenshot extraction", () => {
  it("maps readable values to editable run-form fields without inventing missing data", () => {
    const extraction = garminExtractionSchema.parse({
      distanceMiles: field(3.25),
      totalDurationSeconds: field(2102),
      movingDurationSeconds: field(2069),
      elapsedDurationSeconds: field(2151),
      averagePaceSecondsPerMile: field(632),
      movingPaceSecondsPerMile: field(622),
      bestPaceSecondsPerMile: field(536),
      averageHeartRate: field(146),
      maximumHeartRate: field(166),
      elevationGainFeet: field(112),
      elevationLossFeet: field(115),
      aerobicTrainingEffect: field(3.4),
      anaerobicTrainingEffect: field(0.4),
      averageTemperatureF: field(76),
      averageCadenceSpm: field(111),
      maximumCadenceSpm: field(225),
      averageStrideLengthMeters: field(1.38),
      warnings: [],
    });

    const values = extractionToFormValues(extraction);
    expect(values.distanceMiles).toBe("3.25");
    expect(values.durationMinutes).toBe("35.03");
    expect(values.paceOverrideMinutes).toBe("10.53");
    expect(values.averageHr).toBe("146");
    expect(values.averageStrideLengthMeters).toBe("1.38");
  });

  it("leaves absent statistics blank", () => {
    const empty = field(null);
    const extraction = garminExtractionSchema.parse({
      distanceMiles: empty, totalDurationSeconds: empty, movingDurationSeconds: empty,
      elapsedDurationSeconds: empty, averagePaceSecondsPerMile: empty,
      movingPaceSecondsPerMile: empty, bestPaceSecondsPerMile: empty,
      averageHeartRate: empty, maximumHeartRate: empty, elevationGainFeet: empty,
      elevationLossFeet: empty, aerobicTrainingEffect: empty, anaerobicTrainingEffect: empty,
      averageTemperatureF: empty, averageCadenceSpm: empty, maximumCadenceSpm: empty,
      averageStrideLengthMeters: empty, warnings: ["Not visible"],
    });
    expect(Object.values(extractionToFormValues(extraction))).toEqual(
      expect.arrayContaining([""]),
    );
    expect(extractionToFormValues(extraction).distanceMiles).toBe("");
  });
});
