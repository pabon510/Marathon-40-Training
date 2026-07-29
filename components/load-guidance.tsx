import type { ExerciseLoadMetadata } from "@/domain/content/loadMetadata";
import type { LoadRecommendation } from "@/domain/progression/loadRecommendation";

/**
 * Shown above an exercise's input fields: exactly how this movement is
 * loaded and counted, plus either the first-session load-selection protocol
 * or today's recommendation with last session's performance for context.
 */
export function LoadGuidance({
  recommendation,
  metadata,
}: {
  recommendation: LoadRecommendation;
  metadata: ExerciseLoadMetadata;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to load it</p>
        <p className="text-sm text-slate-700">{metadata.loadingInstructions}</p>
        {metadata.loadPosition ? (
          <p className="text-xs text-slate-500">Position: {metadata.loadPosition}</p>
        ) : null}
        {metadata.repScope === "per_side" ? (
          <p className="text-xs font-medium text-brand-700">Reps are per side.</p>
        ) : null}
        {metadata.startLoadNote ? (
          <p className="mt-1 text-xs font-medium text-safety-warn">{metadata.startLoadNote}</p>
        ) : null}
      </div>

      {recommendation.kind === "first_session" ? (
        <div className="border-t border-slate-200 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            First time — choose a starting load
          </p>
          {recommendation.firstSessionProtocol ? (
            <p className="mt-1 text-sm font-medium text-slate-800">{recommendation.firstSessionProtocol}</p>
          ) : null}
          <ol className="mt-2 list-inside list-decimal space-y-0.5 text-sm text-slate-700">
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
