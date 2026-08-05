import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isSubstitutionReason,
  substitutionReasonLabel,
  type SubstitutionReason,
} from "@/domain/planning/exerciseSubstitution";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfile } from "@/lib/services/profileService";
import { resolveWorkoutStrengthSection } from "@/lib/services/workoutDetailService";
import { getSubstitutionCandidates } from "@/lib/services/exerciseSubstitutionService";
import { restoreOriginalAction, saveSubstitutionAction } from "./actions";

const REASONS: SubstitutionReason[] = [
  "prefer_machine",
  "equipment_unavailable",
  "uncomfortable",
  "different_exercise",
  "home_conversion",
];

export default async function SubstituteExercisePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const plannedWorkoutId = typeof params.plannedWorkoutId === "string" ? params.plannedWorkoutId : "";
  const ordinal = Number(typeof params.ordinal === "string" ? params.ordinal : "");
  const rawReason = typeof params.reason === "string" ? params.reason : "different_exercise";
  const returnTo = params.returnTo === "/log/strength" ? "/log/strength" : "/workouts";
  const reason: SubstitutionReason = isSubstitutionReason(rawReason) ? rawReason : "different_exercise";
  if (!plannedWorkoutId || !Number.isInteger(ordinal)) notFound();

  const supabase = await createClient();
  const user = await getCurrentUser();
  const profile = await getProfile(supabase, user!.id);
  if (!profile) notFound();
  const { data: workout } = await supabase
    .from("planned_workouts")
    .select("*")
    .eq("id", plannedWorkoutId)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!workout) notFound();
  const location = workout.location_choice === "gym" ? "gym" : "home";
  const strength = await resolveWorkoutStrengthSection(supabase, user!.id, profile, workout, location);
  const current = strength?.items.find((item) => item.ordinal === ordinal);
  if (!current) notFound();
  const originalSlug = current.savedSubstitution?.originalExerciseSlug ?? current.exercise.slug;

  const { data: latestCheckIn } = await supabase
    .from("morning_check_ins")
    .select("knee")
    .eq("user_id", user!.id)
    .eq("local_date", workout.local_date)
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  const blockLowerBody = (latestCheckIn?.knee ?? 0) >= 6;
  const candidates = await getSubstitutionCandidates(
    supabase,
    user!.id,
    originalSlug,
    location,
    reason,
    blockLowerBody,
  );

  return (
    <div className="space-y-4">
      <div>
        <Link href={returnTo} className="text-sm text-slate-500 underline">← Back to workout</Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Substitute exercise</h1>
        <p className="mt-1 text-sm text-slate-600">
          Replace {current.savedSubstitution?.originalExerciseName ?? current.exercise.name} for this workout only.
        </p>
      </div>

      <div className="card">
        <p className="field-label">Why do you want to substitute it?</p>
        <div className="mt-2 grid gap-2">
          {REASONS.map((option) => (
            <Link
              key={option}
              href={`/workouts/substitute?plannedWorkoutId=${encodeURIComponent(plannedWorkoutId)}&ordinal=${ordinal}&reason=${option}&returnTo=${encodeURIComponent(returnTo)}`}
              aria-current={option === reason ? "true" : undefined}
              className={option === reason ? "btn-primary justify-start" : "btn-secondary justify-start"}
            >
              {substitutionReasonLabel(option)}
            </Link>
          ))}
        </div>
      </div>

      {blockLowerBody ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Knee discomfort is 6 or higher, so lower-body alternatives are not available.
        </p>
      ) : null}

      <div className="space-y-3">
        {candidates.length === 0 ? (
          <div className="card text-sm text-slate-600">
            No approved {reason === "prefer_machine" ? "machine " : ""}alternative preserves this exercise&apos;s intent and logging format.
          </div>
        ) : candidates.map((candidate) => (
          <div key={candidate.exercise.slug} className="card space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{candidate.exercise.name}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                  {candidate.quality} match
                </p>
              </div>
              <Link
                href={`/library?exercise=${encodeURIComponent(candidate.exercise.slug)}`}
                className="text-xs text-brand-700 underline"
              >
                View in Library
              </Link>
            </div>
            <p className="text-sm text-slate-700">{candidate.explanation}</p>
            <p className="text-xs text-slate-500">
              Equipment: {candidate.matchingEquipment.join(", ") || candidate.exercise.equipment.join(", ")}
            </p>
            <p className="text-xs text-slate-500">
              {candidate.historyCompatible
                ? "Prior progression history is compatible."
                : "Progression history stays separate for this exercise."}
            </p>
            <form action={saveSubstitutionAction}>
              <input type="hidden" name="plannedWorkoutId" value={plannedWorkoutId} />
              <input type="hidden" name="ordinal" value={ordinal} />
              <input type="hidden" name="substituteSlug" value={candidate.exercise.slug} />
              <input type="hidden" name="reason" value={reason} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className="btn-primary w-full">
                Use {candidate.exercise.name}
              </button>
            </form>
          </div>
        ))}
      </div>

      {current.savedSubstitution ? (
        <form action={restoreOriginalAction} className="card">
          <input type="hidden" name="plannedWorkoutId" value={plannedWorkoutId} />
          <input type="hidden" name="ordinal" value={ordinal} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button type="submit" className="btn-secondary w-full">
            Restore {current.savedSubstitution.originalExerciseName}
          </button>
        </form>
      ) : null}
    </div>
  );
}
