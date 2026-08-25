import type { RunPrescription, WorkoutKind } from "@/domain/types";

export type RunContext = "standard" | "stroller";

export function allowsStrollerContext(
  kind: WorkoutKind | string | null | undefined,
  prescription?: RunPrescription | null,
): boolean {
  if (prescription?.strollerEligible !== undefined) return prescription.strollerEligible;
  return kind === "easy_run" || kind === "long_run";
}

export function runContextGuidance(context: RunContext): string {
  return context === "stroller"
    ? "Use duration and heart rate as your targets. Pace is informational and will only be compared with other stroller runs."
    : "Use duration and heart rate as your primary targets.";
}
