"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RunContext } from "@/domain/running/runContext";

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
  // "layout" so every /plan/[date] preview picks up the new choice too.
  revalidatePath("/plan", "layout");
}

export async function setRunContext(plannedWorkoutId: string, context: RunContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: workout } = await supabase
    .from("planned_workouts")
    .select("workout_kind")
    .eq("id", plannedWorkoutId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!workout || !["easy_run", "long_run"].includes(workout.workout_kind)) return;

  await supabase
    .from("planned_workouts")
    .update({ run_context: context })
    .eq("id", plannedWorkoutId)
    .eq("user_id", user.id);
  revalidatePath("/workouts");
  revalidatePath("/plan", "layout");
  revalidatePath("/log/run");
}
