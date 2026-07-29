import type { WorkoutKind } from "@/domain/types";
import { WORKOUT_KIND_LABELS } from "@/domain/content/workoutLabels";

/**
 * Builds the message shown immediately after a morning check-in.
 *
 * This module only *describes* what the adaptation chain already decided —
 * it never decides anything itself. Keeping it pure and separate is what
 * makes "did the workout change, and why" testable without a database.
 */

const RUN_KINDS: WorkoutKind[] = ["long_run", "easy_run", "threshold_run"];
const STRENGTH_KINDS: WorkoutKind[] = ["strength_a", "strength_b", "strength_full", "upper_core_safety"];

export type LocationChoice = "gym" | "home" | "unspecified" | null;

export interface OutcomeWorkout {
  workoutKind: WorkoutKind;
  durationMinutes: number;
  locationChoice: LocationChoice;
}

export interface OutcomeValues {
  knee: number | null;
  priorDailyKnee: number | null;
  energy: number | null;
  soreness: number | null;
  fatigue: number | null;
  hoursSlept: number | null;
  ouraScore: number | null;
  /** Minutes the user said they had, or null when they didn't answer. */
  availableMinutes: number | null;
}

export interface CheckInOutcomeInput {
  changed: boolean;
  before: OutcomeWorkout;
  after: OutcomeWorkout;
  blocked: boolean;
  reasonCode: string;
  /** The rules engine's own explanation, used when no richer reason can be built. */
  fallbackExplanation: string;
  values: OutcomeValues;
}

export interface CheckInOutcome {
  changed: boolean;
  blocked: boolean;
  headline: string;
  detail: string;
  /** Already prefixed with "Reason: " when present. */
  reason: string | null;
}

function label(kind: WorkoutKind): string {
  return WORKOUT_KIND_LABELS[kind] ?? kind;
}

function locationWord(location: LocationChoice): string | null {
  return location === "gym" ? "Gym" : location === "home" ? "Home" : null;
}

function capitalize(sentence: string): string {
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Joins clauses as "a", "a and b", or "a, b and c". */
function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function describeWorkout(workout: OutcomeWorkout): string {
  const place = locationWord(workout.locationChoice);
  const named = label(workout.workoutKind);
  // Only strength workouts are meaningfully gym-vs-home; a run reads oddly
  // as "Home Easy run".
  return place && STRENGTH_KINDS.includes(workout.workoutKind) ? `${place} ${named}` : named;
}

/**
 * Builds the "Reason:" line from the values the user actually entered,
 * rather than restating the rule code. Falls back to the engine's own
 * explanation when nothing more specific applies.
 */
function buildReason(input: CheckInOutcomeInput): string | null {
  const { values, reasonCode } = input;

  if (reasonCode === "CHECKIN_KNEE_UNKNOWN") {
    return "Knee discomfort was not answered, so today uses the conservative non-running option until it's confirmed.";
  }

  if (reasonCode.startsWith("KNEE_") || reasonCode.startsWith("SAFETY")) {
    if (values.knee !== null && values.priorDailyKnee !== null && values.knee > values.priorDailyKnee) {
      return `Knee discomfort increased from ${values.priorDailyKnee} to ${values.knee}.`;
    }
    if (values.knee !== null && values.priorDailyKnee !== null && values.knee < values.priorDailyKnee) {
      return `Knee discomfort was ${values.knee}/10, down from ${values.priorDailyKnee}.`;
    }
    if (values.knee !== null) {
      return `Knee discomfort was ${values.knee}/10.`;
    }
    return input.fallbackExplanation;
  }

  if (reasonCode === "RECOVERY_MULTI_SIGNAL") {
    const parts: string[] = [];
    if (values.energy !== null && values.energy <= 2) parts.push(`energy was low (${values.energy}/5)`);
    if (values.soreness !== null && values.soreness >= 4) parts.push(`soreness was high (${values.soreness}/5)`);
    if (values.hoursSlept !== null && values.hoursSlept < 6) parts.push(`sleep was ${values.hoursSlept} hours`);
    if (values.ouraScore !== null) parts.push(`Oura score was ${values.ouraScore}`);
    if (values.fatigue !== null) parts.push(`fatigue was ${values.fatigue}/5`);
    if (parts.length > 0) return `${capitalize(joinClauses(parts))}.`;
    return input.fallbackExplanation;
  }

  // Nothing about readiness changed the workout; the only thing that could
  // have shortened it is the time the user said they had.
  if (input.changed && values.availableMinutes !== null && input.after.durationMinutes < input.before.durationMinutes) {
    return `Available time today was ${values.availableMinutes} minutes.`;
  }

  return input.changed ? input.fallbackExplanation : null;
}

export function buildCheckInOutcome(input: CheckInOutcomeInput): CheckInOutcome {
  const reason = buildReason(input);

  if (!input.changed) {
    return {
      changed: false,
      blocked: input.blocked,
      headline: `Workout confirmed: ${describeWorkout(input.after)}, ${input.after.durationMinutes} minutes`,
      detail: "No change was made. Recovery and knee scores were within the allowed range.",
      reason: null,
    };
  }

  const replacedWithUpperCore =
    input.after.workoutKind === "upper_core_safety" && input.before.workoutKind !== "upper_core_safety";

  let headline: string;
  if (replacedWithUpperCore && RUN_KINDS.includes(input.before.workoutKind)) {
    headline = "Today's run was replaced with upper-body and core work.";
  } else if (replacedWithUpperCore) {
    headline = "Today's lower-body work was replaced with upper-body and core work.";
  } else {
    const sameKind = input.before.workoutKind === input.after.workoutKind;
    const place = locationWord(input.after.locationChoice);
    const afterDescriptor =
      sameKind && place ? `${place.toLowerCase()} workout` : `${label(input.after.workoutKind)}`;
    headline =
      `Workout adjusted: ${input.before.durationMinutes}-minute ${label(input.before.workoutKind)} ` +
      `changed to a ${input.after.durationMinutes}-minute ${afterDescriptor}.`;
  }

  return {
    changed: true,
    blocked: input.blocked,
    headline,
    detail: input.blocked
      ? "Running and lower-body strength are blocked today. The alternative below is safe to do."
      : "The plan below reflects the change. Nothing is owed or made up later.",
    reason: reason ? `Reason: ${reason}` : null,
  };
}
