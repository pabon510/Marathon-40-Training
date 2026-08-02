import type { WorkoutKind } from "@/domain/types";

export interface ComparableRunCandidate {
  runLogId: string;
  localDate: string;
  workoutKind: WorkoutKind | null;
  runType: string;
  isStroller: boolean;
  durationSeconds: number | null;
  paceSecondsPerMile: number | null;
  averageHr: number | null;
  maximumHr: number | null;
  effort: number | null;
  averageTemperatureF: number | null;
  immediateKnee: number | null;
}

export interface RunComparison {
  prior: ComparableRunCandidate;
  selectionReason: string;
  differences: {
    durationMinutes: number | null;
    paceSecondsPerMile: number | null;
    averageHrBpm: number | null;
    effort: number | null;
    temperatureF: number | null;
  };
}

const easyLike = (kind: WorkoutKind | null) => kind === "easy_run" || kind === "long_run";

export function selectComparableRun(current: ComparableRunCandidate, candidates: ComparableRunCandidate[]): RunComparison | null {
  const eligible = candidates.filter((candidate) =>
    candidate.runLogId !== current.runLogId
    && candidate.localDate < current.localDate
    && candidate.isStroller === current.isStroller
    && candidate.runType === current.runType
    && candidate.durationSeconds !== null
    && candidate.averageHr !== null
    && (candidate.workoutKind === current.workoutKind || (easyLike(candidate.workoutKind) && easyLike(current.workoutKind))),
  );
  if (!eligible.length) return null;

  const scored = eligible.map((candidate) => {
    const exactKind = candidate.workoutKind === current.workoutKind ? 100 : 50;
    const durationGap = current.durationSeconds === null ? 0 : Math.abs(candidate.durationSeconds! - current.durationSeconds) / 60;
    const recency = new Date(`${candidate.localDate}T00:00:00Z`).getTime() / 86_400_000;
    return { candidate, score: exactKind - Math.min(durationGap, 40) + recency / 10_000 };
  }).sort((a, b) => b.score - a.score);
  const prior = scored[0]!.candidate;
  const delta = (a: number | null, b: number | null) => a === null || b === null ? null : a - b;
  return {
    prior,
    selectionReason: prior.workoutKind === current.workoutKind
      ? "Most relevant earlier run with the same workout type, stroller context, and surface classification."
      : "Most relevant earlier aerobic run with the same stroller context and surface classification; duration and workout type differ.",
    differences: {
      durationMinutes: current.durationSeconds === null ? null : Number(((current.durationSeconds - prior.durationSeconds!) / 60).toFixed(1)),
      paceSecondsPerMile: delta(current.paceSecondsPerMile, prior.paceSecondsPerMile),
      averageHrBpm: delta(current.averageHr, prior.averageHr),
      effort: delta(current.effort, prior.effort),
      temperatureF: delta(current.averageTemperatureF, prior.averageTemperatureF),
    },
  };
}
