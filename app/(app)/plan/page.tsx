import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlanChangesForRange, getPlannedWorkoutsForRange } from "@/lib/services/planService";
import { todayLocalDate, mondayOfWeek, addDays } from "@/lib/date";
import { WORKOUT_KIND_LABELS, STATUS_LABELS } from "@/lib/labels";
import { SeedProfileButton } from "@/components/seed-profile-button";

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile(supabase, user!.id);

  if (!profile) {
    return <SeedProfileButton />;
  }

  const today = todayLocalDate(profile.timezone);
  const weekStart = mondayOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  const [workouts, changes] = await Promise.all([
    getPlannedWorkoutsForRange(supabase, user!.id, weekStart, weekEnd),
    getPlanChangesForRange(supabase, user!.id, weekStart, weekEnd),
  ]);

  const changesByDate = new Map<string, typeof changes>();
  for (const change of changes) {
    const list = changesByDate.get(change.local_date) ?? [];
    list.push(change);
    changesByDate.set(change.local_date, list);
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">This week</h1>
        <Link href="/plan/setup" className="btn-secondary">
          Set up a week
        </Link>
      </div>

      <div className="space-y-3">
        {days.map((date) => {
          const workout = workouts.find((w) => w.local_date === date);
          const dayChanges = changesByDate.get(date) ?? [];
          const isToday = date === today;
          return (
            <div key={date} className={`card ${isToday ? "ring-2 ring-brand-500" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                  {isToday ? <span className="ml-2 text-xs font-medium text-brand-600">Today</span> : null}
                </p>
                {workout ? (
                  <span className="badge-ok">{STATUS_LABELS[workout.status] ?? workout.status}</span>
                ) : null}
              </div>
              {workout ? (
                <>
                  <p className="mt-1 text-sm text-slate-700">
                    {WORKOUT_KIND_LABELS[workout.workout_kind] ?? workout.workout_kind} —{" "}
                    {workout.planned_duration_minutes} min
                  </p>
                  <p className="text-xs text-slate-500">{workout.goal}</p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-400">No workout scheduled.</p>
              )}
              {dayChanges.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                  {dayChanges.map((c) => (
                    <li key={c.id} className="text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Changed:</span> {c.explanation}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
