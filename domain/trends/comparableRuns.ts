import type { RunType } from "@/domain/types";

export interface ComparableRunCandidate {
  id: string;
  localDate: string;
  isThreshold: boolean;
  runType: RunType;
  isStroller: boolean;
  durationSeconds: number;
  paceSecondsPerMile: number;
  averageHr: number | null;
  effort: number | null;
  kneeNextMorning: number | null;
}

export type ComparisonBasis =
  | "faster_pace_similar_hr"
  | "lower_hr_similar_pace"
  | "longer_duration_same_effort"
  | "not_comparable"
  | "no_improvement";

export interface ComparableRunOutcome {
  earlier: ComparableRunCandidate;
  later: ComparableRunCandidate;
  improved: boolean;
  basis: ComparisonBasis;
}

/** Runs within this many minutes of each other in duration are considered comparable. */
const DURATION_TOLERANCE_SECONDS = 10 * 60;
/** Average HR within this many bpm counts as "similar HR". */
const HR_SIMILARITY_BPM = 3;
/** Pace within this many seconds/mile counts as "similar pace". */
const PACE_SIMILARITY_SECONDS = 10;

function isComparable(a: ComparableRunCandidate, b: ComparableRunCandidate): boolean {
  return (
    !a.isThreshold &&
    !b.isThreshold &&
    a.runType === b.runType &&
    a.isStroller === b.isStroller &&
    Math.abs(a.durationSeconds - b.durationSeconds) <= DURATION_TOLERANCE_SECONDS
  );
}

function compareTwoRuns(
  earlier: ComparableRunCandidate,
  later: ComparableRunCandidate,
): ComparableRunOutcome {
  if (!isComparable(earlier, later)) {
    return { earlier, later, improved: false, basis: "not_comparable" };
  }

  const bothHaveHr = earlier.averageHr !== null && later.averageHr !== null;
  const similarHr = bothHaveHr && Math.abs(earlier.averageHr! - later.averageHr!) <= HR_SIMILARITY_BPM;
  const similarPace = Math.abs(earlier.paceSecondsPerMile - later.paceSecondsPerMile) <= PACE_SIMILARITY_SECONDS;

  if (similarHr && later.paceSecondsPerMile < earlier.paceSecondsPerMile - PACE_SIMILARITY_SECONDS) {
    return { earlier, later, improved: true, basis: "faster_pace_similar_hr" };
  }

  if (similarPace && bothHaveHr && later.averageHr! < earlier.averageHr! - HR_SIMILARITY_BPM) {
    return { earlier, later, improved: true, basis: "lower_hr_similar_pace" };
  }

  const noWorseEffort =
    later.effort === null || earlier.effort === null || later.effort <= earlier.effort;
  const noWorseKnee =
    later.kneeNextMorning === null ||
    earlier.kneeNextMorning === null ||
    later.kneeNextMorning <= earlier.kneeNextMorning;

  if (later.durationSeconds > earlier.durationSeconds + 60 && noWorseEffort && noWorseKnee) {
    return { earlier, later, improved: true, basis: "longer_duration_same_effort" };
  }

  return { earlier, later, improved: false, basis: "no_improvement" };
}

/**
 * Finds the most recent comparable pair for the "running is getting
 * easier" trend: takes the latest non-threshold run and searches backward
 * for the nearest earlier run of the same environment and stroller context
 * within the duration tolerance. Threshold runs are excluded entirely —
 * they are evaluated separately, never mixed into this comparison.
 */
export function findComparableTrend(runs: ComparableRunCandidate[]): ComparableRunOutcome | null {
  const sorted = [...runs]
    .filter((r) => !r.isThreshold)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));

  if (sorted.length < 2) return null;

  const latest = sorted[sorted.length - 1]!;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const candidate = sorted[i]!;
    if (isComparable(candidate, latest)) {
      return compareTwoRuns(candidate, latest);
    }
  }
  return null;
}
