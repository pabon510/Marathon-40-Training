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
      { exerciseSlug: "easy_breathing", name: "Easy Breathing", minutes: 1, guidance: "Breathe slowly through your nose and let your shoulders relax." },
      { exerciseSlug: "gentle_cat_cow", name: "Gentle Cat–Cow", minutes: 1, guidance: "Move gently through a comfortable spinal range." },
      { exerciseSlug: "standing_ankle_rocks", name: "Standing Ankle Rocks", minutes: 2, guidance: "Keep the heel down and glide the knee forward without forcing range." },
      { exerciseSlug: "ninety_ninety_hip_switches", name: "90/90 Hip Switches", minutes: 2, guidance: "Move slowly between sides; use your hands for support." },
      { exerciseSlug: "half_kneeling_hip_flexor_stretch", name: "Half-Kneeling Hip-Flexor Stretch", minutes: 2, guidance: "Squeeze the back glute and avoid arching your low back." },
      { exerciseSlug: "wall_calf_stretch", name: "Wall Calf Stretch", minutes: 2, guidance: "Use a wall for support and keep the stretch mild." },
    ],
  },
  {
    slug: "hip_ankle_mobility_15",
    name: "Hip + ankle mobility",
    durationMinutes: 15,
    description: "Running-focused mobility for hips, ankles, and lower legs.",
    movements: [
      { exerciseSlug: "easy_walk_in_place", name: "Easy Walk in Place", minutes: 2, guidance: "Keep the effort very easy." },
      { exerciseSlug: "standing_ankle_rocks", name: "Standing Ankle Rocks", minutes: 3, guidance: "Alternate sides and keep each heel planted." },
      { exerciseSlug: "adductor_rock_back", name: "Adductor Rock-Back", minutes: 3, guidance: "Keep your spine long and use a pain-free range." },
      { exerciseSlug: "ninety_ninety_hip_switches", name: "90/90 Hip Switches", minutes: 3, guidance: "Move with control; support yourself with your hands." },
      { exerciseSlug: "half_kneeling_hip_flexor_stretch", name: "Half-Kneeling Hip-Flexor Stretch", minutes: 2, guidance: "Keep ribs stacked over hips." },
      { exerciseSlug: "bent_knee_calf_stretch", name: "Bent-Knee Calf Stretch", minutes: 2, guidance: "Let the knee bend while the heel stays down." },
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
      { exerciseSlug: "easy_breathing", name: "Easy Breathing", minutes: 1, guidance: "Relax your jaw, neck, and shoulders." },
      { exerciseSlug: "gentle_cat_cow", name: "Gentle Cat–Cow", minutes: 2, guidance: "Move within a comfortable range." },
      { exerciseSlug: "open_book_rotation", name: "Open-Book Rotation", minutes: 3, guidance: "Keep knees stacked and rotate from the upper back." },
      { exerciseSlug: "gentle_wall_slides", name: "Gentle Wall Slides", minutes: 2, guidance: "Keep ribs down and move only as high as comfortable." },
      { exerciseSlug: "childs_pose_side_reach", name: "Child’s Pose Side Reach", minutes: 2, guidance: "Reach to each side without forcing the stretch." },
    ],
  },
];

export function getRecoveryRoutine(slug: string | null | undefined) {
  return RECOVERY_ROUTINES.find((routine) => routine.slug === slug) ?? null;
}

export function isRecoveryRoutineSlug(value: string): boolean {
  return RECOVERY_ROUTINES.some((routine) => routine.slug === value);
}
