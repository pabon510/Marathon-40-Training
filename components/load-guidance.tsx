import type { LoadRecommendation } from "@/domain/progression/loadRecommendation";

export interface LoadingInfo {
  loadingInstructions: string;
  loadPosition: string;
  startLoadNote: string;
  repBasis: "total" | "per_side";
}

/**
 * Shown above an exercise's input fields: exactly how this movement is
 * loaded and counted, plus either the first-session load-finding protocol
 * or today's recommendation with last session's performance for context.
 */
export function LoadGuidance({
  recommendation,
  loading,
}: {
  recommendation: LoadRecommendation;
  loading: LoadingInfo;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to load it</p>
        <p className="text-sm text-slate-700">{loading.loadingInstructions}</p>
        {loading.loadPosition ? (
          <p className="text-xs text-slate-500">Position: {loading.loadPosition}</p>
        ) : null}
        {loading.repBasis === "per_side" ? (
          <p className="text-xs font-medium text-brand-700">Reps are per side.</p>
        ) : null}
        {loading.startLoadNote ? (
          <p className="mt-1 text-xs font-medium text-safety-warn">{loading.startLoadNote}</p>
        ) : null}
      </div>

      {recommendation.kind === "first_session" ? (
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            First time — find your working load
          </p>
          <ol className="mt-1 list-inside list-decimal space-y-0.5 text-sm text-slate-700">
            {recommendation.firstSessionSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="border-t border-slate-200 pt-2">
          <p className="text-sm font-semibold text-slate-900">
            Recommended: {recommendation.recommendedText}
          </p>
          {recommendation.previousText ? (
            <p className="text-sm text-slate-600">Last time: {recommendation.previousText}</p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">{recommendation.explanation}</p>
        </div>
      )}
    </div>
  );
}
