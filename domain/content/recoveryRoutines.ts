export interface RecoveryMovement {
  exerciseSlug?: string;
  name: string;
  minutes: number;
  guidance: string;
}

export interface RecoveryRoutine {
  slug: string;
  name: string;
  durationMinutes: number;
  description: string;
  movements: RecoveryMovement[];
}

export const RECOVERY_ROUTINES: RecoveryRoutine[] = [
  {
    slug: "runner_reset_10",
    name: "Runner reset",
    durationMinutes: 10,
    description: "A short hips, calves, and spine reset for a busy day.",
    movements: [
      { name: "Easy breathing", minutes: 1, guidance: "Breathe slowly through your nose and let your shoulders relax." },
      { name: "Cat-cow", minutes: 1, guidance: "Move gently through a comfortable spinal range." },
      { name: "Ankle rocks", minutes: 2, guidance: "Keep the heel down and glide the knee forward without forcing range." },
      { name: "90/90 hip switches", minutes: 2, guidance: "Move slowly between sides; use your hands for support." },
      { name: "Half-kneeling hip-flexor stretch", minutes: 2, guidance: "Squeeze the back glute and avoid arching your low back." },
      { name: "Calf stretch", minutes: 2, guidance: "Use a wall for support and keep the stretch mild." },
    ],
  },
  {
    slug: "hip_ankle_mobility_15",
    name: "Hip + ankle mobility",
    durationMinutes: 15,
    description: "Running-focused mobility for hips, ankles, and lower legs.",
    movements: [
      { name: "Easy walk in place", minutes: 2, guidance: "Keep the effort very easy." },
      { name: "Ankle rocks", minutes: 3, guidance: "Alternate sides and keep each heel planted." },
      { name: "Adductor rock-back", minutes: 3, guidance: "Keep your spine long and use a pain-free range." },
      { name: "90/90 hip switches", minutes: 3, guidance: "Move with control; support yourself with your hands." },
      { name: "Half-kneeling hip-flexor stretch", minutes: 2, guidance: "Keep ribs stacked over hips." },
      { name: "Bent-knee calf stretch", minutes: 2, guidance: "Let the knee bend while the heel stays down." },
    ],
  },
  {
    slug: "gentle_yoga_20",
    name: "Gentle yoga flow",
    durationMinutes: 20,
    description: "A low-intensity whole-body flow with no performance target.",
    movements: [
      { exerciseSlug: "childs_pose_breathing", name: "Breathing + Child’s Pose", minutes: 3, guidance: "Settle into a comfortable position; do not force depth." },
      { exerciseSlug: "cat_cow_thoracic_rotation", name: "Cat–Cow + Thoracic Rotation", minutes: 4, guidance: "Move slowly with your breath." },
      { exerciseSlug: "gentle_low_lunge_flow", name: "Gentle Low-Lunge Flow", minutes: 5, guidance: "Use padding and shorten the stance if the knee is uncomfortable." },
      { exerciseSlug: "down_dog_calf_pedal", name: "Down Dog to Calf Pedal", minutes: 3, guidance: "Keep knees soft and alternate heels gently." },
      { exerciseSlug: "supine_figure_four", name: "Supine Figure-Four Stretch", minutes: 3, guidance: "Keep the stretch mild and even between sides." },
      { exerciseSlug: "relaxed_diaphragmatic_breathing", name: "Relaxed Diaphragmatic Breathing", minutes: 2, guidance: "Finish lying or seated with slow breathing." },
    ],
  },
  {
    slug: "upper_body_reset_10",
    name: "Upper-body reset",
    durationMinutes: 10,
    description: "Gentle mobility for the upper back, shoulders, and trunk.",
    movements: [
      { name: "Easy breathing", minutes: 1, guidance: "Relax your jaw, neck, and shoulders." },
      { name: "Cat-cow", minutes: 2, guidance: "Move within a comfortable range." },
      { name: "Open-book rotation", minutes: 3, guidance: "Keep knees stacked and rotate from the upper back." },
      { name: "Wall slides", minutes: 2, guidance: "Keep ribs down and move only as high as comfortable." },
      { name: "Child’s pose reach", minutes: 2, guidance: "Reach to each side without forcing the stretch." },
    ],
  },
];

export function getRecoveryRoutine(slug: string | null | undefined) {
  return RECOVERY_ROUTINES.find((routine) => routine.slug === slug) ?? null;
}

export function isRecoveryRoutineSlug(value: string): boolean {
  return RECOVERY_ROUTINES.some((routine) => routine.slug === value);
}
