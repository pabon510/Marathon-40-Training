import {
  EXERCISES,
  getExerciseMetadataV2,
  type ExerciseMetadataV2,
  type LoadBasis,
  type LoadType,
  type RepBasis,
} from "@/domain/content/exerciseLibrary";

/**
 * The load/rep semantics for one exercise.
 *
 * IMPORTANT: this is resolved from the curated code library by slug, NOT
 * from the database row. Migration 0008 added these columns with a
 * `bodyweight` default, so every pre-existing exercise row in a live
 * database claims to be bodyweight until the seed re-runs. Treating the
 * code as authoritative means correct behaviour without touching
 * production data. The database columns are a denormalized copy for
 * querying; they are never trusted for display or recommendation.
 */
export interface ExerciseLoadMetadata extends ExerciseMetadataV2 {
  slug: string;
  allowedLoadTypes: LoadType[];
  defaultLoadType: LoadType;
  /** How to read the load number: machine total, per dumbbell, per hand, etc. */
  loadScope: LoadBasis;
  /** Whether reps are counted in total or per side. */
  repScope: RepBasis;
  loadingInstructions: string;
  loadPosition: string;
  startLoadNote: string;
  loadIncrementLb: number;
}

const BY_SLUG = new Map<string, ExerciseLoadMetadata>(
  EXERCISES.map((e) => {
    const v2 = getExerciseMetadataV2(e);
    return [
      e.slug,
      {
      slug: e.slug,
      allowedLoadTypes: e.allowedLoadTypes,
      defaultLoadType: e.defaultLoadType,
      loadScope: e.loadBasis,
      repScope: e.repBasis,
      loadingInstructions: e.loadingInstructions,
      loadPosition: e.loadPosition,
      startLoadNote: e.startLoadNote,
      loadIncrementLb: e.loadIncrementLb,
      ...v2,
      },
    ];
  }),
);

/**
 * Fallback for an exercise slug not present in the curated library (should
 * not happen in practice). Deliberately NOT bodyweight — an unknown
 * exercise must never silently claim no load is needed.
 */
const UNKNOWN_FALLBACK: Omit<ExerciseLoadMetadata, "slug"> = {
  allowedLoadTypes: ["weighted", "bodyweight", "band", "machine"],
  defaultLoadType: "weighted",
  loadScope: "single_implement",
  repScope: "total",
  loadingInstructions: "Record the load you used.",
  loadPosition: "",
  startLoadNote: "",
  loadIncrementLb: 5,
  familySlug: "unknown",
  programmingRole: "secondary",
  prescriptionMetric: "reps",
  sideMode: "bilateral",
  defaultTempo: null,
  defaultDurationSeconds: null,
  defaultDistanceFeet: null,
  historyCompatibility: "exact_only",
  progressionExerciseSlugs: [],
  regressionExerciseSlugs: [],
  substitutionExerciseSlugs: [],
  safetyAlternativeEligible: false,
  activeForNewPlans: false,
  legacyDisplayOnly: true,
  selectionPriority: Number.MAX_SAFE_INTEGER,
  rotationEligible: false,
};

export function getExerciseLoadMetadata(slug: string): ExerciseLoadMetadata {
  return BY_SLUG.get(slug) ?? { slug, ...UNKNOWN_FALLBACK };
}

export function allowsBodyweight(metadata: ExerciseLoadMetadata): boolean {
  return metadata.allowedLoadTypes.includes("bodyweight");
}

/**
 * The load type to assume when an exercise is actually carrying external
 * load — used to interpret historical rows whose `load_type` predates the
 * column, and to pick a sensible default for first sessions.
 */
export function loadedTypeFor(metadata: ExerciseLoadMetadata): LoadType {
  if (metadata.defaultLoadType !== "bodyweight") return metadata.defaultLoadType;
  const loaded = metadata.allowedLoadTypes.find((t) => t !== "bodyweight");
  return loaded ?? "weighted";
}

/**
 * Resolves the effective load type of a historical log entry without
 * mutating it.
 *
 * Rules, in order:
 *  - A numeric load always wins. A row with 130 lb recorded is not
 *    bodyweight, whatever its (possibly NULL, possibly stale) load_type says.
 *  - An explicit load type is honoured if the exercise permits it.
 *  - Otherwise fall back to the exercise's default.
 */
export function resolveHistoricalLoadType(
  loadValue: number | null,
  storedLoadType: LoadType | null | undefined,
  metadata: ExerciseLoadMetadata,
): LoadType {
  const hasNumericLoad = loadValue !== null && loadValue > 0;

  if (hasNumericLoad) {
    if (storedLoadType && storedLoadType !== "bodyweight" && metadata.allowedLoadTypes.includes(storedLoadType)) {
      return storedLoadType;
    }
    return loadedTypeFor(metadata);
  }

  if (storedLoadType && metadata.allowedLoadTypes.includes(storedLoadType)) {
    return storedLoadType;
  }

  return metadata.defaultLoadType;
}
