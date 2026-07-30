import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { PlanTrigger, RunPrescription, WorkoutKind, WorkoutStatus } from "@/domain/types";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";

type Client = SupabaseClient<Database>;

export interface DailyRecalcInput {
  localDate: string;
  newWorkoutKind: WorkoutKind;
  newStatus: WorkoutStatus;
  newRunPrescription: RunPrescription | null;
  newDurationMinutes: number;
  newLocationChoice?: "gym" | "home" | "unspecified";
  trigger: PlanTrigger;
  sourceEventType: string;
  sourceEventId?: string;
  reasonCode: string;
  explanation: string;
  triggeringValues: Record<string, unknown>;
}

function summarize(row: {
  workout_kind: string;
  planned_duration_minutes: number;
  status: string;
} | null) {
  if (!row) return null;
  return {
    workoutKind: row.workout_kind,
    plannedDurationMinutes: row.planned_duration_minutes,
    status: row.status,
  };
}

/**
 * Applies a single day's recalculated outcome. If nothing meaningful
 * changed from the current row, it just updates status in place (no new
 * version/plan_change) — this keeps repeated evaluation of unchanged
 * inputs from duplicating history. If the workout kind, duration, or
 * location changed, it bumps a new plan_version, writes a new
 * planned_workouts row (linked via original_workout_id), and records the
 * change with its reason in plan_changes.
 */
export async function applyDailyRecalculation(supabase: Client, userId: string, input: DailyRecalcInput) {
  const previous = await getPlannedWorkoutForDate(supabase, userId, input.localDate);

  const materiallyChanged =
    !previous ||
    previous.workout_kind !== input.newWorkoutKind ||
    previous.planned_duration_minutes !== input.newDurationMinutes;

  if (!materiallyChanged && previous) {
    if (previous.status !== input.newStatus) {
      const { error } = await supabase
        .from("planned_workouts")
        .update({ status: input.newStatus })
        .eq("id", previous.id);
      if (error) throw error;
    }
    return { changed: false, plannedWorkoutId: previous.id };
  }

  if (!previous) return { changed: false, plannedWorkoutId: null };

  const { data: latestVersion } = await supabase
    .from("plan_versions")
    .select("version_number")
    .eq("user_id", userId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: newVersion, error: versionError } = await supabase
    .from("plan_versions")
    .insert({
      user_id: userId,
      rolling_start_date: input.localDate,
      version_number: (latestVersion?.version_number ?? 0) + 1,
      trigger: input.trigger,
      source_event_type: input.sourceEventType,
      source_event_id: input.sourceEventId ?? null,
      is_active: true,
    })
    .select("id")
    .single();
  if (versionError || !newVersion) throw versionError ?? new Error("Failed to create plan version");

  const { data: newWorkout, error: workoutError } = await supabase
    .from("planned_workouts")
    .insert({
      plan_version_id: newVersion.id,
      user_id: userId,
      local_date: input.localDate,
      workout_kind: input.newWorkoutKind,
      goal: previous.goal,
      planned_duration_minutes: input.newDurationMinutes,
      status: input.newStatus,
      run_prescription: input.newRunPrescription as unknown as Json,
      strength_template_id: previous.strength_template_id,
      location_choice: input.newLocationChoice ?? previous.location_choice ?? "unspecified",
      run_context: ["easy_run", "long_run"].includes(input.newWorkoutKind)
        ? previous.run_context
        : "standard",
      original_workout_id: previous.id,
    })
    .select("id")
    .single();
  if (workoutError || !newWorkout) throw workoutError ?? new Error("Failed to insert recalculated workout");

  const { error: changeError } = await supabase.from("plan_changes").insert({
    user_id: userId,
    old_plan_version_id: previous.plan_version_id,
    new_plan_version_id: newVersion.id,
    local_date: input.localDate,
    old_workout_summary: summarize(previous) as unknown as Json,
    new_workout_summary: summarize({
      workout_kind: input.newWorkoutKind,
      planned_duration_minutes: input.newDurationMinutes,
      status: input.newStatus,
    }) as unknown as Json,
    reason_code: input.reasonCode,
    explanation: input.explanation,
    triggering_values: input.triggeringValues as unknown as Json,
  });
  if (changeError) throw changeError;

  return { changed: true, plannedWorkoutId: newWorkout.id as string };
}

export interface RecordRuleEvaluationInput {
  sourceType: "morning_check_in" | "workout_session" | "plan_generation" | "edit" | "unplanned";
  sourceId?: string;
  inputsSnapshot: Record<string, unknown>;
  matchedRules: string[];
  result: Record<string, unknown>;
  explanation: string;
}

export async function recordRuleEvaluation(supabase: Client, userId: string, input: RecordRuleEvaluationInput) {
  const { error } = await supabase.from("rule_evaluations").insert({
    user_id: userId,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    inputs_snapshot: input.inputsSnapshot as unknown as Json,
    matched_rules: input.matchedRules,
    result: input.result as unknown as Json,
    explanation: input.explanation,
  });
  if (error) throw error;
}

export interface RecordSafetyEventInput {
  sourceType: "morning_check_in" | "workout_session" | "during_workout";
  sourceId?: string;
  ruleCode: string;
  kneeStart?: number | null;
  kneeCurrent?: number | null;
  kneeChange?: number | null;
  blockedWorkoutTypes: string[];
  offeredAlternatives: string[];
}

export async function recordSafetyEvent(supabase: Client, userId: string, input: RecordSafetyEventInput) {
  const { error } = await supabase.from("safety_events").insert({
    user_id: userId,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    rule_code: input.ruleCode,
    knee_start: input.kneeStart ?? null,
    knee_current: input.kneeCurrent ?? null,
    knee_change: input.kneeChange ?? null,
    blocked_workout_types: input.blockedWorkoutTypes,
    offered_alternatives: input.offeredAlternatives,
  });
  if (error) throw error;
}
