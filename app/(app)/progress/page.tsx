import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import {
  computeFourWeekScorecard,
  getComparableRunTrend,
  getDailyKneeScores,
  getWeeklyPlanCompletion,
  getWeeklyRunTotals,
  getWeeklyStrengthCompletion,
} from "@/lib/services/progressService";
import { addDays, mondayOfWeek, todayLocalDate } from "@/lib/date";
import { SeedProfileButton } from "@/components/seed-profile-button";

export default async function ProgressPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const today = todayLocalDate(profile.timezone);
  const weekStart = mondayOfWeek(today);

  const [runTotals, strength, planCompletionRate, trend, dailyKnee, { data: earliestVersion }] = await Promise.all([
    getWeeklyRunTotals(supabase, user!.id, weekStart),
    getWeeklyStrengthCompletion(supabase, user!.id, weekStart),
    getWeeklyPlanCompletion(supabase, user!.id, weekStart),
    getComparableRunTrend(supabase, user!.id, addDays(today, -90)),
    getDailyKneeScores(supabase, user!.id, addDays(today, -13), today),
    supabase
      .from("plan_versions")
      .select("rolling_start_date")
      .eq("user_id", user!.id)
      .order("rolling_start_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const programStart = earliestVersion?.rolling_start_date ?? weekStart;
  const scorecard = await computeFourWeekScorecard(supabase, user!.id, programStart);

  const kneeSummary =
    dailyKnee.length === 0
      ? "No knee data recorded yet."
      : `Max ${Math.max(...dailyKnee.map((d) => d.max_knee_score))}/10 over the last ${dailyKnee.length} recorded day(s).`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Progress</h1>
        <Link href="/history" className="btn-secondary">
          History
        </Link>
      </div>

      <div className="card">
        <p className="text-sm font-semibold text-slate-900">This week</p>
        <p className="mt-1 text-sm text-slate-700">
          {Math.round(runTotals.total_run_minutes)} run minutes · {runTotals.total_run_miles.toFixed(1)} miles
        </p>
        <p className="text-sm text-slate-700">
          Strength: {strength.completed_sessions}/{strength.logged_sessions || 0} logged sessions completed
        </p>
        <p className="text-sm text-slate-700">Adapted plan completion: {Math.round(planCompletionRate * 100)}%</p>
      </div>

      <div className="card">
        <p className="text-sm font-semibold text-slate-900">Running is getting easier</p>
        {trend ? (
          <div className="mt-1">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
              {trend.later.isStroller ? "Stroller runs" : "Standard runs"}
            </p>
            <p className="text-sm text-slate-700">
              {trend.improved
                ? `Improving: comparing ${trend.earlier.localDate} to ${trend.later.localDate} (${trend.basis.replaceAll("_", " ")}).`
                : `No improvement detected yet between the most recent comparable runs (${trend.earlier.localDate} vs ${trend.later.localDate}).`}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Not enough comparable easy runs yet.</p>
        )}
      </div>

      <div className="card">
        <p className="text-sm font-semibold text-slate-900">Knee discomfort (last 14 days)</p>
        <p className="mt-1 text-sm text-slate-700">{kneeSummary}</p>
        <ul className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
          {dailyKnee.map((d) => (
            <li
              key={d.local_date}
              title={`${d.local_date}: ${d.max_knee_score}/10`}
              className={`h-6 w-6 rounded text-center text-[10px] leading-6 text-white ${
                d.max_knee_score >= 6 ? "bg-safety-block" : d.max_knee_score >= 3 ? "bg-safety-warn" : "bg-safety-ok"
              }`}
            >
              {d.max_knee_score}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <p className="text-sm font-semibold text-slate-900">
          Four-week scorecard: {scorecard.metCount}/5 {scorecard.success ? "(on track)" : ""}
        </p>
        <ul className="mt-2 space-y-1">
          {scorecard.criteria.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <span aria-hidden="true">{c.met ? "✅" : "⬜"}</span>
              <span className={c.met ? "text-slate-700" : "text-slate-500"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
