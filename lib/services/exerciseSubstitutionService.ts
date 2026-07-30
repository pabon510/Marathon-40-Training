import type { SupabaseClient } from "@supabase/supabase-js";
import { EXERCISES } from "@/domain/content/exerciseLibrary";
import {
  buildSubstitutionCandidates,
  type ExercisePreference,
  type SubstitutionCandidate,
  type SubstitutionReason,
} from "@/domain/planning/exerciseSubstitution";
import type { Database } from "@/lib/supabase/types";
import type { ResolvedExerciseItem } from "@/lib/services/workoutContentService";

type Client = SupabaseClient<Database>;

export interface SavedSubstitution {
  originalExerciseId: string;
  originalExerciseName: string;
  originalExerciseSlug: string;
  quality: "exact" | "close" | "general";
}

export async function applyPlannedExerciseSubstitutions(
  supabase: Client,
  plannedWorkoutId: string,
  location: "gym" | "home",
  items: ResolvedExerciseItem[],
): Promise<ResolvedExerciseItem[]> {
  const { data: rows, error } = await supabase
    .from("planned_exercise_substitutions")
    .select("*")
    .eq("planned_workout_id", plannedWorkoutId);
  if (error) throw error;
  if (!rows?.length) return items;

  const substituteIds = [...new Set(rows.map((row) => row.substitute_exercise_id))];
  const originalIds = [...new Set(rows.map((row) => row.original_exercise_id))];
  const [{ data: definitions, error: definitionsError }, { data: variants, error: variantsError }] = await Promise.all([
    supabase.from("exercise_definitions").select("*").in("id", [...new Set([...substituteIds, ...originalIds])]),
    supabase.from("exercise_variants").select("*").in("exercise_id", substituteIds),
  ]);
  if (definitionsError) throw definitionsError;
  if (variantsError) throw variantsError;

  const definitionById = new Map((definitions ?? []).map((definition) => [definition.id, definition]));
  const rowByOrdinal = new Map(rows.map((row) => [row.ordinal, row]));

  return items.map((item) => {
    const saved = rowByOrdinal.get(item.ordinal);
    if (!saved) return item;
    const exercise = definitionById.get(saved.substitute_exercise_id);
    const original = definitionById.get(saved.original_exercise_id);
    const variant = (variants ?? [])
      .filter((candidate) => candidate.exercise_id === saved.substitute_exercise_id)
      .filter((candidate) => candidate.location === location || candidate.location === "either")
      .sort((a, b) => a.selection_priority - b.selection_priority)[0];
    if (!exercise || !original || !variant) return item;

    return {
      ...item,
      exercise,
      variant: {
        id: variant.id,
        exerciseId: exercise.id,
        exerciseSlug: exercise.slug,
        location: variant.location,
        equivalenceGroup: variant.equivalence_group,
        isShortOption: variant.is_short_option,
        selectionPriority: variant.selection_priority,
        activeForNewPlans: exercise.active_for_new_plans,
        safetyEligible: true,
        rotationEligible: variant.rotation_eligible,
      },
      selectionReasonCode: "manual_substitution",
      savedSubstitution: {
        originalExerciseId: original.id,
        originalExerciseName: original.name,
        originalExerciseSlug: original.slug,
        quality: saved.substitution_quality,
      },
    };
  });
}

export async function getSubstitutionCandidates(
  supabase: Client,
  userId: string,
  originalSlug: string,
  location: "gym" | "home",
  reason: SubstitutionReason,
  blockLowerBody: boolean,
): Promise<SubstitutionCandidate[]> {
  const { data: rows, error } = await supabase
    .from("exercise_preferences")
    .select("exercise_slug, preference")
    .eq("user_id", userId);
  if (error) throw error;
  const preferences = new Map<string, ExercisePreference>(
    (rows ?? []).map((row) => [row.exercise_slug, row.preference]),
  );
  return buildSubstitutionCandidates({
    originalSlug,
    location,
    reason,
    preferences,
    blockLowerBody,
    library: EXERCISES,
  });
}

