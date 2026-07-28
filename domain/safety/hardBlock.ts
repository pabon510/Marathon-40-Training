import { KNEE_HARD_BLOCK_THRESHOLD, KNEE_WORSENING_DELTA_BLOCK } from "@/domain/types";

export type SafetyAlternative = "upper_body" | "core" | "mobility" | "walk" | "rest";

export const SAFETY_ALTERNATIVES: SafetyAlternative[] = [
  "upper_body",
  "core",
  "mobility",
  "walk",
  "rest",
];

export interface SafetyBlockResult {
  blocked: boolean;
  ruleCode: "KNEE_HARD_BLOCK" | "KNEE_WORKOUT_RISE_BLOCK" | null;
  explanation: string | null;
  offeredAlternatives: SafetyAlternative[];
}

const NOT_BLOCKED: SafetyBlockResult = {
  blocked: false,
  ruleCode: null,
  explanation: null,
  offeredAlternatives: [],
};

/**
 * Pre-workout / morning hard block: running and lower-body strength are
 * blocked outright when knee discomfort is 6 or higher. This function is the
 * single source of truth for that check — call it both when rendering the
 * recommendation and when authorizing a session start/continue on the
 * server, so a hidden button is never the only thing preventing a bypass.
 */
export function evaluatePreWorkoutSafety(kneeScore: number | null): SafetyBlockResult {
  if (kneeScore === null) return NOT_BLOCKED;
  if (kneeScore >= KNEE_HARD_BLOCK_THRESHOLD) {
    return {
      blocked: true,
      ruleCode: "KNEE_HARD_BLOCK",
      explanation: `Knee discomfort is ${kneeScore}/10, at or above the ${KNEE_HARD_BLOCK_THRESHOLD} hard-stop threshold, so running and lower-body strength are blocked today. Upper-body, core, gentle mobility, comfortable walking, or rest are available instead.`,
      offeredAlternatives: SAFETY_ALTERNATIVES,
    };
  }
  return NOT_BLOCKED;
}

/**
 * During-workout hard stop: evaluated continuously against the knee score
 * recorded at workout start. Triggers if the current reading reaches 6, or
 * has risen by 2 or more points from the start value. This has no override
 * in UI or API — the caller must stop the running/lower-body work and
 * recalculate.
 */
export function evaluateDuringWorkoutSafety(
  kneeAtStart: number,
  kneeCurrent: number,
): SafetyBlockResult {
  const rise = kneeCurrent - kneeAtStart;
  const reachedThreshold = kneeCurrent >= KNEE_HARD_BLOCK_THRESHOLD;
  const roseTooFast = rise >= KNEE_WORSENING_DELTA_BLOCK;

  if (reachedThreshold || roseTooFast) {
    const explanation = reachedThreshold
      ? `Knee discomfort reached ${kneeCurrent}/10 during the workout, at or above the ${KNEE_HARD_BLOCK_THRESHOLD} hard-stop threshold. Stop running/lower-body work now.`
      : `Knee discomfort rose from ${kneeAtStart} to ${kneeCurrent} during the workout (+${rise}), at or above the ${KNEE_WORSENING_DELTA_BLOCK}-point hard-stop rise. Stop running/lower-body work now.`;
    return {
      blocked: true,
      ruleCode: "KNEE_WORKOUT_RISE_BLOCK",
      explanation,
      offeredAlternatives: SAFETY_ALTERNATIVES,
    };
  }
  return NOT_BLOCKED;
}

export type RedFlagSymptom =
  | "cannot_bear_weight"
  | "locking_or_giving_way"
  | "significant_swelling_or_deformity"
  | "severe_or_rapidly_escalating_pain"
  | "chest_pain_or_fainting_or_breathing";

const RED_FLAG_MESSAGES: Record<RedFlagSymptom, string> = {
  cannot_bear_weight:
    "You reported being unable to bear weight on the leg. Stop training and consider prompt professional or urgent evaluation.",
  locking_or_giving_way:
    "You reported the knee locking or giving way/feeling unstable. Stop training and consider prompt professional or urgent evaluation.",
  significant_swelling_or_deformity:
    "You reported significant swelling, deformity, or an acute injury. Stop training and consider prompt professional or urgent evaluation.",
  severe_or_rapidly_escalating_pain:
    "You reported severe or rapidly escalating pain. Stop training and consider prompt professional or urgent evaluation.",
  chest_pain_or_fainting_or_breathing:
    "You reported a possible emergency symptom (chest pain, fainting, or severe shortness of breath). If this is an emergency, use emergency services now.",
};

/**
 * Red-flag warnings are explicit safety messaging, separate from and
 * additional to the numeric knee algorithm above. They never silently
 * change the deterministic adaptation result — they are surfaced as their
 * own prominent notice.
 */
export function redFlagMessages(symptoms: RedFlagSymptom[]): string[] {
  return symptoms.map((s) => RED_FLAG_MESSAGES[s]);
}
