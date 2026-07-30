"use server";

import { revalidatePath } from "next/cache";
import { EXERCISES, getExerciseMetadataV2 } from "@/domain/content/exerciseLibrary";
import { createClient } from "@/lib/supabase/server";
import { todayLocalDate } from "@/lib/date";

export type ExercisePreferenceChoice = "prefer" | "avoid" | "neutral";

export interface ExercisePreferenceResult {
  success?: boolean;
  error?: string;
}

export async function setExercisePreference(
  exerciseSlug: string,
  preference: ExercisePreferenceChoice,
): Promise<ExercisePreferenceResult> {
  const exercise = EXERCISES.find((candidate) => candidate.slug === exerciseSlug);
  if (!exercise) return { error: "Exercise not found." };
  const metadata = getExerciseMetadataV2(exercise);
  if (!metadata.activeForNewPlans || metadata.legacyDisplayOnly) {
    return { error: "Preferences are unavailable for this legacy exercise." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (preference === "neutral") {
    const { error } = await supabase
      .from("exercise_preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("exercise_slug", exerciseSlug);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("exercise_preferences").upsert(
      { user_id: user.id, exercise_slug: exerciseSlug, preference },
      { onConflict: "user_id,exercise_slug" },
    );
    if (error) return { error: error.message };
  }

  // A deliberate preference change should affect upcoming recommendations.
  // Invalidate only current/future block-choice cache rows; completed
  // workouts, logs, and past block selections remain untouched.
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user.id)
    .maybeSingle();
  const today = todayLocalDate(profile?.timezone ?? "America/New_York");
  const { error: selectionError } = await supabase
    .from("strength_block_selections")
    .delete()
    .eq("user_id", user.id)
    .gte("block_end_date", today);
  if (selectionError) return { error: selectionError.message };

  revalidatePath("/library");
  revalidatePath("/workouts");
  revalidatePath("/plan");
  revalidatePath("/log/strength");
  return { success: true };
}

