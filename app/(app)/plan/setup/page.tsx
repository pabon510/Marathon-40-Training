import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getOrCreateWeeklySetup, suggestedNextWeekStart } from "@/lib/services/planService";
import { todayLocalDate, addDays, mondayOfWeek } from "@/lib/date";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { WeeklySetupForm } from "./setup-form";
import type { Json } from "@/lib/supabase/types";

function parseRecoveryChoices(value: Json): { localDate: string; routineSlug: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { localDate: string; routineSlug: string } =>
      typeof item === "object"
      && item !== null
      && typeof (item as Record<string, unknown>).localDate === "string"
      && typeof (item as Record<string, unknown>).routineSlug === "string",
  );
}

export default async function PlanSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);

  if (!profile) {
    return <SeedProfileButton />;
  }

  const { data: latestSetup } = await supabase
    .from("weekly_setups")
    .select("week_start_date")
    .eq("user_id", user!.id)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const today = todayLocalDate(profile.timezone);
  const currentWeekStart = mondayOfWeek(today);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const requestedWeek = (await searchParams).week;
  const weekStartDate = requestedWeek === currentWeekStart || requestedWeek === nextWeekStart
    ? requestedWeek
    : suggestedNextWeekStart(today, latestSetup?.week_start_date ?? null);
  const existing = await getOrCreateWeeklySetup(supabase, user!.id, weekStartDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">
        {existing ? "Adjust" : "Set up"} week of {weekStartDate}
      </h1>
      <p className="text-sm text-slate-600">
        Choose 3-5 available days, then the long-run day (weekend). Missing a day never creates debt — the plan
        recalculates around what actually happens. Workouts through today stay fixed when you adjust the current week.
      </p>
      <WeeklySetupForm
        weekStartDate={weekStartDate}
        weekDates={weekDates}
        defaultAvailableWeekdays={profile.default_available_weekdays}
        preferredLongRunDay={profile.preferred_long_run_day}
        todayDate={today}
        isCurrentWeek={weekStartDate === currentWeekStart}
        existing={
          existing
            ? {
                availableDates: existing.available_dates,
                intendedLongRunDate: existing.intended_long_run_date,
                backupLongRunDate: existing.backup_long_run_date,
                activeRecoveryChoices: parseRecoveryChoices(existing.active_recovery_choices),
              }
            : null
        }
      />
    </div>
  );
}
