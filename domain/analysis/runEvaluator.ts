import type { RunPrescription, WorkoutKind } from "@/domain/types";

export const RUN_ANALYSIS_RULES_VERSION = "run-evaluator-v1";

export interface RunEvidenceInput {
  workoutKind: WorkoutKind | null;
  plannedDurationMinutes: number | null;
  prescription: RunPrescription | null;
  completedFull: boolean;
  distanceMiles: number | null;
  durationSeconds: number | null;
  paceSecondsPerMile: number | null;
  averageHr: number | null;
  maximumHr: number | null;
  effort: number | null;
  immediateKnee: number | null;
  morningKnee: number | null;
  highestKneeDuring: number | null;
  isStroller: boolean;
  runType: string;
  averageTemperatureF: number | null;
  elevationGainFeet: number | null;
  aerobicTrainingEffect: number | null;
  anaerobicTrainingEffect: number | null;
  averageCadenceSpm: number | null;
  maximumCadenceSpm: number | null;
  chartObservations: unknown;
}

export type RunVerdict =
  | "successful"
  | "successful_with_caution"
  | "harder_than_intended"
  | "incomplete"
  | "insufficient_data";

export interface RunEvidencePackage {
  rulesVersion: string;
  authoritativeVerdict: RunVerdict;
  progressionStatus: "pending_next_morning" | "not_eligible";
  progressionReason: string;
  prescription: Record<string, unknown>;
  actual: Record<string, unknown>;
  deterministicFindings: string[];
  contextModifiers: string[];
  dataQualityWarnings: string[];
  improvementDirective: string;
  chartObservations: unknown;
}

export function evaluateRun(input: RunEvidenceInput): RunEvidencePackage {
  const findings: string[] = [];
  const context: string[] = [];
  const warnings: string[] = [];
  const plannedSeconds = input.plannedDurationMinutes === null ? null : input.plannedDurationMinutes * 60;
  const durationRatio = plannedSeconds && input.durationSeconds ? input.durationSeconds / plannedSeconds : null;
  const easyLike = input.workoutKind === "easy_run" || input.workoutKind === "long_run";
  const floor = input.prescription?.hrTarget ?? null;
  const ceiling = input.prescription?.hrCeiling ?? null;

  if (durationRatio !== null) {
    if (durationRatio >= 0.9 && durationRatio <= 1.1) findings.push("Completed the prescribed duration within 10 percent.");
    else if (durationRatio < 0.9) findings.push("Completed less than 90 percent of the prescribed duration.");
    else findings.push("Ran more than 10 percent beyond the prescribed duration.");
  } else {
    warnings.push("Duration adherence could not be evaluated.");
  }

  if (easyLike && input.averageHr !== null && floor !== null && ceiling !== null) {
    if (input.averageHr >= floor && input.averageHr <= ceiling) findings.push(`Average heart rate ${input.averageHr} bpm was inside the prescribed ${floor}-${ceiling} bpm range.`);
    else if (input.averageHr > ceiling) findings.push(`Average heart rate ${input.averageHr} bpm was above the prescribed ${ceiling} bpm ceiling.`);
    else findings.push(`Average heart rate ${input.averageHr} bpm was below the prescribed ${floor}-${ceiling} bpm range.`);
    warnings.push("Average and maximum heart rate cannot prove exact time spent above the ceiling.");
  }

  if (input.isStroller) context.push("Jogging-stroller run: pace may be compared only with other stroller runs.");
  if (input.averageTemperatureF !== null && input.averageTemperatureF >= 75) context.push(`Warm conditions: average temperature was ${input.averageTemperatureF}°F.`);
  if (input.elevationGainFeet !== null && input.elevationGainFeet >= 150) context.push(`Meaningful climbing: ${input.elevationGainFeet} feet of elevation gain.`);
  if (input.runType === "run_walk") context.push("Planned or recorded run-walk execution.");

  if (
    input.averageCadenceSpm !== null
    && input.maximumCadenceSpm !== null
    && input.maximumCadenceSpm > input.averageCadenceSpm * 1.7
  ) warnings.push(`Cadence may be unreliable: ${input.averageCadenceSpm} spm average and ${input.maximumCadenceSpm} spm maximum are internally inconsistent.`);
  if (input.isStroller && input.averageCadenceSpm !== null) warnings.push("Stroller mechanics can make wrist-based cadence less reliable.");

  let verdict: RunVerdict = "successful";
  if (!input.completedFull || (durationRatio !== null && durationRatio < 0.75)) verdict = "incomplete";
  else if (input.durationSeconds === null || input.effort === null) verdict = "insufficient_data";
  else if (
    (easyLike && ceiling !== null && input.averageHr !== null && input.averageHr > ceiling)
    || input.effort > 7
    || (input.immediateKnee !== null && input.immediateKnee >= 6)
  ) verdict = "harder_than_intended";
  else if ((durationRatio !== null && durationRatio > 1.1) || warnings.length > 1) verdict = "successful_with_caution";

  const immediatelyEligible =
    input.completedFull
    && input.effort !== null
    && input.effort <= 7
    && (input.immediateKnee === null || input.immediateKnee < 6)
    && (durationRatio === null || durationRatio >= 0.9);
  const progressionStatus = immediatelyEligible ? "pending_next_morning" : "not_eligible";
  const progressionReason = immediatelyEligible
    ? "Execution checks passed so far; progression still requires the next-morning knee score not to increase and acceptable recovery."
    : "At least one immediate execution requirement was not met, so this run does not qualify for progression.";

  const midpoint = floor !== null && ceiling !== null ? Math.round((floor + ceiling) / 2) : null;
  const ceilingChartValue =
    input.chartObservations
    && typeof input.chartObservations === "object"
    && "prescribedHrCeilingPattern" in input.chartObservations
    && input.chartObservations.prescribedHrCeilingPattern
    && typeof input.chartObservations.prescribedHrCeilingPattern === "object"
    && "value" in input.chartObservations.prescribedHrCeilingPattern
      ? input.chartObservations.prescribedHrCeilingPattern.value
      : null;
  let improvementDirective = "Repeat this execution and collect another comparable run before changing the target.";
  if (easyLike && ceiling !== null && input.averageHr !== null && input.averageHr > ceiling) {
    improvementDirective = "Slow earlier or use walk breaks sooner so the next easy run stays under the prescribed heart-rate ceiling.";
  } else if (
    easyLike
    && midpoint !== null
    && input.averageHr !== null
    && (
      (input.averageHr > midpoint + 3 && input.averageHr <= (ceiling ?? Infinity))
      || ceilingChartValue === "near_for_long_periods"
    )
  ) {
    improvementDirective = `On the next comparable easy run, aim to settle nearer the middle of the HR range (about ${midpoint} bpm) instead of riding the ceiling.`;
  } else if (!input.completedFull) {
    improvementDirective = "Use the prescribed shorter alternative next time if available time may prevent completing the full session.";
  }

  return {
    rulesVersion: RUN_ANALYSIS_RULES_VERSION,
    authoritativeVerdict: verdict,
    progressionStatus,
    progressionReason,
    prescription: {
      workoutKind: input.workoutKind,
      plannedDurationMinutes: input.plannedDurationMinutes,
      hrFloor: floor,
      hrCeiling: ceiling,
      walkBreaksAllowed: Boolean(input.prescription?.walkBreakGuidance),
      calibration: input.prescription?.isCalibration ?? false,
    },
    actual: {
      completedFull: input.completedFull,
      distanceMiles: input.distanceMiles,
      durationSeconds: input.durationSeconds,
      paceSecondsPerMile: input.paceSecondsPerMile,
      averageHr: input.averageHr,
      maximumHr: input.maximumHr,
      effort: input.effort,
      highestKneeDuring: input.highestKneeDuring,
      immediateKnee: input.immediateKnee,
      morningKnee: input.morningKnee,
      averageTemperatureF: input.averageTemperatureF,
      elevationGainFeet: input.elevationGainFeet,
      aerobicTrainingEffect: input.aerobicTrainingEffect,
      anaerobicTrainingEffect: input.anaerobicTrainingEffect,
      averageCadenceSpm: input.averageCadenceSpm,
      maximumCadenceSpm: input.maximumCadenceSpm,
    },
    deterministicFindings: findings,
    contextModifiers: context,
    dataQualityWarnings: warnings,
    improvementDirective,
    chartObservations: input.chartObservations,
  };
}
