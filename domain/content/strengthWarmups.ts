import type { Location, WorkoutKind } from "@/domain/types";

export interface WarmupStep {
  name: string;
  guidance: string;
}

export interface StrengthWarmup {
  durationMinutes: number;
  steps: WarmupStep[];
  rampUpGuidance: string;
}

const LOWER_BODY: StrengthWarmup = {
  durationMinutes: 7,
  steps: [
    { name: "Easy cardio · 3 min", guidance: "Walk, cycle, or jog at an easy pace." },
    { name: "Ankle rocks · 8/side", guidance: "Keep the heel down and use a comfortable range." },
    { name: "Hip-hinge drill · 8 reps", guidance: "Push the hips back while keeping the spine long." },
    { name: "Bodyweight squat to bench · 8 reps", guidance: "Move smoothly and check knee comfort." },
  ],
  rampUpGuidance:
    "Before the first main lower-body exercise, do one very light set of about 10 reps. Add one moderate set of about 6 reps when the working load is challenging.",
};

const UPPER_CORE: StrengthWarmup = {
  durationMinutes: 6,
  steps: [
    { name: "Easy movement · 2 min", guidance: "Walk or march gently if comfortable." },
    { name: "Cat-cow · 6 reps", guidance: "Move slowly through a comfortable spinal range." },
    { name: "Wall slides · 8 reps", guidance: "Keep ribs down and shoulders relaxed." },
    { name: "Dead bug · 5/side", guidance: "Move slowly without letting the low back arch." },
  ],
  rampUpGuidance:
    "Before the first loaded upper-body exercise, perform one light rehearsal set of about 8–10 reps.",
};

export function getStrengthWarmup(kind: WorkoutKind, _location: Location): StrengthWarmup | null {
  if (kind === "upper_core_safety") return UPPER_CORE;
  if (["strength_a", "strength_b", "strength_full", "combined_short"].includes(kind)) return LOWER_BODY;
  return null;
}
