import type { RunPrescription, WorkoutKind } from "@/domain/types";
import type { RunComparison } from "@/domain/analysis/runComparison";

export const RUN_ANALYSIS_RULES_VERSION = "run-evaluator-v5";

export interface RunIntervalEvidence {
  ordinal: number;
  stepType: "warmup" | "work" | "recovery" | "cooldown" | "unknown";
  repetitionNumber: number | null;
  durationSeconds: number | null;
  distanceMiles: number | null;
  averagePaceSecondsPerMile: number | null;
  averageHeartRate: number | null;
  maximumHeartRate: number | null;
  included: boolean;
  confidence: "high" | "medium" | "low";
}

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
  comparison: RunComparison | null;
  intervalSteps?: RunIntervalEvidence[];
  fueling?: {
    gel100Count: number;
    gel100CafCount: number;
    postRecovery: string | null;
    giResponse: string | null;
    energyResponse: string | null;
  } | null;
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
  nextRunProtocol: { start: string; intervene: string; resume: string; success: string } | null;
  comparison: RunComparison | null;
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
  const intervalSteps = input.intervalSteps ?? [];
  const includedWorkSteps = intervalSteps.filter((step) => step.included && step.stepType === "work");
  const excludedIntervalCount = intervalSteps.filter((step) => !step.included).length;
  const plannedIntervals = input.prescription?.intervals?.[0] ?? null;
  const workPaces = includedWorkSteps
    .map((step) => step.averagePaceSecondsPerMile)
    .filter((pace): pace is number => pace !== null);
  const workPaceSpread = workPaces.length >= 2 ? Math.max(...workPaces) - Math.min(...workPaces) : null;
  const thresholdPacingControlled = workPaceSpread !== null && workPaceSpread <= 20;
  const onDurationWorkCount = plannedIntervals
    ? includedWorkSteps.filter(
        (step) => step.durationSeconds !== null && Math.abs(step.durationSeconds - plannedIntervals.workMinutes * 60) <= 5,
      ).length
    : 0;
  const structuredWorkCompleted = Boolean(
    input.workoutKind === "threshold_run"
    && plannedIntervals
    && intervalSteps.length > 0
    && includedWorkSteps.length >= plannedIntervals.repeats
    && onDurationWorkCount >= plannedIntervals.repeats,
  );
  const thresholdExecutionSuccessful = Boolean(
    structuredWorkCompleted
    && thresholdPacingControlled
    && input.completedFull
    && input.effort !== null
    && input.effort <= 8
    && (input.immediateKnee === null || input.immediateKnee < 6),
  );

  if (structuredWorkCompleted) {
    findings.push("The complete prescribed work-interval structure is authoritative for threshold completion; total-duration mismatch is not treated as incomplete execution.");
  } else if (durationRatio !== null) {
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

  if (input.workoutKind === "threshold_run" && intervalSteps.length > 0) {
    findings.push(
      plannedIntervals
        ? `Completed ${includedWorkSteps.length} included work intervals against ${plannedIntervals.repeats} prescribed.`
        : `Recorded ${includedWorkSteps.length} included work intervals.`,
    );
    if (plannedIntervals) {
      findings.push(`${onDurationWorkCount} of ${includedWorkSteps.length} work intervals were within five seconds of the planned ${plannedIntervals.workMinutes}-minute duration.`);
    }
    if (workPaceSpread !== null) {
      findings.push(
        workPaceSpread <= 20
          ? `Included work-interval pace spread was ${Math.round(workPaceSpread)} seconds per mile, meeting the controlled-pacing target of about 20 seconds per mile or less.`
          : `Included work-interval pace spread was ${Math.round(workPaceSpread)} seconds per mile, above the controlled-pacing target of about 20 seconds per mile.`,
      );
    }
  }

  if (input.isStroller) context.push("Jogging-stroller run: pace may be compared only with other stroller runs.");
  if (input.averageTemperatureF !== null && input.averageTemperatureF >= 75) context.push(`Warm conditions: average temperature was ${input.averageTemperatureF}°F.`);
  if (input.elevationGainFeet !== null && input.elevationGainFeet >= 150) context.push(`Meaningful climbing: ${input.elevationGainFeet} feet of elevation gain.`);
  if (input.runType === "run_walk") context.push("Planned or recorded run-walk execution.");
  if (input.fueling) {
    const carbohydrateFromGels = (input.fueling.gel100Count + input.fueling.gel100CafCount) * 25;
    const caffeineFromGels = input.fueling.gel100CafCount * 100;
    if (carbohydrateFromGels > 0) {
      findings.push(`Logged approximately ${carbohydrateFromGels} g carbohydrate from Maurten gels during the run.`);
    }
    if (caffeineFromGels > 0) context.push(`Caffeinated gel intake contributed approximately ${caffeineFromGels} mg caffeine.`);
    if (input.fueling.giResponse === "mild_issue") context.push("Fueling log reported mild stomach trouble.");
    if (input.fueling.giResponse === "significant_issue") context.push("Fueling log reported significant stomach trouble.");
    if (input.fueling.energyResponse === "faded") context.push("Fueling log reported fading energy.");
  }

  if (
    input.averageCadenceSpm !== null
    && input.maximumCadenceSpm !== null
    && input.maximumCadenceSpm > input.averageCadenceSpm * 1.7
  ) warnings.push(`Cadence may be unreliable: ${input.averageCadenceSpm} spm average and ${input.maximumCadenceSpm} spm maximum are internally inconsistent.`);
  if (input.isStroller && input.averageCadenceSpm !== null) warnings.push("Stroller mechanics can make wrist-based cadence less reliable.");

  let verdict: RunVerdict = "successful";
  if (!input.completedFull || (!structuredWorkCompleted && durationRatio !== null && durationRatio < 0.75)) verdict = "incomplete";
  else if (input.workoutKind === "threshold_run" && plannedIntervals && intervalSteps.length > 0 && includedWorkSteps.length < plannedIntervals.repeats) verdict = "incomplete";
  else if (input.durationSeconds === null || input.effort === null) verdict = "insufficient_data";
  else if (
    (easyLike && ceiling !== null && input.averageHr !== null && input.averageHr > ceiling)
    || (input.workoutKind === "threshold_run" ? input.effort > 8 : input.effort > 7)
    || (input.immediateKnee !== null && input.immediateKnee >= 6)
  ) verdict = "harder_than_intended";
  else if (input.workoutKind === "threshold_run" && thresholdExecutionSuccessful && input.effort === 8) verdict = "successful_with_caution";
  else if ((durationRatio !== null && durationRatio > 1.1) || warnings.length > 1) verdict = "successful_with_caution";

  const immediatelyEligible =
    input.completedFull
    && input.effort !== null
    && input.effort <= 7
    && (input.immediateKnee === null || input.immediateKnee < 6)
    && (structuredWorkCompleted || durationRatio === null || (durationRatio >= 0.9 && durationRatio <= 1.1))
    && !(input.workoutKind === "threshold_run" && plannedIntervals && intervalSteps.length > 0 && includedWorkSteps.length < plannedIntervals.repeats)
    && (!easyLike || ceiling === null || input.averageHr === null || input.averageHr <= ceiling);
  const progressionStatus = immediatelyEligible ? "pending_next_morning" : "not_eligible";
  const immediateFailureReasons = [
    !input.completedFull ? "the workout was marked incomplete" : null,
    input.effort !== null && input.effort > 7 ? `overall effort was ${input.effort}/10, above the progression limit of 7/10` : null,
    input.immediateKnee !== null && input.immediateKnee >= 6 ? `immediate knee discomfort was ${input.immediateKnee}/10` : null,
    !structuredWorkCompleted && durationRatio !== null && (durationRatio < 0.9 || durationRatio > 1.1) ? "completed duration was outside the allowed range" : null,
    input.workoutKind === "threshold_run" && plannedIntervals && intervalSteps.length > 0 && includedWorkSteps.length < plannedIntervals.repeats
      ? `only ${includedWorkSteps.length} of ${plannedIntervals.repeats} work intervals were completed`
      : null,
    easyLike && ceiling !== null && input.averageHr !== null && input.averageHr > ceiling ? `average heart rate exceeded the ${ceiling} bpm ceiling` : null,
  ].filter((reason): reason is string => reason !== null);
  const progressionReason = immediatelyEligible
    ? "Execution checks passed so far; progression still requires the next-morning knee score not to increase and acceptable recovery."
    : `This run does not qualify for progression because ${immediateFailureReasons.join(" and ") || "an immediate execution requirement was not met"}.`;

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
  let nextRunProtocol: RunEvidencePackage["nextRunProtocol"] = null;
  if (easyLike && ceiling !== null && input.averageHr !== null && input.averageHr > ceiling) {
    const startLow = floor ?? Math.max(1, ceiling - 10);
    const startHigh = midpoint ?? ceiling - 5;
    const earlyAction = Math.max(startLow, ceiling - 2);
    improvementDirective = `Use an early HR-control protocol on the next comparable run: settle at ${startLow}-${startHigh} bpm and act before reaching the ${ceiling} bpm ceiling.`;
    nextRunProtocol = {
      start: `Keep the first 10 minutes around ${startLow}-${startHigh} bpm; pace is secondary.`,
      intervene: `Slow down as HR approaches ${earlyAction} bpm. If it remains at or above ${ceiling} bpm for about two minutes, walk.`,
      resume: `Resume easy running only after HR returns to about ${startLow}-${startHigh} bpm. In warm stroller conditions, planned walk breaks from the start are acceptable.`,
      success: `Most of the visible HR chart stays below ${ceiling} bpm, average HR is at or below ${ceiling} bpm, and the run does not feel harder than intended.`,
    };
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
  } else if (input.workoutKind === "threshold_run" && includedWorkSteps.length > 0) {
    const firstPace = includedWorkSteps[0]?.averagePaceSecondsPerMile ?? null;
    const lastPace = includedWorkSteps.at(-1)?.averagePaceSecondsPerMile ?? null;
    if (thresholdExecutionSuccessful && input.effort === 8) {
      improvementDirective = "Repeat the same threshold prescription without increasing pace, aiming for the full session to feel no harder than 7/10 overall.";
      nextRunProtocol = {
        start: "Use today’s controlled work-interval pace range as a ceiling, not a target to beat.",
        intervene: "If the session is tracking toward 8/10 again before the final repetition, ease the remaining work intervals slightly rather than forcing today’s pace.",
        resume: "Take every prescribed easy recovery in full; recovery pace is not a performance target.",
        success: "Complete the same interval structure with controlled pacing, acceptable knee response, and overall effort of 7/10 or lower.",
      };
    } else if (firstPace !== null && lastPace !== null && lastPace - firstPace > 20) {
      improvementDirective = "Start the first work interval more controlled so the final repetition stays within about 20 seconds per mile of the first.";
    } else if (workPaceSpread !== null && workPaceSpread > 30) {
      improvementDirective = "Use a steadier threshold effort and keep the next set of work intervals within about 20 seconds per mile from fastest to slowest.";
    } else {
      improvementDirective = "Maintain the controlled threshold execution; do not increase pace until the current prescription also meets the recovery and effort progression rules.";
    }
    if (!nextRunProtocol && !thresholdPacingControlled) {
      nextRunProtocol = {
        start: "Run the first work interval at a controlled threshold effort.",
        intervene: "If the work-interval pace range exceeds about 20 seconds per mile, ease the next repetition toward the established range.",
        resume: "Use the full prescribed easy recovery; recovery pace is not a performance target.",
        success: plannedIntervals
          ? `Complete all ${plannedIntervals.repeats} work intervals near ${plannedIntervals.workMinutes} minutes with no more than about 20 seconds per mile from fastest to slowest.`
          : "Complete every prescribed work interval with no more than about 20 seconds per mile from fastest to slowest.",
      };
    }
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
      intervals: input.prescription?.intervals ?? [],
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
      preRunMorningKnee: input.morningKnee,
      averageTemperatureF: input.averageTemperatureF,
      elevationGainFeet: input.elevationGainFeet,
      aerobicTrainingEffect: input.aerobicTrainingEffect,
      anaerobicTrainingEffect: input.anaerobicTrainingEffect,
      averageCadenceSpm: input.averageCadenceSpm,
      maximumCadenceSpm: input.maximumCadenceSpm,
      fueling: input.fueling ?? null,
      intervalSteps,
      includedWorkIntervalCount: includedWorkSteps.length,
      workPaceSpreadSecondsPerMile: workPaceSpread,
      structuredWorkCompleted,
      thresholdPacingControlled,
      thresholdExecutionSuccessful,
      excludedIntervalCount,
    },
    deterministicFindings: findings,
    contextModifiers: context,
    dataQualityWarnings: warnings,
    improvementDirective,
    nextRunProtocol,
    comparison: input.comparison,
    chartObservations: input.chartObservations,
  };
}
