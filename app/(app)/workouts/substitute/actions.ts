"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildSubstitutionCandidates,
  isSubstitutionReason,
  type ExercisePreference,
} from "@/domain/planning/exerciseSubstitution";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { resolveWorkoutStrengthSection } from "@/lib/services/workoutDetailService";

function safeReturnTo(value: FormDataEntryValue | null) {
  return value === "/log/strength" ? value : "/workouts";
}

async function ownedWorkout(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, workoutId: string) {
  const { data } = await supabase
    .from("planned_workouts")
    .select("id, local_date, location_choice")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function saveSubstitutionAction(formData: FormData) {
  const plannedWorkoutId = String(formData.get("plannedWorkoutId") ?? "");
  const ordinal = Number(formData.get("ordinal"));
  const substituteSlug = String(formData.get("substituteSlug") ?? "");
  const reasonValue = String(formData.get("reason") ?? "");
  const returnTo = safeReturnTo(formData.get("returnTo"));
  if (!plannedWorkoutId || !Number.isInteger(ordinal) || ordinal < 0 || !isSubstitutionReason(reasonValue)) {
    throw new Error("Invalid substitution request.");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const workout = await ownedWorkout(supabase, user.id, plannedWorkoutId);
  if (!workout) throw new Error("Workout not found.");
  const location = workout.location_choice === "gym" ? "gym" : "home";
  const profile = await getProfile(supabase, user.id);
  if (!profile) throw new Error("Profile not found.");
  const { data: fullWorkout } = await supabase
    .from("planned_workouts")
    .select("*")
    .eq("id", plannedWorkoutId)
    .eq("user_id", user.id)
    .single();
  if (!fullWorkout) throw new Error("Workout not found.");
  const strength = await resolveWorkoutStrengthSection(supabase, user.id, profile, fullWorkout, location);
  const plannedItem = strength?.items.find((item) => item.ordinal === ordinal);
  if (!plannedItem) throw new Error("Exercise slot not found.");
  const originalSlug = plannedItem.savedSubstitution?.originalExerciseSlug ?? plannedItem.exercise.slug;

  const [{ data: preferenceRows }, { data: latestCheckIn }] = await Promise.all([
    supabase.from("exercise_preferences").select("exercise_slug, preference").eq("user_id", user.id),
    supabase.from("morning_check_ins").select("knee").eq("user_id", user.id)
      .eq("local_date", workout.local_date).order("check_in_time", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const preferences = new Map<string, ExercisePreference>(
    (preferenceRows ?? []).map((row) => [row.exercise_slug, row.preference]),
  );
  const candidate = buildSubstitutionCandidates({
    originalSlug,
    location,
    reason: reasonValue,
    preferences,
    blockLowerBody: (latestCheckIn?.knee ?? 0) >= 6,
  }).find((option) => option.exercise.slug === substituteSlug);
  if (!candidate) throw new Error("That exercise is not an approved substitute for this workout.");

  const { data: definitions, error: definitionsError } = await supabase
    .from("exercise_definitions")
    .select("id, slug")
    .in("slug", [originalSlug, substituteSlug]);
  if (definitionsError) throw definitionsError;
  const original = definitions?.find((row) => row.slug === originalSlug);
  const substitute = definitions?.find((row) => row.slug === substituteSlug);
  if (!original || !substitute) throw new Error("Exercise library data is missing. Run the current seed first.");

  const { error } = await supabase.from("planned_exercise_substitutions").upsert({
    planned_workout_id: plannedWorkoutId,
    ordinal,
    original_exercise_id: original.id,
    substitute_exercise_id: substitute.id,
    reason_code: reasonValue,
    substitution_quality: candidate.quality,
  }, { onConflict: "planned_workout_id,ordinal" });
  if (error) throw error;

  revalidatePath("/workouts");
  revalidatePath("/log/strength");
  revalidatePath("/plan", "layout");
  redirect(returnTo);
}

export async function restoreOriginalAction(formData: FormData) {
  const plannedWorkoutId = String(formData.get("plannedWorkoutId") ?? "");
  const ordinal = Number(formData.get("ordinal"));
  const returnTo = safeReturnTo(formData.get("returnTo"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  if (!await ownedWorkout(supabase, user.id, plannedWorkoutId)) throw new Error("Workout not found.");

  const { error } = await supabase
    .from("planned_exercise_substitutions")
    .delete()
    .eq("planned_workout_id", plannedWorkoutId)
    .eq("ordinal", ordinal);
  if (error) throw error;
  revalidatePath("/workouts");
  revalidatePath("/log/strength");
  revalidatePath("/plan", "layout");
  redirect(returnTo);
}
