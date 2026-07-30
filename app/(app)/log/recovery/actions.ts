"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { startWorkoutSession, savePostWorkoutCheckIn } from "@/lib/services/loggingService";
import { todayLocalDate } from "@/lib/date";
import { isScaleScore } from "@/domain/content/trainingScales";

export interface RecoveryLogState {
  error?: string;
  success?: boolean;
}

export async function logRecoveryAction(_previous: RecoveryLogState, formData: FormData): Promise<RecoveryLogState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const profile = await getProfile(supabase, user.id);
  if (!profile) return { error: "No profile found." };

  const localDate = todayLocalDate(profile.timezone);
  const workout = await getPlannedWorkoutForDate(supabase, user.id, localDate);
  if (!workout || workout.workout_kind !== "active_recovery") {
    return { error: "There is no active-recovery session planned for today." };
  }

  const effort = Number(formData.get("effort"));
  const highestKneeDuring = Number(formData.get("highestKneeDuring"));
  const kneeImmediatelyAfter = Number(formData.get("kneeImmediatelyAfter"));
  if (
    !isScaleScore(effort, 1, 3)
    || !isScaleScore(highestKneeDuring, 0, 10)
    || !isScaleScore(kneeImmediatelyAfter, 0, 10)
  ) {
    return { error: "Select effort and both knee-discomfort scores before saving." };
  }

  const completedFull = formData.get("completedFull") === "on";
  try {
    const sessionId = await startWorkoutSession(supabase, user.id, {
      plannedWorkoutId: workout.id,
      localDate,
      sessionType: "mobility",
      location: "home",
      unplanned: false,
      overrideFlag: false,
    });
    await savePostWorkoutCheckIn(supabase, user.id, {
      sessionId,
      overallEffort: effort,
      highestKneeDuring,
      kneeImmediatelyAfter,
      completedFull,
      expectationResult: "as_expected",
      unusualPainFlag: formData.get("unusualPainFlag") === "on",
      notes: String(formData.get("notes") ?? "").trim(),
    });
    await supabase
      .from("planned_workouts")
      .update({ status: completedFull ? "completed" : "partial", completion_credit_factor: completedFull ? 1 : 0.5 })
      .eq("id", workout.id)
      .eq("user_id", user.id);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save active recovery." };
  }

  revalidatePath("/today");
  revalidatePath("/plan");
  revalidatePath("/progress");
  return { success: true };
}
