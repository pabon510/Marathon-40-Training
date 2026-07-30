import Link from "next/link";
import { RunLogForm } from "./run-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { todayLocalDate } from "@/lib/date";
import { allowsStrollerContext } from "@/domain/running/runContext";

export default async function LogRunPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  const workout = profile
    ? await getPlannedWorkoutForDate(supabase, user!.id, todayLocalDate(profile.timezone))
    : null;
  const strollerAllowed = !workout || allowsStrollerContext(workout.workout_kind);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Log a run</h1>
      <RunLogForm
        defaultStroller={workout?.run_context === "stroller"}
        strollerAllowed={strollerAllowed}
      />
      <Link href="/log/skip" className="block text-center text-sm text-slate-500 underline">
        Skip today&apos;s workout instead
      </Link>
    </div>
  );
}
