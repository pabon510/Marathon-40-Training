import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { resolveStrengthWorkout } from "@/lib/services/workoutContentService";
import { todayLocalDate } from "@/lib/date";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { attachLoadGuidance, type GuidedExerciseItem } from "@/lib/services/strengthGuidanceService";
import { StrengthLogForm } from "./strength-form";

export default async function LogStrengthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const localDate = todayLocalDate(profile.timezone);
  const workout = await getPlannedWorkoutForDate(supabase, user!.id, localDate);

  let items: GuidedExerciseItem[] = [];
  const location = workout?.location_choice === "gym" ? "gym" : "home";
  if (workout?.strength_template_id) {
    const wantShort = workout.planned_duration_minutes < 40;
    const resolved = await resolveStrengthWorkout(supabase, workout.strength_template_id, location, wantShort);
    items = await attachLoadGuidance(supabase, user!.id, profile, resolved.items, location);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Log strength</h1>
      <StrengthLogForm items={items} defaultLocation={location} />
      <Link href="/log/skip" className="block text-center text-sm text-slate-500 underline">
        Skip today&apos;s workout instead
      </Link>
    </div>
  );
}
