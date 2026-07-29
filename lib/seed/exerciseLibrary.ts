import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  EXERCISES,
  EXERCISE_HISTORY_COMPATIBILITY,
  TEMPLATES,
  getExerciseMetadataV2,
} from "@/domain/content/exerciseLibrary";

type AdminClient = SupabaseClient<Database>;

/**
 * Upserts the curated exercise library (definitions, gym/home/short
 * variants, and strength templates). This is shared reference content, not
 * user data, so it's always safe to re-run — reused by both the local
 * `npm run seed` script and the in-app `/api/admin/seed` route.
 */
export async function seedExerciseLibrary(admin: AdminClient) {
  const exerciseIdBySlug = new Map<string, string>();

  for (const exercise of EXERCISES) {
    const metadataV2 = getExerciseMetadataV2(exercise);
    const { data, error } = await admin
      .from("exercise_definitions")
      .upsert(
        {
          slug: exercise.slug,
          name: exercise.name,
          movement_pattern: exercise.movementPattern,
          target_muscles: exercise.targetMuscles,
          equipment: exercise.equipment,
          setup: exercise.setup,
          execution: exercise.execution,
          cues: exercise.cues,
          mistakes: exercise.mistakes,
          stop_substitute_guidance: exercise.stopSubstituteGuidance,
          is_lower_body: exercise.isLowerBody,
          active: true,
          load_basis: exercise.loadBasis,
          default_load_type: exercise.defaultLoadType,
          rep_basis: exercise.repBasis,
          loading_instructions: exercise.loadingInstructions,
          load_position: exercise.loadPosition,
          start_load_note: exercise.startLoadNote,
          load_increment_lb: exercise.loadIncrementLb,
          family_slug: metadataV2.familySlug,
          programming_role: metadataV2.programmingRole,
          prescription_metric: metadataV2.prescriptionMetric,
          side_mode: metadataV2.sideMode,
          default_tempo: metadataV2.defaultTempo,
          default_duration_seconds: metadataV2.defaultDurationSeconds,
          default_distance_feet: metadataV2.defaultDistanceFeet,
          history_compatibility: metadataV2.historyCompatibility,
          safety_alternative_eligible: metadataV2.safetyAlternativeEligible,
          active_for_new_plans: metadataV2.activeForNewPlans,
          legacy_display_only: metadataV2.legacyDisplayOnly,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert exercise "${exercise.slug}": ${error?.message}`);
    }
    exerciseIdBySlug.set(exercise.slug, data.id);
  }

  for (const exercise of EXERCISES) {
    const exerciseId = exerciseIdBySlug.get(exercise.slug)!;
    const metadataV2 = getExerciseMetadataV2(exercise);
    if (exercise.variants.length === 0) continue;
    // Upsert on the (exercise_id, location, equivalence_group) natural key
    // rather than delete-and-reinsert: strength_logs.prescribed_variant_id
    // references these rows, so deleting them would break logged history.
    const { error: upsertError } = await admin.from("exercise_variants").upsert(
      exercise.variants.map((v) => ({
        exercise_id: exerciseId,
        location: v.location,
        equipment_requirements: v.equipmentRequirements,
        progression_methods: v.progressionMethods,
        contraindication_tags: v.contraindicationTags,
        equivalence_group: v.equivalenceGroup,
        is_short_option: v.isShortOption,
        selection_priority: v.selectionPriority ?? metadataV2.selectionPriority,
        programming_role: v.programmingRole ?? metadataV2.programmingRole,
        rotation_eligible: v.rotationEligible ?? metadataV2.rotationEligible,
      })),
      { onConflict: "exercise_id,location,equivalence_group" },
    );
    if (upsertError) throw new Error(`Failed to upsert variants for "${exercise.slug}": ${upsertError.message}`);
  }

  if (EXERCISE_HISTORY_COMPATIBILITY.length > 0) {
    const { error: compatibilityError } = await admin.from("exercise_history_compatibility").upsert(
      EXERCISE_HISTORY_COMPATIBILITY.map((edge) => ({
        source_exercise_id: exerciseIdBySlug.get(edge.sourceSlug)!,
        target_exercise_id: exerciseIdBySlug.get(edge.targetSlug)!,
        compatibility_scope: edge.compatibilityScope,
        notes: edge.notes,
      })),
      { onConflict: "source_exercise_id,target_exercise_id" },
    );
    if (compatibilityError) {
      throw new Error(`Failed to upsert exercise history compatibility: ${compatibilityError.message}`);
    }
  }

  for (const template of TEMPLATES) {
    const { data, error } = await admin
      .from("strength_templates")
      .upsert(
        {
          slug: template.slug,
          name: template.name,
          goal: template.goal,
          emphasis: template.emphasis,
          duration_minutes: template.durationMinutes,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(`Failed to upsert template "${template.slug}": ${error?.message}`);
    }

    // Upsert on (template_id, ordinal) rather than delete-and-reinsert, so a
    // template is never momentarily empty while the seed runs.
    const { error: insertError } = await admin.from("strength_template_items").upsert(
      template.items.map((item) => ({
        template_id: data.id,
        ordinal: item.ordinal,
        equivalence_group: item.equivalenceGroup,
        set_count: item.setCount,
        rep_range_low: item.repRangeLow,
        rep_range_high: item.repRangeHigh,
        rest_seconds: item.restSeconds,
        is_optional: item.isOptional,
        is_finisher: item.isFinisher,
        include_in_short_version: item.includeInShortVersion,
      })),
      { onConflict: "template_id,ordinal" },
    );
    if (insertError) throw new Error(`Failed to insert items for "${template.slug}": ${insertError.message}`);

    // Remove any trailing items left over from a previously longer version
    // of this template. Nothing references template items, so this is safe.
    const maxOrdinal = Math.max(...template.items.map((i) => i.ordinal));
    const { error: pruneError } = await admin
      .from("strength_template_items")
      .delete()
      .eq("template_id", data.id)
      .gt("ordinal", maxOrdinal);
    if (pruneError) throw new Error(`Failed to prune items for "${template.slug}": ${pruneError.message}`);
  }

  return { exerciseCount: EXERCISES.length, templateCount: TEMPLATES.length };
}
