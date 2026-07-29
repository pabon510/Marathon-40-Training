import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { evaluateDailyAdaptation } from "@/domain/adaptation/evaluate";
import { computeRecoverySignals, type RecoveryInputs } from "@/domain/adaptation/recovery";
import { addDays } from "@/lib/date";
import { applyDailyRecalculation, recordRuleEvaluation, recordSafetyEvent } from "@/lib/services/recalcService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import type { AvailableTime, RunPrescription, WorkoutKind } from "@/domain/types";

type Client = SupabaseClient<Database>;

export interface CheckInInput {
  localDate: string;
  hoursSlept: number | null;
  ouraScore: number | null;
  energy: 1 | 2 | 3 | 4 | 5 | null;
  soreness: 1 | 2 | 3 | 4 | 5 | null;
  stress: 1 | 2 | 3 | 4 | 5 | null;
  fatigue: 1 | 2 | 3 | 4 | 5 | null;
  knee: number | null;
  availableTime: AvailableTime;
  strengthLocation: "gym" | "home" | null;
  skippedFields: string[];
}

async function getPriorDailyKnee(supabase: Client, userId: string, localDate: string): Promise<number | null> {
  const priorDate = addDays(localDate, -1);
  const { data, error } = await supabase
    .from("v_daily_knee_scores")
    .select("max_knee_score")
    .eq("user_id", userId)
    .eq("local_date", priorDate)
    .maybeSingle();
  if (error) throw error;
  return data?.max_knee_score ?? null;
}

async function getRecentOuraAverage(supabase: Client, userId: string, localDate: string): Promise<number | null> {
  const since = addDays(localDate, -14);
  const { data, error } = await supabase
    .from("morning_check_ins")
    .select("oura_score")
    .eq("user_id", userId)
    .gte("local_date", since)
    .lt("local_date", localDate)
    .not("oura_score", "is", null);
  if (error) throw error;
  const scores = (data ?? []).map((r) => r.oura_score).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

async function getPoorRecoveryYesterday(supabase: Client, userId: string, localDate: string): Promise<boolean> {
  const priorDate = addDays(localDate, -1);
  const { data, error } = await supabase
    .from("morning_check_ins")
    .select("*")
    .eq("user_id", userId)
    .eq("local_date", priorDate)
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  const recentOuraAverage = await getRecentOuraAverage(supabase, userId, priorDate);
  const signals = computeRecoverySignals({
    energy: data.energy as RecoveryInputs["energy"],
    soreness: data.soreness as RecoveryInputs["soreness"],
    fatigue: data.fatigue as RecoveryInputs["fatigue"],
    hoursSlept: data.hours_slept,
    ouraScore: data.oura_score,
    recentOuraAverage,
    poorRecoveryYesterday: false,
  });
  return signals.poorRecoveryPresent;
}

const WORKOUT_KIND_GOAL_DURATION: Partial<Record<WorkoutKind, number>> = {
  upper_core_safety: 35,
};

/**
 * Submits a morning check-in and immediately evaluates the deterministic
 * adaptation chain against today's planned workout (safety -> knee ->
 * recovery -> time). Persists the check-in, the rule-evaluation audit
 * record, a safety_event if blocked, and (only when something material
 * changed) a new plan version + plan_changes entry.
 */
export async function submitCheckInAndRecalculate(supabase: Client, userId: string, input: CheckInInput) {
  const { data: existingLatest } = await supabase
    .from("morning_check_ins")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", input.localDate)
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: checkIn, error: insertError } = await supabase
    .from("morning_check_ins")
    .insert({
      user_id: userId,
      local_date: input.localDate,
      hours_slept: input.hoursSlept,
      oura_score: input.ouraScore,
      energy: input.energy,
      soreness: input.soreness,
      stress: input.stress,
      fatigue: input.fatigue,
      knee: input.knee,
      available_time: input.availableTime,
      strength_location: input.strengthLocation,
      skipped_fields: input.skippedFields,
      refreshed_from_id: existingLatest?.id ?? null,
    })
    .select("*")
    .single();
  if (insertError || !checkIn) throw insertError ?? new Error("Failed to save check-in");

  const plannedWorkout = await getPlannedWorkoutForDate(supabase, userId, input.localDate);
  if (!plannedWorkout) {
    return { checkIn, plannedWorkout: null, adaptation: null, priorDailyKnee: null, durationMinutes: null };
  }

  const [priorDailyKnee, recentOuraAverage, poorRecoveryYesterday] = await Promise.all([
    getPriorDailyKnee(supabase, userId, input.localDate),
    getRecentOuraAverage(supabase, userId, input.localDate),
    getPoorRecoveryYesterday(supabase, userId, input.localDate),
  ]);

  const adaptation = evaluateDailyAdaptation({
    plannedWorkoutKind: plannedWorkout.workout_kind as WorkoutKind,
    plannedDurationMinutes: plannedWorkout.planned_duration_minutes,
    morningKnee: input.knee,
    priorDailyKnee,
    recovery: {
      energy: input.energy,
      soreness: input.soreness,
      fatigue: input.fatigue,
      hoursSlept: input.hoursSlept,
      ouraScore: input.ouraScore,
      recentOuraAverage,
      poorRecoveryYesterday,
    },
    availableTime: input.availableTime,
    localDate: input.localDate,
  });

  await recordRuleEvaluation(supabase, userId, {
    sourceType: "morning_check_in",
    sourceId: checkIn.id,
    inputsSnapshot: {
      knee: input.knee,
      priorDailyKnee,
      energy: input.energy,
      soreness: input.soreness,
      fatigue: input.fatigue,
      hoursSlept: input.hoursSlept,
      ouraScore: input.ouraScore,
      recentOuraAverage,
      poorRecoveryYesterday,
      availableTime: input.availableTime,
      plannedWorkoutKind: plannedWorkout.workout_kind,
    },
    matchedRules: [adaptation.reasonCode],
    result: adaptation as unknown as Record<string, unknown>,
    explanation: adaptation.explanation,
  });

  if (adaptation.blocked) {
    await recordSafetyEvent(supabase, userId, {
      sourceType: "morning_check_in",
      sourceId: checkIn.id,
      ruleCode: adaptation.reasonCode,
      kneeStart: input.knee,
      kneeCurrent: input.knee,
      kneeChange: null,
      blockedWorkoutTypes: [plannedWorkout.workout_kind],
      offeredAlternatives: ["upper_body", "core", "mobility", "walk", "rest"],
    });
  }

  const durationMinutes =
    adaptation.chosenWorkoutKind === "upper_core_safety"
      ? WORKOUT_KIND_GOAL_DURATION.upper_core_safety ?? adaptation.cappedDurationMinutes
      : adaptation.cappedDurationMinutes;

  const newRunPrescription: RunPrescription | null =
    plannedWorkout.run_prescription && adaptation.chosenWorkoutKind !== "upper_core_safety"
      ? ({
          ...(plannedWorkout.run_prescription as unknown as RunPrescription),
          durationMinutes,
          isThreshold: adaptation.chosenWorkoutKind === "threshold_run",
        } as RunPrescription)
      : null;

  const recalcResult = await applyDailyRecalculation(supabase, userId, {
    localDate: input.localDate,
    newWorkoutKind: adaptation.chosenWorkoutKind,
    newStatus: adaptation.blocked ? "blocked" : "confirmed",
    newRunPrescription,
    newDurationMinutes: durationMinutes,
    newLocationChoice: input.strengthLocation ?? undefined,
    trigger: "check_in",
    sourceEventType: "morning_check_in",
    sourceEventId: checkIn.id,
    reasonCode: adaptation.reasonCode,
    explanation: adaptation.explanation,
    triggeringValues: {
      knee: input.knee,
      priorDailyKnee,
      category: adaptation.category,
    } as unknown as Json as Record<string, unknown>,
  });

  // `plannedWorkout` is deliberately the pre-recalculation row: the caller
  // needs the "before" side to explain what changed.
  return { checkIn, plannedWorkout, adaptation, recalcResult, priorDailyKnee, durationMinutes };
}
