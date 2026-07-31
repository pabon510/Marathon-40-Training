import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getSessionDetail } from "@/lib/services/historyService";
import { getRunAnalysis } from "@/lib/services/runAnalysisService";
import { runAnalysisResultSchema } from "@/domain/analysis/runAnalysisPrompt";
import type { RunEvidencePackage } from "@/domain/analysis/runEvaluator";
import { RetryAnalysis } from "./retry-analysis";
import { deleteScreenshotsAction, keepScreenshotsAction } from "./actions";

function verdictStyle(verdict: string) {
  if (verdict === "successful") return "from-emerald-950 via-emerald-800 to-teal-600";
  if (verdict === "successful_with_caution") return "from-amber-950 via-amber-800 to-orange-600";
  if (verdict === "harder_than_intended") return "from-orange-950 via-red-900 to-red-700";
  return "from-slate-950 via-slate-800 to-slate-600";
}

export default async function RunAnalysisPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const detail = await getSessionDetail(supabase, user!.id, sessionId);
  if (!detail?.runLog) notFound();

  const analysis = await getRunAnalysis(supabase, user!.id, detail.runLog.id);
  const result = runAnalysisResultSchema.safeParse(analysis?.structured_result).success
    ? runAnalysisResultSchema.parse(analysis!.structured_result)
    : null;
  const evidence = (analysis?.evidence_snapshot ?? null) as unknown as RunEvidencePackage | null;
  const nextMorning = analysis?.next_morning_result as { explanation?: string; successfulExposure?: boolean } | null;

  const { data: screenshots } = detail.runLog.import_id
    ? await supabase
        .from("run_import_images")
        .select("id, expires_at, keep_permanently, deleted_at")
        .eq("run_import_id", detail.runLog.import_id)
        .eq("user_id", user!.id)
        .order("ordinal")
    : { data: [] };
  const retained = (screenshots ?? []).filter((image) => image.deleted_at === null);
  const keepPermanently = retained.length > 0 && retained.every((image) => image.keep_permanently);

  return (
    <div className="space-y-4">
      <header>
        <Link href={`/history/${sessionId}`} className="text-sm text-slate-500 underline">← Back to run details</Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Post-run review</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">What this run tells us</h1>
      </header>

      {!analysis || analysis.status !== "completed" || !result || !evidence ? (
        <section className="card space-y-3">
          <p className="font-bold text-slate-950">
            {analysis?.status === "failed" ? "The first analysis attempt didn’t finish" : "Your run is logged and ready to analyze"}
          </p>
          <p className="text-sm text-slate-600">
            Analysis is separate from logging, so your saved run is safe even when generation needs a retry.
          </p>
          <RetryAnalysis runLogId={detail.runLog.id} />
        </section>
      ) : (
        <>
          <section className={`overflow-hidden rounded-3xl bg-gradient-to-br ${verdictStyle(evidence.authoritativeVerdict)} p-5 text-white shadow-lg`}>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{evidence.authoritativeVerdict.replaceAll("_", " ")}</p>
            <h2 className="mt-2 text-2xl font-bold">{result.verdictHeadline}</h2>
            <p className="mt-3 text-sm leading-6 text-white/85">{result.summary}</p>
            <p className="mt-4 rounded-xl bg-white/10 p-3 text-xs text-white/80">Analysis confidence: {result.confidence}</p>
          </section>

          <section className="card">
            <h2 className="font-bold text-slate-950">What went well</h2>
            <ul className="mt-3 space-y-3">
              {result.whatWentWell.map((item) => <li key={item.text} className="flex gap-2 text-sm text-slate-700"><span className="text-emerald-600">✓</span><span>{item.text}</span></li>)}
            </ul>
          </section>

          {result.contextThatMatters.length ? (
            <section className="card">
              <h2 className="font-bold text-slate-950">Context that matters</h2>
              <ul className="mt-3 space-y-3">
                {result.contextThatMatters.map((item) => <li key={item.text} className="text-sm leading-6 text-slate-700">{item.text}</li>)}
              </ul>
            </section>
          ) : null}

          <section className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-800">One focus for next time</p>
            <p className="mt-2 text-base font-semibold leading-6 text-brand-950">{result.primaryImprovement.text}</p>
          </section>

          {result.metricToVerify ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">Verify, don’t fix yet</p>
              <p className="mt-2 text-sm leading-6 text-amber-950">{result.metricToVerify.text}</p>
            </section>
          ) : null}

          <section className="card">
            <h2 className="font-bold text-slate-950">Progression status</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{result.progressionExplanation}</p>
            <p className="mt-2 text-xs text-slate-500">The next-morning knee score remains authoritative.</p>
          </section>
          {nextMorning?.explanation ? (
            <section className={`rounded-2xl border p-4 ${nextMorning.successfulExposure ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.16em] ${nextMorning.successfulExposure ? "text-emerald-800" : "text-amber-800"}`}>Next-morning update</p>
              <p className="mt-2 text-sm leading-6 text-slate-800">{nextMorning.explanation}</p>
            </section>
          ) : null}
        </>
      )}

      {detail.runLog.import_id ? (
        <section className="card">
          <h2 className="font-bold text-slate-950">Garmin source screenshots</h2>
          {retained.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">The source screenshots have been deleted. Confirmed metrics and the evidence snapshot remain.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-600">
                {retained.length} private screenshot{retained.length === 1 ? "" : "s"} retained {keepPermanently ? "until you delete them" : "for 180 days"}.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {!keepPermanently ? (
                  <form action={keepScreenshotsAction}>
                    <input type="hidden" name="importId" value={detail.runLog.import_id} />
                    <input type="hidden" name="sessionId" value={sessionId} />
                    <button className="btn-secondary w-full">Keep with this run</button>
                  </form>
                ) : null}
                <form action={deleteScreenshotsAction}>
                  <input type="hidden" name="importId" value={detail.runLog.import_id} />
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <button className="btn-secondary w-full text-red-700">Delete screenshots now</button>
                </form>
              </div>
            </>
          )}
        </section>
      ) : null}

      {analysis?.status === "completed" ? <RetryAnalysis runLogId={detail.runLog.id} /> : null}
    </div>
  );
}
