import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type AdminClient = SupabaseClient<Database>;

export interface ProfileConfig {
  displayName: string;
  timezone: string;
  targetMarathonDate: string | null;
  phase: "base_rebuilding";
  easyHrFloor: number;
  easyHrCeiling: number;
  calibrationEndDate: string | null;
  preferredLongRunDay: "saturday" | "sunday";
  defaultAvailableWeekdays: string[];
  equipment: unknown;
  reminderPreferences: unknown;
  baselineVersion: number;
}

export function loadProfileConfig(): ProfileConfig {
  const configPath = resolve(process.cwd(), "config/profile.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

/**
 * Inserts the profile from config/profile.json for a specific auth user id,
 * ONLY if no profile row exists yet for them — never overwrites live data.
 * Returns "created" or "already_existed" so callers can report status.
 */
export async function seedProfileForUser(
  admin: AdminClient,
  userId: string,
  config: ProfileConfig = loadProfileConfig(),
): Promise<"created" | "already_existed"> {
  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw new Error(`Failed to check existing profile: ${existingError.message}`);
  if (existing) return "already_existed";

  const { error: insertError } = await admin.from("profiles").insert({
    user_id: userId,
    display_name: config.displayName,
    timezone: config.timezone,
    target_marathon_date: config.targetMarathonDate,
    phase: config.phase,
    easy_hr_floor: config.easyHrFloor,
    easy_hr_ceiling: config.easyHrCeiling,
    calibration_end_date: config.calibrationEndDate,
    preferred_long_run_day: config.preferredLongRunDay,
    default_available_weekdays: config.defaultAvailableWeekdays,
    equipment: config.equipment,
    reminder_preferences: config.reminderPreferences,
    baseline_version: config.baselineVersion,
  });

  if (insertError) throw new Error(`Failed to insert profile: ${insertError.message}`);
  return "created";
}
