export interface RunQualification {
  completedAsPlanned: boolean;
  effort: number;
  nextMorningKneeIncreased: boolean;
  recoveryAcceptable: boolean;
}

export interface RunProgressionResult {
  eligible: boolean;
  reasonCode: "CALIBRATION_NO_PROGRESSION" | "PROGRESSION_APPLIED" | "NO_CHANGE";
  explanation: string;
}

/**
 * Weekly-boundary review of whether next week's running load may increase.
 * Weeks 1-2 are calibration and never progress regardless of how the runs
 * went. Otherwise every run logged that week must individually qualify —
 * completed as planned, effort <= 7, next-morning knee did not increase,
 * and recovery was acceptable — or the whole week fails to progress.
 */
export function evaluateRunProgressionEligibility(
  records: RunQualification[],
  isCalibrationWeek: boolean,
): RunProgressionResult {
  if (isCalibrationWeek) {
    return {
      eligible: false,
      reasonCode: "CALIBRATION_NO_PROGRESSION",
      explanation: "Weeks 1-2 are calibration: this week's runs are for maintaining or reducing only, never progressing.",
    };
  }

  if (records.length === 0) {
    return {
      eligible: false,
      reasonCode: "NO_CHANGE",
      explanation: "No completed runs to review yet, so no progression decision is made.",
    };
  }

  const allQualify = records.every(
    (r) => r.completedAsPlanned && r.effort <= 7 && !r.nextMorningKneeIncreased && r.recoveryAcceptable,
  );

  if (!allQualify) {
    return {
      eligible: false,
      reasonCode: "NO_CHANGE",
      explanation: "Not every run this week met all progression criteria, so next week's running load stays the same.",
    };
  }

  return {
    eligible: true,
    reasonCode: "PROGRESSION_APPLIED",
    explanation: "All runs this week were completed as planned, at controlled effort, with no knee increase and acceptable recovery, so running load may progress.",
  };
}

const WEEKLY_LOAD_INCREASE_CEILING = 0.05;

/** Returns the maximum value allowed under the ~5% weekly increase ceiling (a ceiling, not a target). */
export function maxProgressedValue(currentValue: number): number {
  return currentValue * (1 + WEEKLY_LOAD_INCREASE_CEILING);
}

export type ProgressionVariable = "duration_or_distance" | "intensity";

/**
 * Threshold work occurs every other week during month one (weeks 1-4),
 * starting in week 3 since weeks 1-2 are pure calibration. `weekNumber` is
 * 1-indexed from the plan's rolling start.
 */
export function isThresholdWeek(weekNumber: number): boolean {
  return weekNumber >= 3 && weekNumber % 2 === 1;
}
