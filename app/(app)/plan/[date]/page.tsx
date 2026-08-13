import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { resolveWorkoutStrengthSection } from "@/lib/services/workoutDetailService";
import { todayLocalDate } from "@/lib/date";
import { WORKOUT_KIND_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { RunPrescription, WorkoutKind } from "@/domain/types";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { WorkoutDetailView } from "@/components/workout-detail";
import { isValidLocalDate, previewNote, relationToToday } from "@/lib/planPreview";
import { fuelingPlanForWorkout } from "@/lib/services/fuelingService";

export default async function PlanDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isValidLocalDate(date)) notFound();

  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const today = todayLocalDate(profile.timezone);
  const relation = relationToToday(date, today);

  const workout = await getPlannedWorkoutForDate(supabase, user!.id, date);
  if (!workout) notFound();

  const kind = workout.workout_kind as WorkoutKind;
  const label = WORKOUT_KIND_LABELS[kind] ?? kind;
  const runPrescription = workout.run_prescription as unknown as RunPrescription | null;
  const location = workout.location_choice === "gym" ? "gym" : "home";

  const strength = await resolveWorkoutStrengthSection(supabase, user!.id, profile, workout, location);
  const fuelingPlan = fuelingPlanForWorkout(profile, kind, workout.planned_duration_minutes);

  const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const note = previewNote(relation);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/plan" className="text-sm text-slate-500 underline">
          ← Back to this week
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">
            {label}
            {relation === "today" ? <span className="ml-2 text-sm font-medium text-brand-600">Today</span> : null}
          </h1>
          <span className="text-sm text-slate-500">{workout.planned_duration_minutes} min</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {dateLabel} · {STATUS_LABELS[workout.status] ?? workout.status}
        </p>
      </div>

      {note ? <p className="card bg-amber-50 text-sm text-amber-900">{note}</p> : null}

      <WorkoutDetailView
        kind={kind}
        goal={workout.goal}
        durationMinutes={workout.planned_duration_minutes}
        runPrescription={runPrescription}
        strength={strength}
        plannedWorkoutId={workout.id}
        locationChoice={workout.location_choice ?? "unspecified"}
        showLocationToggle={relation !== "past"}
        runContext={workout.run_context}
        recoveryRoutineSlug={workout.recovery_routine_slug}
        fuelingPlan={fuelingPlan}
      />

      {relation === "today" ? (
        <Link href="/workouts" className="btn-primary flex justify-center">
          Go to today&apos;s workout
        </Link>
      ) : null}
      {relation === "past" && !["completed", "partial", "blocked"].includes(workout.status) ? (
        <Link href={`/workouts/move?source=${workout.id}`} className="btn-secondary flex justify-center">
          Do this workout today instead
        </Link>
      ) : null}
    </div>
  );
}
