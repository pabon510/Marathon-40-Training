import { EXERCISES, getExerciseMetadataV2, type PrescriptionMetric } from "./exerciseLibrary";
import { RECOVERY_MOVEMENTS } from "./recoveryMovementLibrary";

export interface ExerciseLibraryEntry {
  slug: string;
  name: string;
  movementPattern: string;
  targetMuscles: string[];
  equipment: string[];
  locations: Array<"gym" | "home" | "either">;
  setup: string;
  execution: string;
  cues: string[];
  mistakes: string[];
  stopSubstituteGuidance: string;
  allowedLoadTypes: string[];
  loadingInstructions: string;
  loadPosition: string;
  startLoadNote: string;
  repBasis: "total" | "per_side";
  prescriptionMetric: PrescriptionMetric;
  progressionNames: string[];
  regressionNames: string[];
  substitutionNames: string[];
  category: "strength" | "recovery";
  preferenceEligible: boolean;
  referenceImagePath: string | null;
  referenceImageAlt: string | null;
}

/** Read-only, user-facing catalogue. Ambiguous legacy rows stay hidden. */
export function buildExerciseLibraryEntries(): ExerciseLibraryEntry[] {
  const nameBySlug = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise.name]));
  const strengthEntries: ExerciseLibraryEntry[] = EXERCISES.filter((exercise) => {
    const metadata = getExerciseMetadataV2(exercise);
    return metadata.activeForNewPlans && !metadata.legacyDisplayOnly;
  })
    .map((exercise) => {
      const metadata = getExerciseMetadataV2(exercise);
      const names = (slugs: string[]) =>
        slugs.map((slug) => nameBySlug.get(slug)).filter((name): name is string => Boolean(name));
      return {
        slug: exercise.slug,
        name: exercise.name,
        movementPattern: exercise.movementPattern,
        targetMuscles: exercise.targetMuscles,
        equipment: exercise.equipment,
        locations: [...new Set(exercise.variants.map((variant) => variant.location))],
        setup: exercise.setup,
        execution: exercise.execution,
        cues: exercise.cues,
        mistakes: exercise.mistakes,
        stopSubstituteGuidance: exercise.stopSubstituteGuidance,
        allowedLoadTypes: exercise.allowedLoadTypes,
        loadingInstructions: exercise.loadingInstructions,
        loadPosition: exercise.loadPosition,
        startLoadNote: exercise.startLoadNote,
        repBasis: exercise.repBasis,
        prescriptionMetric: metadata.prescriptionMetric,
        progressionNames: names(metadata.progressionExerciseSlugs),
        regressionNames: names(metadata.regressionExerciseSlugs),
        substitutionNames: names(metadata.substitutionExerciseSlugs),
        category: "strength",
        preferenceEligible: true,
        referenceImagePath: null,
        referenceImageAlt: null,
      };
    });
  const recoveryEntries: ExerciseLibraryEntry[] = RECOVERY_MOVEMENTS.map((movement) => ({
    slug: movement.slug,
    name: movement.name,
    movementPattern: movement.movementPattern,
    targetMuscles: movement.targetAreas,
    equipment: ["yoga mat"],
    locations: ["home"],
    setup: movement.setup,
    execution: movement.execution,
    cues: movement.cues,
    mistakes: movement.mistakes,
    stopSubstituteGuidance: movement.stopGuidance,
    allowedLoadTypes: ["bodyweight"],
    loadingInstructions: "Use a comfortable, pain-free range. No external load is needed.",
    loadPosition: "No external load",
    startLoadNote: "This is a recovery movement, not a strength progression.",
    repBasis: "total",
    prescriptionMetric: "breaths",
    progressionNames: [],
    regressionNames: [],
    substitutionNames: [],
    category: "recovery",
    preferenceEligible: false,
    referenceImagePath: movement.imagePath,
    referenceImageAlt: movement.imageAlt,
  }));
  return [...strengthEntries, ...recoveryEntries].sort((a, b) => a.name.localeCompare(b.name));
}

export interface ExerciseLibraryFilters {
  query: string;
  location: "all" | "gym" | "home";
  movementPattern: string;
  equipment: string;
  targetMuscle: string;
}

function normalizedSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function filterExerciseLibrary(
  entries: ExerciseLibraryEntry[],
  filters: ExerciseLibraryFilters,
): ExerciseLibraryEntry[] {
  const query = normalizedSearchText(filters.query);
  return entries.filter((entry) => {
    const searchable = normalizedSearchText([
      entry.name,
      entry.movementPattern,
      ...entry.targetMuscles,
      ...entry.equipment,
      ...entry.substitutionNames,
    ]
      .join(" "));
    const locationMatch =
      filters.location === "all" ||
      entry.locations.includes(filters.location) ||
      entry.locations.includes("either");
    return (
      (!query || searchable.includes(query)) &&
      locationMatch &&
      (!filters.movementPattern || entry.movementPattern === filters.movementPattern) &&
      (!filters.equipment || entry.equipment.includes(filters.equipment)) &&
      (!filters.targetMuscle || entry.targetMuscles.includes(filters.targetMuscle))
    );
  });
}
