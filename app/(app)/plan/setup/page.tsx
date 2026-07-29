import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { getOrCreateWeeklySetup, suggestedNextWeekStart } from "@/lib/services/planService";
import { todayLocalDate, addDays } from "@/lib/date";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { WeeklySetupForm } from "./setup-form";

export default async function PlanSetupPage() {
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
  const weekStartDate = suggestedNextWeekStart(today, latestSetup?.week_start_date ?? null);
  const existing = await getOrCreateWeeklySetup(supabase, user!.id, weekStartDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Set up week of {weekStartDate}</h1>
      <p className="text-sm text-slate-600">
        Choose 3-5 available days, then the long-run day (weekend). Missing a day never creates debt — the plan
        recalculates around what actually happens.
      </p>
      <WeeklySetupForm
        weekStartDate={weekStartDate}
        weekDates={weekDates}
        defaultAvailableWeekdays={profile.default_available_weekdays}
        preferredLongRunDay={profile.preferred_long_run_day}
        existing={
          existing
            ? {
                availableDates: existing.available_dates,
                intendedLongRunDate: existing.intended_long_run_date,
                backupLongRunDate: existing.backup_long_run_date,
              }
            : null
        }
      />
    </div>
  );
}
