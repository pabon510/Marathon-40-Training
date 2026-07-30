"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { evaluatePreWorkoutSafety } from "@/domain/safety/hardBlock";
import { startWorkoutSession, saveRunLog, savePostWorkoutCheckIn } from "@/lib/services/loggingService";
import { evaluateDailyAdaptation } from "@/domain/adaptation/evaluate";
import { todayLocalDate } from "@/lib/date";
import type { AvailableTime, RunType, WorkoutKind } from "@/domain/types";

export interface LogRunFormState {
  error?: string;
  success?: boolean;
  tomorrowPreview?: string;
}

function optionalNumber(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function logRunAction(_prev: LogRunFormState, formData: FormData): Promise<LogRunFormState> {
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
    .select("*")
    .eq("user_id", user.id)
    .eq("local_date", localDate)
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  const highestKneeDuring = Number(formData.get("highestKneeDuring") ?? 0);
  const kneeImmediatelyAfter = Number(formData.get("kneeImmediatelyAfter") ?? 0);

  // Server-side hard-block re-check. A crafted request cannot bypass this —
  // it does not depend on what the client claims about overrides.
  const morningKnee = latestCheckIn?.knee ?? null;
  const preSafety = evaluatePreWorkoutSafety(morningKnee);
  const isUnplanned = formData.get("unplanned") === "on";
  if (preSafety.blocked && !isUnplanned) {
    return {
      error: `Blocked: ${preSafety.explanation} Log upper-body/core, mobility, walking, or rest instead.`,
    };
  }

  const plannedWorkout = await getPlannedWorkoutForDate(supabase, user.id, localDate);
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  const isOverride = formData.get("isOverride") === "on";
  if (isOverride && !overrideReason) {
    return { error: "An override requires a reason." };
  }

  const runType = String(formData.get("runType") ?? "outdoor") as RunType;
  const isStroller = formData.get("isStroller") === "on";
  if (isStroller && runType === "treadmill") {
    return { error: "A jogging-stroller run must use the outdoor or run-walk environment." };
  }
  if (
    isStroller
    && plannedWorkout
    && !["easy_run", "long_run"].includes(plannedWorkout.workout_kind)
    && !isUnplanned
  ) {
    return { error: "Jogging-stroller runs can only complete easy or long run workouts." };
  }
  const allowedStrollerAreas = new Set(["knee", "back", "shoulder_arm", "other"]);
  const strollerDiscomfortAreas = formData
    .getAll("strollerDiscomfortAreas")
    .map(String)
    .filter((area) => allowedStrollerAreas.has(area));
  const distanceMiles = Number(formData.get("distanceMiles") ?? 0) || null;
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0);
  const durationSeconds = durationMinutes ? durationMinutes * 60 : null;
  const paceOverrideRaw = String(formData.get("paceOverrideMinutes") ?? "");
  const paceOverrideSecondsPerMile = paceOverrideRaw ? Number(paceOverrideRaw) * 60 : null;
  const averageHr = Number(formData.get("averageHr") ?? 0) || null;
  const maximumHr = Number(formData.get("maximumHr") ?? 0) || null;
  const effort = Number(formData.get("effort") ?? 5);
  const elevationGainFeet = Number(formData.get("elevationGainFeet") ?? 0) || null;
  const completedFull = formData.get("completedFull") === "on";
  const expectationResult = String(formData.get("expectationResult") ?? "as_expected") as
    | "easier"
    | "as_expected"
    | "harder";
  const unusualPainFlag = formData.get("unusualPainFlag") === "on";
  const notes = String(formData.get("notes") ?? "");
  const importId = String(formData.get("importId") ?? "").trim() || null;
  if (importId) {
    const { data: importDraft } = await supabase
      .from("run_imports")
      .select("id, status")
      .eq("id", importId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!importDraft || importDraft.status !== "draft") {
      return { error: "This Garmin import is unavailable or has already been used." };
    }
  }

  const importedMetrics = {
    movingDurationSeconds: optionalNumber(formData, "movingDurationSeconds"),
    elapsedDurationSeconds: optionalNumber(formData, "elapsedDurationSeconds"),
    movingPaceSecondsPerMile: optionalNumber(formData, "movingPaceSecondsPerMile"),
    bestPaceSecondsPerMile: optionalNumber(formData, "bestPaceSecondsPerMile"),
    elevationLossFeet: optionalNumber(formData, "elevationLossFeet"),
    aerobicTrainingEffect: optionalNumber(formData, "aerobicTrainingEffect"),
    anaerobicTrainingEffect: optionalNumber(formData, "anaerobicTrainingEffect"),
    averageTemperatureF: optionalNumber(formData, "averageTemperatureF"),
    averageCadenceSpm: optionalNumber(formData, "averageCadenceSpm"),
    maximumCadenceSpm: optionalNumber(formData, "maximumCadenceSpm"),
    averageStrideLengthMeters: optionalNumber(formData, "averageStrideLengthMeters"),
  };
  if (
    Object.values(importedMetrics).some((metric) => metric !== null && metric < 0)
    || (importedMetrics.aerobicTrainingEffect !== null && importedMetrics.aerobicTrainingEffect > 5)
    || (importedMetrics.anaerobicTrainingEffect !== null && importedMetrics.anaerobicTrainingEffect > 5)
  ) {
    return { error: "One or more imported Garmin values is outside the allowed range." };
  }

  try {
    const sessionId = await startWorkoutSession(supabase, user.id, {
      plannedWorkoutId: plannedWorkout?.id ?? null,
      localDate,
      sessionType: "run",
      location: runType === "treadmill" ? "treadmill" : "outdoor",
      unplanned: isUnplanned,
      overrideFlag: isOverride,
      overrideReason: isOverride ? overrideReason : undefined,
    });

    const runLogId = await saveRunLog(supabase, {
      sessionId,
      runType,
      distanceMiles,
      durationSeconds,
      paceOverrideSecondsPerMile,
      averageHr,
      maximumHr,
      effort,
      elevationGainFeet,
      highestKneeDuring,
      kneeImmediatelyAfter,
      isStroller,
      strollerDiscomfortAreas,
      importId,
      dataSource: importId ? "garmin_screenshot" : "manual",
      ...(importId ? importedMetrics : {
        movingDurationSeconds: null,
        elapsedDurationSeconds: null,
        movingPaceSecondsPerMile: null,
        bestPaceSecondsPerMile: null,
        elevationLossFeet: null,
        aerobicTrainingEffect: null,
        anaerobicTrainingEffect: null,
        averageTemperatureF: null,
        averageCadenceSpm: null,
        maximumCadenceSpm: null,
        averageStrideLengthMeters: null,
      }),
    });

    if (importId) {
      const { error: confirmError } = await supabase
        .from("run_imports")
        .update({
          status: "confirmed",
          run_log_id: runLogId,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", importId)
        .eq("user_id", user.id)
        .eq("status", "draft");
      if (confirmError) throw confirmError;
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
      const newStatus = completedFull ? "completed" : "partial";
      await supabase
        .from("planned_workouts")
        .update({ status: newStatus, completion_credit_factor: completedFull ? 1.0 : 0.5 })
        .eq("id", plannedWorkout.id);
    }

    // Preliminary tomorrow preview (not persisted) — confirmed for real
    // tomorrow morning once the actual check-in knee score is known.
    let tomorrowPreview: string | undefined;
    if (plannedWorkout) {
      const preview = evaluateDailyAdaptation({
        plannedWorkoutKind: plannedWorkout.workout_kind as WorkoutKind,
        plannedDurationMinutes: plannedWorkout.planned_duration_minutes,
        morningKnee: kneeImmediatelyAfter,
        priorDailyKnee: morningKnee,
        recovery: {
          energy: null,
          soreness: null,
          fatigue: null,
          hoursSlept: null,
          ouraScore: null,
          recentOuraAverage: null,
          poorRecoveryYesterday: false,
        },
        availableTime: "60" as AvailableTime,
        localDate,
      });
      tomorrowPreview =
        preview.category === "full"
          ? "Based on today's knee response, tomorrow's plan looks unaffected — confirmed after tomorrow's check-in."
          : `Based on today's knee response, tomorrow may be adapted (${preview.explanation}) — confirmed after tomorrow's check-in.`;
    }

    revalidatePath("/today");
    revalidatePath("/plan");
    revalidatePath("/progress");
    return { success: true, tomorrowPreview };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save run log." };
  }
}
