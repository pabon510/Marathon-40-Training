"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { todayLocalDate } from "@/lib/date";
import { isWorkoutMoveReason } from "@/domain/planning/workoutMove";

export interface MoveWorkoutFormState { error?: string }

export async function moveWorkoutAction(
  _previous: MoveWorkoutFormState,
  formData: FormData,
): Promise<MoveWorkoutFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const profile = await getProfile(supabase, user.id);
  if (!profile) return { error: "Your training profile could not be loaded." };

  const sourceWorkoutId = String(formData.get("sourceWorkoutId") ?? "");
  const reasonCode = String(formData.get("reasonCode") ?? "");
  const reasonDetail = String(formData.get("reasonDetail") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(sourceWorkoutId)) return { error: "Choose the workout you want to do today." };
  if (!isWorkoutMoveReason(reasonCode)) return { error: "Choose why the schedule changed." };
  if (!reasonDetail) return { error: "Add a short reason for the change." };

  const targetDate = todayLocalDate(profile.timezone);
  const { error } = await supabase.rpc("move_planned_workout", {
    source_workout_id: sourceWorkoutId,
    target_local_date: targetDate,
    move_reason_code: reasonCode,
    move_reason_text: reasonDetail,
  });
  if (error) return { error: error.message };

  revalidatePath("/today");
  revalidatePath("/workouts");
  revalidatePath("/plan");
  revalidatePath("/progress");
  redirect("/workouts");
}
