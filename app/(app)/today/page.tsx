import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { todayLocalDate } from "@/lib/date";
import { WORKOUT_KIND_LABELS } from "@/lib/labels";
import { CheckInForm } from "./checkin-form";

const STRENGTH_KINDS = new Set(["strength_a", "strength_b", "strength_full", "combined_short", "upper_core_safety"]);

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile(supabase, user!.id);

  if (!profile) {
    return <div className="card">No profile found. Run the seed script first (see README).</div>;
  }

  const localDate = todayLocalDate(profile.timezone);
  const workout = await getPlannedWorkoutForDate(supabase, user!.id, localDate);

  const { data: latestCheckIn } = await supabase
    .from("morning_check_ins")
    .select("*")
    .eq("user_id", user!.id)
    .eq("local_date", localDate)
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!workout) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Today</h1>
        <div className="card">
          <p className="text-sm text-slate-600">No workout is scheduled for today yet.</p>
          <Link href="/plan/setup" className="btn-primary mt-3 inline-flex">
            Set up this week
          </Link>
        </div>
      </div>
    );
  }

  const label = WORKOUT_KIND_LABELS[workout.workout_kind] ?? workout.workout_kind;

  if (!latestCheckIn) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Today</h1>
        <div className="card">
          <span className="badge-warn">Provisional</span>
          <p className="mt-2 text-lg font-semibold text-slate-900">{label}</p>
          <p className="text-sm text-slate-600">{workout.goal}</p>
          <p className="mt-1 text-sm text-slate-500">{workout.planned_duration_minutes} minutes (planned)</p>
          <p className="mt-3 text-xs text-slate-500">
            Complete the morning check-in to confirm or adapt today&apos;s workout. You can&apos;t start a workout before
            checking in.
          </p>
        </div>
        <CheckInForm needsLocation={STRENGTH_KINDS.has(workout.workout_kind)} />
      </div>
    );
  }

  const blocked = workout.status === "blocked";
  const label2 = WORKOUT_KIND_LABELS[workout.workout_kind] ?? workout.workout_kind;
  const shorterMinutes = Math.max(15, Math.round(workout.planned_duration_minutes * 0.6));

  const { data: latestChange } = await supabase
    .from("plan_changes")
    .select("*")
    .eq("user_id", user!.id)
    .eq("local_date", localDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Today</h1>

      <div className="card">
        {blocked ? (
          <span className="badge-block">Running/lower-body blocked today</span>
        ) : (
          <span className="badge-ok">Confirmed</span>
        )}
        <p className="mt-2 text-lg font-semibold text-slate-900">{label2}</p>
        <p className="text-sm text-slate-600">{workout.goal}</p>
        <p className="mt-1 text-sm text-slate-500">{workout.planned_duration_minutes} minutes</p>

        {latestChange ? (
          <div className="mt-3 rounded-lg bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">Why this changed</p>
            <p className="text-sm text-amber-900">{latestChange.explanation}</p>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Shorter alternative</p>
          <p className="text-sm text-slate-700">
            Same goal in about {shorterMinutes} minutes — full credit if you need to compress today.
          </p>
        </div>

        <Link href="/workouts" className="btn-primary mt-4 inline-flex">
          {blocked ? "See today&apos;s safe alternative" : "Start workout"}
        </Link>
      </div>

      <details className="card">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Refresh check-in</summary>
        <div className="mt-3">
          <CheckInForm needsLocation={STRENGTH_KINDS.has(workout.workout_kind)} />
        </div>
      </details>
    </div>
  );
}
