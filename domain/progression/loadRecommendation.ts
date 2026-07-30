import type { LoadType, RepBasis } from "@/domain/content/exerciseLibrary";
import {
  allowsBodyweight,
  loadedTypeFor,
  resolveHistoricalLoadType,
  type ExerciseLoadMetadata,
} from "@/domain/content/loadMetadata";
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
  completedSeconds?: number | null;
  completedDistanceFeet?: number | null;
  completedSteps?: number | null;
  difficulty: number | null;
  repBasis: RepBasis | null;
  /** Null/undefined is unknown and must not silently qualify progression. */
  painIncreased?: boolean | null;
  formFailed?: boolean | null;
  recoveryAcceptable?: boolean | null;
}

export interface Prescription {
  setCount: number;
  repRangeLow: number;
  repRangeHigh: number;
}

export interface ExerciseLoadContext {
  metadata: ExerciseLoadMetadata;
  location: "gym" | "home";
  /** Whether a heavier implement exists at this location (drives reps-vs-load at home). */
  hasHeavierEquipmentAvailable: boolean;
}

export type RecommendationKind =
  | "first_session"
  | "repeat"
  | "add_reps"
  | "add_load"
  | "home_variable";

export interface LoadRecommendation {
  kind: RecommendationKind;
  /** "130 lb for 3 sets of 8 to 12" — absent on a first session. */
  recommendedText: string | null;
  recommendedLoad: number | null;
  /** The load type today's recommendation assumes. Never bodyweight unless the exercise allows it. */
  recommendedLoadType: LoadType;
  recommendedSets: number;
  recommendedRepsLow: number;
  recommendedRepsHigh: number;
  /** "130 lb for 3 sets of 10, difficulty 7" — absent on a first session. */
  previousText: string | null;
  previousDifficulty: number | null;
  /** Short plain-language reason the recommendation is what it is. */
  explanation: string;
  /** One-sentence load-selection protocol, only populated for a first session. */
  firstSessionProtocol: string | null;
  /** Step-by-step protocol, only populated for a first session. */
  firstSessionSteps: string[];
}

function repRangeText(low: number, high: number): string {
  return low === high ? `${low}` : `${low} to ${high}`;
}

/**
 * Renders a load for display. A numeric load is ALWAYS shown as a weight —
 * it is never collapsed to "bodyweight", which was the original defect
 * (a 130 lb leg press rendering as bodyweight because the exercise row's
 * load_basis had defaulted to bodyweight).
 */
function formatLoad(
  loadValue: number | null,
  loadType: LoadType,
  bandLevel: BandLevel | null,
  metadata: ExerciseLoadMetadata,
): string {
  if (loadValue !== null && loadValue > 0) {
    // Scope is only spelled out where the number is genuinely ambiguous.
    const suffix =
      metadata.loadScope === "per_dumbbell"
        ? " per dumbbell"
        : metadata.loadScope === "per_hand"
          ? " per hand"
          : "";
    return `${loadValue} lb${suffix}`;
  }
  if (loadType === "band") return bandLevel ? `${bandLevel} band` : "band";
  if (loadType === "bodyweight") return "bodyweight";
  return "no load recorded";
}

function formatReps(reps: number | null, repScope: RepBasis): string {
  if (reps === null) return "reps not recorded";
  return repScope === "per_side" ? `${reps} per side` : `${reps}`;
}

function completedMetricValue(exposure: ExerciseExposure, metadata: ExerciseLoadMetadata): number | null {
  switch (metadata.prescriptionMetric) {
    case "seconds":
      return exposure.completedSeconds ?? null;
    case "distance_feet":
      return exposure.completedDistanceFeet ?? null;
    case "steps":
      return exposure.completedSteps ?? null;
    default:
      return exposure.representativeReps;
  }
}

function formatResult(value: number | null, metadata: ExerciseLoadMetadata, repScope: RepBasis): string {
  if (metadata.prescriptionMetric === "reps" || metadata.prescriptionMetric === "breaths") {
    return formatReps(value, repScope);
  }
  if (value === null) return `${metadata.prescriptionMetric.replace("_", " ")} not recorded`;
  const unit =
    metadata.prescriptionMetric === "seconds"
      ? "seconds"
      : metadata.prescriptionMetric === "distance_feet"
        ? "feet"
        : "steps";
  return `${value} ${unit}${repScope === "per_side" ? " per side" : ""}`;
}

/** The first-session load-selection protocol, phrased for how this exercise is actually loaded. */
export function firstSessionProtocolFor(
  metadata: ExerciseLoadMetadata,
  prescription: Prescription,
): string {
  const reps = repRangeText(prescription.repRangeLow, prescription.repRangeHigh);
  const unit =
    metadata.prescriptionMetric === "seconds"
      ? "seconds"
      : metadata.prescriptionMetric === "distance_feet"
        ? "feet"
        : metadata.prescriptionMetric === "steps"
          ? "steps"
          : "controlled reps";
  const tail =
    metadata.prescriptionMetric === "reps"
      ? `that allows ${reps} controlled reps at difficulty 6 to 7, with approximately 2 to 3 good reps remaining.`
      : `that allows ${reps} ${unit} at difficulty 6 to 7 with clean form.`;
  const type = loadedTypeFor(metadata);

  if (metadata.defaultLoadType === "bodyweight" && allowsBodyweight(metadata)) {
    return metadata.prescriptionMetric === "reps"
      ? `Start with bodyweight and complete ${reps} controlled reps at difficulty 6 to 7, with approximately 2 to 3 good reps remaining.`
      : `Start with bodyweight and complete ${reps} ${unit} at difficulty 6 to 7 with clean form.`;
  }
  if (type === "machine") return `Select a starting machine weight ${tail}`;
  if (type === "band") return `Select a band level ${tail}`;
  if (metadata.loadScope === "per_hand") return `Select a starting dumbbell weight per hand ${tail}`;
  if (metadata.loadScope === "per_dumbbell") return `Select a starting dumbbell weight per dumbbell ${tail}`;
  return `Select a starting weight ${tail}`;
}

export const FIRST_SESSION_STEPS: string[] = [
  "Start with a light warmup set to feel the movement.",
  "Increase gradually across a set or two rather than jumping straight to a working weight.",
  "Choose a load that lets you complete the prescribed reps with clean form.",
  "Aim for a difficulty of about 6-7 out of 10.",
  "Stop increasing once roughly 2-3 good reps would remain at the end of a set.",
];

function toStrengthExposure(
  exposure: ExerciseExposure,
  prescription: Prescription,
  metadata: ExerciseLoadMetadata,
): StrengthExposure {
  const result = completedMetricValue(exposure, metadata);
  return {
    completedAsPrescribed:
      exposure.completedSets !== null &&
      exposure.completedSets >= prescription.setCount &&
      result !== null &&
      result >= prescription.repRangeLow,
    repsAtTopOfRange:
      result !== null && result >= prescription.repRangeHigh,
    // A missing difficulty is treated as "too uncertain to progress on" —
    // it must not silently read as an easy session.
    difficulty: exposure.difficulty ?? 10,
    // Unknown evidence is conservative: progression requires explicit
    // confirmation that pain/form/recovery criteria were satisfied.
    painIncreased: exposure.painIncreased !== false,
    formFailed: exposure.formFailed !== false,
    recoveryAcceptable: exposure.recoveryAcceptable === true,
  };
}

/**
 * Builds the guidance shown above an exercise's input fields: either the
 * first-session load-selection protocol, or a concrete recommendation plus
 * what was done last time and why the recommendation changed (or didn't).
 *
 * `history` is newest-first and is only ever read, never modified.
 * Progression itself is decided by the shared `evaluateStrengthProgression`
 * rules so this stays consistent with docs/ADAPTATION_RULES.md.
 */
export function buildLoadRecommendation(
  history: ExerciseExposure[],
  prescription: Prescription,
  context: ExerciseLoadContext,
): LoadRecommendation {
  const { metadata } = context;
  const base = {
    recommendedSets: prescription.setCount,
    recommendedRepsLow: prescription.repRangeLow,
    recommendedRepsHigh: prescription.repRangeHigh,
    firstSessionProtocol: null as string | null,
    firstSessionSteps: [] as string[],
  };

  if (history.length === 0) {
    return {
      ...base,
      kind: "first_session",
      recommendedText: null,
      recommendedLoad: null,
      // Never bodyweight unless this exercise actually allows it.
      recommendedLoadType: metadata.defaultLoadType,
      previousText: null,
      previousDifficulty: null,
      explanation:
        "No history for this exercise yet, so find a working load today and log what you used.",
      firstSessionProtocol: firstSessionProtocolFor(metadata, prescription),
      firstSessionSteps: FIRST_SESSION_STEPS,
    };
  }

  const last = history[0]!;
  const lastLoadType = resolveHistoricalLoadType(last.loadValue, last.loadType, metadata);
  const lastRepScope = last.repBasis ?? metadata.repScope;

  const previousText = `${formatLoad(last.loadValue, lastLoadType, last.bandLevel, metadata)} for ${
    last.completedSets ?? prescription.setCount
  } sets of ${formatResult(completedMetricValue(last, metadata), metadata, lastRepScope)}${
    last.difficulty !== null ? `, difficulty ${last.difficulty}` : ""
  }`;

  const progression = evaluateStrengthProgression(
    history.slice(0, 2).map((e) => toStrengthExposure(e, prescription, metadata)),
    context.location,
    context.hasHeavierEquipmentAvailable,
  );

  function recommendedTextFor(load: number | null, repsLow: number, repsHigh: number): string {
    const loadPart = formatLoad(load, lastLoadType, last.bandLevel, metadata);
    const perSide = metadata.repScope === "per_side" ? " per side" : "";
    const unit =
      metadata.prescriptionMetric === "seconds"
        ? " seconds"
        : metadata.prescriptionMetric === "distance_feet"
          ? " feet"
          : metadata.prescriptionMetric === "steps"
            ? " steps"
            : "";
    return `${loadPart} for ${prescription.setCount} sets of ${repRangeText(repsLow, repsHigh)}${unit}${perSide}`;
  }

  if (!progression.eligible || progression.method === null) {
    return {
      ...base,
      kind: "repeat",
      recommendedLoad: last.loadValue,
      recommendedLoadType: lastLoadType,
      recommendedText: recommendedTextFor(last.loadValue, prescription.repRangeLow, prescription.repRangeHigh),
      previousText,
      previousDifficulty: last.difficulty,
      explanation:
        history.length < 2
          ? "Repeat the same load. Progression requires two similar successful sessions."
          : "Repeat the same load: the last two sessions didn't both meet the progression criteria.",
    };
  }

  if (progression.method === "reps") {
    return {
      ...base,
      kind: "add_reps",
      recommendedLoad: last.loadValue,
      recommendedLoadType: lastLoadType,
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
      recommendedLoadType: lastLoadType,
      recommendedText: recommendedTextFor(last.loadValue, prescription.repRangeHigh, prescription.repRangeHigh),
      previousText,
      previousDifficulty: last.difficulty,
      explanation:
        "You're at the top of the rep range without heavier equipment at home — add difficulty with a slower tempo, a pause, more range, or a single-side version instead.",
    };
  }

  const nextLoad = last.loadValue === null ? null : last.loadValue + metadata.loadIncrementLb;
  return {
    ...base,
    kind: "add_load",
    recommendedLoad: nextLoad,
    recommendedLoadType: lastLoadType,
    recommendedText: recommendedTextFor(nextLoad, prescription.repRangeLow, prescription.repRangeHigh),
    previousText,
    previousDifficulty: last.difficulty,
    explanation: `You hit the top of the rep range twice at a controlled difficulty, so add the smallest practical increase (+${metadata.loadIncrementLb} lb) and rebuild the reps.`,
  };
}
