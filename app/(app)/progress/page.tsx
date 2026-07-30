import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import {
  computeFourWeekScorecard,
  getComparableRunTrend,
  getDailyKneeScores,
  getRecentWeeklyRunTotals,
  getWeeklyPlanCompletion,
  getWeeklyRunTotals,
  getWeeklyStrengthCompletion,
} from "@/lib/services/progressService";
import { addDays, mondayOfWeek, todayLocalDate } from "@/lib/date";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { formatDuration, formatPace } from "@/domain/metrics/pace";

function weekLabel(date: string) {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

function encouragement(completion: number, sessions: number) {
  if (completion >= 1) return "You completed the full adapted plan. That is a week worth celebrating.";
  if (completion >= 0.75) return "You are meeting the consistency target that keeps progress moving.";
  if (sessions > 0) return "Momentum is building. Every completed session moves the plan forward.";
  return "Your next completed workout is where this week’s momentum begins.";
}

function trendHeadline(basis: string) {
  if (basis === "faster_pace_similar_hr") return "Faster at a similar heart rate";
  if (basis === "lower_hr_similar_pace") return "Lower heart rate at a similar pace";
  if (basis === "longer_duration_same_effort") return "Longer without added effort";
  return "Building the comparison";
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const today = todayLocalDate(profile.timezone);
  const weekStart = mondayOfWeek(today);
  const fourWeeksAgo = addDays(weekStart, -21);

  const [runTotals, recentRuns, strength, planCompletionRate, trend, dailyKnee, { data: earliestVersion }] =
    await Promise.all([
      getWeeklyRunTotals(supabase, user!.id, weekStart),
      getRecentWeeklyRunTotals(supabase, user!.id, fourWeeksAgo, weekStart),
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
  const scorecard = await computeFourWeekScorecard(supabase, user!.id, programStart, today);
  const completionPercent = Math.round(planCompletionRate * 100);
  const runMinutes = Math.round(runTotals.total_run_minutes);
  const completedSessions = strength.completed_sessions + (runMinutes > 0 ? 1 : 0);
  const maxWeeklyMinutes = Math.max(1, ...recentRuns.map((week) => week.total_run_minutes));
  const maxKnee = dailyKnee.length ? Math.max(...dailyKnee.map((day) => day.max_knee_score)) : null;
  const missionPercent = Math.round((scorecard.metCount / 5) * 100);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Your training</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Progress dashboard</h1>
        </div>
        <Link href="/history" className="btn-secondary">
          History
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-5">
          <div
            className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#ffffff ${completionPercent * 3.6}deg, rgba(255,255,255,.2) 0deg)`,
            }}
            aria-label={`${completionPercent}% of adapted weekly plan completed`}
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-800/95 text-center">
              <span>
                <strong className="block text-2xl leading-none">{completionPercent}%</strong>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-brand-100">complete</span>
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-100">This week</p>
            <h2 className="mt-1 text-xl font-bold">Keep the momentum</h2>
            <p className="mt-2 text-sm leading-5 text-brand-50">
              {encouragement(planCompletionRate, completedSessions)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
            <span className="text-lg" aria-hidden="true">🏃</span>
            <strong className="mt-1 block text-xl">{runMinutes}</strong>
            <span className="text-[11px] text-brand-100">run minutes</span>
          </div>
          <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
            <span className="text-lg" aria-hidden="true">📍</span>
            <strong className="mt-1 block text-xl">{runTotals.total_run_miles.toFixed(1)}</strong>
            <span className="text-[11px] text-brand-100">miles</span>
          </div>
          <div className="rounded-2xl bg-white/12 p-3 backdrop-blur">
            <span className="text-lg" aria-hidden="true">🏋️</span>
            <strong className="mt-1 block text-xl">{strength.completed_sessions}</strong>
            <span className="text-[11px] text-brand-100">strength</span>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Running volume</p>
            <h2 className="text-lg font-bold text-slate-950">Four-week rhythm</h2>
          </div>
          <span className="text-sm font-semibold text-brand-700">{runMinutes} min this week</span>
        </div>
        <div className="mt-5 flex h-28 items-end gap-3" aria-label="Weekly running minutes for the last four weeks">
          {[0, 1, 2, 3].map((index) => {
            const date = addDays(fourWeeksAgo, index * 7);
            const week = recentRuns.find((item) => item.week_start === date);
            const minutes = week?.total_run_minutes ?? 0;
            const height = minutes === 0 ? 6 : Math.max(14, (minutes / maxWeeklyMinutes) * 88);
            return (
              <div key={date} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold text-slate-600">{Math.round(minutes)}</span>
                <div
                  className={`w-full rounded-t-xl ${date === weekStart ? "bg-brand-600" : "bg-brand-200"}`}
                  style={{ height }}
                  title={`Week of ${date}: ${Math.round(minutes)} run minutes`}
                />
                <span className="text-[10px] text-slate-500">{weekLabel(date)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card relative overflow-hidden">
          <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-blue-100" aria-hidden="true" />
          <p className="relative text-xs font-semibold uppercase tracking-wide text-brand-700">Running efficiency</p>
          <h2 className="relative mt-1 text-lg font-bold text-slate-950">
            {trend?.improved ? "Running is getting easier" : "Building your baseline"}
          </h2>
          {trend ? (
            <>
              <p className="relative mt-3 text-sm font-semibold text-slate-800">{trendHeadline(trend.basis)}</p>
              <div className="relative mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-[10px] uppercase text-slate-500">Earlier</span>
                  <strong className="block text-base">{formatPace(trend.earlier.paceSecondsPerMile)}</strong>
                  <span className="text-xs text-slate-500">{trend.earlier.averageHr ?? "—"} bpm</span>
                </div>
                <span className="text-xl text-brand-600" aria-hidden="true">→</span>
                <div className="rounded-xl bg-brand-50 p-3">
                  <span className="text-[10px] uppercase text-brand-700">Latest</span>
                  <strong className="block text-base">{formatPace(trend.later.paceSecondsPerMile)}</strong>
                  <span className="text-xs text-slate-500">{trend.later.averageHr ?? "—"} bpm</span>
                </div>
              </div>
              <p className="relative mt-2 text-xs text-slate-500">
                Comparable {trend.later.isStroller ? "stroller" : "standard"} runs · {formatDuration(trend.later.durationSeconds)}
              </p>
            </>
          ) : (
            <div className="relative mt-4 rounded-xl bg-brand-50 p-3">
              <p className="text-sm text-slate-700">
                Complete another similar easy run and this card will compare pace, heart rate, duration, and effort.
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Knee trend</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">Last 14 days</h2>
            </div>
            <span className={maxKnee === null ? "badge-warn" : maxKnee <= 2 ? "badge-ok" : maxKnee < 6 ? "badge-warn" : "badge-block"}>
              {maxKnee === null ? "No data" : `Max ${maxKnee}/10`}
            </span>
          </div>
          {dailyKnee.length ? (
            <>
              <div className="mt-5 flex h-24 items-end gap-1.5" aria-label="Recorded daily maximum knee discomfort">
                {dailyKnee.map((day) => (
                  <div key={day.local_date} className="flex flex-1 flex-col items-center justify-end">
                    <span className="mb-1 text-[10px] font-semibold text-slate-600">{day.max_knee_score}</span>
                    <div
                      className={`w-full min-w-3 rounded-t-md ${
                        day.max_knee_score >= 6
                          ? "bg-safety-block"
                          : day.max_knee_score >= 3
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                      }`}
                      style={{ height: Math.max(8, day.max_knee_score * 7) }}
                      title={`${day.local_date}: ${day.max_knee_score}/10`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Only days with a recorded knee score are shown.</p>
            </>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              Your check-ins will build this trend without averaging away a difficult day.
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="flex items-center gap-4">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(#2064d9 ${missionPercent * 3.6}deg, #d9ecff 0deg)` }}
            aria-label={`${scorecard.metCount} of 5 four-week goals achieved`}
          >
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-center">
              <strong className="text-lg text-brand-800">{scorecard.metCount}/5</strong>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Four-week mission</p>
            <h2 className="text-lg font-bold text-slate-950">
              {scorecard.success ? "Month successful" : `${4 - scorecard.metCount} more goals for success`}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Four of five goals makes the month successful.</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {scorecard.criteria.map((criterion) => (
            <div
              key={criterion.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                criterion.met ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  criterion.met ? "bg-emerald-600 text-white" : "bg-white text-slate-400 ring-1 ring-slate-300"
                }`}
                aria-hidden="true"
              >
                {criterion.met ? "✓" : "○"}
              </span>
              <span className={`text-sm ${criterion.met ? "font-medium text-emerald-950" : "text-slate-600"}`}>
                {criterion.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <Link href="/history" className="btn-secondary w-full">
        Explore workout history
      </Link>
    </div>
  );
}
