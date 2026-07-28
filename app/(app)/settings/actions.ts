"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSettings } from "@/lib/services/profileService";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

export async function saveSettings(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const targetMarathonDate = String(formData.get("targetMarathonDate") ?? "").trim();
  const preferredLongRunDay = String(formData.get("preferredLongRunDay") ?? "saturday") as "saturday" | "sunday";
  const easyHrFloor = Number(formData.get("easyHrFloor"));
  const easyHrCeiling = Number(formData.get("easyHrCeiling"));
  const weekdays = formData.getAll("availableWeekdays").map(String);
  const homeDumbbells = String(formData.get("homeDumbbells") ?? "");
  const homeBands = formData.get("homeBands") === "on";
  const homeBench = formData.get("homeBench") === "on";
  const homeKettlebell = String(formData.get("homeKettlebell") ?? "");

  if (easyHrCeiling < easyHrFloor) {
    return { error: "Easy-run HR ceiling must be at or above the floor." };
  }
  if (weekdays.length < 3) {
    return { error: "Select at least 3 available weekdays." };
  }

  await updateProfileSettings(supabase, user.id, {
    target_marathon_date: targetMarathonDate || null,
    preferred_long_run_day: preferredLongRunDay,
    easy_hr_floor: easyHrFloor,
    easy_hr_ceiling: easyHrCeiling,
    default_available_weekdays: weekdays,
    equipment: {
      home: {
        dumbbellsLb: homeDumbbells
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n)),
        bands: homeBands,
        bench: homeBench,
        adjustableKettlebellLb: homeKettlebell
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n)),
      },
      gym: "planet_fitness",
    },
  });

  revalidatePath("/settings");
  return { success: true };
}
