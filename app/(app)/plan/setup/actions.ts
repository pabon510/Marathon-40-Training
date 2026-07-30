"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateWeekFromSetup, submitWeeklySetup } from "@/lib/services/planService";
import { isRecoveryRoutineSlug } from "@/domain/content/recoveryRoutines";
import { addDays } from "@/lib/date";

export interface WeeklySetupFormState {
  error?: string;
}

export async function submitWeeklySetupAction(
  _prev: WeeklySetupFormState,
  formData: FormData,
): Promise<WeeklySetupFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const weekStartDate = String(formData.get("weekStartDate") ?? "");
  const availableDates = formData.getAll("availableDates").map(String).sort();
  const intendedLongRunDate = String(formData.get("intendedLongRunDate") ?? "");
  const backupLongRunDate = String(formData.get("backupLongRunDate") ?? "");
  let activeRecoveryChoices: { localDate: string; routineSlug: string }[] = [];
  try {
    activeRecoveryChoices = JSON.parse(String(formData.get("activeRecoveryChoices") ?? "[]"));
  } catch {
    return { error: "The active-recovery choices could not be read." };
  }

  if (availableDates.length < 3 || availableDates.length > 5) {
    return { error: "Choose between 3 and 5 available days for this week." };
  }
  if (!availableDates.includes(intendedLongRunDate)) {
    return { error: "The long-run day must be one of the selected available days." };
  }
  const weekEndDate = addDays(weekStartDate, 6);
  if (
    !Array.isArray(activeRecoveryChoices)
    || activeRecoveryChoices.length > 2
    || activeRecoveryChoices.some(
      (choice) =>
        !choice
        || typeof choice.localDate !== "string"
        || typeof choice.routineSlug !== "string"
        || choice.localDate < weekStartDate
        || choice.localDate > weekEndDate
        || availableDates.includes(choice.localDate)
        || !isRecoveryRoutineSlug(choice.routineSlug),
    )
    || new Set(activeRecoveryChoices.map((choice) => choice.localDate)).size !== activeRecoveryChoices.length
  ) {
    return { error: "Choose up to two valid active-recovery sessions on non-training days." };
  }

  try {
    const weeklySetupId = await submitWeeklySetup(supabase, user.id, {
      weekStartDate,
      availableDates,
      intendedLongRunDate,
      backupLongRunDate: backupLongRunDate || intendedLongRunDate,
      activeRecoveryChoices,
    });
    await generateWeekFromSetup(supabase, user.id, weeklySetupId, "initial");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to generate the plan for this week." };
  }

  revalidatePath("/plan");
  revalidatePath("/today");
  redirect("/plan");
}
