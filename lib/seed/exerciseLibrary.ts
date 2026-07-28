import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { EXERCISES, TEMPLATES } from "@/domain/content/exerciseLibrary";

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
    // Variants are reference data derived entirely from the exercise slug;
    // delete-and-reinsert keeps this idempotent without needing a natural
    // unique key across (exercise, location, equivalence_group).
    const { error: deleteError } = await admin.from("exercise_variants").delete().eq("exercise_id", exerciseId);
    if (deleteError) throw new Error(`Failed to clear variants for "${exercise.slug}": ${deleteError.message}`);

    if (exercise.variants.length === 0) continue;
    const { error: insertError } = await admin.from("exercise_variants").insert(
      exercise.variants.map((v) => ({
        exercise_id: exerciseId,
        location: v.location,
        equipment_requirements: v.equipmentRequirements,
        progression_methods: v.progressionMethods,
        contraindication_tags: v.contraindicationTags,
        equivalence_group: v.equivalenceGroup,
        is_short_option: v.isShortOption,
      })),
    );
    if (insertError) throw new Error(`Failed to insert variants for "${exercise.slug}": ${insertError.message}`);
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

    const { error: deleteError } = await admin
      .from("strength_template_items")
      .delete()
      .eq("template_id", data.id);
    if (deleteError) throw new Error(`Failed to clear items for "${template.slug}": ${deleteError.message}`);

    const { error: insertError } = await admin.from("strength_template_items").insert(
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
    );
    if (insertError) throw new Error(`Failed to insert items for "${template.slug}": ${insertError.message}`);
  }

  return { exerciseCount: EXERCISES.length, templateCount: TEMPLATES.length };
}
