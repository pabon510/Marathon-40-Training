import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { evaluateRun, type RunEvidencePackage } from "@/domain/analysis/runEvaluator";
import type { RunPrescription, WorkoutKind } from "@/domain/types";

type Client = SupabaseClient<Database>;

export async function buildRunEvidence(
  supabase: Client,
  userId: string,
  runLogId: string,
): Promise<{ evidence: RunEvidencePackage; scenario: { workoutKind: WorkoutKind | null; isStroller: boolean; runType: string; isCalibration: boolean; hasChartEvidence: boolean } } | null> {
  const { data: runLog, error: runError } = await supabase
    .from("run_logs")
    .select("*")
    .eq("id", runLogId)
    .maybeSingle();
  if (runError) throw runError;
  if (!runLog) return null;

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", runLog.workout_session_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) return null;

  const [{ data: postCheckIn }, { data: runMorningCheckIn }, plannedResult, importResult] = await Promise.all([
    supabase.from("post_workout_check_ins").select("*").eq("workout_session_id", session.id).maybeSingle(),
    supabase.from("morning_check_ins").select("knee").eq("user_id", userId).eq("local_date", session.local_date).order("check_in_time", { ascending: false }).limit(1).maybeSingle(),
    session.planned_workout_id
      ? supabase.from("planned_workouts").select("*").eq("id", session.planned_workout_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    runLog.import_id
      ? supabase.from("run_imports").select("extracted_payload").eq("id", runLog.import_id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (plannedResult.error) throw plannedResult.error;
  if (importResult.error) throw importResult.error;

  const planned = plannedResult.data;
  const prescription = planned?.run_prescription as unknown as RunPrescription | null;
  const payload = importResult.data?.extracted_payload as Record<string, Json | undefined> | null;
  const chartObservations = payload
    ? {
        heartRateChartPattern: payload.heartRateChartPattern ?? null,
        paceChartPattern: payload.paceChartPattern ?? null,
        prescribedHrCeilingPattern: payload.prescribedHrCeilingPattern ?? null,
      }
    : null;
  const pace = runLog.pace_override_seconds_per_mile ?? runLog.calculated_pace_seconds_per_mile;

  const evidence = evaluateRun({
    workoutKind: (planned?.workout_kind as WorkoutKind | undefined) ?? null,
    plannedDurationMinutes: planned?.planned_duration_minutes ?? null,
    prescription,
    completedFull: postCheckIn?.completed_full ?? session.completion_state === "full",
    distanceMiles: runLog.distance_miles,
    durationSeconds: runLog.duration_seconds,
    paceSecondsPerMile: pace,
    averageHr: runLog.average_hr,
    maximumHr: runLog.maximum_hr,
    effort: runLog.effort ?? postCheckIn?.overall_effort ?? session.overall_effort,
    immediateKnee: runLog.knee_immediately_after ?? postCheckIn?.knee_immediately_after ?? null,
    morningKnee: runMorningCheckIn?.knee ?? null,
    highestKneeDuring: runLog.highest_knee_during ?? postCheckIn?.highest_knee_during ?? null,
    isStroller: runLog.is_stroller,
    runType: runLog.run_type,
    averageTemperatureF: runLog.average_temperature_f,
    elevationGainFeet: runLog.elevation_gain_feet,
    aerobicTrainingEffect: runLog.aerobic_training_effect,
    anaerobicTrainingEffect: runLog.anaerobic_training_effect,
    averageCadenceSpm: runLog.average_cadence_spm,
    maximumCadenceSpm: runLog.maximum_cadence_spm,
    chartObservations,
  });

  const hasChartEvidence = Boolean(
    chartObservations
    && Object.values(chartObservations).some((value) => value && typeof value === "object"),
  );
  return {
    evidence,
    scenario: {
      workoutKind: (planned?.workout_kind as WorkoutKind | undefined) ?? null,
      isStroller: runLog.is_stroller,
      runType: runLog.run_type,
      isCalibration: prescription?.isCalibration ?? false,
      hasChartEvidence,
    },
  };
}

export async function getRunAnalysis(supabase: Client, userId: string, runLogId: string) {
  const { data, error } = await supabase
    .from("run_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("run_log_id", runLogId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function finalizePreviousRunAnalyses(
  supabase: Client,
  userId: string,
  runDate: string,
  nextMorningKnee: number | null,
  recoveryAcceptable: boolean,
) {
  if (nextMorningKnee === null) return;
  const { data: sessions, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", runDate)
    .eq("session_type", "run");
  if (sessionError) throw sessionError;
  if (!sessions?.length) return;
  const { data: runLogs, error: logError } = await supabase
    .from("run_logs")
    .select("id")
    .in("workout_session_id", sessions.map((session) => session.id));
  if (logError) throw logError;
  if (!runLogs?.length) return;

  const { data: analyses, error: analysisError } = await supabase
    .from("run_analyses")
    .select("id, evidence_snapshot")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("run_log_id", runLogs.map((log) => log.id));
  if (analysisError) throw analysisError;

  for (const analysis of analyses ?? []) {
    const evidence = analysis.evidence_snapshot as unknown as RunEvidencePackage;
    const runMorningKnee = typeof evidence?.actual?.morningKnee === "number" ? evidence.actual.morningKnee : null;
    const wasPending = evidence?.progressionStatus === "pending_next_morning";
    const kneeDidNotIncrease = runMorningKnee !== null && nextMorningKnee <= runMorningKnee;
    const successfulExposure = wasPending && kneeDidNotIncrease && recoveryAcceptable;
    const result = {
      nextMorningKnee,
      runMorningKnee,
      successfulExposure,
      status: successfulExposure ? "successful_exposure" : "not_eligible",
      explanation: runMorningKnee === null
        ? "The pre-run morning knee score was unavailable, so progression eligibility cannot be confirmed."
        : successfulExposure
          ? `Next-morning knee discomfort was ${nextMorningKnee}/10 and did not increase from the pre-run ${runMorningKnee}/10. This counts as a successful exposure for the weekly progression review.`
          : !recoveryAcceptable
            ? `Next-morning knee discomfort was ${nextMorningKnee}/10 versus ${runMorningKnee}/10 before the run, but recovery did not meet the progression criteria. This run does not qualify for progression.`
          : `Next-morning knee discomfort was ${nextMorningKnee}/10 versus ${runMorningKnee}/10 before the run, so this run does not qualify for progression.`,
    };
    await supabase.from("run_analyses").update({
      next_morning_result: result,
      next_morning_updated_at: new Date().toISOString(),
    }).eq("id", analysis.id).eq("user_id", userId);
  }
}
