"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { skipPlannedWorkout } from "@/lib/services/loggingService";
import { todayLocalDate } from "@/lib/date";

export interface SkipFormState {
  error?: string;
}

export async function skipTodayAction(_prev: SkipFormState, formData: FormData): Promise<SkipFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const profile = await getProfile(supabase, user.id);
  if (!profile) return { error: "No profile found." };

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "A reason is required to skip." };

  const localDate = todayLocalDate(profile.timezone);
  const workout = await getPlannedWorkoutForDate(supabase, user.id, localDate);
  if (!workout) return { error: "No workout scheduled today." };

  await skipPlannedWorkout(supabase, user.id, workout.id, reason);

  revalidatePath("/today");
  revalidatePath("/plan");
  redirect("/today");
}
