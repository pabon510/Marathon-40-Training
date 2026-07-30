import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import {
  buildStrengthLoadSignature,
  detectMaterialChanges,
  type MaterialEditResult,
  type SessionSnapshot,
} from "@/domain/logging/materialEdit";
import { calculatePaceSecondsPerMile } from "@/domain/metrics/pace";
import { getSessionDetail, type SessionDetail } from "@/lib/services/historyService";
import { recordRuleEvaluation, recordSafetyEvent } from "@/lib/services/recalcService";
import type { CompletionState, ExpectationResult, RunType } from "@/domain/types";

type Client = SupabaseClient<Database>;

function snapshotOf(detail: SessionDetail): SessionSnapshot {
  return {
    sessionType: detail.session.session_type,
    completionState: detail.session.completion_state,
    overallEffort: detail.postCheckIn?.overall_effort ?? detail.session.overall_effort,
    highestKneeDuring: detail.postCheckIn?.highest_knee_during ?? detail.runLog?.highest_knee_during ?? null,
    kneeImmediatelyAfter:
      detail.postCheckIn?.knee_immediately_after ?? detail.runLog?.knee_immediately_after ?? null,
    completedFull: detail.postCheckIn?.completed_full ?? null,
    runType: detail.runLog?.run_type ?? null,
    distanceMiles: detail.runLog?.distance_miles ?? null,
    durationSeconds: detail.runLog?.duration_seconds ?? null,
    strengthLoadSignature:
      detail.strengthLogs.length === 0
        ? null
        : buildStrengthLoadSignature(
            detail.strengthLogs.map((l) => ({
              exerciseId: l.exercise_id,
              completedSets: l.completed_sets,
              representativeReps: l.representative_reps,
              loadValue: l.load_value,
              loadType: l.load_type,
              bandLevel: l.band_level,
            })),
          ),
    notes: detail.session.notes,
  };
}

export interface RunEditInput {
  runType: RunType;
  distanceMiles: number | null;
  durationSeconds: number | null;
  paceOverrideSecondsPerMile: number | null;
  averageHr: number | null;
  maximumHr: number | null;
  elevationGainFeet: number | null;
  overallEffort: number;
  highestKneeDuring: number;
  kneeImmediatelyAfter: number;
  completedFull: boolean;
  completionState: CompletionState;
  expectationResult: ExpectationResult;
  unusualPainFlag: boolean;
  notes: string | null;
}

export interface StrengthEntryEditInput {
  strengthLogId: string;
  completedSets: number | null;
  representativeReps: number | null;
  completedSeconds: number | null;
  completedDistanceFeet: number | null;
  completedSteps: number | null;
  prescriptionMetric: "reps" | "seconds" | "distance_feet" | "steps" | "breaths";
  loadValue: number | null;
  loadType: "weighted" | "bodyweight" | "band" | "machine";
  bandLevel: "light" | "medium" | "heavy" | null;
  difficulty: number | null;
}

export interface StrengthEditInput {
  entries: StrengthEntryEditInput[];
  overallEffort: number;
  highestKneeDuring: number;
  kneeImmediatelyAfter: number;
  completedFull: boolean;
  completionState: CompletionState;
  expectationResult: ExpectationResult;
  unusualPainFlag: boolean;
  notes: string | null;
}

/**
 * Recalculation performed after a material edit. Completion credit on the
 * linked planned workout is re-derived, a rule_evaluations audit row is
 * written, and a safety event is raised if the corrected knee values cross
 * the hard-stop threshold. Weekly metrics and trends read from stored data
 * on every request, so they self-correct once the underlying rows change.
 */
async function recalculateAfterEdit(
  supabase: Client,
  userId: string,
  detail: SessionDetail,
  after: SessionSnapshot,
  change: MaterialEditResult,
) {
  if (detail.session.planned_workout_id) {
    const completedFull = after.completedFull ?? after.completionState === "full";
    await supabase
      .from("planned_workouts")
      .update({
        status: completedFull ? "completed" : after.completionState === "skipped" ? "skipped" : "partial",
        completion_credit_factor: completedFull ? 1.0 : 0.5,
      })
      .eq("id", detail.session.planned_workout_id)
      .eq("user_id", userId);
  }

  await recordRuleEvaluation(supabase, userId, {
    sourceType: "edit",
    sourceId: detail.session.id,
    inputsSnapshot: {
      localDate: detail.session.local_date,
      changedFields: change.changedFields,
      before: snapshotOf(detail) as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
    },
    matchedRules: ["MATERIAL_EDIT_RECALC"],
    result: { recalculated: true, changedFields: change.changedFields },
    explanation: change.explanation ?? "Material edit recalculated.",
  });

  const worstKnee = Math.max(after.highestKneeDuring ?? 0, after.kneeImmediatelyAfter ?? 0);
  if (worstKnee >= 6) {
    await recordSafetyEvent(supabase, userId, {
      sourceType: "workout_session",
      sourceId: detail.session.id,
      ruleCode: "KNEE_HARD_BLOCK",
      kneeCurrent: worstKnee,
      blockedWorkoutTypes: ["run", "strength"],
      offeredAlternatives: ["upper_body", "core", "mobility", "walk", "rest"],
    });
  }
}

async function applySharedSessionFields(
  supabase: Client,
  userId: string,
  sessionId: string,
  input: {
    overallEffort: number;
    completionState: CompletionState;
    expectationResult: ExpectationResult;
    unusualPainFlag: boolean;
    notes: string | null;
    highestKneeDuring: number;
    kneeImmediatelyAfter: number;
    completedFull: boolean;
  },
  hasExistingCheckIn: boolean,
) {
  const { error: sessionError } = await supabase
    .from("workout_sessions")
    .update({
      completion_state: input.completionState,
      overall_effort: input.overallEffort,
      expectation_result: input.expectationResult,
      unusual_pain_flag: input.unusualPainFlag,
      notes: input.notes,
    })
    .eq("id", sessionId)
    .eq("user_id", userId);
  if (sessionError) throw sessionError;

  const checkInValues = {
    overall_effort: input.overallEffort,
    highest_knee_during: input.highestKneeDuring,
    knee_immediately_after: input.kneeImmediatelyAfter,
    completed_full: input.completedFull,
    expectation_result: input.expectationResult,
    unusual_pain_flag: input.unusualPainFlag,
    notes: input.notes,
  };

  if (hasExistingCheckIn) {
    const { error } = await supabase
      .from("post_workout_check_ins")
      .update(checkInValues)
      .eq("workout_session_id", sessionId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("post_workout_check_ins")
      .insert({ workout_session_id: sessionId, ...checkInValues });
    if (error) throw error;
  }
}

export async function updateRunSession(
  supabase: Client,
  userId: string,
  sessionId: string,
  input: RunEditInput,
): Promise<MaterialEditResult> {
  const before = await getSessionDetail(supabase, userId, sessionId);
  if (!before) throw new Error("Workout not found.");

  const calculatedPace =
    input.distanceMiles && input.durationSeconds
      ? calculatePaceSecondsPerMile(input.distanceMiles, input.durationSeconds)
      : null;

  const runValues = {
    run_type: input.runType,
    distance_miles: input.distanceMiles,
    duration_seconds: input.durationSeconds,
    calculated_pace_seconds_per_mile: calculatedPace,
    pace_override_seconds_per_mile: input.paceOverrideSecondsPerMile,
    average_hr: input.averageHr,
    maximum_hr: input.maximumHr,
    effort: input.overallEffort,
    elevation_gain_feet: input.elevationGainFeet,
    highest_knee_during: input.highestKneeDuring,
    knee_immediately_after: input.kneeImmediatelyAfter,
  };

  if (before.runLog) {
    const { error } = await supabase.from("run_logs").update(runValues).eq("id", before.runLog.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("run_logs")
      .insert({ workout_session_id: sessionId, ...runValues });
    if (error) throw error;
  }

  await applySharedSessionFields(supabase, userId, sessionId, input, before.postCheckIn !== null);

  const after = await getSessionDetail(supabase, userId, sessionId);
  const change = detectMaterialChanges(snapshotOf(before), snapshotOf(after!));
  if (change.isMaterial) {
    await recalculateAfterEdit(supabase, userId, before, snapshotOf(after!), change);
  }
  return change;
}

export async function updateStrengthSession(
  supabase: Client,
  userId: string,
  sessionId: string,
  input: StrengthEditInput,
): Promise<MaterialEditResult> {
  const before = await getSessionDetail(supabase, userId, sessionId);
  if (!before) throw new Error("Workout not found.");

  const ownedLogIds = new Set(before.strengthLogs.map((l) => l.id));

  for (const entry of input.entries) {
    // Only touch rows that belong to this session — a crafted request
    // cannot redirect the update at someone else's log row.
    if (!ownedLogIds.has(entry.strengthLogId)) continue;

    const previous = before.strengthLogs.find((l) => l.id === entry.strengthLogId)!;
    const loadChanged =
      previous.completed_sets !== entry.completedSets ||
      previous.representative_reps !== entry.representativeReps ||
      previous.completed_seconds !== entry.completedSeconds ||
      previous.completed_distance_feet !== entry.completedDistanceFeet ||
      previous.completed_steps !== entry.completedSteps ||
      previous.load_value !== entry.loadValue ||
      previous.load_type !== entry.loadType ||
      previous.band_level !== entry.bandLevel;

    const skipped: string[] = [];
    if ((entry.loadType === "weighted" || entry.loadType === "machine") && entry.loadValue === null) {
      skipped.push("load");
    }
    const resultMissing =
      entry.prescriptionMetric === "seconds"
        ? entry.completedSeconds === null
        : entry.prescriptionMetric === "distance_feet"
          ? entry.completedDistanceFeet === null
          : entry.prescriptionMetric === "steps"
            ? entry.completedSteps === null
            : entry.representativeReps === null;
    if (resultMissing) skipped.push(entry.prescriptionMetric);
    if (entry.difficulty === null) skipped.push("difficulty");

    const { error } = await supabase
      .from("strength_logs")
      .update({
        completed_sets: entry.completedSets,
        representative_reps: entry.representativeReps,
        completed_seconds: entry.completedSeconds,
        completed_distance_feet: entry.completedDistanceFeet,
        completed_steps: entry.completedSteps,
        load_value: entry.loadValue,
        load_type: entry.loadType,
        band_level: entry.bandLevel,
        load_unit:
          entry.loadType === "bodyweight" ? "bodyweight" : entry.loadType === "band" ? "band" : "lb",
        difficulty: entry.difficulty,
        skipped_fields: skipped,
      })
      .eq("id", entry.strengthLogId);
    if (error) throw error;

    // Any per-set detail recorded originally no longer matches the edited
    // summary, so it is cleared rather than left contradicting the record.
    if (loadChanged) {
      const { error: setsError } = await supabase
        .from("strength_set_logs")
        .delete()
        .eq("strength_log_id", entry.strengthLogId);
      if (setsError) throw setsError;
    }
  }

  await applySharedSessionFields(supabase, userId, sessionId, input, before.postCheckIn !== null);

  const after = await getSessionDetail(supabase, userId, sessionId);
  const change = detectMaterialChanges(snapshotOf(before), snapshotOf(after!));
  if (change.isMaterial) {
    await recalculateAfterEdit(supabase, userId, before, snapshotOf(after!), change);
  }
  return change;
}

/** Records that a session's plan linkage changed, for the day's change history. */
export async function recordEditPlanChange(
  supabase: Client,
  userId: string,
  localDate: string,
  explanation: string,
) {
  const { data: activeVersion } = await supabase
    .from("plan_versions")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!activeVersion) return;

  const { error } = await supabase.from("plan_changes").insert({
    user_id: userId,
    old_plan_version_id: activeVersion.id,
    new_plan_version_id: activeVersion.id,
    local_date: localDate,
    new_workout_summary: { edited: true } as unknown as Json,
    reason_code: "MATERIAL_EDIT_RECALC",
    explanation,
    triggering_values: {} as unknown as Json,
  });
  if (error) throw error;
}
