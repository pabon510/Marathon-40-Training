import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export async function getProfile(supabase: Client, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export interface ProfileSettingsPatch {
  target_marathon_date?: string | null;
  default_available_weekdays?: string[];
  preferred_long_run_day?: "saturday" | "sunday";
  easy_hr_floor?: number;
  easy_hr_ceiling?: number;
  equipment?: unknown;
  reminder_preferences?: unknown;
  display_name?: string;
  body_weight_kg?: number | null;
  preferred_weight_unit?: "lb" | "kg";
  typical_daily_caffeine_mg?: number | null;
  caffeine_sensitivity?: "low" | "normal" | "high" | "avoid";
  caffeine_cutoff_hour?: number | null;
  dietary_restrictions?: string[];
  lactose_tolerant?: boolean | null;
  fueling_timing_preference?: "early_morning" | "standard";
}

/** Only in-app-editable fields per docs/VERSION_1_SCOPE.md "Access and profile". Baseline/injury history stay repository-managed. */
export async function updateProfileSettings(supabase: Client, userId: string, patch: ProfileSettingsPatch) {
  const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
  if (error) throw error;
}
