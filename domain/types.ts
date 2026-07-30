/**
 * Shared domain vocabulary. These types are the single source of truth for
 * every enum-like string union used across the domain layer, the database
 * types, and the UI. Keep in sync with docs/DATA_MODEL.md and the
 * supabase/migrations check constraints.
 */

export type Phase = "base_rebuilding";

export type PreferredLongRunDay = "saturday" | "sunday";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type Location = "gym" | "home";

export type WorkoutKind =
  | "long_run"
  | "easy_run"
  | "threshold_run"
  | "strength_a"
  | "strength_b"
  | "strength_full"
  | "combined_short"
  | "upper_core_safety"
  | "active_recovery"
  | "rest"
  | "custom";

export type WorkoutStatus =
  | "provisional"
  | "confirmed"
  | "completed"
  | "partial"
  | "skipped"
  | "blocked"
  | "replaced"
  | "incomplete";

export type PlanTrigger =
  | "initial"
  | "check_in"
  | "post_workout"
  | "missed"
  | "edit"
  | "unplanned";

export type AvailableTime = "15" | "30" | "45" | "60" | "75" | "90_plus";

export type SessionType =
  | "run"
  | "strength"
  | "cross_training"
  | "mobility"
  | "rest_active";

export type SessionLocation = "gym" | "home" | "outdoor" | "treadmill" | "n/a";

export type CompletionState = "full" | "partial" | "stopped" | "skipped";

export type ExpectationResult = "easier" | "as_expected" | "harder";

export type RunType = "outdoor" | "treadmill" | "run_walk";

export type LoadUnit = "lb" | "kg" | "bodyweight" | "band" | "n/a";

/** 1 depleted … 5 excellent */
export type Scale1to5 = 1 | 2 | 3 | 4 | 5;
/** 0 no discomfort … 10 worst imaginable */
export type KneeScale = number; // 0-10, kept as number for arithmetic (worsening deltas etc.)
/** 1 extremely easy … 10 maximal */
export type EffortScale = number; // 1-10

export const KNEE_HARD_BLOCK_THRESHOLD = 6;
export const KNEE_WORSENING_DELTA_BLOCK = 2;

export type ReasonCode =
  | "KNEE_HARD_BLOCK"
  | "KNEE_WORKOUT_RISE_BLOCK"
  | "KNEE_WORSENING_0_2"
  | "KNEE_WORSENING_3_5"
  | "KNEE_STABLE_3_5_THRESHOLD_DOWNGRADE"
  | "KNEE_IMPROVING_3_5_NO_INCREASE"
  | "RECOVERY_MULTI_SIGNAL"
  | "MISSED_REBALANCE"
  | "UNPLANNED_RECALC"
  | "MATERIAL_EDIT_RECALC"
  | "PROGRESSION_APPLIED"
  | "CALIBRATION_NO_PROGRESSION"
  | "LOCATION_CONVERSION"
  | "TIME_COMPRESSION"
  | "CHECKIN_KNEE_UNKNOWN"
  | "NO_CHANGE";

export interface RunPrescription {
  durationMinutes: number;
  hrTarget?: number;
  hrCeiling?: number;
  paceReferenceSecondsPerMile?: number;
  isThreshold: boolean;
  isCalibration: boolean;
  walkBreakGuidance: string;
  intervals?: { workMinutes: number; restMinutes: number; repeats: number }[];
}

export interface ShortAlternative {
  goal: string;
  durationMinutes: number;
  description: string;
}

export interface RuleEvaluationResult {
  allowedWorkoutTypes: SessionType[];
  chosenWorkoutKind: WorkoutKind;
  blocked: boolean;
  reasonCode: ReasonCode;
  explanation: string;
  affectedLocalDates: string[];
}
