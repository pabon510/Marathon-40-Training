import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildRunEvidence, getRunAnalysis } from "@/lib/services/runAnalysisService";
import {
  RUN_ANALYSIS_CORE_PROMPT,
  RUN_ANALYSIS_MODEL,
  RUN_ANALYSIS_PROMPT_VERSION,
  RUN_ANALYSIS_VERSION,
  analysisUserPrompt,
  runAnalysisResultSchema,
  scenarioPrompt,
} from "@/domain/analysis/runAnalysisPrompt";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Run analysis is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as { runLogId?: unknown; force?: unknown } | null;
  if (!body || typeof body.runLogId !== "string") {
    return NextResponse.json({ error: "A run log is required." }, { status: 400 });
  }

  const existing = await getRunAnalysis(supabase, user.id, body.runLogId);
  if (existing?.status === "completed" && body.force !== true) {
    return NextResponse.json({ analysis: existing });
  }

  const context = await buildRunEvidence(supabase, user.id, body.runLogId);
  if (!context) return NextResponse.json({ error: "Run not found." }, { status: 404 });

  const { data: row, error: upsertError } = await supabase
    .from("run_analyses")
    .upsert({
      user_id: user.id,
      run_log_id: body.runLogId,
      status: "pending",
      analysis_version: RUN_ANALYSIS_VERSION,
      prompt_version: RUN_ANALYSIS_PROMPT_VERSION,
      rules_version: context.evidence.rulesVersion,
      model: RUN_ANALYSIS_MODEL,
      evidence_snapshot: context.evidence,
      structured_result: null,
      error_message: null,
    }, { onConflict: "run_log_id,analysis_version" })
    .select("id")
    .single();
  if (upsertError || !row) throw upsertError ?? new Error("Could not start run analysis.");

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const scenarios = scenarioPrompt(context.scenario);
    const response = await openai.responses.parse({
      model: RUN_ANALYSIS_MODEL,
      input: [
        { role: "system", content: RUN_ANALYSIS_CORE_PROMPT },
        { role: "user", content: analysisUserPrompt(context.evidence, scenarios) },
      ],
      text: { format: zodTextFormat(runAnalysisResultSchema, "run_review") },
    });
    if (!response.output_parsed) throw new Error("The analysis response was incomplete.");

    const { data: completed, error: updateError } = await supabase
      .from("run_analyses")
      .update({
        status: "completed",
        structured_result: response.output_parsed,
        generated_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", row.id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (updateError) throw updateError;
    return NextResponse.json({ analysis: completed });
  } catch (error) {
    console.error("Run analysis failed", error);
    await supabase.from("run_analyses").update({
      status: "failed",
      error_message: "Analysis could not be generated. The run is safely logged and can be retried.",
    }).eq("id", row.id).eq("user_id", user.id);
    return NextResponse.json({ error: "Analysis could not be generated. Your run is still saved." }, { status: 502 });
  }
}
