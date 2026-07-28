import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ProfileRow } from "@/lib/supabase/types";
import type { RunPrescription, WorkoutKind } from "@/domain/types";
import { generateWeeklyShape, type WeeklyShapeDay } from "@/domain/planning/weeklyShape";
import { addDays, mondayOfWeek, nextWeekday } from "@/lib/date";

type Client = SupabaseClient<Database>;

const STRENGTH_KIND_TO_TEMPLATE_SLUG: Partial<Record<WorkoutKind, string>> = {
  strength_a: "strength_a",
  strength_b: "strength_b",
  strength_full: "strength_b",
  combined_short: "combined_short",
  upper_core_safety: "upper_core_safety",
};

function buildRunPrescription(
  kind: WorkoutKind,
  profile: Pick<ProfileRow, "easy_hr_floor" | "easy_hr_ceiling">,
  isCalibration: boolean,
): RunPrescription | null {
  const walkBreakGuidance = `If HR is above ${profile.easy_hr_ceiling} for about two minutes, slow down or take a walk break. Walk breaks are normal, successful execution.`;

  switch (kind) {
    case "long_run":
      return {
        durationMinutes: 70,
        hrTarget: profile.easy_hr_floor,
        hrCeiling: profile.easy_hr_ceiling,
        isThreshold: false,
        isCalibration,
        walkBreakGuidance,
      };
    case "easy_run":
      return {
        durationMinutes: 35,
        hrTarget: profile.easy_hr_floor,
        hrCeiling: profile.easy_hr_ceiling,
        isThreshold: false,
        isCalibration,
        walkBreakGuidance,
      };
    case "threshold_run":
      return {
        durationMinutes: 35,
        isThreshold: true,
        isCalibration,
        walkBreakGuidance: "Pace guides this session; HR is secondary because it lags effort.",
        intervals: [{ workMinutes: 5, restMinutes: 2, repeats: 4 }],
      };
    case "combined_short":
      return {
        durationMinutes: 15,
        hrTarget: profile.easy_hr_floor,
        hrCeiling: profile.easy_hr_ceiling,
        isThreshold: false,
        isCalibration,
        walkBreakGuidance,
      };
    default:
      return null;
  }
}

async function templateDurationMinutes(supabase: Client, kind: WorkoutKind): Promise<number> {
  const slug = STRENGTH_KIND_TO_TEMPLATE_SLUG[kind];
  if (!slug) return 0;
  const { data, error } = await supabase
    .from("strength_templates")
    .select("duration_minutes")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data?.duration_minutes ?? 45;
}

async function strengthTemplateId(supabase: Client, kind: WorkoutKind): Promise<string | null> {
  const slug = STRENGTH_KIND_TO_TEMPLATE_SLUG[kind];
  if (!slug) return null;
  const { data, error } = await supabase.from("strength_templates").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

const GOALS: Record<WorkoutKind, string> = {
  long_run: "Build aerobic base with an easy, HR-guided long run.",
  easy_run: "Easy aerobic effort — should feel conversational.",
  threshold_run: "Comfortably hard, sustained effort to build durability.",
  strength_a: "Lower body strength, hip stability, upper push, and core.",
  strength_b: "Full-body strength with a posterior-chain and upper/core emphasis.",
  strength_full: "Full-body strength for a compressed 3-day week.",
  combined_short: "Short easy run plus a few high-value strength movements.",
  upper_core_safety: "Upper-body and core work that excludes loaded lower-body movement.",
  rest: "Rest day.",
  custom: "Custom entry.",
};

export interface GeneratedWeekResult {
  planVersionId: string;
  weekStartDate: string;
  days: WeeklyShapeDay[];
}

/**
 * Generates one Mon-Sun week of planned_workouts from a submitted weekly
 * setup, creating a new active plan_version (deactivating any previously
 * active version) and inserting the resulting planned_workouts. This is
 * called once at initial setup and again each time the user sets up a new
 * week — it never touches days that already have logged history.
 */
export async function generateWeekFromSetup(
  supabase: Client,
  userId: string,
  weeklySetupId: string,
  trigger: "initial" | "edit" = "initial",
): Promise<GeneratedWeekResult> {
  const { data: setup, error: setupError } = await supabase
    .from("weekly_setups")
    .select("*")
    .eq("id", weeklySetupId)
    .single();
  if (setupError) throw setupError;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (profileError) throw profileError;

  const { data: earliestVersion } = await supabase
    .from("plan_versions")
    .select("rolling_start_date")
    .eq("user_id", userId)
    .order("rolling_start_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const trainingStartDate = earliestVersion?.rolling_start_date ?? setup.week_start_date;

  const calibrationEndDate = profile.calibration_end_date ?? addDays(trainingStartDate, 13);
  if (!profile.calibration_end_date) {
    await supabase.from("profiles").update({ calibration_end_date: calibrationEndDate }).eq("user_id", userId);
  }

  const weekNumber =
    Math.floor(
      (new Date(`${setup.week_start_date}T00:00:00Z`).getTime() -
        new Date(`${trainingStartDate}T00:00:00Z`).getTime()) /
        (7 * 86_400_000),
    ) + 1;

  const isCalibration = setup.week_start_date <= calibrationEndDate;
  const shape = generateWeeklyShape(setup.available_dates, setup.intended_long_run_date, Math.max(1, weekNumber));

  const { data: latestVersion } = await supabase
    .from("plan_versions")
    .select("version_number")
    .eq("user_id", userId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersionNumber = (latestVersion?.version_number ?? 0) + 1;

  await supabase.from("plan_versions").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);

  const { data: planVersion, error: versionError } = await supabase
    .from("plan_versions")
    .insert({
      user_id: userId,
      rolling_start_date: setup.week_start_date,
      version_number: nextVersionNumber,
      trigger,
      source_event_type: "weekly_setup",
      source_event_id: weeklySetupId,
      is_active: true,
    })
    .select("id")
    .single();
  if (versionError || !planVersion) throw versionError ?? new Error("Failed to create plan version");

  const rows = [];
  for (const day of shape) {
    const runPrescription = buildRunPrescription(day.workoutKind, profile, isCalibration);
    const templateId = await strengthTemplateId(supabase, day.workoutKind);
    const strengthMinutes = await templateDurationMinutes(supabase, day.workoutKind);
    const plannedDuration = (runPrescription?.durationMinutes ?? 0) + strengthMinutes;

    rows.push({
      plan_version_id: planVersion.id,
      user_id: userId,
      local_date: day.localDate,
      workout_kind: day.workoutKind,
      priority: 0,
      status: "provisional" as const,
      goal: GOALS[day.workoutKind],
      planned_duration_minutes: plannedDuration || 30,
      run_prescription: runPrescription as unknown as Database["public"]["Tables"]["planned_workouts"]["Insert"]["run_prescription"],
      strength_template_id: templateId,
      location_choice: "unspecified" as const,
    });
  }

  const { error: insertError } = await supabase.from("planned_workouts").insert(rows);
  if (insertError) throw insertError;

  return { planVersionId: planVersion.id, weekStartDate: setup.week_start_date, days: shape };
}

export async function getOrCreateWeeklySetup(
  supabase: Client,
  userId: string,
  weekStartDate: string,
): Promise<Database["public"]["Tables"]["weekly_setups"]["Row"] | null> {
  const { data, error } = await supabase
    .from("weekly_setups")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface SubmitWeeklySetupInput {
  weekStartDate: string;
  availableDates: string[];
  intendedLongRunDate: string;
  backupLongRunDate: string;
}

export async function submitWeeklySetup(supabase: Client, userId: string, input: SubmitWeeklySetupInput) {
  const { data, error } = await supabase
    .from("weekly_setups")
    .upsert(
      {
        user_id: userId,
        week_start_date: input.weekStartDate,
        available_dates: input.availableDates,
        intended_long_run_date: input.intendedLongRunDate,
        backup_long_run_date: input.backupLongRunDate,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start_date" },
    )
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to save weekly setup");
  return data.id as string;
}

export async function getActivePlanVersion(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("plan_versions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Returns the latest planned_workout per local_date in range. A
 * recalculation writes a new row for a changed date rather than mutating
 * history in place, so "latest row per date" is the authoritative current
 * plan — this is what every read path uses, regardless of which
 * plan_version.is_active happens to be true.
 */
export async function getPlannedWorkoutsForRange(
  supabase: Client,
  userId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from("planned_workouts")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const latestByDate = new Map<string, (typeof data)[number]>();
  for (const row of data ?? []) {
    latestByDate.set(row.local_date, row);
  }
  return [...latestByDate.values()].sort((a, b) => a.local_date.localeCompare(b.local_date));
}

export async function getPlannedWorkoutForDate(supabase: Client, userId: string, localDate: string) {
  const rows = await getPlannedWorkoutsForRange(supabase, userId, localDate, localDate);
  return rows[0] ?? null;
}

export async function getPlanChangesForRange(supabase: Client, userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("plan_changes")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", startDate)
    .lte("local_date", endDate)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Suggests the next Monday-Sunday week (starting today if today has no setup yet, else the week after the latest existing setup). */
export function suggestedNextWeekStart(todayLocalDate: string, latestSetupWeekStart: string | null): string {
  if (!latestSetupWeekStart) return mondayOfWeek(todayLocalDate);
  return addDays(latestSetupWeekStart, 7);
}

export function defaultLongRunDate(weekStartDate: string, preferredDay: "saturday" | "sunday"): string {
  return nextWeekday(weekStartDate, preferredDay);
}
