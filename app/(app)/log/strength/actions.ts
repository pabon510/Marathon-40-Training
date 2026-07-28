"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { evaluatePreWorkoutSafety } from "@/domain/safety/hardBlock";
import { startWorkoutSession, saveStrengthLogEntries, savePostWorkoutCheckIn } from "@/lib/services/loggingService";
import { todayLocalDate } from "@/lib/date";

export interface LogStrengthFormState {
  error?: string;
  success?: boolean;
}

export async function logStrengthAction(_prev: LogStrengthFormState, formData: FormData): Promise<LogStrengthFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const profile = await getProfile(supabase, user.id);
  if (!profile) return { error: "No profile found." };

  const localDate = todayLocalDate(profile.timezone);

  const { data: latestCheckIn } = await supabase
    .from("morning_check_ins")
    .select("knee")
    .eq("user_id", user.id)
    .eq("local_date", localDate)
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  const exerciseIds = formData.getAll("exerciseId").map(String);
  const isUnplanned = formData.get("unplanned") === "on";

  const preSafety = evaluatePreWorkoutSafety(latestCheckIn?.knee ?? null);
  if (preSafety.blocked && exerciseIds.length > 0) {
    const { data: exercises } = await supabase
      .from("exercise_definitions")
      .select("id, is_lower_body")
      .in("id", exerciseIds);
    const hasLowerBody = (exercises ?? []).some((e) => e.is_lower_body);
    if (hasLowerBody && !isUnplanned) {
      return {
        error: `Blocked: ${preSafety.explanation} This session includes lower-body work and cannot be logged as completed lower-body training today.`,
      };
    }
  }

  const plannedWorkout = await getPlannedWorkoutForDate(supabase, user.id, localDate);
  const location = String(formData.get("location") ?? "home") as "gym" | "home";
  const highestKneeDuring = Number(formData.get("highestKneeDuring") ?? 0);
  const kneeImmediatelyAfter = Number(formData.get("kneeImmediatelyAfter") ?? 0);
  const effort = Number(formData.get("effort") ?? 5);
  const completedFull = formData.get("completedFull") === "on";
  const expectationResult = String(formData.get("expectationResult") ?? "as_expected") as
    | "easier"
    | "as_expected"
    | "harder";
  const unusualPainFlag = formData.get("unusualPainFlag") === "on";
  const notes = String(formData.get("notes") ?? "");

  try {
    const sessionId = await startWorkoutSession(supabase, user.id, {
      plannedWorkoutId: plannedWorkout?.id ?? null,
      localDate,
      sessionType: "strength",
      location,
      unplanned: isUnplanned,
      overrideFlag: false,
    });

    const entries = exerciseIds.map((exerciseId, i) => ({
      exerciseId,
      ordinal: i + 1,
      prescribedVariantId: String(formData.get(`variantId_${i}`) ?? "") || null,
      completedSets: Number(formData.get(`sets_${i}`) ?? 0) || null,
      representativeReps: Number(formData.get(`reps_${i}`) ?? 0) || null,
      maxReps: null,
      loadValue: Number(formData.get(`load_${i}`) ?? 0) || null,
      loadUnit: (String(formData.get(`loadUnit_${i}`) ?? "lb") as "lb" | "kg" | "bodyweight" | "band" | "n/a") || null,
      difficulty: Number(formData.get(`difficulty_${i}`) ?? 0) || null,
      substitutionExerciseId: null,
      notes: null,
    }));

    if (entries.length > 0) {
      await saveStrengthLogEntries(supabase, sessionId, entries);
    }

    await savePostWorkoutCheckIn(supabase, user.id, {
      sessionId,
      overallEffort: effort,
      highestKneeDuring,
      kneeImmediatelyAfter,
      completedFull,
      expectationResult,
      unusualPainFlag,
      notes,
    });

    if (plannedWorkout) {
      await supabase
        .from("planned_workouts")
        .update({
          status: completedFull ? "completed" : "partial",
          completion_credit_factor: completedFull ? 1.0 : 0.5,
        })
        .eq("id", plannedWorkout.id);
    }

    revalidatePath("/today");
    revalidatePath("/plan");
    revalidatePath("/progress");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save strength log." };
  }
}
