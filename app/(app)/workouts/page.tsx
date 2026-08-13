import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { resolveWorkoutStrengthSection } from "@/lib/services/workoutDetailService";
import { todayLocalDate } from "@/lib/date";
import { WORKOUT_KIND_LABELS } from "@/lib/labels";
import type { RunPrescription, WorkoutKind } from "@/domain/types";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { WorkoutDetailView } from "@/components/workout-detail";
import { fuelingPlanForWorkout } from "@/lib/services/fuelingService";

const STRENGTH_KINDS: WorkoutKind[] = ["strength_a", "strength_b", "strength_full", "upper_core_safety"];

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const localDate = todayLocalDate(profile.timezone);
  const workout = await getPlannedWorkoutForDate(supabase, user!.id, localDate);

  if (!workout) {
    return (
      <div className="card">
        <p className="text-sm text-slate-600">No workout scheduled today.</p>
        <Link href="/plan/setup" className="btn-primary mt-3 inline-flex">
          Set up this week
        </Link>
      </div>
    );
  }

  const kind = workout.workout_kind as WorkoutKind;
  const label = WORKOUT_KIND_LABELS[kind] ?? kind;
  const runPrescription = workout.run_prescription as unknown as RunPrescription | null;
  const location = workout.location_choice === "gym" ? "gym" : "home";

  const strength = await resolveWorkoutStrengthSection(supabase, user!.id, profile, workout, location);
  const fuelingPlan = fuelingPlanForWorkout(profile, kind, workout.planned_duration_minutes);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">{label}</h1>
        <span className="text-sm text-slate-500">{workout.planned_duration_minutes} min</span>
      </div>

      <WorkoutDetailView
        kind={kind}
        goal={workout.goal}
        durationMinutes={workout.planned_duration_minutes}
        runPrescription={runPrescription}
        strength={strength}
        plannedWorkoutId={workout.id}
        locationChoice={workout.location_choice ?? "unspecified"}
        showLocationToggle
        runContext={workout.run_context}
        recoveryRoutineSlug={workout.recovery_routine_slug}
        fuelingPlan={fuelingPlan}
      />

      <Link
        href={kind === "active_recovery" ? "/log/recovery" : STRENGTH_KINDS.includes(kind) || kind === "combined_short" ? "/log/strength" : "/log/run"}
        className="btn-primary flex justify-center"
      >
        {kind === "active_recovery"
          ? "Complete active recovery"
          : STRENGTH_KINDS.includes(kind) || kind === "combined_short"
          ? "Start logging, exercise by exercise"
          : "Log this workout"}
      </Link>
      <Link href="/workouts/move" className="btn-secondary flex justify-center">
        Do a different planned workout
      </Link>
    </div>
  );
}
