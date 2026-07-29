import type { RunPrescription, WorkoutKind } from "@/domain/types";
import type { StrengthSection } from "@/lib/services/workoutDetailService";
import { LoadGuidance } from "@/components/load-guidance";
import { LocationToggle } from "@/components/location-toggle";

const RUN_ONLY_KINDS: WorkoutKind[] = ["long_run", "easy_run", "threshold_run"];

/**
 * The body of a single day's workout: run prescription (with its HR range,
 * not just "conversational") and/or the full strength exercise breakdown
 * with load guidance. Shared between today's live `/workouts` page and the
 * `/plan/[date]` preview so both show exactly the same detail.
 */
export function WorkoutDetailView({
  kind,
  goal,
  durationMinutes,
  runPrescription,
  strength,
  plannedWorkoutId,
  locationChoice,
  showLocationToggle,
}: {
  kind: WorkoutKind;
  goal: string;
  durationMinutes: number;
  runPrescription: RunPrescription | null;
  strength: StrengthSection | null;
  plannedWorkoutId: string;
  locationChoice: "gym" | "home" | "unspecified";
  showLocationToggle: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{goal}</p>

      {runPrescription && (RUN_ONLY_KINDS.includes(kind) || kind === "combined_short") ? (
        <div className="card space-y-1">
          <p className="text-sm font-semibold text-slate-900">Run</p>
          <p className="text-sm text-slate-700">{runPrescription.durationMinutes} minutes, HR-guided</p>
          {runPrescription.hrTarget && runPrescription.hrCeiling ? (
            <p className="text-sm text-slate-700">
              Target {runPrescription.hrTarget}-{runPrescription.hrCeiling} bpm
            </p>
          ) : null}
          {runPrescription.intervals ? (
            <p className="text-sm text-slate-700">
              {runPrescription.intervals[0]!.repeats} x {runPrescription.intervals[0]!.workMinutes} min work /{" "}
              {runPrescription.intervals[0]!.restMinutes} min easy
            </p>
          ) : null}
          <p className="text-xs text-slate-500">{runPrescription.walkBreakGuidance}</p>
          {runPrescription.isCalibration ? (
            <p className="text-xs text-amber-700">Calibration week: maintain or reduce only, no progression.</p>
          ) : null}
        </div>
      ) : null}

      {strength ? (
        <div className="space-y-3">
          <div className="card">
            <p className="text-sm font-semibold text-slate-900">{strength.templateName}</p>
            <p className="text-xs text-slate-500">{strength.templateGoal}</p>
            {showLocationToggle ? (
              <div className="mt-3">
                <LocationToggle plannedWorkoutId={plannedWorkoutId} current={locationChoice} />
              </div>
            ) : null}
          </div>

          <div className="card">
            <p className="mb-2 text-sm font-semibold text-slate-900">Full workout overview</p>
            <ol className="space-y-3">
              {strength.items.map((item) => (
                <li key={item.ordinal} className="rounded-lg border border-slate-100 p-2">
                  <p className="text-sm font-medium text-slate-800">
                    {item.exercise.name}
                    {item.loadMetadata.repScope === "per_side" ? (
                      <span className="ml-1 text-xs font-normal text-brand-700">(per side)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.setCount} x {item.repRangeLow}-{item.repRangeHigh} · rest {item.restSeconds}s
                    {item.isOptional ? " · optional" : ""}
                  </p>
                  <div className="mt-2">
                    <LoadGuidance recommendation={item.recommendation} metadata={item.loadMetadata} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      {!runPrescription && !strength ? (
        <p className="card text-sm text-slate-500">{durationMinutes} minutes.</p>
      ) : null}
    </div>
  );
}
