export interface StrengthExposure {
  completedAsPrescribed: boolean;
  repsAtTopOfRange: boolean;
  difficulty: number; // 1-10
  painIncreased: boolean;
  formFailed: boolean;
  recoveryAcceptable: boolean;
}

export type ProgressionMethod = "reps" | "load" | "home_variable";

export interface StrengthProgressionResult {
  eligible: boolean;
  method: ProgressionMethod | null;
  reasonCode: "PROGRESSION_APPLIED" | "NO_CHANGE";
  explanation: string;
}

function qualifies(exposure: StrengthExposure): boolean {
  return (
    exposure.completedAsPrescribed &&
    !exposure.painIncreased &&
    !exposure.formFailed &&
    exposure.difficulty <= 8 &&
    exposure.recoveryAcceptable
  );
}

/**
 * Strength progresses only after two similar successful exposures to the
 * same movement (caller groups exposures by exercise/variant before
 * calling). Reps to the top of the prescribed range come first, then the
 * smallest practical weight increase. At home, before requiring new
 * equipment, use reps/tempo/pauses/range/unilateral variations instead.
 */
export function evaluateStrengthProgression(
  lastTwoExposures: StrengthExposure[],
  location: "gym" | "home",
  hasHeavierEquipmentAvailable: boolean,
): StrengthProgressionResult {
  if (lastTwoExposures.length < 2 || !lastTwoExposures.every(qualifies)) {
    return {
      eligible: false,
      method: null,
      reasonCode: "NO_CHANGE",
      explanation: "Progression requires two similar successful exposures with controlled difficulty, no pain increase, and no form breakdown.",
    };
  }

  const bothAtTopOfRange = lastTwoExposures.every((e) => e.repsAtTopOfRange);

  if (!bothAtTopOfRange) {
    return {
      eligible: true,
      method: "reps",
      reasonCode: "PROGRESSION_APPLIED",
      explanation: "Two successful exposures at this load, so add reps toward the top of the prescribed range next time.",
    };
  }

  if (location === "home" && !hasHeavierEquipmentAvailable) {
    return {
      eligible: true,
      method: "home_variable",
      reasonCode: "PROGRESSION_APPLIED",
      explanation: "Already at the top of the rep range at home without heavier equipment available, so progress using tempo, pauses, range of motion, or a unilateral variation.",
    };
  }

  return {
    eligible: true,
    method: "load",
    reasonCode: "PROGRESSION_APPLIED",
    explanation: "Already at the top of the rep range for two successful exposures, so make the smallest practical load increase next time.",
  };
}
