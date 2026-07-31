import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate, getPlannedWorkoutsForRange } from "@/lib/services/planService";
import { addDays, mondayOfWeek, todayLocalDate } from "@/lib/date";
import { WORKOUT_KIND_LABELS } from "@/lib/labels";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { CheckInForm } from "./checkin-form";
import { ShorterAlternativeButton } from "./shorter-alternative-button";
import type { RunPrescription, WorkoutKind } from "@/domain/types";
import { getRecoveryRoutine } from "@/domain/content/recoveryRoutines";
import { canUseShorterAlternative, shorterAlternativeMinutes } from "@/domain/planning/shorterAlternative";

const STRENGTH_KINDS = new Set(["strength_a", "strength_b", "strength_full", "combined_short", "upper_core_safety"]);

const KIND_STYLE: Record<string, { icon: string; eyebrow: string; gradient: string; pill: string }> = {
  easy_run: { icon: "🏃", eyebrow: "Easy aerobic work", gradient: "from-blue-950 via-blue-800 to-brand-600", pill: "bg-blue-50 text-blue-800" },
  long_run: { icon: "🏃", eyebrow: "Endurance builder", gradient: "from-indigo-950 via-indigo-800 to-violet-600", pill: "bg-indigo-50 text-indigo-800" },
  threshold_run: { icon: "⚡", eyebrow: "Quality run", gradient: "from-violet-950 via-violet-800 to-fuchsia-600", pill: "bg-violet-50 text-violet-800" },
  strength_a: { icon: "🏋️", eyebrow: "Strength + durability", gradient: "from-slate-950 via-amber-950 to-amber-700", pill: "bg-amber-50 text-amber-900" },
  strength_b: { icon: "🏋️", eyebrow: "Full-body strength", gradient: "from-slate-950 via-orange-950 to-orange-700", pill: "bg-orange-50 text-orange-900" },
  strength_full: { icon: "🏋️", eyebrow: "Full-body strength", gradient: "from-slate-950 via-orange-950 to-orange-700", pill: "bg-orange-50 text-orange-900" },
  combined_short: { icon: "🔁", eyebrow: "Run + strength", gradient: "from-slate-950 via-cyan-950 to-cyan-700", pill: "bg-cyan-50 text-cyan-900" },
  upper_core_safety: { icon: "🛡️", eyebrow: "Safe alternative", gradient: "from-slate-950 via-emerald-950 to-emerald-700", pill: "bg-emerald-50 text-emerald-900" },
  active_recovery: { icon: "🧘", eyebrow: "Restore + reset", gradient: "from-teal-950 via-teal-800 to-emerald-600", pill: "bg-teal-50 text-teal-900" },
  custom: { icon: "✨", eyebrow: "Today’s workout", gradient: "from-slate-950 via-slate-800 to-slate-600", pill: "bg-slate-100 text-slate-800" },
};

function rememberedLocation(choice: string | null): "gym" | "home" | null {
  return choice === "gym" || choice === "home" ? choice : null;
}

function formatToday(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCheckInTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function WeekMomentum({
  completed,
  total,
  nextLabel,
}: {
  completed: number;
  total: number;
  nextLabel: string | null;
}) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section className="card">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">This week</p>
          <p className="mt-1 text-lg font-bold text-slate-950">
            {completed} of {total} planned sessions complete
          </p>
        </div>
        <span className="text-sm font-bold text-brand-700">{percent}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400" style={{ width: `${percent}%` }} />
      </div>
      {nextLabel ? <p className="mt-2 text-xs text-slate-500">Next up: {nextLabel}</p> : null}
    </section>
  );
}

export default async function TodayPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const localDate = todayLocalDate(profile.timezone);
  const weekStart = mondayOfWeek(localDate);
  const weekEnd = addDays(weekStart, 6);

  const [workout, weekWorkouts, { data: latestCheckIn }, { data: weeklySetup }] = await Promise.all([
    getPlannedWorkoutForDate(supabase, user!.id, localDate),
    getPlannedWorkoutsForRange(supabase, user!.id, weekStart, weekEnd),
    supabase
      .from("morning_check_ins")
      .select("*")
      .eq("user_id", user!.id)
      .eq("local_date", localDate)
      .order("check_in_time", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("weekly_setups")
      .select("id")
      .eq("user_id", user!.id)
      .eq("week_start_date", weekStart)
      .maybeSingle(),
  ]);

  const completedCount = weekWorkouts.filter((item) => ["completed", "partial"].includes(item.status)).length;
  const nextWorkout = weekWorkouts.find(
    (item) => item.local_date > localDate && !["skipped", "incomplete"].includes(item.status),
  );
  const nextLabel = nextWorkout
    ? `${WORKOUT_KIND_LABELS[nextWorkout.workout_kind] ?? nextWorkout.workout_kind} on ${new Date(`${nextWorkout.local_date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}`
    : null;

  if (!workout) {
    return (
      <div className="space-y-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{formatToday(localDate)}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Today</h1>
        </header>
        {weeklySetup ? (
          <>
            <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-white shadow-lg">
              <span className="text-4xl" aria-hidden="true">🌙</span>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Rest day</p>
              <h2 className="mt-1 text-2xl font-bold">Nothing to make up today</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Rest is part of the plan. Your next session is already waiting for you.
              </p>
              {nextLabel ? <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm font-semibold">{nextLabel}</p> : null}
            </section>
            <WeekMomentum completed={completedCount} total={weekWorkouts.length} nextLabel={nextLabel} />
          </>
        ) : (
          <section className="card p-5">
            <span className="text-3xl" aria-hidden="true">📅</span>
            <h2 className="mt-3 text-xl font-bold text-slate-950">Your week isn’t set up yet</h2>
            <p className="mt-1 text-sm text-slate-600">Choose your available days and the app will build the week around them.</p>
            <Link href="/plan/setup" className="btn-primary mt-4 flex w-full">Set up this week</Link>
          </section>
        )}
      </div>
    );
  }

  const kind = workout.workout_kind as WorkoutKind;
  const style = KIND_STYLE[kind] ?? KIND_STYLE.custom!;
  const label = WORKOUT_KIND_LABELS[kind] ?? kind;
  const run = workout.run_prescription as unknown as RunPrescription | null;
  const recovery = kind === "active_recovery" ? getRecoveryRoutine(workout.recovery_routine_slug) : null;
  const completed = ["completed", "partial"].includes(workout.status);
  const blocked = workout.status === "blocked";
  const shorterMinutes = shorterAlternativeMinutes(workout.planned_duration_minutes);
  const canShorten = canUseShorterAlternative({
    kind,
    status: workout.status,
    plannedMinutes: workout.planned_duration_minutes,
  });

  const [{ data: latestChange }, { data: latestSession }] = await Promise.all([
    supabase
      .from("plan_changes")
      .select("*")
      .eq("user_id", user!.id)
      .eq("local_date", localDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("id, session_type, completion_state, overall_effort, completed_at")
      .eq("user_id", user!.id)
      .eq("planned_workout_id", workout.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!latestCheckIn) {
    return (
      <div className="space-y-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{formatToday(localDate)}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Today</h1>
        </header>
        <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ${style.gradient} p-5 text-white shadow-lg`}>
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Provisional</span>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-2xl" aria-hidden="true">{style.icon}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">{style.eyebrow}</p>
              <h2 className="text-2xl font-bold">{label}</h2>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/80">{workout.goal}</p>
          <p className="mt-3 text-sm font-semibold">{workout.planned_duration_minutes} planned minutes</p>
          <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm">
            Complete your check-in to confirm or adapt this workout before starting.
          </p>
        </section>
        <CheckInForm
          needsLocation={STRENGTH_KINDS.has(workout.workout_kind)}
          rememberedLocation={rememberedLocation(workout.location_choice)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{formatToday(localDate)}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Today</h1>
      </header>

      <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ${completed ? "from-emerald-950 via-emerald-800 to-teal-600" : style.gradient} p-5 text-white shadow-lg`}>
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${blocked ? "bg-red-200 text-red-950" : "bg-white/15 text-white"}`}>
            {completed ? "✓ Completed" : blocked ? "Safety adjusted" : latestChange ? "Adjusted" : "Confirmed"}
          </span>
          <span className="text-3xl" aria-hidden="true">{completed ? "🎉" : style.icon}</span>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-white/70">{style.eyebrow}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">{label}</h2>
        <p className="mt-2 text-sm leading-6 text-white/80">{workout.goal}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">⏱ {workout.planned_duration_minutes} min</span>
          {run?.hrTarget && run.hrCeiling ? (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">♥ {run.hrTarget}–{run.hrCeiling} bpm</span>
          ) : null}
          {run ? <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">Walk breaks allowed</span> : null}
          {STRENGTH_KINDS.has(kind) ? (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
              {workout.location_choice === "gym" ? "⌖ Planet Fitness" : "⌂ Home"} · warmup included
            </span>
          ) : null}
          {recovery ? <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">1–3/10 effort · Home</span> : null}
          {workout.run_context === "stroller" ? <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">Jogging stroller</span> : null}
        </div>

        {completed ? (
          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <p className="font-bold">You showed up today.</p>
            <p className="mt-1 text-sm text-white/80">
              {latestSession?.overall_effort ? `Logged at effort ${latestSession.overall_effort}/10. ` : ""}
              This session counts toward your adapted weekly plan.
            </p>
            <Link
              href={latestSession?.session_type === "run" ? `/history/${latestSession.id}/analysis` : "/history"}
              className="mt-3 inline-flex text-sm font-semibold text-white underline"
            >
              {latestSession?.session_type === "run" ? "View run review" : "Review logged workout"}
            </Link>
          </div>
        ) : (
          <Link href="/workouts" className="mt-5 flex min-h-touch w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-sm">
            {blocked ? "Open safe alternative" : "Start workout"}
          </Link>
        )}
      </section>

      {!completed ? (
        <section className={`rounded-2xl p-4 ring-1 ${latestChange ? "bg-amber-50 ring-amber-200" : "bg-emerald-50 ring-emerald-200"}`}>
          <p className={`text-xs font-bold uppercase tracking-[0.14em] ${latestChange ? "text-amber-800" : "text-emerald-800"}`}>
            {latestChange ? "Why today changed" : "No adjustment needed"}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {latestChange
              ? latestChange.explanation
              : "Recovery and knee scores were within your allowed range, so the planned workout was confirmed."}
          </p>
        </section>
      ) : null}

      {canShorten ? (
        <section className="card">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg" aria-hidden="true">⏱</span>
            <div>
              <p className="font-bold text-slate-950">Short on time?</p>
              <p className="mt-1 text-sm text-slate-600">
                Switch to the {shorterMinutes}-minute version. It preserves today’s goal and earns full credit.
              </p>
            </div>
          </div>
          <ShorterAlternativeButton shorterMinutes={shorterMinutes} />
        </section>
      ) : null}

      <WeekMomentum completed={completedCount} total={weekWorkouts.length} nextLabel={nextLabel} />

      {!completed ? (
        <details className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
            <span>Check-in completed at {formatCheckInTime(latestCheckIn.check_in_time, profile.timezone)}</span>
            <span className="text-brand-700">Refresh</span>
          </summary>
          <div className="border-t border-slate-100 p-4">
            <CheckInForm
              needsLocation={STRENGTH_KINDS.has(workout.workout_kind)}
              rememberedLocation={rememberedLocation(workout.location_choice)}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
