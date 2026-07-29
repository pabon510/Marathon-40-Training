import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profileService";
import { getPlannedWorkoutForDate } from "@/lib/services/planService";
import { resolveStrengthWorkout } from "@/lib/services/workoutContentService";
import { todayLocalDate } from "@/lib/date";
import { WORKOUT_KIND_LABELS } from "@/lib/labels";
import type { RunPrescription, WorkoutKind } from "@/domain/types";
import { SeedProfileButton } from "@/components/seed-profile-button";
import { LoadGuidance } from "@/components/load-guidance";
import { attachLoadGuidance } from "@/lib/services/strengthGuidanceService";
import { LocationToggle } from "./location-toggle";
import { GuidedMode } from "./guided-mode";

const RUN_ONLY_KINDS: WorkoutKind[] = ["long_run", "easy_run", "threshold_run"];
const STRENGTH_KINDS: WorkoutKind[] = ["strength_a", "strength_b", "strength_full", "upper_core_safety"];

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) return <SeedProfileButton />;

  const localDate = todayLocalDate(profile.timezone);
  const workout = await getPlannedWorkoutForDate(supabase, user!.id, localDate);

  if (!workout) {
    return (
      <div className="card">
        <p className="text-sm text-slate-600">No workout scheduled today.</p>
        <Link href="/plan/setup" className="btn-primary mt-3 inline-flex">
          Set up this week
        </Link>
      </div>
    );
  }

  const kind = workout.workout_kind as WorkoutKind;
  const label = WORKOUT_KIND_LABELS[kind] ?? kind;
  const runPrescription = workout.run_prescription as unknown as RunPrescription | null;
  const location = workout.location_choice === "gym" ? "gym" : "home";

  let strengthSection = null;
  if (workout.strength_template_id) {
    const wantShort = workout.planned_duration_minutes < 40;
    const { template, items } = await resolveStrengthWorkout(supabase, workout.strength_template_id, location, wantShort);
    const guidedItems = await attachLoadGuidance(supabase, user!.id, profile, items, location);
    strengthSection = (
      <div className="space-y-3">
        <div className="card">
          <p className="text-sm font-semibold text-slate-900">{template.name}</p>
          <p className="text-xs text-slate-500">{template.goal}</p>
          <div className="mt-3">
            <LocationToggle plannedWorkoutId={workout.id} current={workout.location_choice ?? "unspecified"} />
          </div>
        </div>

        <div className="card">
          <p className="mb-2 text-sm font-semibold text-slate-900">Full workout overview</p>
          <ol className="space-y-3">
            {guidedItems.map((item) => (
              <li key={item.ordinal} className="rounded-lg border border-slate-100 p-2">
                <p className="text-sm font-medium text-slate-800">
                  {item.exercise.name}
                  {item.exercise.rep_basis === "per_side" ? (
                    <span className="ml-1 text-xs font-normal text-brand-700">(per side)</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {item.setCount} x {item.repRangeLow}-{item.repRangeHigh} · rest {item.restSeconds}s
                  {item.isOptional ? " · optional" : ""}
                </p>
                <div className="mt-2">
                  <LoadGuidance
                    recommendation={item.recommendation}
                    loading={{
                      loadingInstructions: item.exercise.loading_instructions,
                      loadPosition: item.exercise.load_position,
                      startLoadNote: item.exercise.start_load_note,
                      repBasis: item.exercise.rep_basis,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>

        <GuidedMode items={guidedItems} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">{label}</h1>
        <span className="text-sm text-slate-500">{workout.planned_duration_minutes} min</span>
      </div>
      <p className="text-sm text-slate-600">{workout.goal}</p>

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

      {strengthSection}

      <Link href={STRENGTH_KINDS.includes(kind) || kind === "combined_short" ? "/log/strength" : "/log/run"} className="btn-primary flex justify-center">
        Log this workout
      </Link>
    </div>
  );
}
