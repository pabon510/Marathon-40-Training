import type { RunPrescription, WorkoutKind } from "@/domain/types";
import Image from "next/image";
import type { StrengthSection } from "@/lib/services/workoutDetailService";
import { LoadGuidance } from "@/components/load-guidance";
import { LocationToggle } from "@/components/location-toggle";
import { metricUnit } from "@/domain/content/prescriptionMetric";
import { selectionReasonLabel } from "@/domain/planning/selectionReason";
import Link from "next/link";
import { RunContextToggle } from "@/components/run-context-toggle";
import { allowsStrollerContext, runContextGuidance, type RunContext } from "@/domain/running/runContext";
import { getRecoveryRoutine } from "@/domain/content/recoveryRoutines";
import { getStrengthWarmup } from "@/domain/content/strengthWarmups";
import { StrengthWarmupCard } from "@/components/strength-warmup";
import { getRecoveryMovement } from "@/domain/content/recoveryMovementLibrary";

const RUN_ONLY_KINDS: WorkoutKind[] = ["long_run", "easy_run", "threshold_run"];

function RecoveryMovementCard({
  movement,
  index,
}: {
  movement: NonNullable<ReturnType<typeof getRecoveryRoutine>>["movements"][number];
  index: number;
}) {
  const libraryMovement = getRecoveryMovement(movement.exerciseSlug);
  return (
    <li className="overflow-hidden rounded-lg bg-white ring-1 ring-teal-100">
      {libraryMovement ? (
        <Image
          src={libraryMovement.imagePath}
          alt={libraryMovement.imageAlt}
          width={800}
          height={800}
          className="aspect-[16/9] w-full bg-amber-50 object-cover"
        />
      ) : null}
      <div className="p-3">
        <p className="text-sm font-semibold text-slate-900">
          {index + 1}. {movement.name} · {movement.minutes} min
        </p>
        <p className="mt-1 text-xs text-slate-600">{movement.guidance}</p>
        {libraryMovement ? (
          <Link
            href={`/library?exercise=${encodeURIComponent(libraryMovement.slug)}`}
            className="mt-2 inline-flex min-h-touch items-center text-xs font-semibold text-brand-700 underline"
          >
            View instructions in Library
          </Link>
        ) : null}
      </div>
    </li>
  );
}

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
  runContext,
  recoveryRoutineSlug,
}: {
  kind: WorkoutKind;
  goal: string;
  durationMinutes: number;
  runPrescription: RunPrescription | null;
  strength: StrengthSection | null;
  plannedWorkoutId: string;
  locationChoice: "gym" | "home" | "unspecified";
  showLocationToggle: boolean;
  runContext: RunContext;
  recoveryRoutineSlug?: string | null;
}) {
  const recoveryRoutine = kind === "active_recovery" ? getRecoveryRoutine(recoveryRoutineSlug) : null;
  const warmup = strength ? getStrengthWarmup(kind, locationChoice === "gym" ? "gym" : "home") : null;
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
          {allowsStrollerContext(kind) && showLocationToggle ? (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <RunContextToggle plannedWorkoutId={plannedWorkoutId} current={runContext} />
              <p className="mt-2 text-xs text-slate-600">{runContextGuidance(runContext)}</p>
            </div>
          ) : runContext === "stroller" ? (
            <p className="mt-2 text-xs text-slate-600">{runContextGuidance(runContext)}</p>
          ) : null}
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

          {warmup ? <StrengthWarmupCard warmup={warmup} /> : null}

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
                    {item.setCount} x {item.repRangeLow}-{item.repRangeHigh}{" "}
                    {metricUnit(item.loadMetadata.prescriptionMetric)} · rest {item.restSeconds}s
                    {item.isOptional ? " · optional" : ""}
                  </p>
                  <p className="mt-1 text-xs text-brand-700">
                    {selectionReasonLabel(item.selectionReasonCode)}
                  </p>
                  {item.savedSubstitution ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Replaces {item.savedSubstitution.originalExerciseName} for this workout only.
                    </p>
                  ) : null}
                  <Link
                    href={`/library?exercise=${encodeURIComponent(item.exercise.slug)}`}
                    className="mt-1 inline-flex min-h-touch items-center text-xs font-medium text-brand-700 underline"
                  >
                    View in Library
                  </Link>
                  <Link
                    href={`/workouts/substitute?plannedWorkoutId=${encodeURIComponent(plannedWorkoutId)}&ordinal=${item.ordinal}`}
                    className="ml-4 inline-flex min-h-touch items-center text-xs font-medium text-brand-700 underline"
                  >
                    Substitute
                  </Link>
                  <div className="mt-2">
                    <LoadGuidance recommendation={item.recommendation} metadata={item.loadMetadata} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      {recoveryRoutine ? (
        <section className="card border-teal-200 bg-teal-50/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-900">{recoveryRoutine.name}</p>
              <p className="text-xs text-slate-600">{recoveryRoutine.description}</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-teal-900">
              {recoveryRoutine.durationMinutes} min
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold text-teal-900">Target effort: 1–3/10 · Home</p>
          <ol className="mt-3 space-y-3">
            {recoveryRoutine.movements.map((movement, index) => (
              <RecoveryMovementCard key={movement.name} movement={movement} index={index} />
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-600">
            This should feel restorative, not like another workout. Reduce the range or stop if discomfort increases.
          </p>
        </section>
      ) : null}

      {!runPrescription && !strength && !recoveryRoutine ? (
        <p className="card text-sm text-slate-500">{durationMinutes} minutes.</p>
      ) : null}
    </div>
  );
}
