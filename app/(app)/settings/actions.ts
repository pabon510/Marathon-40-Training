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
  const preferredWeightUnit = String(formData.get("preferredWeightUnit") ?? "lb") as "lb" | "kg";
  const rawBodyWeight = String(formData.get("bodyWeight") ?? "").trim();
  const bodyWeight = rawBodyWeight ? Number(rawBodyWeight) : null;
  const bodyWeightKg = bodyWeight === null ? null : preferredWeightUnit === "lb" ? bodyWeight / 2.2046226218 : bodyWeight;
  const rawCaffeine = String(formData.get("typicalDailyCaffeineMg") ?? "").trim();
  const typicalDailyCaffeineMg = rawCaffeine ? Number(rawCaffeine) : null;
  const caffeineSensitivity = String(formData.get("caffeineSensitivity") ?? "normal") as
    | "low" | "normal" | "high" | "avoid";
  const rawCutoffHour = String(formData.get("caffeineCutoffHour") ?? "").trim();
  const caffeineCutoffHour = rawCutoffHour ? Number(rawCutoffHour) : null;
  const dietaryRestrictions = String(formData.get("dietaryRestrictions") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const lactoseValue = String(formData.get("lactoseTolerant") ?? "unknown");
  const lactoseTolerant = lactoseValue === "yes" ? true : lactoseValue === "no" ? false : null;
  const fuelingTimingPreference = String(formData.get("fuelingTimingPreference") ?? "standard") as
    | "early_morning" | "standard";

  if (easyHrCeiling < easyHrFloor) {
    return { error: "Easy-run HR ceiling must be at or above the floor." };
  }
  if (weekdays.length < 3) {
    return { error: "Select at least 3 available weekdays." };
  }
  if (bodyWeightKg !== null && (!Number.isFinite(bodyWeightKg) || bodyWeightKg < 30 || bodyWeightKg > 300)) {
    return { error: "Enter a body weight between 66 and 661 lb (30 and 300 kg), or leave it blank." };
  }
  if (typicalDailyCaffeineMg !== null && (!Number.isInteger(typicalDailyCaffeineMg) || typicalDailyCaffeineMg < 0 || typicalDailyCaffeineMg > 1000)) {
    return { error: "Enter typical daily caffeine between 0 and 1,000 mg, or leave it blank." };
  }
  if (caffeineCutoffHour !== null && (!Number.isInteger(caffeineCutoffHour) || caffeineCutoffHour < 0 || caffeineCutoffHour > 23)) {
    return { error: "Choose a caffeine cutoff hour between 0 and 23, or leave it blank." };
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
    body_weight_kg: bodyWeightKg === null ? null : Math.round(bodyWeightKg * 100) / 100,
    preferred_weight_unit: preferredWeightUnit,
    typical_daily_caffeine_mg: typicalDailyCaffeineMg,
    caffeine_sensitivity: caffeineSensitivity,
    caffeine_cutoff_hour: caffeineCutoffHour,
    dietary_restrictions: dietaryRestrictions,
    lactose_tolerant: lactoseTolerant,
    fueling_timing_preference: fuelingTimingPreference,
  });

  revalidatePath("/settings");
  return { success: true };
}
