import type { AvailableTime, RuleEvaluationResult, SessionType, WorkoutKind } from "@/domain/types";
import { evaluatePreWorkoutSafety } from "@/domain/safety/hardBlock";
import {
  computeKneeTrend,
  evaluateKneeAdaptation,
  moreRestrictive,
  type AdaptationCategory,
} from "@/domain/adaptation/kneeRules";
import { evaluateGeneralRecovery, type RecoveryInputs } from "@/domain/adaptation/recovery";

const LOWER_BODY_OR_RUNNING_KINDS: WorkoutKind[] = [
  "long_run",
  "easy_run",
  "threshold_run",
  "strength_a",
  "strength_b",
  "strength_full",
  "combined_short",
];

function isLowerBodyOrRunning(kind: WorkoutKind): boolean {
  return LOWER_BODY_OR_RUNNING_KINDS.includes(kind);
}

export interface DailyAdaptationInput {
  plannedWorkoutKind: WorkoutKind;
  plannedDurationMinutes: number;
  morningKnee: number | null;
  priorDailyKnee: number | null;
  recovery: RecoveryInputs;
  availableTime: AvailableTime;
  localDate: string;
}

export interface DailyAdaptationResult extends RuleEvaluationResult {
  category: AdaptationCategory;
  progressionAllowed: boolean;
  requiresPainNeutralLowerBody: boolean;
  cappedDurationMinutes: number;
  useShortVersion: boolean;
}

const AVAILABLE_MINUTES: Record<AvailableTime, number> = {
  "15": 15,
  "30": 30,
  "45": 45,
  "60": 60,
  "75": 75,
  "90_plus": 999,
};

function workoutKindToSessionTypes(kind: WorkoutKind): SessionType[] {
  switch (kind) {
    case "long_run":
    case "easy_run":
    case "threshold_run":
      return ["run"];
    case "strength_a":
    case "strength_b":
    case "strength_full":
      return ["strength"];
    case "combined_short":
      return ["run", "strength"];
    case "upper_core_safety":
      return ["strength", "mobility"];
    case "active_recovery":
      return ["mobility"];
    case "rest":
      return ["rest_active"];
    default:
      return ["cross_training"];
  }
}

function applyCategoryToKind(kind: WorkoutKind, category: AdaptationCategory): WorkoutKind {
  if (category === "full") return kind;

  if (category === "easy_cap") {
    if (kind === "threshold_run") return "easy_run";
    return kind;
  }

  // upper_core_only or blocked
  if (isLowerBodyOrRunning(kind)) return "upper_core_safety";
  return kind;
}

/**
 * Applies the deterministic precedence chain for a single planned workout on
 * a single day: safety block -> knee adaptation -> general recovery ->
 * time/location conversion. Weekly rebalance and progression eligibility are
 * evaluated separately (they operate across the week / at week boundaries,
 * not within a single day's decision) — see domain/planning and
 * domain/progression.
 */
export function evaluateDailyAdaptation(input: DailyAdaptationInput): DailyAdaptationResult {
  const safety = evaluatePreWorkoutSafety(input.morningKnee);

  const kneeScore = input.morningKnee;
  const knee =
    kneeScore === null
      ? {
          category: "upper_core_only" as AdaptationCategory,
          progressionAllowed: false,
          requiresPainNeutralLowerBody: false,
          reasonCode: "CHECKIN_KNEE_UNKNOWN" as const,
          explanation:
            "Knee discomfort was skipped this morning, so today conservatively becomes upper-body/core, mobility, walking, or rest until it's confirmed.",
        }
      : evaluateKneeAdaptation(kneeScore, computeKneeTrend(kneeScore, input.priorDailyKnee));

  const recovery = evaluateGeneralRecovery(input.recovery);

  const combinedCategory = moreRestrictive(knee.category, recovery.category);
  const recoveryIsDriver =
    ["full", "easy_cap", "upper_core_only", "blocked"].indexOf(recovery.category) >
    ["full", "easy_cap", "upper_core_only", "blocked"].indexOf(knee.category);

  const driver = recoveryIsDriver ? recovery : knee;
  const progressionAllowed = knee.progressionAllowed && recovery.progressionAllowed;

  let chosenKind = applyCategoryToKind(input.plannedWorkoutKind, combinedCategory);

  const availableMinutes = AVAILABLE_MINUTES[input.availableTime];
  const cappedDurationMinutes = Math.min(input.plannedDurationMinutes, availableMinutes);
  const useShortVersion = cappedDurationMinutes < input.plannedDurationMinutes * 0.8;

  const blocked = safety.blocked || combinedCategory === "blocked";
  if (safety.blocked) {
    chosenKind = isLowerBodyOrRunning(chosenKind) ? "upper_core_safety" : chosenKind;
  }

  const finalReasonCode = safety.blocked ? safety.ruleCode! : driver.reasonCode;
  const finalExplanation = safety.blocked ? safety.explanation! : driver.explanation;

  return {
    allowedWorkoutTypes: workoutKindToSessionTypes(chosenKind),
    chosenWorkoutKind: chosenKind,
    blocked,
    reasonCode: finalReasonCode,
    explanation: finalExplanation,
    affectedLocalDates: [input.localDate],
    category: combinedCategory,
    progressionAllowed,
    requiresPainNeutralLowerBody: knee.requiresPainNeutralLowerBody,
    cappedDurationMinutes,
    useShortVersion,
  };
}
