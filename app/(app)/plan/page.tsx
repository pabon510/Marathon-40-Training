import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getPlanChangesForRange, getPlannedWorkoutsForRange } from "@/lib/services/planService";
import { todayLocalDate, mondayOfWeek, addDays } from "@/lib/date";
import { WORKOUT_KIND_LABELS } from "@/lib/labels";
import { SeedProfileButton } from "@/components/seed-profile-button";
import type { RunPrescription, WorkoutKind } from "@/domain/types";

const RUN_KINDS = new Set(["easy_run", "long_run", "threshold_run"]);
const STRENGTH_KINDS = new Set(["strength_a", "strength_b", "strength_full", "upper_core_safety"]);

const KIND_STYLE: Record<string, { icon: string; accent: string; soft: string; label: string }> = {
  easy_run: { icon: "🏃", accent: "border-blue-500", soft: "bg-blue-50", label: "Easy run" },
  long_run: { icon: "🏃", accent: "border-indigo-500", soft: "bg-indigo-50", label: "Long run" },
  threshold_run: { icon: "⚡", accent: "border-violet-500", soft: "bg-violet-50", label: "Threshold run" },
  strength_a: { icon: "🏋️", accent: "border-amber-500", soft: "bg-amber-50", label: "Strength A" },
  strength_b: { icon: "🏋️", accent: "border-orange-500", soft: "bg-orange-50", label: "Strength B" },
  strength_full: { icon: "🏋️", accent: "border-orange-500", soft: "bg-orange-50", label: "Full-body strength" },
  combined_short: { icon: "🔁", accent: "border-cyan-500", soft: "bg-cyan-50", label: "Run + strength" },
  upper_core_safety: { icon: "🛡️", accent: "border-emerald-500", soft: "bg-emerald-50", label: "Upper body + core" },
  custom: { icon: "✨", accent: "border-slate-500", soft: "bg-slate-50", label: "Custom workout" },
};

function formatDay(date: string, includeWeekday = true) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: includeWeekday ? "long" : undefined,
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function shortWeekday(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "narrow",
    timeZone: "UTC",
  });
}

function statusPresentation(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completed", classes: "bg-emerald-100 text-emerald-800", symbol: "✓" };
    case "partial":
      return { label: "Partial", classes: "bg-amber-100 text-amber-800", symbol: "◐" };
    case "confirmed":
      return { label: "Confirmed", classes: "bg-blue-100 text-blue-800", symbol: "●" };
    case "blocked":
      return { label: "Blocked", classes: "bg-red-100 text-red-800", symbol: "!" };
    case "skipped":
    case "incomplete":
      return { label: status === "skipped" ? "Skipped" : "Incomplete", classes: "bg-slate-200 text-slate-700", symbol: "–" };
    case "replaced":
      return { label: "Adapted", classes: "bg-amber-100 text-amber-800", symbol: "↻" };
    default:
      return { label: "Planned", classes: "bg-slate-100 text-slate-700", symbol: "○" };
  }
}

function WorkoutCard({
  date,
  workout,
  changes,
  isToday,
  exerciseCount,
  prominent = false,
}: {
  date: string;
  workout: Awaited<ReturnType<typeof getPlannedWorkoutsForRange>>[number];
  changes: Awaited<ReturnType<typeof getPlanChangesForRange>>;
  isToday: boolean;
  exerciseCount: number;
  prominent?: boolean;
}) {
  const kind = workout.workout_kind as WorkoutKind;
  const style = KIND_STYLE[kind] ?? KIND_STYLE.custom!;
  const status = statusPresentation(workout.status);
  const run = workout.run_prescription as RunPrescription | null;
  const location =
    workout.location_choice === "gym" ? "Planet Fitness" : workout.location_choice === "home" ? "Home" : null;
  const action =
    workout.status === "completed"
      ? "Review workout"
      : isToday
        ? "Open today’s workout"
        : "Preview workout";

  return (
    <Link
      href={`/plan/${date}`}
      className={`block overflow-hidden rounded-2xl border-l-4 bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md ${style.accent} ${
        prominent ? "ring-2 ring-brand-400" : ""
      }`}
    >
      <div className={prominent ? "p-5" : "p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${style.soft}`} aria-hidden="true">
              {style.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {formatDay(date)} {isToday ? <span className="text-brand-700">· Today</span> : null}
              </p>
              <h3 className={`${prominent ? "text-xl" : "text-base"} truncate font-bold text-slate-950`}>
                {WORKOUT_KIND_LABELS[kind] ?? style.label}
              </h3>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.classes}`}>
            <span aria-hidden="true">{status.symbol}</span>
            {status.label}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            ⏱ {workout.planned_duration_minutes} min
          </span>
          {run?.hrTarget && run.hrCeiling ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
              ♥ {run.hrTarget}–{run.hrCeiling} bpm
            </span>
          ) : null}
          {exerciseCount > 0 ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {exerciseCount} exercises
            </span>
          ) : null}
          {location ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {location === "Home" ? "⌂" : "⌖"} {location}
            </span>
          ) : null}
          {workout.run_context === "stroller" ? (
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
              Stroller run
            </span>
          ) : null}
        </div>

        <p className="mt-3 text-sm leading-5 text-slate-600">{workout.goal}</p>

        {changes.length > 0 ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">↻ Adapted plan</p>
            <p className="mt-1 text-xs leading-5 text-amber-950">{changes.at(-1)!.explanation}</p>
            <span className="mt-1 inline-block text-xs font-semibold text-amber-900 underline">Why this changed</span>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">
            {run?.isCalibration ? "Calibration phase · maintain or reduce" : "Built for this week’s plan"}
          </span>
          <span className="text-sm font-semibold text-brand-700">{action} →</span>
        </div>
      </div>
    </Link>
  );
}

export default async function PlanPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const today = todayLocalDate(profile.timezone);
  const weekStart = mondayOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  const [workouts, changes, weeklySetup] = await Promise.all([
    getPlannedWorkoutsForRange(supabase, user!.id, weekStart, weekEnd),
    getPlanChangesForRange(supabase, user!.id, weekStart, weekEnd),
    supabase
      .from("weekly_setups")
      .select("id")
      .eq("user_id", user!.id)
      .eq("week_start_date", weekStart)
      .maybeSingle(),
  ]);

  const workoutIds = workouts.map((workout) => workout.id);
  const { data: strengthItems } = workoutIds.length
    ? await supabase
        .from("planned_strength_items")
        .select("planned_workout_id")
        .in("planned_workout_id", workoutIds)
    : { data: [] };
  const exerciseCounts = new Map<string, number>();
  for (const item of strengthItems ?? []) {
    exerciseCounts.set(item.planned_workout_id, (exerciseCounts.get(item.planned_workout_id) ?? 0) + 1);
  }

  const changesByDate = new Map<string, typeof changes>();
  for (const change of changes) {
    const list = changesByDate.get(change.local_date) ?? [];
    list.push(change);
    changesByDate.set(change.local_date, list);
  }

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const todayWorkout = workouts.find((workout) => workout.local_date === today);
  const runCount = workouts.filter((workout) => RUN_KINDS.has(workout.workout_kind)).length;
  const strengthCount = workouts.filter((workout) => STRENGTH_KINDS.has(workout.workout_kind)).length;
  const combinedCount = workouts.filter((workout) => workout.workout_kind === "combined_short").length;
  const recoveryDays = Math.max(0, 7 - workouts.length);
  const totalMinutes = workouts.reduce((sum, workout) => sum + workout.planned_duration_minutes, 0);
  const completedCount = workouts.filter((workout) => ["completed", "partial"].includes(workout.status)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Weekly plan</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {formatDay(weekStart, false)}–{formatDay(weekEnd, false)}
          </h1>
        </div>
        <Link href="/plan/setup" className="btn-secondary shrink-0">
          {weeklySetup.data ? "Adjust week" : "Set up week"}
        </Link>
      </div>

      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-200">Your week at a glance</p>
            <h2 className="mt-1 text-xl font-bold">{workouts.length} training opportunities</h2>
            <p className="mt-2 text-sm text-brand-100">
              {runCount + combinedCount} run{runCount + combinedCount === 1 ? "" : "s"} ·{" "}
              {strengthCount + combinedCount} strength · {recoveryDays} recovery
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
            <strong className="block text-2xl">{totalMinutes}</strong>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-100">planned min</span>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{ width: `${workouts.length ? Math.round((completedCount / workouts.length) * 100) : 0}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-brand-100">
          {completedCount}/{workouts.length || 0} planned workouts completed
        </p>
      </section>

      <section aria-label="Seven-day plan overview">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date) => {
            const workout = workouts.find((item) => item.local_date === date);
            const style = workout ? KIND_STYLE[workout.workout_kind] ?? KIND_STYLE.custom! : null;
            const status = workout ? statusPresentation(workout.status) : null;
            const content = (
              <>
                <span className={`text-[10px] font-bold uppercase ${date === today ? "text-brand-700" : "text-slate-500"}`}>
                  {shortWeekday(date)}
                </span>
                <span className={`text-sm font-bold ${date === today ? "text-brand-800" : "text-slate-800"}`}>
                  {Number(date.slice(8, 10))}
                </span>
                <span className="mt-1 text-base" aria-hidden="true">{style?.icon ?? "○"}</span>
                <span className={`mt-1 h-1.5 w-1.5 rounded-full ${
                  status?.label === "Completed"
                    ? "bg-emerald-500"
                    : date === today
                      ? "bg-brand-600"
                      : workout
                        ? "bg-slate-300"
                        : "bg-slate-200"
                }`} />
              </>
            );
            const classes = `flex min-h-[82px] flex-col items-center rounded-xl border py-2 ${
              date === today ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300" : "border-slate-200 bg-white"
            }`;
            return workout ? (
              <Link key={date} href={`/plan/${date}`} className={classes} aria-label={`${formatDay(date)}: ${style?.label}`}>
                {content}
              </Link>
            ) : (
              <div key={date} className={classes} aria-label={`${formatDay(date)}: recovery day`}>
                {content}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
          <span><span className="text-emerald-600">●</span> Completed</span>
          <span><span className="text-brand-600">●</span> Today</span>
          <span><span className="text-slate-400">●</span> Planned</span>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Today</p>
            <h2 className="text-lg font-bold text-slate-950">{formatDay(today)}</h2>
          </div>
        </div>
        {todayWorkout ? (
          <WorkoutCard
            date={today}
            workout={todayWorkout}
            changes={changesByDate.get(today) ?? []}
            isToday
            exerciseCount={exerciseCounts.get(todayWorkout.id) ?? 0}
            prominent
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-2xl shadow-sm" aria-hidden="true">🌿</span>
              <div>
                <h3 className="text-lg font-bold text-slate-950">Recovery day</h3>
                <p className="text-sm text-slate-600">No workout is scheduled. Nothing needs to be made up.</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {days.some((date) => date < today) ? (
        <section>
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Earlier this week</p>
          </div>
          <div className="space-y-2">
            {days
              .filter((date) => date < today)
              .map((date) => {
                const workout = workouts.find((item) => item.local_date === date);
                if (!workout) {
                  return (
                    <div key={date} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-sm font-semibold text-slate-600">{formatDay(date)}</span>
                      <span className="text-xs text-slate-400">Recovery</span>
                    </div>
                  );
                }
                const style = KIND_STYLE[workout.workout_kind] ?? KIND_STYLE.custom!;
                const status = statusPresentation(workout.status);
                return (
                  <Link
                    key={date}
                    href={`/plan/${date}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-lg ${style.soft}`} aria-hidden="true">
                        {style.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{formatDay(date)}</p>
                        <p className="text-xs text-slate-500">
                          {style.label} · {workout.planned_duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${status.classes}`}>
                      {status.symbol} {status.label}
                    </span>
                  </Link>
                );
              })}
          </div>
        </section>
      ) : null}

      {days.some((date) => date > today) ? (
      <section>
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rest of the week</p>
          <h2 className="text-lg font-bold text-slate-950">What’s ahead</h2>
        </div>
        <div className="space-y-3">
          {days
            .filter((date) => date > today)
            .map((date) => {
              const workout = workouts.find((item) => item.local_date === date);
              if (!workout) {
                return (
                  <div key={date} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg" aria-hidden="true">🌿</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{formatDay(date)}</p>
                        <p className="text-xs text-slate-500">Recovery day</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">No workout debt</span>
                  </div>
                );
              }
              return (
                <WorkoutCard
                  key={date}
                  date={date}
                  workout={workout}
                  changes={changesByDate.get(date) ?? []}
                  isToday={false}
                  exerciseCount={exerciseCounts.get(workout.id) ?? 0}
                />
              );
            })}
        </div>
      </section>
      ) : null}
    </div>
  );
}
