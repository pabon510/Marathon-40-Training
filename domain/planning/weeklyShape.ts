import type { WorkoutKind } from "@/domain/types";
import { isThresholdWeek } from "@/domain/progression/running";

export interface WeeklyShapeDay {
  localDate: string;
  workoutKind: WorkoutKind;
}

const LOWER_BODY_STRENGTH: WorkoutKind[] = ["strength_a", "strength_b", "strength_full"];

function dayDiff(a: string, b: string): number {
  return Math.abs((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000);
}

/** Counts date pairs where two lower-body strength kinds land on calendar-adjacent days. */
function countAdjacentStrengthConflicts(days: WeeklyShapeDay[]): number {
  const strengthDates = days.filter((d) => LOWER_BODY_STRENGTH.includes(d.workoutKind)).map((d) => d.localDate);
  let conflicts = 0;
  for (let i = 0; i < strengthDates.length; i++) {
    for (let j = i + 1; j < strengthDates.length; j++) {
      if (dayDiff(strengthDates[i]!, strengthDates[j]!) === 1) conflicts++;
    }
  }
  return conflicts;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const perm of permutations(rest)) {
      result.push([item, ...perm]);
    }
  });
  return result;
}

/** Assigns `roles` to `dates` (same length) minimizing consecutive-day lower-body strength overlap. */
export function bestAssignment(dates: string[], roles: WorkoutKind[]): WeeklyShapeDay[] {
  let best: WeeklyShapeDay[] | null = null;
  let bestConflicts = Infinity;
  for (const perm of permutations(roles)) {
    const candidate = dates.map((localDate, i) => ({ localDate, workoutKind: perm[i]! }));
    const conflicts = countAdjacentStrengthConflicts(candidate);
    if (conflicts < bestConflicts) {
      bestConflicts = conflicts;
      best = candidate;
      if (conflicts === 0) break;
    }
  }
  return best!;
}

/**
 * Rebuilds the editable portion of a week while keeping workouts that have
 * already happened fixed. Each locked workout consumes the matching role from
 * the newly generated weekly shape, so editing availability cannot duplicate a
 * completed strength session or long run later in the same week.
 */
export function generateWeeklyShapeAroundLockedDays(
  availableDates: string[],
  longRunDate: string,
  weekNumber: number,
  lockedDays: WeeklyShapeDay[],
): WeeklyShapeDay[] {
  const desired = generateWeeklyShape(availableDates, longRunDate, weekNumber);
  const remainingKinds = desired.map((day) => day.workoutKind);

  for (const locked of lockedDays) {
    const index = remainingKinds.indexOf(locked.workoutKind);
    if (index >= 0) remainingKinds.splice(index, 1);
  }

  const lockedDates = new Set(lockedDays.map((day) => day.localDate));
  const editableDates = [...availableDates].sort().filter((date) => !lockedDates.has(date));
  if (remainingKinds.length !== editableDates.length) {
    throw new Error("Keep completed and current workout days selected when adjusting this week.");
  }

  const longRunIndex = remainingKinds.indexOf("long_run");
  const fixedLongRun = longRunIndex >= 0 && editableDates.includes(longRunDate)
    ? [{ localDate: longRunDate, workoutKind: "long_run" as WorkoutKind }]
    : [];
  if (fixedLongRun.length) remainingKinds.splice(longRunIndex, 1);

  const otherDates = editableDates.filter((date) => date !== longRunDate || fixedLongRun.length === 0);
  return [...lockedDays, ...fixedLongRun, ...bestAssignment(otherDates, remainingKinds)]
    .sort((a, b) => a.localDate.localeCompare(b.localDate));
}

/**
 * Builds the default weekly shape (which workout kind lands on which day)
 * for 3, 4, or 5 available days, per docs/VERSION_1_SCOPE.md "Weekly
 * planning". `weekNumber` is 1-indexed from the plan's rolling start and
 * decides whether a short run becomes the every-other-week threshold
 * session.
 */
export function generateWeeklyShape(
  availableDates: string[],
  longRunDate: string,
  weekNumber: number,
): WeeklyShapeDay[] {
  const sorted = [...availableDates].sort();
  if (!sorted.includes(longRunDate)) {
    throw new Error("longRunDate must be one of the available dates");
  }
  const remaining = sorted.filter((d) => d !== longRunDate);
  const threshold = isThresholdWeek(weekNumber);

  const longRunDay: WeeklyShapeDay = { localDate: longRunDate, workoutKind: "long_run" };

  if (sorted.length === 3) {
    // Compressed 3-day: long run, full-body strength, combined short run + strength.
    const [a, b] = remaining as [string, string];
    return [
      longRunDay,
      { localDate: a, workoutKind: "strength_full" },
      { localDate: b, workoutKind: "combined_short" },
    ];
  }

  if (sorted.length === 4) {
    const roles: WorkoutKind[] = [threshold ? "threshold_run" : "easy_run", "strength_a", "strength_b"];
    return [longRunDay, ...bestAssignment(remaining, roles)];
  }

  // 5 (or more, treated as 5) available days: two strength + three runs total (long + 2 short).
  const shortRunKinds: WorkoutKind[] = threshold ? ["threshold_run", "easy_run"] : ["easy_run", "easy_run"];
  const roles: WorkoutKind[] = [...shortRunKinds, "strength_a", "strength_b"];
  return [longRunDay, ...bestAssignment(remaining.slice(0, 4), roles)];
}
