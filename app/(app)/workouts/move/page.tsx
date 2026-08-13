import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate, getPlannedWorkoutsForRange } from "@/lib/services/planService";
import { addDays, mondayOfWeek, todayLocalDate } from "@/lib/date";
import { WORKOUT_KIND_LABELS } from "@/lib/labels";
import { canMoveWorkout, workoutMoveSpacingNote } from "@/domain/planning/workoutMove";
import type { WorkoutKind } from "@/domain/types";
import { MoveWorkoutForm } from "./move-workout-form";

function dateLabel(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function MoveWorkoutPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return null;

  const today = todayLocalDate(profile.timezone);
  const weekStart = mondayOfWeek(today);
  const weekWorkouts = await getPlannedWorkoutsForRange(supabase, user!.id, weekStart, addDays(weekStart, 6));
  const todayWorkout = await getPlannedWorkoutForDate(supabase, user!.id, today);
  if (!todayWorkout) {
    return <div className="card"><p className="text-sm text-slate-600">There is no planned workout to replace today.</p><Link href="/plan" className="mt-3 inline-flex text-brand-700 underline">Back to plan</Link></div>;
  }

  const ids = weekWorkouts.map((workout) => workout.id);
  const { data: sessions } = ids.length
    ? await supabase.from("workout_sessions").select("planned_workout_id").in("planned_workout_id", ids)
    : { data: [] };
  const loggedIds = new Set((sessions ?? []).map((session) => session.planned_workout_id).filter(Boolean));
  const { data: checkIn } = await supabase.from("morning_check_ins").select("knee").eq("user_id", user!.id).eq("local_date", today).order("check_in_time", { ascending: false }).limit(1).maybeSingle();

  const candidates = weekWorkouts.filter((workout) => workout.id !== todayWorkout.id).map((workout) => {
    const eligibility = canMoveWorkout({
      sourceDate: workout.local_date,
      targetDate: today,
      sourceStatus: workout.status,
      sourceKind: workout.workout_kind as WorkoutKind,
      hasSession: loggedIds.has(workout.id),
      kneeScore: checkIn?.knee ?? null,
    });
    return {
      id: workout.id,
      label: WORKOUT_KIND_LABELS[workout.workout_kind as WorkoutKind] ?? workout.workout_kind,
      dateLabel: dateLabel(workout.local_date),
      detail: `${workout.planned_duration_minutes} min · ${workout.local_date < today ? "missed/recent" : "upcoming"}`,
      disabledReason: eligibility.reason,
      spacingNote: workoutMoveSpacingNote({
        movedKind: workout.workout_kind as WorkoutKind,
        targetDate: today,
        nextWorkout: weekWorkouts
          .filter((candidate) => candidate.local_date > today && candidate.id !== workout.id)
          .map((candidate) => ({ localDate: candidate.local_date, workoutKind: candidate.workout_kind as WorkoutKind }))[0] ?? null,
      }),
    };
  });
  const preferredSourceId = (await searchParams).source ?? null;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/today" className="text-sm text-slate-500 underline">← Back to today</Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Schedule changed</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">Do another planned workout today</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Choose another unlogged workout from this week. Nothing will be added to next week.</p>
      </div>
      {candidates.length ? (
        <MoveWorkoutForm
          candidates={candidates}
          preferredSourceId={preferredSourceId}
          replacedLabel={WORKOUT_KIND_LABELS[todayWorkout.workout_kind as WorkoutKind] ?? todayWorkout.workout_kind}
        />
      ) : <p className="card text-sm text-slate-600">There are no other planned workouts available to move today.</p>}
    </div>
  );
}
