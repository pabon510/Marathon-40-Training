import type { WorkoutKind } from "@/domain/types";

export const WORKOUT_MOVE_REASONS = [
  ["family_conflict", "Family or childcare conflict"],
  ["schedule_change", "Schedule changed"],
  ["time", "Not enough time"],
  ["fatigue", "Fatigue or recovery"],
  ["knee_discomfort", "Knee discomfort"],
  ["illness", "Illness"],
  ["personal_choice", "Personal choice"],
] as const;

export type WorkoutMoveReason = (typeof WORKOUT_MOVE_REASONS)[number][0];

const BLOCKED_SOURCE_STATUSES = new Set(["completed", "partial", "blocked"]);
const KNEE_BLOCKED_KINDS = new Set<WorkoutKind>([
  "long_run",
  "easy_run",
  "threshold_run",
  "combined_short",
  "strength_a",
  "strength_b",
  "strength_full",
]);

export function isWorkoutMoveReason(value: string): value is WorkoutMoveReason {
  return WORKOUT_MOVE_REASONS.some(([reason]) => reason === value);
}

export function canMoveWorkout(input: {
  sourceDate: string;
  targetDate: string;
  sourceStatus: string;
  sourceKind: WorkoutKind;
  hasSession: boolean;
  kneeScore: number | null;
}): { allowed: boolean; reason: string | null } {
  if (input.sourceDate === input.targetDate) return { allowed: false, reason: "That workout is already scheduled today." };
  if (BLOCKED_SOURCE_STATUSES.has(input.sourceStatus)) return { allowed: false, reason: "Completed, partial, or safety-blocked workouts cannot be moved." };
  if (input.hasSession) return { allowed: false, reason: "A workout with an existing log cannot be moved." };
  if (input.kneeScore !== null && input.kneeScore >= 6 && KNEE_BLOCKED_KINDS.has(input.sourceKind)) {
    return { allowed: false, reason: "Today’s knee score blocks running and lower-body work." };
  }
  return { allowed: true, reason: null };
}

export function workoutMoveSpacingNote(input: {
  movedKind: WorkoutKind;
  targetDate: string;
  nextWorkout: { localDate: string; workoutKind: WorkoutKind } | null;
}): string | null {
  if (!input.nextWorkout) return null;
  const nextDay = new Date(`${input.targetDate}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  if (input.nextWorkout.localDate !== nextDay.toISOString().slice(0, 10)) return null;
  if (input.movedKind === "threshold_run" && input.nextWorkout.workoutKind === "long_run") {
    return "This places a threshold run immediately before the long run. Consider moving or shortening the long run if recovery is not good tomorrow.";
  }
  if (input.movedKind === "long_run" && ["strength_a", "strength_b", "strength_full"].includes(input.nextWorkout.workoutKind)) {
    return "This places lower-body strength immediately after the long run. Use tomorrow’s check-in and adaptation before training.";
  }
  return null;
}
