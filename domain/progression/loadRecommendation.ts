import type { LoadBasis, LoadType, RepBasis } from "@/domain/content/exerciseLibrary";
import { evaluateStrengthProgression, type StrengthExposure } from "@/domain/progression/strength";

export type BandLevel = "light" | "medium" | "heavy";

/** One previously logged exposure to a single exercise, newest first when in a list. */
export interface ExerciseExposure {
  localDate: string;
  loadValue: number | null;
  loadType: LoadType | null;
  bandLevel: BandLevel | null;
  completedSets: number | null;
  representativeReps: number | null;
  difficulty: number | null;
  repBasis: RepBasis | null;
}

export interface Prescription {
  setCount: number;
  repRangeLow: number;
  repRangeHigh: number;
}

export interface ExerciseLoadContext {
  loadBasis: LoadBasis;
  defaultLoadType: LoadType;
  repBasis: RepBasis;
  loadIncrementLb: number;
  location: "gym" | "home";
  /** Whether a heavier implement exists at this location (drives reps-vs-load at home). */
  hasHeavierEquipmentAvailable: boolean;
}

/**
 * The first-session load-finding protocol, shown when an exercise has no
 * logged history. Deliberately a process, not a number — the app has no
 * basis to guess a starting load.
 */
export const FIRST_SESSION_STEPS: string[] = [
  "Start with a light warmup set to feel the movement.",
  "Increase gradually across a set or two rather than jumping straight to a working weight.",
  "Choose a load that lets you complete the prescribed reps with clean form.",
  "Aim for a difficulty of about 6-7 out of 10.",
  "Stop increasing once roughly 2-3 good reps would remain at the end of a set.",
];

export type RecommendationKind =
  | "first_session"
  | "repeat"
  | "add_reps"
  | "add_load"
  | "home_variable";

export interface LoadRecommendation {
  kind: RecommendationKind;
  /** "130 lb for 3 sets of 10" — absent on a first session. */
  recommendedText: string | null;
  recommendedLoad: number | null;
  recommendedSets: number;
  recommendedRepsLow: number;
  recommendedRepsHigh: number;
  /** "130 lb for 3 sets of 10, difficulty 6" — absent on a first session. */
  previousText: string | null;
  previousDifficulty: number | null;
  /** Short plain-language reason the recommendation is what it is. */
  explanation: string;
  /** Step-by-step protocol, only populated for a first session. */
  firstSessionSteps: string[];
}

function formatLoad(
  loadValue: number | null,
  loadType: LoadType | null,
  bandLevel: BandLevel | null,
  loadBasis: LoadBasis,
): string {
  if (loadType === "bodyweight" || loadBasis === "bodyweight") return "bodyweight";
  if (loadType === "band" || loadBasis === "band") {
    return bandLevel ? `${bandLevel} band` : "band";
  }
  if (loadValue === null) return "no load recorded";
  const suffix =
    loadBasis === "per_dumbbell" || loadBasis === "per_hand"
      ? " per hand"
      : loadBasis === "machine_total"
        ? " total"
        : "";
  return `${loadValue} lb${suffix}`;
}

function formatReps(reps: number | null, repBasis: RepBasis): string {
  if (reps === null) return "reps not recorded";
  return repBasis === "per_side" ? `${reps} per side` : `${reps}`;
}

function toStrengthExposure(
  exposure: ExerciseExposure,
  prescription: Prescription,
): StrengthExposure {
  return {
    completedAsPrescribed:
      exposure.completedSets !== null &&
      exposure.completedSets >= prescription.setCount &&
      exposure.representativeReps !== null &&
      exposure.representativeReps >= prescription.repRangeLow,
    repsAtTopOfRange:
      exposure.representativeReps !== null && exposure.representativeReps >= prescription.repRangeHigh,
    // A missing difficulty is treated as "too uncertain to progress on" —
    // it must not silently read as an easy session.
    difficulty: exposure.difficulty ?? 10,
    painIncreased: false,
    formFailed: false,
    recoveryAcceptable: true,
  };
}

/**
 * Builds the guidance shown above an exercise's input fields: either the
 * first-session load-finding protocol, or a concrete recommendation plus
 * what was done last time and why the recommendation changed (or didn't).
 *
 * `history` is newest-first. Progression itself is decided by the shared
 * `evaluateStrengthProgression` rules (two similar successful exposures,
 * reps before load, home variables before new equipment) so this stays
 * consistent with docs/ADAPTATION_RULES.md.
 */
export function buildLoadRecommendation(
  history: ExerciseExposure[],
  prescription: Prescription,
  context: ExerciseLoadContext,
): LoadRecommendation {
  const base = {
    recommendedSets: prescription.setCount,
    recommendedRepsLow: prescription.repRangeLow,
    recommendedRepsHigh: prescription.repRangeHigh,
    firstSessionSteps: [] as string[],
  };

  if (history.length === 0) {
    return {
      ...base,
      kind: "first_session",
      recommendedText: null,
      recommendedLoad: null,
      previousText: null,
      previousDifficulty: null,
      explanation:
        "No history for this exercise yet, so find a working load today using the steps below and log what you used.",
      firstSessionSteps: FIRST_SESSION_STEPS,
    };
  }

  const last = history[0]!;
  const lastRepBasis = last.repBasis ?? context.repBasis;
  const previousText = `${formatLoad(last.loadValue, last.loadType, last.bandLevel, context.loadBasis)} for ${
    last.completedSets ?? prescription.setCount
  } sets of ${formatReps(last.representativeReps, lastRepBasis)}${
    last.difficulty !== null ? `, difficulty ${last.difficulty}` : ""
  }`;

  const progression = evaluateStrengthProgression(
    history.slice(0, 2).map((e) => toStrengthExposure(e, prescription)),
    context.location,
    context.hasHeavierEquipmentAvailable,
  );

  const isUnloaded =
    context.loadBasis === "bodyweight" ||
    context.loadBasis === "band" ||
    last.loadType === "bodyweight" ||
    last.loadType === "band";

  function recommendedTextFor(load: number | null, repsLow: number, repsHigh: number): string {
    const loadPart = isUnloaded
      ? formatLoad(load, last.loadType, last.bandLevel, context.loadBasis)
      : load !== null
        ? formatLoad(load, last.loadType ?? context.defaultLoadType, last.bandLevel, context.loadBasis)
        : "a working load";
    const repPart =
      repsLow === repsHigh ? `${repsLow}` : `${repsLow}-${repsHigh}`;
    const perSide = context.repBasis === "per_side" ? " per side" : "";
    return `${loadPart} for ${prescription.setCount} sets of ${repPart}${perSide}`;
  }

  if (!progression.eligible || progression.method === null) {
    return {
      ...base,
      kind: "repeat",
      recommendedLoad: last.loadValue,
      recommendedText: recommendedTextFor(last.loadValue, prescription.repRangeLow, prescription.repRangeHigh),
      previousText,
      previousDifficulty: last.difficulty,
      explanation:
        history.length < 2
          ? "Repeat the same work — progression needs two similar successful sessions."
          : "Repeat the same work: the last two sessions didn't both meet the progression criteria.",
    };
  }

  if (progression.method === "reps") {
    return {
      ...base,
      kind: "add_reps",
      recommendedLoad: last.loadValue,
      recommendedText: recommendedTextFor(last.loadValue, prescription.repRangeHigh, prescription.repRangeHigh),
      previousText,
      previousDifficulty: last.difficulty,
      explanation: "Complete more reps at this load before increasing the weight.",
    };
  }

  if (progression.method === "home_variable") {
    return {
      ...base,
      kind: "home_variable",
      recommendedLoad: last.loadValue,
      recommendedText: recommendedTextFor(last.loadValue, prescription.repRangeHigh, prescription.repRangeHigh),
      previousText,
      previousDifficulty: last.difficulty,
      explanation:
        "You're at the top of the rep range without heavier equipment at home — add difficulty with a slower tempo, a pause, more range, or a single-side version instead.",
    };
  }

  const nextLoad = last.loadValue === null ? null : last.loadValue + context.loadIncrementLb;
  return {
    ...base,
    kind: "add_load",
    recommendedLoad: nextLoad,
    recommendedText: recommendedTextFor(nextLoad, prescription.repRangeLow, prescription.repRangeHigh),
    previousText,
    previousDifficulty: last.difficulty,
    explanation: `You hit the top of the rep range twice at a controlled difficulty, so add the smallest practical increase (+${context.loadIncrementLb} lb) and rebuild the reps.`,
  };
}
