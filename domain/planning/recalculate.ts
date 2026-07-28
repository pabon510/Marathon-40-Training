import type { SessionType, WorkoutKind } from "@/domain/types";
import type { WeeklyShapeDay } from "@/domain/planning/weeklyShape";

/**
 * Priority in month one, highest first (kept longest when compressing):
 * long easy run; lower/core strength; full-body strength (3-day compression
 * only); full/upper strength; short easy run; combined short run+strength;
 * threshold (replaces a short easy run and ranks below it); safety
 * substitutes and rest are never "dropped" — they are already the reduced
 * outcome of another rule.
 */
export const PRIORITY_ORDER: WorkoutKind[] = [
  "long_run",
  "strength_a",
  "strength_full",
  "strength_b",
  "easy_run",
  "combined_short",
  "threshold_run",
  "upper_core_safety",
  "custom",
  "rest",
];

export function priorityRank(kind: WorkoutKind): number {
  const idx = PRIORITY_ORDER.indexOf(kind);
  return idx === -1 ? PRIORITY_ORDER.length : idx;
}

/** Drops the lowest-priority days until at most `maxKeep` remain. No debt is carried — dropped days are simply not rescheduled. */
export function dropToFit(days: WeeklyShapeDay[], maxKeep: number): WeeklyShapeDay[] {
  if (days.length <= maxKeep) return days;
  return [...days]
    .sort((a, b) => priorityRank(a.workoutKind) - priorityRank(b.workoutKind))
    .slice(0, maxKeep)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));
}

/**
 * A missed long run becomes a shorter run on the backup long-run day if
 * that day is still upcoming this week — it is never forced onto a weekday
 * or carried into next week.
 */
export function applyMissedLongRun(
  weekDays: WeeklyShapeDay[],
  missedDate: string,
  backupLongRunDate: string,
  todayDate: string,
): WeeklyShapeDay[] {
  const missedDay = weekDays.find((d) => d.localDate === missedDate);
  if (!missedDay || missedDay.workoutKind !== "long_run") return weekDays;
  if (backupLongRunDate <= todayDate) return weekDays;

  return weekDays.map((d) =>
    d.localDate === backupLongRunDate ? { localDate: d.localDate, workoutKind: "easy_run" as WorkoutKind } : d,
  );
}

/** If only three days remain in the week, reshape them to the 3-day compression pattern. */
export function reshapeToThreeDayIfNeeded(
  remainingDays: WeeklyShapeDay[],
  longRunAlreadyDone: boolean,
): WeeklyShapeDay[] {
  if (remainingDays.length !== 3) return dropToFit(remainingDays, 3);

  const sorted = [...remainingDays].sort((a, b) => a.localDate.localeCompare(b.localDate));
  if (longRunAlreadyDone) {
    return dropToFit(sorted, 3);
  }
  return [
    { localDate: sorted[0]!.localDate, workoutKind: "long_run" },
    { localDate: sorted[1]!.localDate, workoutKind: "strength_full" },
    { localDate: sorted[2]!.localDate, workoutKind: "combined_short" },
  ];
}

export interface UnplannedLoadInput {
  sessionType: SessionType;
  isEasyWalkOrBriefMobility: boolean;
}

/** Meaningful unplanned running or lower-body load triggers recalculation; easy walking/brief mobility does not. */
export function isMeaningfulUnplannedLoad(input: UnplannedLoadInput): boolean {
  if (input.sessionType === "mobility") return false;
  if (input.sessionType === "cross_training" && input.isEasyWalkOrBriefMobility) return false;
  return true;
}
