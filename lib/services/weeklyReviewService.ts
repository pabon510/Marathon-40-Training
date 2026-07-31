import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { addDays } from "@/lib/date";
import { WEEKLY_REVIEW_RULES_VERSION, type WeeklyReviewEvidence } from "@/domain/analysis/weeklyReview";

type Client = SupabaseClient<Database>;

export async function buildWeeklyReviewEvidence(supabase: Client, userId: string, weekStart: string, today: string): Promise<WeeklyReviewEvidence> {
  const weekEnd = addDays(weekStart, 6);
  const [plan, sessions, knees, checkins] = await Promise.all([
    supabase.from("v_weekly_plan_completion").select("*").eq("user_id", userId).eq("week_start", weekStart).maybeSingle(),
    supabase.from("workout_sessions").select("id, session_type, completion_state, overall_effort, run_logs(id, distance_miles, duration_seconds, effort, is_stroller)").eq("user_id", userId).gte("local_date", weekStart).lte("local_date", weekEnd),
    supabase.from("v_daily_knee_scores").select("local_date, max_knee_score").eq("user_id", userId).gte("local_date", weekStart).lte("local_date", weekEnd).order("local_date"),
    supabase.from("v_checkin_completion").select("*").eq("user_id", userId).eq("week_start", weekStart).maybeSingle(),
  ]);
  for (const result of [plan, sessions, knees, checkins]) if (result.error) throw result.error;

  const completed = (sessions.data ?? []).filter((session) => session.completion_state === "full" || session.completion_state === "partial");
  const runSessions = completed.filter((session) => session.session_type === "run");
  const runLogs = runSessions.flatMap((session) => {
    const logs = (session as unknown as { run_logs: Array<{ id: string; distance_miles: number | null; duration_seconds: number | null; effort: number | null; is_stroller: boolean }> }).run_logs;
    return Array.isArray(logs) ? logs : [];
  });
  const runLogIds = runLogs.map((run) => run.id);
  const analyses = runLogIds.length
    ? await supabase.from("run_analyses").select("evidence_snapshot, run_log_id").eq("user_id", userId).eq("status", "completed").in("run_log_id", runLogIds)
    : { data: [], error: null };
  if (analyses.error) throw analyses.error;
  const efforts = runLogs.map((run) => run.effort).filter((value): value is number => value !== null);
  const kneeRows = knees.data ?? [];
  const firstKnee = kneeRows[0]?.max_knee_score ?? null;
  const latestKnee = kneeRows.at(-1)?.max_knee_score ?? null;
  const direction = firstKnee === null || latestKnee === null ? "unknown" : latestKnee < firstKnee ? "improving" : latestKnee > firstKnee ? "worsening" : "stable";
  const verdicts = (analyses.data ?? []).map((analysis) => {
    const snapshot = analysis.evidence_snapshot as { authoritativeVerdict?: string; progressionStatus?: string };
    return snapshot;
  });
  const planned = plan.data?.planned_count ?? 0;
  const credited = plan.data?.credited_count ?? 0;

  return {
    rulesVersion: WEEKLY_REVIEW_RULES_VERSION,
    period: { weekStart, weekEnd, complete: today > weekEnd },
    consistency: {
      planned,
      credited,
      completionPercent: planned ? Math.round((credited / planned) * 100) : 0,
      checkInDays: checkins.data?.checked_in_days ?? 0,
      workoutDays: checkins.data?.workout_days ?? 0,
    },
    running: {
      sessions: runSessions.length,
      minutes: Math.round(runLogs.reduce((sum, run) => sum + (run.duration_seconds ?? 0), 0) / 60),
      miles: Number(runLogs.reduce((sum, run) => sum + (run.distance_miles ?? 0), 0).toFixed(2)),
      strollerRuns: runLogs.filter((run) => run.is_stroller).length,
      averageEffort: efforts.length ? Number((efforts.reduce((a, b) => a + b, 0) / efforts.length).toFixed(1)) : null,
      completedAnalyses: verdicts.length,
    },
    strength: {
      completedSessions: completed.filter((session) => session.session_type === "strength").length,
      loggedSessions: (sessions.data ?? []).filter((session) => session.session_type === "strength").length,
    },
    knee: {
      recordedDays: kneeRows.length,
      maximum: kneeRows.length ? Math.max(...kneeRows.map((row) => row.max_knee_score)) : null,
      first: firstKnee,
      latest: latestKnee,
      direction,
    },
    runReviewSignals: {
      successful: verdicts.filter((item) => item.authoritativeVerdict === "successful").length,
      caution: verdicts.filter((item) => item.authoritativeVerdict === "successful_with_caution").length,
      harderThanIntended: verdicts.filter((item) => item.authoritativeVerdict === "harder_than_intended").length,
      pendingNextMorning: verdicts.filter((item) => item.progressionStatus === "pending_next_morning").length,
    },
  };
}

export async function getWeeklyReview(supabase: Client, userId: string, weekStart: string) {
  const { data, error } = await supabase.from("weekly_coaching_reviews").select("*").eq("user_id", userId).eq("week_start", weekStart).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}
