import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { calculatePaceSecondsPerMile } from "@/domain/metrics/pace";
import { evaluateDuringWorkoutSafety } from "@/domain/safety/hardBlock";
import { recordSafetyEvent } from "@/lib/services/recalcService";
import type { CompletionState, ExpectationResult, RunType, SessionType } from "@/domain/types";

type Client = SupabaseClient<Database>;

export interface StartSessionInput {
  plannedWorkoutId: string | null;
  localDate: string;
  sessionType: SessionType;
  location: "gym" | "home" | "outdoor" | "treadmill" | "n/a" | null;
  unplanned: boolean;
  overrideFlag: boolean;
  overrideReason?: string;
}

/**
 * Starts a workout session. If overriding a non-blocked recommendation,
 * `overrideReason` must be present — this is enforced again server-side in
 * the calling server action, not just in the UI.
 */
export async function startWorkoutSession(supabase: Client, userId: string, input: StartSessionInput) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: userId,
      planned_workout_id: input.plannedWorkoutId,
      local_date: input.localDate,
      session_type: input.sessionType,
      location: input.location,
      started_at: new Date().toISOString(),
      completion_state: "full",
      unplanned: input.unplanned,
      override_flag: input.overrideFlag,
      override_reason: input.overrideReason ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to start session");
  return data.id as string;
}

/**
 * Server-enforced during-workout hard-stop check. The client sends the
 * knee value at workout start (stored on the session at creation time is
 * not tracked separately here for simplicity — callers pass it back in);
 * this function is the single authority the UI cannot bypass by hiding a
 * button, since the same check runs here regardless of what the client
 * requested.
 */
export async function checkDuringWorkoutSafety(
  supabase: Client,
  userId: string,
  sessionId: string,
  kneeAtStart: number,
  kneeCurrent: number,
) {
  const result = evaluateDuringWorkoutSafety(kneeAtStart, kneeCurrent);
  if (result.blocked) {
    await recordSafetyEvent(supabase, userId, {
      sourceType: "during_workout",
      sourceId: sessionId,
      ruleCode: result.ruleCode!,
      kneeStart: kneeAtStart,
      kneeCurrent,
      kneeChange: kneeCurrent - kneeAtStart,
      blockedWorkoutTypes: ["run", "strength"],
      offeredAlternatives: result.offeredAlternatives,
    });
    await supabase
      .from("workout_sessions")
      .update({ completion_state: "stopped", modification_reason: result.ruleCode ?? undefined })
      .eq("id", sessionId)
      .eq("user_id", userId);
  }
  return result;
}

export interface RunLogInput {
  sessionId: string;
  runType: RunType;
  distanceMiles: number | null;
  durationSeconds: number | null;
  paceOverrideSecondsPerMile: number | null;
  averageHr: number | null;
  maximumHr: number | null;
  effort: number | null;
  elevationGainFeet: number | null;
  highestKneeDuring: number | null;
  kneeImmediatelyAfter: number | null;
  splits?: { ordinal: number; durationSeconds: number; splitDistanceMiles?: number }[];
}

export async function saveRunLog(supabase: Client, input: RunLogInput) {
  const calculatedPace =
    input.distanceMiles && input.durationSeconds
      ? calculatePaceSecondsPerMile(input.distanceMiles, input.durationSeconds)
      : null;

  const { data, error } = await supabase
    .from("run_logs")
    .insert({
      workout_session_id: input.sessionId,
      run_type: input.runType,
      distance_miles: input.distanceMiles,
      duration_seconds: input.durationSeconds,
      calculated_pace_seconds_per_mile: calculatedPace,
      pace_override_seconds_per_mile: input.paceOverrideSecondsPerMile,
      average_hr: input.averageHr,
      maximum_hr: input.maximumHr,
      effort: input.effort,
      elevation_gain_feet: input.elevationGainFeet,
      highest_knee_during: input.highestKneeDuring,
      knee_immediately_after: input.kneeImmediatelyAfter,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to save run log");

  if (input.splits && input.splits.length > 0) {
    const { error: splitsError } = await supabase.from("run_splits").insert(
      input.splits.map((s) => ({
        run_log_id: data.id as string,
        ordinal: s.ordinal,
        split_distance_miles: s.splitDistanceMiles ?? 1.0,
        duration_seconds: s.durationSeconds,
      })),
    );
    if (splitsError) throw splitsError;
  }

  return data.id as string;
}

export interface StrengthLogEntryInput {
  exerciseId: string;
  ordinal: number;
  prescribedVariantId: string | null;
  completedSets: number | null;
  representativeReps: number | null;
  maxReps: number | null;
  loadValue: number | null;
  loadUnit: "lb" | "kg" | "bodyweight" | "band" | "n/a" | null;
  difficulty: number | null;
  substitutionExerciseId: string | null;
  notes: string | null;
}

export async function saveStrengthLogEntries(
  supabase: Client,
  sessionId: string,
  entries: StrengthLogEntryInput[],
) {
  const { error } = await supabase.from("strength_logs").insert(
    entries.map((e) => ({
      workout_session_id: sessionId,
      exercise_id: e.exerciseId,
      ordinal: e.ordinal,
      prescribed_variant_id: e.prescribedVariantId,
      completed_sets: e.completedSets,
      representative_reps: e.representativeReps,
      max_reps: e.maxReps,
      load_value: e.loadValue,
      load_unit: e.loadUnit,
      difficulty: e.difficulty,
      substitution_exercise_id: e.substitutionExerciseId,
      notes: e.notes,
    })),
  );
  if (error) throw error;
}

export interface PostWorkoutCheckInInput {
  sessionId: string;
  overallEffort: number;
  highestKneeDuring: number;
  kneeImmediatelyAfter: number;
  completedFull: boolean;
  expectationResult: ExpectationResult;
  unusualPainFlag: boolean;
  unusualPainDetails?: string;
  notes?: string;
}

export async function savePostWorkoutCheckIn(supabase: Client, userId: string, input: PostWorkoutCheckInInput) {
  const { error: insertError } = await supabase.from("post_workout_check_ins").insert({
    workout_session_id: input.sessionId,
    overall_effort: input.overallEffort,
    highest_knee_during: input.highestKneeDuring,
    knee_immediately_after: input.kneeImmediatelyAfter,
    completed_full: input.completedFull,
    expectation_result: input.expectationResult,
    unusual_pain_flag: input.unusualPainFlag,
    unusual_pain_details: input.unusualPainDetails ?? null,
    notes: input.notes ?? null,
  });
  if (insertError) throw insertError;

  const completionState: CompletionState = input.completedFull ? "full" : "partial";
  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({
      completed_at: new Date().toISOString(),
      completion_state: completionState,
      overall_effort: input.overallEffort,
      expectation_result: input.expectationResult,
      unusual_pain_flag: input.unusualPainFlag,
      unusual_pain_details: input.unusualPainDetails ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", input.sessionId)
    .eq("user_id", userId);
  if (updateError) throw updateError;

  if (input.highestKneeDuring >= 6 || input.kneeImmediatelyAfter >= 6) {
    await recordSafetyEvent(supabase, userId, {
      sourceType: "workout_session",
      sourceId: input.sessionId,
      ruleCode: "KNEE_HARD_BLOCK",
      kneeCurrent: Math.max(input.highestKneeDuring, input.kneeImmediatelyAfter),
      blockedWorkoutTypes: ["run", "strength"],
      offeredAlternatives: ["upper_body", "core", "mobility", "walk", "rest"],
    });
  }
}

export async function skipPlannedWorkout(
  supabase: Client,
  userId: string,
  plannedWorkoutId: string,
  reason: string,
) {
  const { error } = await supabase
    .from("planned_workouts")
    .update({ status: "skipped" })
    .eq("id", plannedWorkoutId)
    .eq("user_id", userId);
  if (error) throw error;

  const { data: workout } = await supabase
    .from("planned_workouts")
    .select("local_date")
    .eq("id", plannedWorkoutId)
    .single();

  if (workout) {
    const { error: changeError } = await supabase.from("plan_changes").insert({
      user_id: userId,
      new_plan_version_id: (
        await supabase.from("planned_workouts").select("plan_version_id").eq("id", plannedWorkoutId).single()
      ).data!.plan_version_id,
      local_date: workout.local_date,
      new_workout_summary: { status: "skipped", reason } as unknown as Json,
      reason_code: "MISSED_REBALANCE",
      explanation: `Skipped: ${reason}`,
      triggering_values: { reason } as unknown as Json,
    });
    if (changeError) throw changeError;
  }
}
