import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFuelingPlan, type FuelingPlan, type FuelingProfile } from "@/domain/fueling/fuelingPlan";
import type { Database, Json, ProfileRow } from "@/lib/supabase/types";
import type { WorkoutKind } from "@/domain/types";

type Client = SupabaseClient<Database>;

export function fuelingProfileFromRow(profile: ProfileRow): FuelingProfile {
  return {
    bodyWeightKg: profile.body_weight_kg,
    typicalDailyCaffeineMg: profile.typical_daily_caffeine_mg,
    caffeineSensitivity: profile.caffeine_sensitivity,
    caffeineCutoffHour: profile.caffeine_cutoff_hour,
    dietaryRestrictions: profile.dietary_restrictions,
    lactoseTolerant: profile.lactose_tolerant,
  };
}

export function fuelingPlanForWorkout(
  profile: ProfileRow,
  kind: WorkoutKind,
  durationMinutes: number,
): FuelingPlan {
  return buildFuelingPlan(kind, durationMinutes, fuelingProfileFromRow(profile));
}

type FuelingLogInput = Omit<Database["public"]["Tables"]["workout_fueling_logs"]["Insert"],
  "id" | "user_id" | "workout_session_id" | "created_at" | "updated_at">;

export async function saveWorkoutFuelingLog(
  supabase: Client,
  userId: string,
  sessionId: string,
  plan: FuelingPlan,
  input: Omit<FuelingLogInput, "rules_version" | "recommendation_snapshot">,
) {
  const { error } = await supabase.from("workout_fueling_logs").insert({
    user_id: userId,
    workout_session_id: sessionId,
    rules_version: plan.rulesVersion,
    recommendation_snapshot: plan as unknown as Json,
    ...input,
  });
  if (error) throw error;
}

const PRE_INTAKES = new Set(["meal", "snack", "gel", "nothing", "other", "not_sure"]);
const PRE_TIMINGS = new Set(["under_30", "30_60", "1_2_hours", "2_4_hours", "over_4_hours", "not_sure"]);
const FLUIDS = new Set(["none", "some", "planned_amount", "not_sure"]);
const POST_RECOVERY = new Set(["shake_only", "shake_plus_carb", "meal", "snack", "nothing_yet", "other"]);
const POST_TIMINGS = new Set(["under_30", "30_60", "1_2_hours", "over_2_hours", "not_yet"]);
const GI_RESPONSES = new Set(["comfortable", "mild_issue", "significant_issue", "not_sure"]);
const ENERGY_RESPONSES = new Set(["steady", "faded", "too_full", "not_sure"]);

function allowedOrNull(value: FormDataEntryValue | null, allowed: Set<string>) {
  const normalized = String(value ?? "");
  return allowed.has(normalized) ? normalized : null;
}

function boundedHalfServing(value: FormDataEntryValue | null, max: number) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max || parsed * 2 % 1 !== 0) return 0;
  return parsed;
}

export function parseFuelingLogForm(formData: FormData) {
  return {
    pre_intake: allowedOrNull(formData.get("fuelPreIntake"), PRE_INTAKES) as FuelingLogInput["pre_intake"],
    pre_timing: allowedOrNull(formData.get("fuelPreTiming"), PRE_TIMINGS) as FuelingLogInput["pre_timing"],
    gel_100_count: boundedHalfServing(formData.get("fuelGel100Count"), 10),
    gel_100_caf_count: boundedHalfServing(formData.get("fuelGel100CafCount"), 5),
    fluid_intake: allowedOrNull(formData.get("fuelFluidIntake"), FLUIDS) as FuelingLogInput["fluid_intake"],
    post_recovery: allowedOrNull(formData.get("fuelPostRecovery"), POST_RECOVERY) as FuelingLogInput["post_recovery"],
    post_timing: allowedOrNull(formData.get("fuelPostTiming"), POST_TIMINGS) as FuelingLogInput["post_timing"],
    gi_response: allowedOrNull(formData.get("fuelGiResponse"), GI_RESPONSES) as FuelingLogInput["gi_response"],
    energy_response: allowedOrNull(formData.get("fuelEnergyResponse"), ENERGY_RESPONSES) as FuelingLogInput["energy_response"],
    notes: String(formData.get("fuelNotes") ?? "").trim() || null,
  };
}
