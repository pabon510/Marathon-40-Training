import type { RunPrescription, RunWorkoutVariant, WorkoutKind } from "@/domain/types";

export interface RunVarietyDefinition {
  variant: RunWorkoutVariant;
  displayName: string;
  status: "active" | "future";
  intensityClass: "easy" | "quality";
  strollerEligible: boolean;
  purpose: string;
}

export const RUN_VARIETY_TAXONOMY: readonly RunVarietyDefinition[] = [
  { variant: "easy_standard", displayName: "Easy run", status: "active", intensityClass: "easy", strollerEligible: true, purpose: "Aerobic consistency and recovery." },
  { variant: "easy_strides", displayName: "Easy run + strides", status: "active", intensityClass: "easy", strollerEligible: false, purpose: "Aerobic work plus relaxed mechanics and leg turnover." },
  { variant: "aerobic_fartlek", displayName: "Aerobic fartlek", status: "active", intensityClass: "quality", strollerEligible: false, purpose: "Controlled changes of pace without sprinting." },
  { variant: "progression_lite", displayName: "Easy progression run", status: "active", intensityClass: "easy", strollerEligible: false, purpose: "Practice finishing smoothly without reaching threshold effort." },
  { variant: "threshold_intervals", displayName: "Threshold intervals", status: "active", intensityClass: "quality", strollerEligible: false, purpose: "Controlled sustained work with complete easy recoveries." },
  { variant: "continuous_threshold", displayName: "Continuous threshold run", status: "future", intensityClass: "quality", strollerEligible: false, purpose: "Sustained threshold durability." },
  { variant: "short_intervals", displayName: "Short intervals", status: "future", intensityClass: "quality", strollerEligible: false, purpose: "Faster running economy and top-end aerobic development." },
  { variant: "hill_repeats", displayName: "Hill repetitions", status: "future", intensityClass: "quality", strollerEligible: false, purpose: "Incline-specific strength and mechanics after readiness is established." },
  { variant: "long_easy", displayName: "Long easy run", status: "active", intensityClass: "easy", strollerEligible: true, purpose: "Aerobic endurance and durable time on feet." },
  { variant: "recovery_run_walk", displayName: "Recovery run-walk", status: "future", intensityClass: "easy", strollerEligible: true, purpose: "Low-cost aerobic movement when a run-walk format is appropriate." },
  { variant: "combined_short", displayName: "Short run + strength", status: "active", intensityClass: "easy", strollerEligible: false, purpose: "A short aerobic warmup attached to strength." },
] as const;

export function activeMidweekVariant(weekNumber: number, isCalibration: boolean): RunWorkoutVariant {
  if (isCalibration) return "easy_standard";
  const cycle: RunWorkoutVariant[] = [
    "threshold_intervals",
    "easy_strides",
    "aerobic_fartlek",
    "progression_lite",
  ];
  return cycle[(Math.max(3, weekNumber) - 3) % cycle.length]!;
}

export function runDisplayName(kind: WorkoutKind | string, prescription: RunPrescription | null): string | null {
  if (prescription?.displayName) return prescription.displayName;
  if (kind === "easy_run") return "Easy run";
  if (kind === "long_run") return "Long run";
  if (kind === "threshold_run") return "Threshold run";
  if (kind === "combined_short") return "Short run + strength";
  return null;
}

export function runVariant(prescription: RunPrescription | null, kind: WorkoutKind | null): RunWorkoutVariant | null {
  if (prescription?.variant) return prescription.variant;
  if (kind === "easy_run") return "easy_standard";
  if (kind === "long_run") return "long_easy";
  if (kind === "threshold_run") return "threshold_intervals";
  if (kind === "combined_short") return "combined_short";
  return null;
}

export function downgradeToStandardEasy(
  prescription: RunPrescription,
  durationMinutes: number,
): RunPrescription {
  return {
    durationMinutes,
    variant: "easy_standard",
    displayName: "Easy run",
    intensityClass: "easy",
    strollerEligible: true,
    hrGuidanceScope: "whole_run",
    hrTarget: prescription.hrTarget,
    hrCeiling: prescription.hrCeiling,
    isThreshold: false,
    isCalibration: prescription.isCalibration,
    walkBreakGuidance: prescription.hrCeiling
      ? `If HR is above ${prescription.hrCeiling} for about two minutes, slow down or take a walk break. Walk breaks are normal, successful execution.`
      : prescription.walkBreakGuidance,
  };
}

export function resizeRunPrescription(
  prescription: RunPrescription,
  durationMinutes: number,
): RunPrescription {
  if (durationMinutes === prescription.durationMinutes) return prescription;
  switch (prescription.variant) {
    case "easy_strides":
      return {
        ...prescription,
        durationMinutes,
        segments: [
          { label: "Easy running", durationMinutes: Math.max(6, durationMinutes - 8), guidance: prescription.segments?.[0]?.guidance ?? "Run easily." },
          { label: "Relaxed strides", durationMinutes: 0.25, repeats: 4, recoveryMinutes: 0.75, recoveryRepeats: 4, guidance: "Run smoothly for 15 seconds, then walk or jog easily for 45 seconds." },
          { label: "Easy cooldown", durationMinutes: 4, guidance: "Return to relaxed easy effort." },
        ],
      };
    case "aerobic_fartlek": {
      const repeats = durationMinutes >= 30 ? 6 : 4;
      const structuredMinutes = repeats * 1.5;
      const warmupMinutes = Math.max(5, Math.round(durationMinutes * 0.3));
      return {
        ...prescription,
        durationMinutes,
        segments: [
          { label: "Easy warmup", durationMinutes: warmupMinutes, guidance: prescription.segments?.[0]?.guidance ?? "Run easily." },
          { label: "Controlled pickups", durationMinutes: 0.5, repeats, recoveryMinutes: 1, recoveryRepeats: repeats, guidance: "Run quicker for 30 seconds, then run or walk easily for 60 seconds." },
          { label: "Easy finish", durationMinutes: Math.max(2, durationMinutes - warmupMinutes - structuredMinutes), guidance: "Finish relaxed under the easy-run ceiling." },
        ],
      };
    }
    case "progression_lite": {
      const cooldownMinutes = Math.max(3, Math.round(durationMinutes * 0.14));
      const progressionMinutes = Math.max(5, Math.round(durationMinutes * 0.28));
      return {
        ...prescription,
        durationMinutes,
        segments: [
          { label: "Easy running", durationMinutes: durationMinutes - cooldownMinutes - progressionMinutes, guidance: prescription.segments?.[0]?.guidance ?? "Run easily." },
          { label: "Gradual progression", durationMinutes: progressionMinutes, guidance: "Increase gently from easy to steady; do not reach threshold effort." },
          { label: "Easy cooldown", durationMinutes: cooldownMinutes, guidance: "Ease fully back down." },
        ],
      };
    }
    case "threshold_intervals": {
      const repeats = durationMinutes >= 30 ? 4 : 2;
      const recoveryRepeats = Math.max(0, repeats - 1);
      const workAndRecovery = repeats * 5 + recoveryRepeats * 2;
      const remaining = Math.max(0, durationMinutes - workAndRecovery);
      return {
        ...prescription,
        durationMinutes,
        warmupMinutes: Math.ceil(remaining / 2),
        cooldownMinutes: Math.floor(remaining / 2),
        intervals: [{ workMinutes: 5, restMinutes: 2, repeats, recoveryRepeats }],
      };
    }
    default:
      return { ...prescription, durationMinutes };
  }
}
