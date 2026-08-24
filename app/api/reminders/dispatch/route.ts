import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDuePushReminders } from "@/lib/services/reminderService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await dispatchDuePushReminders(createAdminClient()));
  } catch (error) {
    console.error("Push reminder dispatch failed", error);
    return NextResponse.json({ error: "Reminder dispatch failed" }, { status: 500 });
  }
}
