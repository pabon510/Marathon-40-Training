export interface ScorecardInputs {
  strengthSessionsCompleted: number;
  /** Fraction (0-1) of the adapted weekly plan completed, one entry per week 1-4. */
  weeklyAdaptedPlanCompletionRates: [number, number, number, number];
  hasQualifyingComparableRun: boolean;
  /** Weekly maximum knee discomfort, one entry per week 1-4. */
  weeklyMaxKnee: [number, number, number, number];
  checkedInWorkoutDays: number;
  totalWorkoutDays: number;
}

export interface ScorecardCriterion {
  id: string;
  label: string;
  met: boolean;
}

export interface ScorecardResult {
  criteria: ScorecardCriterion[];
  metCount: number;
  success: boolean;
}

const STRENGTH_TARGET = 8;
const STRENGTH_MET_THRESHOLD = 6;
const REQUIRED_CRITERIA_MET = 4;

/**
 * Four-week 4-of-5 scorecard per docs/PRODUCT_BRIEF.md "Success after four
 * weeks". Visible from day one; each criterion is independently computed
 * from stored data, never estimated.
 */
export function evaluateScorecard(inputs: ScorecardInputs): ScorecardResult {
  const weeksAtLeast75 = inputs.weeklyAdaptedPlanCompletionRates.filter((r) => r >= 0.75).length;
  const checkinRate =
    inputs.totalWorkoutDays === 0 ? 0 : inputs.checkedInWorkoutDays / inputs.totalWorkoutDays;
  const kneeStableOrImproving = inputs.weeklyMaxKnee[3] <= inputs.weeklyMaxKnee[0];

  const criteria: ScorecardCriterion[] = [
    {
      id: "strength_consistency",
      label: `Complete at least ${STRENGTH_MET_THRESHOLD} of ${STRENGTH_TARGET} planned strength sessions`,
      met: inputs.strengthSessionsCompleted >= STRENGTH_MET_THRESHOLD,
    },
    {
      id: "adapted_plan_completion",
      label: "Complete at least 75% of the adapted weekly plan in at least three of four weeks",
      met: weeksAtLeast75 >= 3,
    },
    {
      id: "comparable_run_improvement",
      label: "Record at least one comparable easy run showing improved ease",
      met: inputs.hasQualifyingComparableRun,
    },
    {
      id: "knee_trend",
      label: "Weekly maximum knee discomfort is stable or trending downward by week four",
      met: kneeStableOrImproving,
    },
    {
      id: "checkin_completion",
      label: "Complete the required morning check-in on at least 80% of workout days",
      met: checkinRate >= 0.8,
    },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  return { criteria, metCount, success: metCount >= REQUIRED_CRITERIA_MET };
}
