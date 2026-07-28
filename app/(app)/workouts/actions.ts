"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setLocationChoice(plannedWorkoutId: string, location: "gym" | "home") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("planned_workouts")
    .update({ location_choice: location })
    .eq("id", plannedWorkoutId)
    .eq("user_id", user.id);

  revalidatePath("/workouts");
}
