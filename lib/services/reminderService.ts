import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, mondayOfWeek } from "@/lib/date";
import { parsePushReminderPreferences } from "@/domain/reminders/preferences";
import { dueReminderTypes, localReminderClock, type ReminderType } from "@/domain/reminders/schedule";
import type { Database, ProfileRow, PushSubscriptionRow } from "@/lib/supabase/types";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { sendPushNotification } from "@/lib/services/pushService";

type Client = SupabaseClient<Database>;

interface ReminderContent {
  title: string;
  body: string;
  path: string;
}

export interface ReminderDispatchSummary {
  profilesChecked: number;
  remindersDue: number;
  sent: number;
  skipped: number;
  failed: number;
}

function preferenceEnabled(profile: ProfileRow, type: ReminderType) {
  const preferences = parsePushReminderPreferences(profile.reminder_preferences);
  if (type === "daily_checkin") return preferences.dailyCheckIn;
  if (type === "weekly_planning") return preferences.weeklyPlanning;
  return preferences.unloggedWorkout;
}

async function reminderContentIfEligible(
  supabase: Client,
  profile: ProfileRow,
  type: ReminderType,
  localDate: string,
): Promise<ReminderContent | null> {
  if (!preferenceEnabled(profile, type)) return null;

  if (type === "daily_checkin") {
    const { data } = await supabase
      .from("morning_check_ins")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("local_date", localDate)
      .limit(1)
      .maybeSingle();
    if (data) return null;
    return {
      title: "Good morning — quick check-in",
      body: "Log sleep, readiness, and knee comfort to confirm today’s plan.",
      path: "/today?reminder=daily-checkin",
    };
  }

  if (type === "weekly_planning") {
    const nextWeekStart = addDays(mondayOfWeek(localDate), 7);
    const { data } = await supabase
      .from("weekly_setups")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("week_start_date", nextWeekStart)
      .maybeSingle();
    if (data) return null;
    return {
      title: "Plan next week",
      body: "Choose your available days now so training can fit the week ahead.",
      path: `/plan/setup?week=${nextWeekStart}&reminder=weekly-planning`,
    };
  }

  const workout = await getPlannedWorkoutForDate(supabase, profile.user_id, localDate);
  if (!workout || ["completed", "partial", "skipped", "blocked", "incomplete"].includes(workout.status)) return null;

  const { data: loggedSession } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", profile.user_id)
    .eq("planned_workout_id", workout.id)
    .in("completion_state", ["full", "partial", "stopped", "skipped"])
    .limit(1)
    .maybeSingle();
  if (loggedSession) return null;

  return {
    title: "What happened with today’s workout?",
    body: "Start it, log what you completed, or skip today—one quick choice keeps the plan accurate.",
    path: "/today?reminder=unlogged-workout",
  };
}

async function markPriorUnloggedWorkoutIncomplete(supabase: Client, profile: ProfileRow, localDate: string) {
  const priorDate = addDays(localDate, -1);
  const workout = await getPlannedWorkoutForDate(supabase, profile.user_id, priorDate);
  if (!workout || !["provisional", "confirmed", "replaced"].includes(workout.status)) return;
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", profile.user_id)
    .eq("planned_workout_id", workout.id)
    .limit(1)
    .maybeSingle();
  if (session) return;
  const { error } = await supabase
    .from("planned_workouts")
    .update({ status: "incomplete" })
    .eq("id", workout.id)
    .eq("user_id", profile.user_id);
  if (error) throw error;
}

function statusCode(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : null;
}

async function deliverOnce(
  supabase: Client,
  profile: ProfileRow,
  subscription: PushSubscriptionRow,
  type: ReminderType,
  localDate: string,
  content: ReminderContent,
): Promise<"sent" | "skipped" | "failed"> {
  const { data: existing } = await supabase
    .from("reminder_deliveries")
    .select("id, status, attempt_count")
    .eq("push_subscription_id", subscription.id)
    .eq("reminder_type", type)
    .eq("local_date", localDate)
    .maybeSingle();

  if (existing?.status === "sent" || existing?.status === "pending" || (existing?.attempt_count ?? 0) >= 3) {
    return "skipped";
  }

  let deliveryId = existing?.id;
  if (deliveryId) {
    const { error } = await supabase
      .from("reminder_deliveries")
      .update({
        status: "pending",
        attempt_count: existing!.attempt_count + 1,
        error_message: null,
        provider_status_code: null,
      })
      .eq("id", deliveryId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("reminder_deliveries")
      .insert({
        user_id: profile.user_id,
        push_subscription_id: subscription.id,
        reminder_type: type,
        local_date: localDate,
        title: content.title,
        body: content.body,
        target_path: content.path,
      })
      .select("id")
      .single();
    if (error || !data) {
      if (error?.code === "23505") return "skipped";
      throw error ?? new Error("Could not reserve reminder delivery");
    }
    deliveryId = data.id;
  }

  try {
    const response = await sendPushNotification(subscription, {
      title: content.title,
      body: content.body,
      url: content.path,
      tag: `${type}-${localDate}`,
    });
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from("reminder_deliveries").update({ status: "sent", sent_at: now, provider_status_code: response.statusCode }).eq("id", deliveryId),
      supabase.from("push_subscriptions").update({ last_success_at: now, failure_reason: null }).eq("id", subscription.id),
    ]);
    return "sent";
  } catch (error) {
    const code = statusCode(error);
    const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown push delivery error";
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from("reminder_deliveries").update({ status: "failed", provider_status_code: code, error_message: message }).eq("id", deliveryId),
      supabase.from("push_subscriptions").update({
        active: code === 404 || code === 410 ? false : subscription.active,
        last_failure_at: now,
        failure_reason: message,
      }).eq("id", subscription.id),
    ]);
    return "failed";
  }
}

export async function dispatchDuePushReminders(
  supabase: Client,
  now = new Date(),
): Promise<ReminderDispatchSummary> {
  const summary: ReminderDispatchSummary = { profilesChecked: 0, remindersDue: 0, sent: 0, skipped: 0, failed: 0 };
  const { data: profiles, error } = await supabase.from("profiles").select("*");
  if (error) throw error;

  for (const profile of profiles ?? []) {
    summary.profilesChecked += 1;
    const clock = localReminderClock(now, profile.timezone);
    const dueTypes = dueReminderTypes(clock);
    if (dueTypes.length === 0) continue;

    if (clock.hour === 5) {
      await markPriorUnloggedWorkoutIncomplete(supabase, profile, clock.localDate);
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", profile.user_id)
      .eq("active", true);
    if (subscriptionsError) throw subscriptionsError;
    if (!subscriptions?.length) continue;

    for (const type of dueTypes) {
      const content = await reminderContentIfEligible(supabase, profile, type, clock.localDate);
      if (!content) continue;
      summary.remindersDue += 1;
      for (const subscription of subscriptions) {
        const result = await deliverOnce(supabase, profile, subscription, type, clock.localDate, content);
        summary[result] += 1;
      }
    }
  }
  return summary;
}
