import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { todayLocalDate, mondayOfWeek } from "@/lib/date";
import { buildWeeklyReviewEvidence, getWeeklyReview } from "@/lib/services/weeklyReviewService";
import { WEEKLY_REVIEW_MODEL, WEEKLY_REVIEW_PROMPT, WEEKLY_REVIEW_PROMPT_VERSION, WEEKLY_REVIEW_VERSION, weeklyReviewResultSchema, weeklyReviewUserPrompt } from "@/domain/analysis/weeklyReview";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Weekly reviews are not configured." }, { status: 503 });
  const profile = await getProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { weekStart?: unknown; force?: unknown };
  const today = todayLocalDate(profile.timezone);
  const weekStart = typeof body.weekStart === "string" ? body.weekStart : mondayOfWeek(today);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || mondayOfWeek(weekStart) !== weekStart || weekStart > mondayOfWeek(today)) {
    return NextResponse.json({ error: "Choose a valid current or past week." }, { status: 400 });
  }
  const existing = await getWeeklyReview(supabase, user.id, weekStart);
  if (existing?.status === "completed" && body.force !== true) return NextResponse.json({ review: existing });
  const evidence = await buildWeeklyReviewEvidence(supabase, user.id, weekStart, today);
  const { data: row, error } = await supabase.from("weekly_coaching_reviews").upsert({
    user_id: user.id, week_start: weekStart, week_end: evidence.period.weekEnd, status: "pending",
    review_version: WEEKLY_REVIEW_VERSION, prompt_version: WEEKLY_REVIEW_PROMPT_VERSION,
    rules_version: evidence.rulesVersion, model: WEEKLY_REVIEW_MODEL, evidence_snapshot: evidence,
    structured_result: null, error_message: null,
  }, { onConflict: "user_id,week_start,review_version" }).select("id").single();
  if (error || !row) throw error ?? new Error("Could not start weekly review.");
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.parse({
      model: WEEKLY_REVIEW_MODEL,
      input: [{ role: "system", content: WEEKLY_REVIEW_PROMPT }, { role: "user", content: weeklyReviewUserPrompt(evidence) }],
      text: { format: zodTextFormat(weeklyReviewResultSchema, "weekly_coaching_review") },
    });
    if (!response.output_parsed) throw new Error("The weekly review response was incomplete.");
    const { data: review, error: updateError } = await supabase.from("weekly_coaching_reviews").update({ status: "completed", structured_result: response.output_parsed, generated_at: new Date().toISOString(), error_message: null }).eq("id", row.id).eq("user_id", user.id).select("*").single();
    if (updateError) throw updateError;
    return NextResponse.json({ review });
  } catch (cause) {
    console.error("Weekly coaching review failed", cause);
    await supabase.from("weekly_coaching_reviews").update({ status: "failed", error_message: "The recap could not be generated. Your training data is unchanged." }).eq("id", row.id).eq("user_id", user.id);
    return NextResponse.json({ error: "The recap could not be generated. Your training data is unchanged." }, { status: 502 });
  }
}
