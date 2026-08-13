import { describe, expect, it } from "vitest";
import { evaluateRun, type RunEvidenceInput } from "./runEvaluator";

const base: RunEvidenceInput = {
  workoutKind: "easy_run",
  plannedDurationMinutes: 35,
  prescription: { durationMinutes: 35, hrTarget: 140, hrCeiling: 150, isThreshold: false, isCalibration: true, walkBreakGuidance: "Walk as needed." },
  completedFull: true,
  distanceMiles: 3.25,
  durationSeconds: 2102,
  paceSecondsPerMile: 632,
  averageHr: 146,
  maximumHr: 166,
  effort: 5,
  immediateKnee: 0,
  morningKnee: 0,
  highestKneeDuring: 0,
  isStroller: true,
  runType: "run_walk",
  averageTemperatureF: 76,
  elevationGainFeet: 112,
  aerobicTrainingEffect: 3.4,
  anaerobicTrainingEffect: 0.4,
  averageCadenceSpm: 111,
  maximumCadenceSpm: 225,
  chartObservations: {
    prescribedHrCeilingPattern: { value: "near_for_long_periods", confidence: "medium", evidence: "HR line near 150" },
  },
  comparison: null,
};

describe("run evaluator", () => {
  it("treats an on-target stroller calibration run as successful while flagging cadence", () => {
    const result = evaluateRun(base);
    expect(result.authoritativeVerdict).toBe("successful_with_caution");
    expect(result.progressionStatus).toBe("pending_next_morning");
    expect(result.contextModifiers.join(" ")).toContain("stroller");
    expect(result.dataQualityWarnings.join(" ")).toContain("Cadence may be unreliable");
    expect(result.improvementDirective).toContain("middle of the HR range");
  });

  it("marks an easy run above its HR ceiling as harder than intended", () => {
    const result = evaluateRun({ ...base, isStroller: false, averageHr: 155, maximumCadenceSpm: 160 });
    expect(result.authoritativeVerdict).toBe("harder_than_intended");
    expect(result.progressionStatus).toBe("not_eligible");
    expect(result.improvementDirective).toContain("early HR-control protocol");
    expect(result.nextRunProtocol).toEqual(expect.objectContaining({
      start: expect.stringContaining("140-145 bpm"),
      intervene: expect.stringContaining("148 bpm"),
      success: expect.stringContaining("below 150 bpm"),
    }));
  });

  it("does not qualify an incomplete run for progression", () => {
    const result = evaluateRun({ ...base, completedFull: false, durationSeconds: 1200 });
    expect(result.authoritativeVerdict).toBe("incomplete");
    expect(result.progressionStatus).toBe("not_eligible");
  });

  it("adds product-based fueling facts without claiming causation", () => {
    const result = evaluateRun({
      ...base,
      fueling: {
        gel100Count: 1,
        gel100CafCount: 1,
        postRecovery: "shake_plus_carb",
        giResponse: "mild_issue",
        energyResponse: "faded",
      },
    });
    expect(result.deterministicFindings.join(" ")).toContain("50 g carbohydrate");
    expect(result.contextModifiers.join(" ")).toContain("100 mg caffeine");
    expect(result.contextModifiers.join(" ")).toContain("mild stomach trouble");
    expect(result.contextModifiers.join(" ")).toContain("fading energy");
  });

  it("evaluates confirmed threshold repetitions and ignores an excluded artifact", () => {
    const result = evaluateRun({
      ...base,
      workoutKind: "threshold_run",
      plannedDurationMinutes: 30,
      durationSeconds: 1822,
      isStroller: false,
      prescription: {
        durationMinutes: 30,
        isThreshold: true,
        isCalibration: false,
        walkBreakGuidance: "Easy recovery between work intervals.",
        intervals: [{ workMinutes: 5, restMinutes: 2, repeats: 4 }],
      },
      intervalSteps: [
        { ordinal: 1, stepType: "work", repetitionNumber: 1, durationSeconds: 300, distanceMiles: 0.61, averagePaceSecondsPerMile: 489, averageHeartRate: null, maximumHeartRate: null, included: true, confidence: "high" },
        { ordinal: 2, stepType: "work", repetitionNumber: 2, durationSeconds: 300, distanceMiles: 0.63, averagePaceSecondsPerMile: 474, averageHeartRate: null, maximumHeartRate: null, included: true, confidence: "high" },
        { ordinal: 3, stepType: "work", repetitionNumber: 3, durationSeconds: 300, distanceMiles: 0.64, averagePaceSecondsPerMile: 472, averageHeartRate: null, maximumHeartRate: null, included: true, confidence: "high" },
        { ordinal: 4, stepType: "work", repetitionNumber: 4, durationSeconds: 300, distanceMiles: 0.62, averagePaceSecondsPerMile: 484, averageHeartRate: null, maximumHeartRate: null, included: true, confidence: "high" },
        { ordinal: 5, stepType: "work", repetitionNumber: 5, durationSeconds: 1.2, distanceMiles: 0, averagePaceSecondsPerMile: 516, averageHeartRate: null, maximumHeartRate: null, included: false, confidence: "high" },
      ],
    });

    expect(result.authoritativeVerdict).not.toBe("incomplete");
    expect(result.actual.includedWorkIntervalCount).toBe(4);
    expect(result.actual.workPaceSpreadSecondsPerMile).toBe(17);
    expect(result.improvementDirective).toContain("within about 20 seconds per mile");
    expect(result.deterministicFindings.join(" ")).toContain("meeting the controlled-pacing target");
    expect(result.dataQualityWarnings.join(" ")).toContain("excluded");
  });

  it("uses completed threshold intervals instead of a conflicting legacy headline duration", () => {
    const result = evaluateRun({
      ...base,
      workoutKind: "threshold_run",
      plannedDurationMinutes: 35,
      durationSeconds: 1822,
      effort: 8,
      isStroller: false,
      prescription: {
        durationMinutes: 35,
        isThreshold: true,
        isCalibration: false,
        walkBreakGuidance: "Pace guided.",
        intervals: [{ workMinutes: 5, restMinutes: 2, repeats: 4 }],
      },
      intervalSteps: [489, 474, 472, 484].map((pace, index) => ({
        ordinal: index + 1,
        stepType: "work" as const,
        repetitionNumber: index + 1,
        durationSeconds: 300,
        distanceMiles: 0.62,
        averagePaceSecondsPerMile: pace,
        averageHeartRate: null,
        maximumHeartRate: null,
        included: true,
        confidence: "high" as const,
      })),
    });

    expect(result.authoritativeVerdict).toBe("harder_than_intended");
    expect(result.actual.structuredWorkCompleted).toBe(true);
    expect(result.deterministicFindings.join(" ")).not.toContain("less than 90 percent");
    expect(result.progressionReason).toContain("overall effort was 8/10");
    expect(result.progressionReason).not.toContain("duration");
  });
});
