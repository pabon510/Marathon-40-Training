import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { findComparableTrend, type ComparableRunCandidate } from "@/domain/trends/comparableRuns";
import { evaluateScorecard, type ScorecardInputs } from "@/domain/trends/scorecard";
import { mondayOfWeek, addDays } from "@/lib/date";

type Client = SupabaseClient<Database>;

export async function getWeeklyRunTotals(supabase: Client, userId: string, weekStart: string) {
  const { data, error } = await supabase
    .from("v_weekly_run_totals")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  return data ?? { total_run_minutes: 0, total_run_miles: 0 };
}

export async function getWeeklyKneeSummary(supabase: Client, userId: string, weekStart: string) {
  const { data, error } = await supabase
    .from("v_weekly_knee_summary")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  return data?.weekly_max_knee ?? 0;
}

export async function getDailyKneeScores(supabase: Client, userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("v_daily_knee_scores")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .order("local_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getWeeklyStrengthCompletion(supabase: Client, userId: string, weekStart: string) {
  const { data, error } = await supabase
    .from("v_weekly_strength_completion")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  return data ?? { completed_sessions: 0, logged_sessions: 0 };
}

export async function getWeeklyPlanCompletion(supabase: Client, userId: string, weekStart: string) {
  const { data, error } = await supabase
    .from("v_weekly_plan_completion")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.planned_count === 0) return 0;
  return data.credited_count / data.planned_count;
}

export async function getComparableRunTrend(supabase: Client, userId: string, sinceDate: string) {
  const { data: sessions, error } = await supabase
    .from("workout_sessions")
    .select("id, local_date, session_type, run_logs(*)")
    .eq("user_id", userId)
    .eq("session_type", "run")
    .gte("local_date", sinceDate);
  if (error) throw error;

  const candidates: ComparableRunCandidate[] = [];
  for (const session of sessions ?? []) {
    const logs = (session as unknown as { run_logs: Database["public"]["Tables"]["run_logs"]["Row"][] }).run_logs;
    const log = Array.isArray(logs) ? logs[0] : logs;
    if (!log || log.duration_seconds === null) continue;
    const pace = log.pace_override_seconds_per_mile ?? log.calculated_pace_seconds_per_mile;
    if (pace === null) continue;
    candidates.push({
      id: log.id,
      localDate: session.local_date,
      isThreshold: false,
      runType: log.run_type,
      durationSeconds: log.duration_seconds,
      paceSecondsPerMile: pace,
      averageHr: log.average_hr,
      effort: log.effort,
      kneeNextMorning: log.knee_immediately_after,
    });
  }

  return findComparableTrend(candidates);
}

/** Builds the 4-week scorecard starting from `programStartDate` (Monday). */
export async function computeFourWeekScorecard(supabase: Client, userId: string, programStartDate: string) {
  const weekStarts = [0, 1, 2, 3].map((i) => addDays(mondayOfWeek(programStartDate), i * 7));

  const [planRates, kneeMaxes, strength, trend] = await Promise.all([
    Promise.all(weekStarts.map((w) => getWeeklyPlanCompletion(supabase, userId, w))),
    Promise.all(weekStarts.map((w) => getWeeklyKneeSummary(supabase, userId, w))),
    Promise.all(weekStarts.map((w) => getWeeklyStrengthCompletion(supabase, userId, w))),
    getComparableRunTrend(supabase, userId, programStartDate),
  ]);

  const { data: checkins } = await supabase
    .from("v_checkin_completion")
    .select("*")
    .eq("user_id", userId)
    .in("week_start", weekStarts);

  const checkedInDays = (checkins ?? []).reduce((sum, c) => sum + c.checked_in_days, 0);
  const totalWorkoutDays = (checkins ?? []).reduce((sum, c) => sum + c.workout_days, 0);

  const inputs: ScorecardInputs = {
    strengthSessionsCompleted: strength.reduce((sum, s) => sum + s.completed_sessions, 0),
    weeklyAdaptedPlanCompletionRates: planRates as [number, number, number, number],
    hasQualifyingComparableRun: trend?.improved ?? false,
    weeklyMaxKnee: kneeMaxes as [number, number, number, number],
    checkedInWorkoutDays: checkedInDays,
    totalWorkoutDays,
  };

  return evaluateScorecard(inputs);
}
