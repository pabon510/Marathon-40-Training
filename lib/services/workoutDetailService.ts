import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRow } from "@/lib/supabase/types";
import { resolveStrengthWorkout } from "@/lib/services/workoutContentService";
import { attachLoadGuidance, type GuidedExerciseItem } from "@/lib/services/strengthGuidanceService";
import type { Location } from "@/domain/types";
import { applyPlannedExerciseSubstitutions } from "@/lib/services/exerciseSubstitutionService";

type Client = SupabaseClient<Database>;

export interface StrengthSection {
  templateName: string;
  templateGoal: string;
  items: GuidedExerciseItem[];
}

/**
 * Resolves the full strength breakdown (exercises, load recommendations) for
 * any planned workout row — today's or a future day's. Load recommendations
 * are computed from history logged *so far*, not from anything about the
 * target date, so this is safe to call for a day that hasn't happened yet:
 * it's a preview of what today's recommendation logic would say right now,
 * which may shift slightly by the time that day actually arrives.
 */
export async function resolveWorkoutStrengthSection(
  supabase: Client,
  userId: string,
  profile: Pick<ProfileRow, "equipment">,
  workout: {
    id: string;
    strength_template_id: string | null;
    planned_duration_minutes: number;
    local_date: string;
  },
  location: Location,
): Promise<StrengthSection | null> {
  if (!workout.strength_template_id) return null;

  const wantShort = workout.planned_duration_minutes < 40;
  const { template, items } = await resolveStrengthWorkout(
    supabase,
    workout.strength_template_id,
    location,
    wantShort,
    { userId, localDate: workout.local_date },
  );
  const substitutedItems = await applyPlannedExerciseSubstitutions(
    supabase,
    workout.id,
    location,
    items,
  );
  const guidedItems = await attachLoadGuidance(supabase, userId, profile, substitutedItems, location);

  return { templateName: template.name, templateGoal: template.goal, items: guidedItems };
}
