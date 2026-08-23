import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotification } from "@/lib/services/pushService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const endpoint = String((await request.json().catch(() => ({})) as { endpoint?: unknown }).endpoint ?? "");
  const { data: subscription, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)
    .eq("active", true)
    .maybeSingle();
  if (error || !subscription) return NextResponse.json({ error: "Active subscription not found" }, { status: 404 });

  try {
    await sendPushNotification(subscription, {
      title: "Marathon 40 reminders are ready",
      body: "This test confirms push notifications can reach this device.",
      url: "/settings",
      tag: "push-reminder-test",
    });
    return NextResponse.json({ success: true });
  } catch (pushError) {
    console.error("Test push failed", pushError);
    return NextResponse.json({ error: "The test notification could not be delivered" }, { status: 500 });
  }
}
