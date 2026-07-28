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
function bestAssignment(dates: string[], roles: WorkoutKind[]): WeeklyShapeDay[] {
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
