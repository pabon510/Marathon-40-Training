export interface RecoveryMovementContent {
  slug: string;
  name: string;
  movementPattern: string;
  targetAreas: string[];
  setup: string;
  execution: string;
  cues: string[];
  mistakes: string[];
  stopGuidance: string;
  imagePath: string;
  imageAlt: string;
}

export const RECOVERY_MOVEMENTS: RecoveryMovementContent[] = [
  {
    slug: "childs_pose_breathing", name: "Breathing + Child’s Pose", movementPattern: "recovery breathing",
    targetAreas: ["back", "hips", "shoulders", "breathing"],
    setup: "Kneel on a mat with your big toes near each other and knees at a comfortable width. Place padding under your knees if needed.",
    execution: "Sit your hips gently toward your heels, fold your torso forward, and reach your arms ahead or rest them by your sides. Take slow, relaxed breaths without forcing your hips lower.",
    cues: ["Let the mat support you.", "Breathe into your ribs and back.", "Keep the range comfortable."],
    mistakes: ["Forcing the hips to the heels.", "Holding the breath.", "Ignoring knee or ankle pressure."],
    stopGuidance: "Come out of the pose if knee, ankle, hip, or back discomfort increases. Use more padding or switch to relaxed breathing on your back.",
    imagePath: "/exercises/yoga/childs-pose.png", imageAlt: "Man demonstrating Child’s Pose on a yoga mat",
  },
  {
    slug: "cat_cow_thoracic_rotation", name: "Cat–Cow + Thoracic Rotation", movementPattern: "spinal mobility",
    targetAreas: ["spine", "upper back", "shoulders", "trunk"],
    setup: "Start on hands and knees with hands under shoulders and knees under hips. Keep your neck long and use knee padding if helpful.",
    execution: "Alternate gently between rounding and extending your spine with your breath. Then place one hand behind your head and rotate that elbow toward the ceiling while keeping your hips mostly still; repeat on both sides.",
    cues: ["Move one vertebra at a time.", "Rotate from the upper back.", "Keep the hips quiet."],
    mistakes: ["Forcing the low back into a deep arch.", "Shrugging into the shoulders.", "Twisting the hips instead of the upper back."],
    stopGuidance: "Reduce the range or stop if you feel sharp back, neck, wrist, or knee discomfort.",
    imagePath: "/exercises/yoga/cat-cow-thoracic-rotation.png", imageAlt: "Two-position demonstration of Cow Pose and kneeling thoracic rotation",
  },
  {
    slug: "gentle_low_lunge_flow", name: "Gentle Low-Lunge Flow", movementPattern: "hip mobility",
    targetAreas: ["hip flexors", "glutes", "quadriceps", "ankles"],
    setup: "From hands and knees, step one foot forward between your hands and lower the opposite knee onto a folded towel or cushion.",
    execution: "Bring your torso upright and rest your hands lightly on the front thigh. Gently shift forward until you feel a mild stretch at the front of the back hip, return, and repeat slowly before switching sides.",
    cues: ["Front knee stays near the ankle.", "Squeeze the back glute gently.", "Keep ribs stacked over hips."],
    mistakes: ["Using a stance that is too long.", "Arching the low back.", "Driving the front knee inward."],
    stopGuidance: "Shorten the stance, add knee padding, or stop if knee, hip, or back discomfort increases.",
    imagePath: "/exercises/yoga/low-lunge.png", imageAlt: "Man demonstrating a supported low lunge with padding under the back knee",
  },
  {
    slug: "down_dog_calf_pedal", name: "Down Dog to Calf Pedal", movementPattern: "whole-body mobility",
    targetAreas: ["calves", "hamstrings", "shoulders", "upper back"],
    setup: "Start on hands and knees, spread your fingers, tuck your toes, and lift your hips up and back. Keep both knees bent enough to lengthen your spine.",
    execution: "Press the floor away and alternate bending one knee while gently lengthening the opposite heel toward the floor. Move slowly rather than trying to plant either heel.",
    cues: ["Hips move up and back.", "Keep knees soft.", "Pedal the heels gently."],
    mistakes: ["Forcing the heels flat.", "Rounding the back to straighten the legs.", "Collapsing into the shoulders or wrists."],
    stopGuidance: "Return to hands and knees or stop if wrist, shoulder, back, or knee discomfort increases.",
    imagePath: "/exercises/yoga/down-dog-calf-pedal.png", imageAlt: "Two-position demonstration of Downward Dog with alternating calf pedal",
  },
  {
    slug: "supine_figure_four", name: "Supine Figure-Four Stretch", movementPattern: "hip mobility",
    targetAreas: ["glutes", "outer hips", "deep hip rotators"],
    setup: "Lie on your back with both knees bent. Cross one ankle over the opposite thigh just above the knee and keep the crossed foot gently flexed.",
    execution: "Stay here if the stretch is enough, or hold behind the uncrossed thigh and draw it toward you until you feel a mild stretch in the crossed-side hip. Repeat on both sides.",
    cues: ["Keep your head and shoulders relaxed.", "Hold behind the thigh, not the knee.", "Use a mild, steady stretch."],
    mistakes: ["Pressing directly on the crossed knee.", "Pulling so hard that the hips curl off the floor.", "Holding the breath."],
    stopGuidance: "Release the stretch if it creates knee, hip, or back pain; keep the uncrossed foot on the floor for a gentler option.",
    imagePath: "/exercises/yoga/supine-figure-four.png", imageAlt: "Man demonstrating a supine figure-four hip stretch",
  },
  {
    slug: "relaxed_diaphragmatic_breathing", name: "Relaxed Diaphragmatic Breathing", movementPattern: "recovery breathing",
    targetAreas: ["breathing", "rib cage", "trunk", "relaxation"],
    setup: "Lie on your back with knees bent and feet supported, or sit comfortably. Place one hand on your chest and the other on your abdomen.",
    execution: "Breathe in slowly through your nose and let the lower hand rise gently. Exhale without forcing it, allowing your jaw, neck, and shoulders to soften.",
    cues: ["Quiet breath in through the nose.", "Let the lower ribs expand.", "Make the exhale easy and unforced."],
    mistakes: ["Taking very large forced breaths.", "Lifting or tensing the shoulders.", "Treating the breathing as a performance test."],
    stopGuidance: "Return to normal breathing if you feel lightheaded, anxious, or uncomfortable.",
    imagePath: "/exercises/yoga/relaxed-breathing.png", imageAlt: "Man lying comfortably with one hand on his chest and one on his abdomen for relaxed breathing",
  },
];

export function getRecoveryMovement(slug: string | null | undefined) {
  return RECOVERY_MOVEMENTS.find((movement) => movement.slug === slug) ?? null;
}
