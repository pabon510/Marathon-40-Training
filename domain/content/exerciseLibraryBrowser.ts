import { EXERCISES, getExerciseMetadataV2, type PrescriptionMetric } from "./exerciseLibrary";

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
}

/** Read-only, user-facing catalogue. Ambiguous legacy rows stay hidden. */
export function buildExerciseLibraryEntries(): ExerciseLibraryEntry[] {
  const nameBySlug = new Map(EXERCISES.map((exercise) => [exercise.slug, exercise.name]));
  return EXERCISES.filter((exercise) => {
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
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface ExerciseLibraryFilters {
  query: string;
  location: "all" | "gym" | "home";
  movementPattern: string;
  equipment: string;
  targetMuscle: string;
}

export function filterExerciseLibrary(
  entries: ExerciseLibraryEntry[],
  filters: ExerciseLibraryFilters,
): ExerciseLibraryEntry[] {
  const query = filters.query.trim().toLowerCase();
  return entries.filter((entry) => {
    const searchable = [
      entry.name,
      entry.movementPattern,
      ...entry.targetMuscles,
      ...entry.equipment,
      ...entry.substitutionNames,
    ]
      .join(" ")
      .toLowerCase();
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

