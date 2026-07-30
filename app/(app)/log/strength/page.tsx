import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { todayLocalDate } from "@/lib/date";
import { SeedProfileButton } from "@/components/seed-profile-button";
import type { GuidedExerciseItem } from "@/lib/services/strengthGuidanceService";
import { StrengthLogForm } from "./strength-form";
import { resolveWorkoutStrengthSection } from "@/lib/services/workoutDetailService";
import { getStrengthWarmup } from "@/domain/content/strengthWarmups";
import { StrengthWarmupCard } from "@/components/strength-warmup";
import type { WorkoutKind } from "@/domain/types";

export default async function LogStrengthPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const localDate = todayLocalDate(profile.timezone);
  const workout = await getPlannedWorkoutForDate(supabase, user!.id, localDate);

  let items: GuidedExerciseItem[] = [];
  const location = workout?.location_choice === "gym" ? "gym" : "home";
  if (workout?.strength_template_id) {
    const strength = await resolveWorkoutStrengthSection(supabase, user!.id, profile, workout, location);
    items = strength?.items ?? [];
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Log strength</h1>
      {workout && getStrengthWarmup(workout.workout_kind as WorkoutKind, location) ? (
        <StrengthWarmupCard warmup={getStrengthWarmup(workout.workout_kind as WorkoutKind, location)!} />
      ) : null}
      <StrengthLogForm items={items} defaultLocation={location} plannedWorkoutId={workout?.id ?? null} />
      <Link href="/log/skip" className="block text-center text-sm text-slate-500 underline">
        Skip today&apos;s workout instead
      </Link>
    </div>
  );
}
