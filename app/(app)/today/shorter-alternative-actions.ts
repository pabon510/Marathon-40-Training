"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { applyDailyRecalculation } from "@/lib/services/recalcService";
import { todayLocalDate } from "@/lib/date";
import type { RunPrescription, WorkoutKind } from "@/domain/types";
import { canUseShorterAlternative, shorterAlternativeMinutes } from "@/domain/planning/shorterAlternative";

export interface ShorterAlternativeState {
  error?: string;
  success?: boolean;
}

export async function useShorterAlternativeAction(
  _previous: ShorterAlternativeState,
  formData: FormData,
): Promise<ShorterAlternativeState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const profile = await getProfile(supabase, user.id);
  if (!profile) return { error: "No profile found." };

  const localDate = todayLocalDate(profile.timezone);
  const workout = await getPlannedWorkoutForDate(supabase, user.id, localDate);
  if (!workout) return { error: "No workout is scheduled today." };
  if (!canUseShorterAlternative({
    kind: workout.workout_kind as WorkoutKind,
    status: workout.status,
    plannedMinutes: workout.planned_duration_minutes,
  })) {
    return { error: "This workout cannot be shortened from here." };
  }

  const requested = Number(formData.get("shorterMinutes"));
  const expected = shorterAlternativeMinutes(workout.planned_duration_minutes);
  if (!Number.isInteger(requested) || requested !== expected || requested >= workout.planned_duration_minutes) {
    return { error: "The shorter workout length is no longer current. Refresh and try again." };
  }

  const runPrescription = workout.run_prescription as unknown as RunPrescription | null;
  const shorterRunPrescription = runPrescription
    ? { ...runPrescription, durationMinutes: requested }
    : null;

  try {
    await applyDailyRecalculation(supabase, user.id, {
      localDate,
      newWorkoutKind: workout.workout_kind as WorkoutKind,
      newStatus: "confirmed",
      newRunPrescription: shorterRunPrescription,
      newDurationMinutes: requested,
      newLocationChoice: workout.location_choice ?? "unspecified",
      trigger: "edit",
      sourceEventType: "today_shorter_alternative",
      sourceEventId: workout.id,
      reasonCode: "TIME_COMPRESSION",
      explanation: `Today’s workout was shortened from ${workout.planned_duration_minutes} to ${requested} minutes at your request. The adapted version earns full credit.`,
      triggeringValues: {
        previousDurationMinutes: workout.planned_duration_minutes,
        requestedDurationMinutes: requested,
      },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not shorten today’s workout." };
  }

  revalidatePath("/today");
  revalidatePath("/workouts");
  revalidatePath("/plan");
  return { success: true };
}
