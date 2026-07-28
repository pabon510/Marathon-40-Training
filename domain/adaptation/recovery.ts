import type { Scale1to5 } from "@/domain/types";
import type { AdaptationCategory } from "@/domain/adaptation/kneeRules";

export interface RecoveryInputs {
  energy: Scale1to5 | null;
  soreness: Scale1to5 | null;
  fatigue: Scale1to5 | null;
  hoursSlept: number | null;
  ouraScore: number | null;
  recentOuraAverage: number | null;
  /** Whether poor recovery (per this same definition) was also present on the immediately preceding workout day. */
  poorRecoveryYesterday: boolean;
}

/**
 * "Unusually poor" sleep has no numeric baseline in the product docs; we
 * operationalize it as fewer than 6 hours, a conservative reading given
 * Andrew's stated goals around consistency and recovery. This threshold is
 * isolated here so it can be tuned from one place if the real baseline
 * differs.
 */
const UNUSUALLY_POOR_SLEEP_HOURS = 6;

export interface RecoverySignals {
  lowEnergy: boolean;
  highSoreness: boolean;
  poorSleep: boolean;
  poorOura: boolean;
  signalCount: number;
  poorRecoveryPresent: boolean;
}

export function computeRecoverySignals(input: RecoveryInputs): RecoverySignals {
  const lowEnergy = input.energy !== null && input.energy <= 2;
  const highSoreness = input.soreness !== null && input.soreness >= 4;
  const poorSleep = input.hoursSlept !== null && input.hoursSlept < UNUSUALLY_POOR_SLEEP_HOURS;
  const poorOura =
    input.ouraScore !== null &&
    (input.ouraScore < 75 ||
      (input.recentOuraAverage !== null && input.ouraScore <= input.recentOuraAverage - 12));

  const signalCount = [lowEnergy, highSoreness, poorSleep, poorOura].filter(Boolean).length;

  return {
    lowEnergy,
    highSoreness,
    poorSleep,
    poorOura,
    signalCount,
    poorRecoveryPresent: signalCount >= 2,
  };
}

export interface RecoveryAdaptationResult {
  category: AdaptationCategory;
  progressionAllowed: boolean;
  reasonCode: "NO_CHANGE" | "RECOVERY_MULTI_SIGNAL";
  explanation: string;
}

/**
 * Reduce/downgrade only when poor recovery exists (>= 2 signals) AND
 * fatigue is 4-5. One poor night, one high-stress day, or stress alone
 * never reduces training on their own.
 */
export function evaluateGeneralRecovery(input: RecoveryInputs): RecoveryAdaptationResult {
  const signals = computeRecoverySignals(input);
  const fatigueHigh = input.fatigue !== null && input.fatigue >= 4;

  if (!signals.poorRecoveryPresent || !fatigueHigh) {
    return {
      category: "full",
      progressionAllowed: true,
      reasonCode: "NO_CHANGE",
      explanation: "Recovery signals are within normal range, so no recovery-based change applies.",
    };
  }

  const severe = signals.signalCount >= 3 || input.poorRecoveryYesterday;

  if (severe) {
    return {
      category: "upper_core_only",
      progressionAllowed: false,
      reasonCode: "RECOVERY_MULTI_SIGNAL",
      explanation:
        "Multiple recovery signals were low across today (or today and yesterday) and fatigue was high, so today's session became upper-body/core, mobility, or rest.",
    };
  }

  return {
    category: "easy_cap",
    progressionAllowed: false,
    reasonCode: "RECOVERY_MULTI_SIGNAL",
    explanation:
      "Recovery signals were low and fatigue was high, so today's session was shortened to available time and any quality work became easy effort.",
  };
}
