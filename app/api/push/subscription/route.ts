import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { serializePushReminderPreferences } from "@/domain/reminders/preferences";

const preferencesSchema = z.object({
  dailyCheckIn: z.boolean(),
  weeklyPlanning: z.boolean(),
  unloggedWorkout: z.boolean(),
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

const bodySchema = z.object({
  subscription: subscriptionSchema,
  preferences: preferencesSchema,
  deviceLabel: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });

  const { subscription, preferences, deviceLabel } = parsed.data;
  const { error: subscriptionError } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    device_label: deviceLabel ?? "Browser",
    user_agent: request.headers.get("user-agent"),
    active: true,
    failure_reason: null,
  }, { onConflict: "endpoint" });
  if (subscriptionError) {
    console.error("Could not save push subscription", subscriptionError);
    return NextResponse.json({ error: "Could not enable notifications" }, { status: 500 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ reminder_preferences: serializePushReminderPreferences(preferences) })
    .eq("user_id", user.id);
  if (profileError) return NextResponse.json({ error: "Could not save reminder choices" }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });

  const [{ error: subscriptionError }, { error: profileError }] = await Promise.all([
    supabase.from("push_subscriptions").update({ active: false }).eq("user_id", user.id).eq("endpoint", parsed.data.endpoint),
    supabase.from("profiles").update({ reminder_preferences: serializePushReminderPreferences({
      dailyCheckIn: false,
      weeklyPlanning: false,
      unloggedWorkout: false,
    }) }).eq("user_id", user.id),
  ]);
  if (subscriptionError || profileError) return NextResponse.json({ error: "Could not disable notifications" }, { status: 500 });
  return NextResponse.json({ success: true });
}
