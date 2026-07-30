import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  buildStrengthWorkout,
  type ResolvedWorkoutItem,
  type TemplateItem,
  type VariantOption,
} from "@/domain/planning/locationConversion";
import type { Location } from "@/domain/types";
import { strengthSlotKey, trainingBlockWindow } from "@/domain/planning/trainingBlock";
import type { SavedSubstitution } from "@/lib/services/exerciseSubstitutionService";

type Client = SupabaseClient<Database>;

export interface ResolvedExerciseItem extends ResolvedWorkoutItem {
  exercise: Database["public"]["Tables"]["exercise_definitions"]["Row"];
  savedSubstitution?: SavedSubstitution;
}

/** Fetches a strength template's items + resolves each to the correct gym/home/short exercise variant, with full content. */
export async function resolveStrengthWorkout(
  supabase: Client,
  templateId: string,
  location: Location,
  wantShort: boolean,
  context?: { userId: string; localDate: string },
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
      rotationEligible: row.rotation_eligible,
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

  if (context) {
    const { data: preferenceRows, error: preferenceError } = await supabase
      .from("exercise_preferences")
      .select("exercise_slug, preference")
      .eq("user_id", context.userId);
    if (preferenceError) throw preferenceError;
    const preferenceBySlug = new Map(
      (preferenceRows ?? []).map((row) => [row.exercise_slug, row.preference] as const),
    );
    for (const variant of variants) {
      if (variant.exerciseSlug) variant.preference = preferenceBySlug.get(variant.exerciseSlug);
    }
  }

  let block:
    | { startDate: string; endDate: string; index: number }
    | null = null;
  const persistedBySlot = new Map<string, string>();

  if (context) {
    const { data: earliestPlan } = await supabase
      .from("plan_versions")
      .select("rolling_start_date")
      .eq("user_id", context.userId)
      .order("rolling_start_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    block = trainingBlockWindow(earliestPlan?.rolling_start_date ?? context.localDate, context.localDate);

    const { data: savedSelections, error: savedError } = await supabase
      .from("strength_block_selections")
      .select("*")
      .eq("user_id", context.userId)
      .eq("block_start_date", block.startDate)
      .eq("template_slug", template.slug);
    if (savedError) throw savedError;
    for (const selection of savedSelections ?? []) {
      persistedBySlot.set(selection.slot_key, selection.exercise_variant_id);
    }

    for (const item of templateItems) {
      const selectedId = persistedBySlot.get(strengthSlotKey(item.ordinal, location, wantShort));
      if (!selectedId) continue;
      const selected = variants.find((variant) => variant.id === selectedId);
      if (selected) selected.isPersistedSelection = true;
    }
  }

  const resolved = buildStrengthWorkout(templateItems, variants, location, wantShort, block?.index ?? 0);

  if (context && block) {
    const newSelections = resolved
      .map((item) => {
        const slotKey = strengthSlotKey(item.ordinal, location, wantShort);
        if (persistedBySlot.has(slotKey)) return null;
        return {
          user_id: context.userId,
          block_start_date: block!.startDate,
          block_end_date: block!.endDate,
          template_slug: template.slug,
          slot_key: slotKey,
          exercise_variant_id: item.variant.id,
          reason_code: item.selectionReasonCode,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    if (newSelections.length > 0) {
      const { error: selectionError } = await supabase
        .from("strength_block_selections")
        .upsert(newSelections, {
          onConflict: "user_id,block_start_date,template_slug,slot_key",
          ignoreDuplicates: true,
        });
      if (selectionError) throw selectionError;
    }
  }

  const items: ResolvedExerciseItem[] = resolved
    .map((r) => {
      const exercise = exerciseById.get(r.variant.exerciseId);
      if (!exercise) return null;
      return { ...r, exercise };
    })
    .filter((x): x is ResolvedExerciseItem => x !== null);

  return { template, items };
}
