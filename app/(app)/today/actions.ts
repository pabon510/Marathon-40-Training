"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { submitCheckInAndRecalculate } from "@/lib/services/checkinService";
import { todayLocalDate } from "@/lib/date";
import { buildCheckInOutcome, type CheckInOutcome, type LocationChoice } from "@/domain/adaptation/checkinOutcome";
import type { WorkoutKind } from "@/domain/types";
import { parseCheckInFormData } from "./parseCheckIn";

export interface CheckInFormState {
  error?: string;
  /** Present once the check-in saved and today's plan was evaluated. */
  outcome?: CheckInOutcome;
  /** The check-in saved, but there was no workout scheduled to evaluate. */
  savedWithoutWorkout?: boolean;
}

function asLocation(value: string | null | undefined): LocationChoice {
  return value === "gym" || value === "home" || value === "unspecified" ? value : null;
}

export async function submitCheckInAction(_prev: CheckInFormState, formData: FormData): Promise<CheckInFormState> {
  const parsed = parseCheckInFormData(formData);
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.value;

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const profile = await getProfile(supabase, user.id);
  if (!profile) return { error: "No profile found." };

  const localDate = todayLocalDate(profile.timezone);

  let result;
  try {
    result = await submitCheckInAndRecalculate(supabase, user.id, {
      localDate,
      hoursSlept: input.hoursSlept,
      ouraScore: input.ouraScore,
      energy: input.energy,
      soreness: input.soreness,
      stress: input.stress,
      fatigue: input.fatigue,
      knee: input.knee,
      availableTime: input.availableTime,
      strengthLocation: input.strengthLocation,
      skippedFields: input.skippedFields,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to submit check-in." };
  }

  revalidatePath("/today");
  revalidatePath("/plan");
  revalidatePath("/workouts");

  const { plannedWorkout, adaptation } = result;
  if (!plannedWorkout || !adaptation) {
    return { savedWithoutWorkout: true };
  }

  const outcome = buildCheckInOutcome({
    changed: result.recalcResult?.changed ?? false,
    before: {
      workoutKind: plannedWorkout.workout_kind as WorkoutKind,
      durationMinutes: plannedWorkout.planned_duration_minutes,
      locationChoice: asLocation(plannedWorkout.location_choice),
    },
    after: {
      workoutKind: adaptation.chosenWorkoutKind,
      durationMinutes: result.durationMinutes ?? plannedWorkout.planned_duration_minutes,
      locationChoice: input.strengthLocation ?? asLocation(plannedWorkout.location_choice),
    },
    blocked: adaptation.blocked,
    reasonCode: adaptation.reasonCode,
    fallbackExplanation: adaptation.explanation,
    values: {
      knee: input.knee,
      priorDailyKnee: result.priorDailyKnee,
      energy: input.energy,
      soreness: input.soreness,
      fatigue: input.fatigue,
      hoursSlept: input.hoursSlept,
      ouraScore: input.ouraScore,
      availableMinutes: input.availableMinutes,
    },
  });

  return { outcome };
}
