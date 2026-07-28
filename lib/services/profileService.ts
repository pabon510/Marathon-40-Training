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
}

/** Only in-app-editable fields per docs/VERSION_1_SCOPE.md "Access and profile". Baseline/injury history stay repository-managed. */
export async function updateProfileSettings(supabase: Client, userId: string, patch: ProfileSettingsPatch) {
  const { error } = await supabase.from("profiles").update(patch).eq("user_id", userId);
  if (error) throw error;
}
