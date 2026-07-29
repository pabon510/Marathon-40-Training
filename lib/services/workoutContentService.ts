import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  buildStrengthWorkout,
  type ResolvedWorkoutItem,
  type TemplateItem,
  type VariantOption,
} from "@/domain/planning/locationConversion";
import type { Location } from "@/domain/types";

type Client = SupabaseClient<Database>;

export interface ResolvedExerciseItem extends ResolvedWorkoutItem {
  exercise: Database["public"]["Tables"]["exercise_definitions"]["Row"];
}

/** Fetches a strength template's items + resolves each to the correct gym/home/short exercise variant, with full content. */
export async function resolveStrengthWorkout(
  supabase: Client,
  templateId: string,
  location: Location,
  wantShort: boolean,
): Promise<{ template: Database["public"]["Tables"]["strength_templates"]["Row"]; items: ResolvedExerciseItem[] }> {
  const [{ data: template, error: templateError }, { data: itemRows, error: itemsError }] = await Promise.all([
    supabase.from("strength_templates").select("*").eq("id", templateId).single(),
    supabase.from("strength_template_items").select("*").eq("template_id", templateId).order("ordinal"),
  ]);
  if (templateError || !template) throw templateError ?? new Error("Template not found");
  if (itemsError) throw itemsError;

  const groups = [...new Set((itemRows ?? []).map((i) => i.equivalence_group))];
  const { data: variantRows, error: variantsError } = await supabase
    .from("exercise_variants")
    .select("*, exercise_definitions(*)")
    .in("equivalence_group", groups);
  if (variantsError) throw variantsError;

  const exerciseById = new Map<string, Database["public"]["Tables"]["exercise_definitions"]["Row"]>();
  const variants: VariantOption[] = [];
  for (const row of (variantRows ?? []) as Array<
    Database["public"]["Tables"]["exercise_variants"]["Row"] & {
      exercise_definitions: Database["public"]["Tables"]["exercise_definitions"]["Row"];
    }
  >) {
    variants.push({
      id: row.id,
      exerciseId: row.exercise_id,
      exerciseSlug: row.exercise_definitions.slug,
      location: row.location,
      equivalenceGroup: row.equivalence_group,
      isShortOption: row.is_short_option,
      selectionPriority: row.selection_priority,
      activeForNewPlans: row.exercise_definitions.active_for_new_plans,
      safetyEligible: true,
    });
    exerciseById.set(row.exercise_id, row.exercise_definitions);
  }

  const templateItems: TemplateItem[] = (itemRows ?? []).map((i) => ({
    ordinal: i.ordinal,
    equivalenceGroup: i.equivalence_group,
    isOptional: i.is_optional,
    isFinisher: i.is_finisher,
    includeInShortVersion: i.include_in_short_version,
    setCount: i.set_count,
    repRangeLow: i.rep_range_low,
    repRangeHigh: i.rep_range_high,
    restSeconds: i.rest_seconds,
  }));

  const resolved = buildStrengthWorkout(templateItems, variants, location, wantShort);

  const items: ResolvedExerciseItem[] = resolved
    .map((r) => {
      const exercise = exerciseById.get(r.variant.exerciseId);
      if (!exercise) return null;
      return { ...r, exercise };
    })
    .filter((x): x is ResolvedExerciseItem => x !== null);

  return { template, items };
}
