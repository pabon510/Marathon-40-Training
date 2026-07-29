/**
 * Curated V1 exercise library content, per docs/EXERCISE_LIBRARY.md. This is
 * the single source of truth consumed by scripts/seed-profile.ts to
 * idempotently upsert exercise_definitions / exercise_variants /
 * strength_templates / strength_template_items. Kept as plain data (not
 * DB-shaped rows) so it can also be unit-tested for content-depth
 * completeness without touching Supabase.
 */

/** How the number entered in the "load" field should be interpreted. */
export type LoadBasis =
  | "machine_total"
  | "per_dumbbell"
  | "per_hand"
  | "single_implement"
  | "bodyweight"
  | "band";

export type LoadType = "weighted" | "bodyweight" | "band" | "machine";

/** Whether a prescribed rep count means total reps or reps on each side. */
export type RepBasis = "total" | "per_side";
export type PrescriptionMetric = "reps" | "seconds" | "distance_feet" | "steps" | "breaths";
export type SideMode = "bilateral" | "alternating" | "per_side";
export type ProgrammingRole =
  | "primary"
  | "secondary"
  | "accessory"
  | "regression"
  | "progression"
  | "safety_alternative"
  | "warmup";
export type HistoryCompatibility = "exact_only" | "same_family";

export interface ExerciseMetadataV2 {
  familySlug: string;
  programmingRole: ProgrammingRole;
  prescriptionMetric: PrescriptionMetric;
  sideMode: SideMode;
  defaultTempo: string | null;
  defaultDurationSeconds: number | null;
  defaultDistanceFeet: number | null;
  historyCompatibility: HistoryCompatibility;
  progressionExerciseSlugs: string[];
  regressionExerciseSlugs: string[];
  substitutionExerciseSlugs: string[];
  safetyAlternativeEligible: boolean;
  activeForNewPlans: boolean;
  legacyDisplayOnly: boolean;
  selectionPriority: number;
  rotationEligible: boolean;
}

export interface ExerciseContent {
  slug: string;
  name: string;
  movementPattern: string;
  targetMuscles: string[];
  equipment: string[];
  setup: string;
  execution: string;
  cues: string[];
  mistakes: string[];
  stopSubstituteGuidance: string;
  isLowerBody: boolean;
  /**
   * Every load type this exercise legitimately supports. A leg press is
   * machine-only; a pushup is bodyweight-only. The logging UI offers only
   * these, and the recommendation engine will never suggest a type outside
   * this list.
   */
  allowedLoadTypes: LoadType[];
  /** How to read the load number (machine total vs per dumbbell vs per hand...). */
  loadBasis: LoadBasis;
  /** Which load type the logging form should preselect. */
  defaultLoadType: LoadType;
  /** Whether prescribed reps are total or per side. */
  repBasis: RepBasis;
  /** One explicit sentence telling the user exactly what number to enter. */
  loadingInstructions: string;
  /** Where the weight is physically held/placed. */
  loadPosition: string;
  /** Optional note about how to start (e.g. bodyweight before adding load). */
  startLoadNote: string;
  /** Smallest practical load increase for this exercise, in pounds. */
  loadIncrementLb: number;
  /**
   * Phase-1 metadata is optional in the authored catalogue so existing
   * records remain data-compatible. `getExerciseMetadataV2` below supplies
   * deterministic conservative defaults until each record is explicitly
   * classified during the visible library expansion.
   */
  metadataV2?: Partial<ExerciseMetadataV2>;
  variants: {
    location: "gym" | "home" | "either";
    equivalenceGroup: string;
    equipmentRequirements: string[];
    progressionMethods: string[];
    contraindicationTags: string[];
    isShortOption: boolean;
    selectionPriority?: number;
    programmingRole?: ProgrammingRole;
    rotationEligible?: boolean;
  }[];
}

/**
 * Conservative V2 defaults. Nothing rotates implicitly, history stays tied
 * to the exact exercise, and every existing exercise remains available.
 */
export function getExerciseMetadataV2(exercise: ExerciseContent): ExerciseMetadataV2 {
  const role: ProgrammingRole = exercise.variants.some((v) => v.isShortOption) ? "regression" : "primary";
  return {
    familySlug: exercise.slug,
    programmingRole: role,
    prescriptionMetric: "reps",
    sideMode: exercise.repBasis === "per_side" ? "per_side" : "bilateral",
    defaultTempo: null,
    defaultDurationSeconds: null,
    defaultDistanceFeet: null,
    historyCompatibility: "exact_only",
    progressionExerciseSlugs: [],
    regressionExerciseSlugs: [],
    substitutionExerciseSlugs: [],
    safetyAlternativeEligible: !exercise.isLowerBody,
    activeForNewPlans: true,
    legacyDisplayOnly: false,
    selectionPriority: 100,
    rotationEligible: false,
    ...exercise.metadataV2,
  };
}

const STOP_LOWER_BODY = "Stop or substitute this exercise if knee discomfort increases during or after.";

export const EXERCISES: ExerciseContent[] = [
  {
    slug: "leg_press",
    name: "Leg press",
    movementPattern: "squat",
    targetMuscles: ["quadriceps", "glutes", "hamstrings"],
    equipment: ["leg press machine"],
    setup: "Sit in the machine with feet shoulder-width on the platform, knees tracking over toes, low back flat against the pad.",
    execution: "Lower under control until knees reach about 90 degrees, then press through the whole foot back to the start without locking the knees hard at the top.",
    cues: ["Push the floor away.", "Knees track over your toes.", "Control the lowering phase."],
    mistakes: ["Letting knees cave inward.", "Bouncing at the bottom.", "Locking knees out hard at the top."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["machine"],
    loadBasis: "machine_total",
    defaultLoadType: "machine",
    repBasis: "total",
    loadingInstructions: "Enter the TOTAL weight shown on the machine (the full stack or all plates loaded), not the weight per side.",
    loadPosition: "Feet on the platform, back against the pad",
    startLoadNote: "",
    loadIncrementLb: 10,
    variants: [
      { location: "gym", equivalenceGroup: "squat", equipmentRequirements: ["leg press machine"], progressionMethods: ["reps", "load"], contraindicationTags: ["knee"], isShortOption: false },
    ],
  },
  {
    slug: "goblet_squat",
    name: "Goblet squat",
    movementPattern: "squat",
    targetMuscles: ["quadriceps", "glutes", "core"],
    equipment: ["dumbbell or kettlebell"],
    setup: "Hold a dumbbell or kettlebell vertically at chest height, feet just outside shoulder width, toes slightly turned out.",
    execution: "Sit the hips back and down between the heels, keeping the chest tall, then drive back up through the whole foot.",
    cues: ["Sit back, not just down.", "Keep the weight close to your chest.", "Drive through your whole foot."],
    mistakes: ["Knees caving inward.", "Heels lifting off the floor.", "Rounding the low back at the bottom."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["weighted"],
    loadBasis: "single_implement",
    defaultLoadType: "weighted",
    repBasis: "total",
    loadingInstructions: "Enter the weight of the ONE dumbbell or kettlebell you are holding.",
    loadPosition: "Held vertically against the chest with both hands",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "home", equivalenceGroup: "squat", equipmentRequirements: ["dumbbell", "kettlebell"], progressionMethods: ["reps", "load", "tempo"], contraindicationTags: ["knee"], isShortOption: false },
    ],
  },
  {
    slug: "bench_box_squat",
    name: "Bench box squat",
    movementPattern: "squat",
    targetMuscles: ["quadriceps", "glutes"],
    equipment: ["bench or sturdy box"],
    setup: "Stand in front of a bench or sturdy box with feet shoulder-width apart.",
    execution: "Lower with control until you lightly touch the bench with your hips, then stand back up. Use hands for support if needed.",
    cues: ["Reach hips back to the bench.", "Tap and stand, don't collapse down.", "Keep knees tracking over toes."],
    mistakes: ["Dropping hard onto the bench.", "Letting knees cave in.", "Using momentum instead of control."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["bodyweight", "weighted"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight by default. If you add load, enter the weight of the ONE dumbbell held at your chest.",
    loadPosition: "Bodyweight, or one dumbbell at the chest",
    startLoadNote: "Start with bodyweight until the depth and knee comfort feel easy.",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "squat", equipmentRequirements: ["bench"], progressionMethods: ["reps", "tempo"], contraindicationTags: ["knee"], isShortOption: true },
    ],
  },
  {
    slug: "db_rdl",
    name: "Dumbbell Romanian deadlift",
    movementPattern: "hinge",
    targetMuscles: ["hamstrings", "glutes", "low back"],
    equipment: ["dumbbells or kettlebell"],
    setup: "Stand holding dumbbells in front of the thighs, feet hip-width apart, soft bend in the knees.",
    execution: "Hinge at the hips, pushing them back while lowering the weights along the legs, keeping the back flat, then drive the hips forward to stand.",
    cues: ["Push your hips back first.", "Keep the weight close to your legs.", "Flat back the whole way down."],
    mistakes: ["Rounding the low back.", "Bending the knees like a squat instead of hinging.", "Letting the weight drift away from the legs."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["weighted"],
    loadBasis: "per_dumbbell",
    defaultLoadType: "weighted",
    repBasis: "total",
    loadingInstructions: "Enter the weight of ONE dumbbell — you are holding one in each hand, so 25 means a 25 lb dumbbell per hand.",
    loadPosition: "One dumbbell in each hand, in front of the thighs",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "hinge", equipmentRequirements: ["dumbbells"], progressionMethods: ["reps", "load", "tempo"], contraindicationTags: ["knee", "low_back"], isShortOption: false },
    ],
  },
  {
    slug: "reduced_range_db_rdl",
    name: "Reduced-range dumbbell RDL",
    movementPattern: "hinge",
    targetMuscles: ["hamstrings", "glutes"],
    equipment: ["dumbbells"],
    setup: "Same setup as the dumbbell RDL, standing tall holding dumbbells in front of the thighs.",
    execution: "Hinge through a smaller, comfortable range — only as far as feels controlled — then return to standing.",
    cues: ["Smaller range, same flat back.", "Stop the descent before any strain.", "Squeeze the glutes to stand."],
    mistakes: ["Forcing extra range to match a full RDL.", "Rounding the back to reach further."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["weighted"],
    loadBasis: "per_dumbbell",
    defaultLoadType: "weighted",
    repBasis: "total",
    loadingInstructions: "Enter the weight of ONE dumbbell — you are holding one in each hand.",
    loadPosition: "One dumbbell in each hand, in front of the thighs",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "hinge", equipmentRequirements: ["dumbbells"], progressionMethods: ["reps", "range"], contraindicationTags: ["knee", "low_back"], isShortOption: true },
    ],
  },
  {
    slug: "step_up",
    name: "Step-up",
    movementPattern: "single_leg",
    targetMuscles: ["quadriceps", "glutes"],
    equipment: ["bench, box, or sturdy step"],
    setup: "Stand facing a step or bench at a height that keeps the front knee comfortable, one foot planted fully on top.",
    execution: "Press through the top foot to stand fully upright on the step, then lower back down with control. Alternate legs or complete one side at a time.",
    cues: ["Drive through the whole front foot.", "Stand all the way up, don't just lean.", "Control the lowering step."],
    mistakes: ["Pushing off the bottom leg instead of the top leg.", "Using a step too high for comfortable knee tracking.", "Rushing the lowering phase."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["bodyweight", "weighted"],
    loadBasis: "per_hand",
    defaultLoadType: "bodyweight",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER LEG. If you add dumbbells, enter the weight of ONE dumbbell (the weight per hand).",
    loadPosition: "One dumbbell in each hand at your sides, or bodyweight",
    startLoadNote: "Begin with bodyweight. Add dumbbells only once your control and knee comfort are good.",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "single_leg", equipmentRequirements: ["bench or box"], progressionMethods: ["reps", "load", "unilateral"], contraindicationTags: ["knee"], isShortOption: false },
    ],
  },
  {
    slug: "assisted_split_squat",
    name: "Assisted split squat",
    movementPattern: "single_leg",
    targetMuscles: ["quadriceps", "glutes"],
    equipment: ["chair or wall for support"],
    setup: "Take a short split stance with one foot forward, holding a chair or wall for light balance support.",
    execution: "Lower straight down a short, comfortable distance, keeping the front knee tracking over the foot, then press back up.",
    cues: ["Use your hand for balance, not to push yourself up.", "Small controlled range.", "Front knee stays over the foot."],
    mistakes: ["Letting the front knee drift past the toes aggressively.", "Going deeper than feels controlled.", "Rushing the tempo."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["bodyweight", "weighted"],
    loadBasis: "per_hand",
    defaultLoadType: "bodyweight",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER LEG. Bodyweight by default; if you add dumbbells, enter the weight per hand.",
    loadPosition: "Bodyweight with light hand support, or one dumbbell in each hand",
    startLoadNote: "Begin with bodyweight and light hand support for balance.",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "single_leg", equipmentRequirements: ["chair or wall"], progressionMethods: ["reps", "range", "tempo"], contraindicationTags: ["knee"], isShortOption: true },
    ],
  },
  {
    slug: "hip_thrust_glute_bridge",
    name: "Hip thrust / glute bridge",
    movementPattern: "glutes",
    targetMuscles: ["glutes", "hamstrings"],
    equipment: ["bench (optional)", "dumbbell (optional)"],
    setup: "Shoulders (or upper back, for the bench version) supported, feet flat, knees bent, optional dumbbell across the hips.",
    execution: "Drive through the heels to lift the hips until the body forms a straight line from shoulders to knees, squeeze the glutes at the top, then lower with control.",
    cues: ["Drive through your heels.", "Squeeze the glutes hard at the top.", "Don't overextend the low back."],
    mistakes: ["Arching the low back instead of squeezing the glutes.", "Pushing through the toes instead of the heels.", "Rushing the rep."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["bodyweight", "weighted"],
    loadBasis: "single_implement",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight by default. If you add load, enter the weight of the ONE dumbbell resting across your hips.",
    loadPosition: "One dumbbell across the front of the hips",
    startLoadNote: "Begin with bodyweight until you can squeeze hard at the top for all reps.",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "glutes", equipmentRequirements: [], progressionMethods: ["reps", "load", "tempo"], contraindicationTags: ["knee"], isShortOption: false },
    ],
  },
  {
    slug: "floor_bridge",
    name: "Floor glute bridge",
    movementPattern: "glutes",
    targetMuscles: ["glutes", "hamstrings"],
    equipment: [],
    setup: "Lie on your back, knees bent, feet flat on the floor hip-width apart.",
    execution: "Drive through the heels to lift the hips into a straight line from shoulders to knees, squeeze, then lower slowly.",
    cues: ["Drive through your heels.", "Squeeze glutes at the top.", "Lower with control, don't drop."],
    mistakes: ["Arching through the low back.", "Feet too close or too far from the hips."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["bodyweight"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight — no load to enter.",
    loadPosition: "Bodyweight",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "glutes", equipmentRequirements: [], progressionMethods: ["reps", "tempo"], contraindicationTags: ["knee"], isShortOption: true },
    ],
  },
  {
    slug: "seated_leg_curl",
    name: "Seated or lying leg curl",
    movementPattern: "hamstrings",
    targetMuscles: ["hamstrings"],
    equipment: ["leg curl machine"],
    setup: "Sit or lie in the machine with the pad positioned just above the heels, knees aligned with the machine's pivot.",
    execution: "Curl the pad down/back under control through a full comfortable range, then return without letting the weight stack slam.",
    cues: ["Control both directions.", "Keep hips pressed into the pad.", "Full comfortable range, not forced."],
    mistakes: ["Using momentum to kick the weight.", "Hips lifting off the pad.", "Cutting the range short."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["machine"],
    loadBasis: "machine_total",
    defaultLoadType: "machine",
    repBasis: "total",
    loadingInstructions: "Enter the TOTAL weight shown on the machine stack.",
    loadPosition: "Machine pad just above the heels",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "gym", equivalenceGroup: "hamstrings", equipmentRequirements: ["leg curl machine"], progressionMethods: ["reps", "load"], contraindicationTags: ["knee"], isShortOption: false },
    ],
  },
  {
    slug: "bridge_walkout",
    name: "Glute bridge walkout / band hamstring curl",
    movementPattern: "hamstrings",
    targetMuscles: ["hamstrings", "glutes"],
    equipment: ["slider or towel, or band"],
    setup: "Lie on your back in a bridge position with heels on a slider/towel (or a band looped around the ankles/a sturdy anchor).",
    execution: "From the bridged position, slide the heels away and back under control, or curl against band resistance, keeping the hips lifted throughout.",
    cues: ["Keep hips lifted the whole time.", "Move slowly, especially sliding out.", "Squeeze hamstrings/glutes throughout."],
    mistakes: ["Letting hips sag toward the floor.", "Moving too fast to control the slide."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["bodyweight", "band"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight, or select a band level if you are using a band.",
    loadPosition: "Bodyweight, or a band around the ankles",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "home", equivalenceGroup: "hamstrings", equipmentRequirements: ["slider or towel", "band"], progressionMethods: ["reps", "tempo", "range"], contraindicationTags: ["knee"], isShortOption: false },
    ],
  },
  {
    slug: "isometric_bridge",
    name: "Isometric hamstring bridge hold",
    movementPattern: "hamstrings",
    targetMuscles: ["hamstrings", "glutes"],
    equipment: [],
    setup: "Lie on your back, heels on the floor (or a low support), knees bent.",
    execution: "Lift into a bridge and hold the position, squeezing the hamstrings and glutes for the prescribed time.",
    cues: ["Squeeze and hold, don't pulse.", "Breathe steadily through the hold.", "Keep hips level."],
    mistakes: ["Letting hips drift down mid-hold.", "Holding your breath."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["bodyweight"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight hold — no load to enter. Record the hold time in seconds in the reps field if you find that useful.",
    loadPosition: "Bodyweight",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "hamstrings", equipmentRequirements: [], progressionMethods: ["tempo"], contraindicationTags: ["knee"], isShortOption: true },
    ],
  },
  {
    slug: "cable_hip_abduction",
    name: "Cable or machine hip abduction",
    movementPattern: "hip_abductors",
    targetMuscles: ["gluteus medius", "hip abductors"],
    equipment: ["cable machine or hip abduction machine"],
    setup: "Attach the ankle cuff to the cable (or sit in the abduction machine) with pads set against the outside of the leg/knees.",
    execution: "Move the leg outward away from the body under control, then return without letting the weight stack slam.",
    cues: ["Move from the hip, not the low back.", "Controlled tempo both ways.", "Keep the torso still."],
    mistakes: ["Leaning the torso to help swing the leg.", "Using momentum instead of a controlled contraction."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["machine"],
    loadBasis: "machine_total",
    defaultLoadType: "machine",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER LEG. Enter the TOTAL weight shown on the cable stack or machine.",
    loadPosition: "Ankle cuff on the working leg, or machine pads outside the knees",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "gym", equivalenceGroup: "hip_abductors", equipmentRequirements: ["cable machine"], progressionMethods: ["reps", "load"], contraindicationTags: ["knee", "hip"], isShortOption: false },
    ],
  },
  {
    slug: "band_lateral_walk",
    name: "Band lateral walk",
    movementPattern: "hip_abductors",
    targetMuscles: ["gluteus medius", "hip abductors"],
    equipment: ["mini band"],
    setup: "Place a mini band around the legs above the knees or around the ankles, feet hip-width apart in a quarter-squat stance.",
    execution: "Step sideways under control, keeping tension on the band and knees tracking over the toes, then return the same number of steps the other direction.",
    cues: ["Keep tension on the band the whole time.", "Stay low in the quarter-squat.", "Small, controlled steps."],
    mistakes: ["Standing up tall between steps.", "Letting the knees cave inward.", "Taking steps too large to control."],
    stopSubstituteGuidance: STOP_LOWER_BODY,
    isLowerBody: true,
    allowedLoadTypes: ["band"],
    loadBasis: "band",
    defaultLoadType: "band",
    repBasis: "total",
    loadingInstructions: "Select a band level rather than entering a weight.",
    loadPosition: "Band above the knees or around the ankles",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "home", equivalenceGroup: "hip_abductors", equipmentRequirements: ["mini band"], progressionMethods: ["reps", "range"], contraindicationTags: ["knee", "hip"], isShortOption: false },
    ],
  },
  {
    slug: "clamshell",
    name: "Banded clamshell",
    movementPattern: "hip_abductors",
    targetMuscles: ["gluteus medius", "hip abductors"],
    equipment: ["mini band"],
    setup: "Side-lying, hips/knees bent, band above knees, feet together, pelvis stacked.",
    execution: "Keep feet together and lift the top knee without rolling the pelvis; lower with control.",
    cues: ["Stack the hips.", "Move from the side glute.", "Use a small controlled range."],
    mistakes: ["Rolling backward.", "Separating feet.", "Rushing."],
    stopSubstituteGuidance: "Stop if knee or hip pain increases; use an unbanded smaller range or another pain-neutral abductor movement.",
    isLowerBody: true,
    allowedLoadTypes: ["bodyweight", "band"],
    loadBasis: "band",
    defaultLoadType: "bodyweight",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER SIDE. Bodyweight by default, or select a band level if you are using a band.",
    loadPosition: "Band above the knees (optional)",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "hip_abductors", equipmentRequirements: ["mini band (optional)"], progressionMethods: ["reps", "range"], contraindicationTags: ["knee", "hip"], isShortOption: true },
    ],
  },
  {
    slug: "db_bench_press",
    name: "Dumbbell bench / chest press",
    movementPattern: "horizontal_push",
    targetMuscles: ["chest", "triceps", "shoulders"],
    equipment: ["dumbbells", "bench"],
    setup: "Lie on the bench holding dumbbells at chest level, feet flat on the floor, shoulder blades set back and down.",
    execution: "Press the dumbbells up and slightly in until the arms are extended, then lower under control back to chest level.",
    cues: ["Keep shoulder blades pinned to the bench.", "Press up and slightly together.", "Control the lowering phase."],
    mistakes: ["Flaring elbows out to 90 degrees.", "Bouncing dumbbells off the chest.", "Arching the low back excessively."],
    stopSubstituteGuidance: "Stop or substitute if shoulder pain increases; reduce range or switch to floor press.",
    isLowerBody: false,
    allowedLoadTypes: ["weighted"],
    loadBasis: "per_dumbbell",
    defaultLoadType: "weighted",
    repBasis: "total",
    loadingInstructions: "Enter the weight of ONE dumbbell — you are holding one in each hand.",
    loadPosition: "One dumbbell in each hand at chest level",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "horizontal_push", equipmentRequirements: ["dumbbells", "bench"], progressionMethods: ["reps", "load"], contraindicationTags: ["shoulder"], isShortOption: false },
    ],
  },
  {
    slug: "high_incline_pushup",
    name: "High-incline push-up",
    movementPattern: "horizontal_push",
    targetMuscles: ["chest", "triceps", "shoulders"],
    equipment: ["bench or sturdy elevated surface"],
    setup: "Hands on a bench or elevated sturdy surface, body in a straight line from head to heels.",
    execution: "Lower the chest toward the surface under control, then press back up while keeping the body rigid.",
    cues: ["Keep a straight line from head to heels.", "Elbows at roughly 45 degrees, not flared.", "Control the lowering phase."],
    mistakes: ["Hips sagging or piking up.", "Only moving through a partial range.", "Flaring elbows straight out to the sides."],
    stopSubstituteGuidance: "Stop or substitute if shoulder or wrist pain increases; raise the surface height to reduce difficulty.",
    isLowerBody: false,
    allowedLoadTypes: ["bodyweight"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight — no load to enter. Raise the surface to make it easier, lower it to make it harder.",
    loadPosition: "Bodyweight, hands on the elevated surface",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "horizontal_push", equipmentRequirements: ["bench"], progressionMethods: ["reps", "range", "tempo"], contraindicationTags: ["shoulder"], isShortOption: true },
    ],
  },
  {
    slug: "seated_cable_row",
    name: "Seated cable row",
    movementPattern: "horizontal_pull",
    targetMuscles: ["upper back", "biceps"],
    equipment: ["cable row machine"],
    setup: "Sit at the cable row station with knees softly bent, chest tall, holding the handle with arms extended.",
    execution: "Pull the handle toward the torso, squeezing the shoulder blades together, then extend back out under control.",
    cues: ["Lead with the elbows.", "Squeeze shoulder blades together.", "Control the return, don't let it yank you forward."],
    mistakes: ["Leaning back excessively to pull.", "Rounding the shoulders forward on the return.", "Using momentum instead of the back muscles."],
    stopSubstituteGuidance: "Stop or substitute if shoulder or low-back pain increases.",
    isLowerBody: false,
    allowedLoadTypes: ["machine"],
    loadBasis: "machine_total",
    defaultLoadType: "machine",
    repBasis: "total",
    loadingInstructions: "Enter the TOTAL weight shown on the cable stack.",
    loadPosition: "Both hands on the handle",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "gym", equivalenceGroup: "horizontal_pull", equipmentRequirements: ["cable row machine"], progressionMethods: ["reps", "load"], contraindicationTags: ["shoulder", "low_back"], isShortOption: false },
    ],
  },
  {
    slug: "one_arm_db_row",
    name: "One-arm dumbbell row",
    movementPattern: "horizontal_pull",
    targetMuscles: ["upper back", "biceps"],
    equipment: ["dumbbell", "bench"],
    setup: "One hand and knee supported on a bench, flat back, dumbbell hanging from the free hand.",
    execution: "Pull the dumbbell up toward the hip, squeezing the shoulder blade back, then lower under control.",
    cues: ["Pull with the elbow, not the hand.", "Keep the back flat throughout.", "Control the lowering phase."],
    mistakes: ["Rotating the torso to help pull.", "Rounding the back.", "Using momentum/jerking the weight up."],
    stopSubstituteGuidance: "Stop or substitute if shoulder or low-back pain increases.",
    isLowerBody: false,
    allowedLoadTypes: ["weighted"],
    loadBasis: "single_implement",
    defaultLoadType: "weighted",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER SIDE. Enter the weight of the ONE dumbbell you are rowing.",
    loadPosition: "One dumbbell in the free hand",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "home", equivalenceGroup: "horizontal_pull", equipmentRequirements: ["dumbbell", "bench"], progressionMethods: ["reps", "load"], contraindicationTags: ["shoulder", "low_back"], isShortOption: false },
    ],
  },
  {
    slug: "bench_supported_row",
    name: "Bench-supported row",
    movementPattern: "horizontal_pull",
    targetMuscles: ["upper back", "biceps"],
    equipment: ["bench", "dumbbells (optional)"],
    setup: "Chest supported face-down on an inclined bench (or lying prone), dumbbells hanging or bodyweight only.",
    execution: "Pull the elbows back, squeezing the shoulder blades together, then lower under control.",
    cues: ["Squeeze shoulder blades together.", "Keep the chest pinned to the bench.", "Control the lowering phase."],
    mistakes: ["Lifting the chest off the bench to cheat the range.", "Shrugging instead of rowing."],
    stopSubstituteGuidance: "Stop or substitute if shoulder pain increases.",
    isLowerBody: false,
    allowedLoadTypes: ["bodyweight", "weighted"],
    loadBasis: "per_dumbbell",
    defaultLoadType: "weighted",
    repBasis: "total",
    loadingInstructions: "Enter the weight of ONE dumbbell — you are holding one in each hand.",
    loadPosition: "One dumbbell in each hand, chest supported on the bench",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "horizontal_pull", equipmentRequirements: ["bench"], progressionMethods: ["reps", "load", "tempo"], contraindicationTags: ["shoulder"], isShortOption: true },
    ],
  },
  {
    slug: "db_shoulder_press",
    name: "Dumbbell shoulder press",
    movementPattern: "vertical_push",
    targetMuscles: ["shoulders", "triceps"],
    equipment: ["dumbbells"],
    setup: "Seated or standing, dumbbells at shoulder height, core braced.",
    execution: "Press the dumbbells overhead until the arms are extended, then lower under control back to shoulder height.",
    cues: ["Brace the core, don't overarch the low back.", "Press up and slightly in.", "Control the lowering phase."],
    mistakes: ["Excessive low-back arch.", "Flaring elbows too far forward or back.", "Using leg drive to cheat the press (unless intentionally standing/push-press)."],
    stopSubstituteGuidance: "Stop or substitute if shoulder pain increases.",
    isLowerBody: false,
    allowedLoadTypes: ["weighted"],
    loadBasis: "per_dumbbell",
    defaultLoadType: "weighted",
    repBasis: "total",
    loadingInstructions: "Enter the weight of ONE dumbbell — you are holding one in each hand.",
    loadPosition: "One dumbbell in each hand at shoulder height",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "vertical_push", equipmentRequirements: ["dumbbells"], progressionMethods: ["reps", "load"], contraindicationTags: ["shoulder"], isShortOption: false },
    ],
  },
  {
    slug: "half_kneeling_single_arm_press",
    name: "Half-kneeling single-arm press",
    movementPattern: "vertical_push",
    targetMuscles: ["shoulders", "triceps", "core"],
    equipment: ["dumbbell"],
    setup: "Half-kneeling position (one knee down, opposite foot forward), dumbbell at shoulder height on the same side as the forward foot.",
    execution: "Press the dumbbell overhead while keeping the torso upright and core braced, then lower under control.",
    cues: ["Keep ribs stacked over hips, no leaning back.", "Brace the core throughout.", "Control the lowering phase."],
    mistakes: ["Leaning to the side to press.", "Losing the half-kneeling position.", "Overarching the low back."],
    stopSubstituteGuidance: "Stop or substitute if shoulder pain increases; use lighter load or seated version.",
    isLowerBody: false,
    allowedLoadTypes: ["weighted"],
    loadBasis: "single_implement",
    defaultLoadType: "weighted",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER SIDE. Enter the weight of the ONE dumbbell you are pressing.",
    loadPosition: "One dumbbell at shoulder height on the working side",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "vertical_push", equipmentRequirements: ["dumbbell"], progressionMethods: ["reps", "unilateral"], contraindicationTags: ["shoulder"], isShortOption: true },
    ],
  },
  {
    slug: "lat_pulldown",
    name: "Lat pulldown",
    movementPattern: "vertical_pull",
    targetMuscles: ["upper back", "biceps"],
    equipment: ["lat pulldown machine"],
    setup: "Sit at the pulldown station, thighs secured, grip the bar slightly wider than shoulder width.",
    execution: "Pull the bar down toward the upper chest, squeezing the shoulder blades down and back, then return under control.",
    cues: ["Lead with the elbows down.", "Squeeze the shoulder blades down and back.", "Control the return, don't let it yank you up."],
    mistakes: ["Leaning back excessively to pull.", "Pulling behind the neck.", "Using momentum instead of the back muscles."],
    stopSubstituteGuidance: "Stop or substitute if shoulder pain increases.",
    isLowerBody: false,
    allowedLoadTypes: ["machine"],
    loadBasis: "machine_total",
    defaultLoadType: "machine",
    repBasis: "total",
    loadingInstructions: "Enter the TOTAL weight shown on the machine stack.",
    loadPosition: "Both hands on the bar, thighs under the pad",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "gym", equivalenceGroup: "vertical_pull", equipmentRequirements: ["lat pulldown machine"], progressionMethods: ["reps", "load"], contraindicationTags: ["shoulder"], isShortOption: false },
    ],
  },
  {
    slug: "band_pulldown",
    name: "Band pulldown",
    movementPattern: "vertical_pull",
    targetMuscles: ["upper back", "biceps"],
    equipment: ["resistance band", "secure high anchor"],
    setup: "Anchor a band securely overhead, kneel or stand facing the anchor holding the band with both hands.",
    execution: "Pull the band down toward the chest, squeezing the shoulder blades down and back, then return under control.",
    cues: ["Only use this if the anchor is truly secure.", "Squeeze shoulder blades down and back.", "Control the return."],
    mistakes: ["Using an unstable or unsafe anchor point.", "Leaning back to help pull.", "Letting the band snap back uncontrolled."],
    stopSubstituteGuidance: "Stop or substitute if shoulder pain increases, or if no safely anchored point is available — use the one-arm row substitute instead.",
    isLowerBody: false,
    allowedLoadTypes: ["band"],
    loadBasis: "band",
    defaultLoadType: "band",
    repBasis: "total",
    loadingInstructions: "Select a band level rather than entering a weight.",
    loadPosition: "Both hands on the band, anchored overhead",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "home", equivalenceGroup: "vertical_pull", equipmentRequirements: ["resistance band", "secure anchor"], progressionMethods: ["reps"], contraindicationTags: ["shoulder"], isShortOption: false },
    ],
  },
  {
    slug: "vertical_pull_row_substitute",
    name: "One-arm row substitute (for vertical pull)",
    movementPattern: "vertical_pull",
    targetMuscles: ["upper back", "biceps"],
    equipment: ["dumbbell", "bench"],
    setup: "Same setup as the one-arm dumbbell row: one hand and knee supported on a bench, flat back.",
    execution: "Pull the dumbbell up toward the hip, squeezing the shoulder blade back, then lower under control.",
    cues: ["Pull with the elbow, not the hand.", "Keep the back flat throughout.", "Control the lowering phase."],
    mistakes: ["Rotating the torso to help pull.", "Rounding the back."],
    stopSubstituteGuidance: "Stop or substitute if shoulder or low-back pain increases.",
    isLowerBody: false,
    allowedLoadTypes: ["weighted"],
    loadBasis: "single_implement",
    defaultLoadType: "weighted",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER SIDE. Enter the weight of the ONE dumbbell you are rowing.",
    loadPosition: "One dumbbell in the free hand",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "vertical_pull", equipmentRequirements: ["dumbbell", "bench"], progressionMethods: ["reps", "load"], contraindicationTags: ["shoulder"], isShortOption: true },
    ],
  },
  {
    slug: "dead_bug",
    name: "Dead bug",
    movementPattern: "core_anti_extension",
    targetMuscles: ["deep core", "hip flexors"],
    equipment: [],
    setup: "Lie on your back, arms reaching toward the ceiling, hips and knees bent to 90 degrees.",
    execution: "Slowly lower one arm and the opposite leg toward the floor while keeping the low back flat against the floor, then return and switch sides.",
    cues: ["Press your low back into the floor the whole time.", "Move slowly, don't rush.", "Breathe out as you extend."],
    mistakes: ["Letting the low back arch off the floor.", "Moving too fast to control.", "Holding your breath."],
    stopSubstituteGuidance: "Stop or substitute if this increases knee, hip, or low-back discomfort.",
    isLowerBody: false,
    allowedLoadTypes: ["bodyweight"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight — no load to enter. One rep is one arm-and-opposite-leg extension.",
    loadPosition: "Bodyweight",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "core_anti_extension", equipmentRequirements: [], progressionMethods: ["reps", "tempo", "range"], contraindicationTags: ["low_back"], isShortOption: false },
    ],
  },
  {
    slug: "elevated_dead_bug",
    name: "Elevated dead bug / plank",
    movementPattern: "core_anti_extension",
    targetMuscles: ["deep core"],
    equipment: ["bench or elevated surface (optional)"],
    setup: "Same dead bug position, or a forearm plank with forearms on an elevated bench to reduce difficulty.",
    execution: "Perform the dead bug through a smaller range, or hold the elevated plank keeping a straight line from head to heels.",
    cues: ["Smaller, fully controlled range.", "Keep the low back flat / body in a straight line.", "Breathe steadily throughout."],
    mistakes: ["Forcing full range to match the standard version.", "Letting the hips sag in the plank."],
    stopSubstituteGuidance: "Stop or substitute if this increases knee, hip, or low-back discomfort.",
    isLowerBody: false,
    allowedLoadTypes: ["bodyweight"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight — no load to enter.",
    loadPosition: "Bodyweight, forearms elevated if planking",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "core_anti_extension", equipmentRequirements: [], progressionMethods: ["reps", "range"], contraindicationTags: ["low_back"], isShortOption: true },
    ],
  },
  {
    slug: "plank",
    name: "Forearm plank",
    movementPattern: "core_plank",
    targetMuscles: ["deep core", "shoulders"],
    equipment: [],
    setup: "Forearms on the floor under the shoulders, body in a straight line from head to heels, toes tucked.",
    execution: "Hold the position, bracing the core and glutes, keeping hips level, for the prescribed time.",
    cues: ["Squeeze glutes and brace the core.", "Keep a straight line, no sagging or piking.", "Breathe steadily throughout."],
    mistakes: ["Hips sagging toward the floor.", "Hips piked too high.", "Holding your breath."],
    stopSubstituteGuidance: "Stop or substitute if this increases low-back or shoulder discomfort.",
    isLowerBody: false,
    allowedLoadTypes: ["bodyweight"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "Bodyweight hold — no load to enter. Record the hold time in seconds in the reps field.",
    loadPosition: "Bodyweight, forearms on the floor",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "core_plank", equipmentRequirements: [], progressionMethods: ["tempo"], contraindicationTags: ["low_back", "shoulder"], isShortOption: false },
    ],
  },
  {
    slug: "pallof_press",
    name: "Pallof press",
    movementPattern: "core_anti_rotation",
    targetMuscles: ["obliques", "deep core"],
    equipment: ["resistance band", "secure anchor"],
    setup: "Stand sideways to a band anchored at chest height, holding the band with both hands at the chest.",
    execution: "Press the band straight out in front of the chest and hold briefly, resisting the pull that wants to rotate your torso, then return.",
    cues: ["Resist the rotation, don't let the band pull you.", "Keep the hips and shoulders square.", "Press straight out, not across the body."],
    mistakes: ["Letting the torso rotate toward the anchor.", "Using an unstable anchor point.", "Pressing too fast to control."],
    stopSubstituteGuidance: "Stop or substitute if this increases low-back discomfort.",
    isLowerBody: false,
    allowedLoadTypes: ["band"],
    loadBasis: "band",
    defaultLoadType: "band",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER SIDE. Select a band level rather than entering a weight.",
    loadPosition: "Both hands at the chest, band anchored to your side",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "core_anti_rotation", equipmentRequirements: ["resistance band", "anchor"], progressionMethods: ["reps", "tempo"], contraindicationTags: ["low_back"], isShortOption: false },
    ],
  },
  {
    slug: "tall_kneeling_band_hold",
    name: "Tall-kneeling band anti-rotation hold",
    movementPattern: "core_anti_rotation",
    targetMuscles: ["obliques", "deep core"],
    equipment: ["resistance band", "secure anchor"],
    setup: "Tall-kneeling (both knees down) sideways to a band anchored at chest height, band held at the chest.",
    execution: "Press the band out and hold, resisting rotation, in the more stable tall-kneeling position.",
    cues: ["Stay tall through the torso.", "Resist the pull toward the anchor.", "Keep the hips square."],
    mistakes: ["Sitting back onto the heels.", "Letting the torso rotate."],
    stopSubstituteGuidance: "Stop or substitute if kneeling increases knee discomfort; switch to standing Pallof press instead.",
    isLowerBody: false,
    allowedLoadTypes: ["band"],
    loadBasis: "band",
    defaultLoadType: "band",
    repBasis: "per_side",
    loadingInstructions: "Reps are PER SIDE. Select a band level rather than entering a weight.",
    loadPosition: "Both hands at the chest, band anchored to your side",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "core_anti_rotation", equipmentRequirements: ["resistance band", "anchor"], progressionMethods: ["reps"], contraindicationTags: ["low_back", "knee"], isShortOption: true },
    ],
  },
  {
    slug: "farmer_suitcase_carry",
    name: "Farmer's / suitcase carry",
    movementPattern: "carry",
    targetMuscles: ["grip", "core", "traps"],
    equipment: ["dumbbells or kettlebell"],
    setup: "Stand tall holding a weight in one hand (suitcase) or both hands (farmer's), shoulders back and down.",
    execution: "Walk a set distance or time keeping the torso upright and level, without leaning toward or away from the load.",
    cues: ["Stand tall, shoulders back.", "Don't lean away from the weight.", "Take controlled, even steps."],
    mistakes: ["Leaning the torso to counterbalance the weight.", "Shrugging the shoulders up toward the ears.", "Rushing the walk."],
    stopSubstituteGuidance: "Stop or substitute if grip, shoulder, or knee discomfort increases.",
    isLowerBody: true,
    allowedLoadTypes: ["weighted"],
    loadBasis: "per_hand",
    defaultLoadType: "weighted",
    repBasis: "total",
    loadingInstructions: "Enter the weight PER HAND. Farmer's carry uses one in each hand; suitcase carry uses one hand only.",
    loadPosition: "One dumbbell or kettlebell per hand, hanging at your sides",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "carry", equipmentRequirements: ["dumbbells or kettlebell"], progressionMethods: ["load", "unilateral"], contraindicationTags: ["knee", "shoulder"], isShortOption: false },
    ],
  },
  {
    slug: "shorter_carry",
    name: "Shorter carry / hold",
    movementPattern: "carry",
    targetMuscles: ["grip", "core"],
    equipment: ["dumbbells (lighter)"],
    setup: "Same carry setup with a lighter weight or a static hold instead of walking.",
    execution: "Walk a shorter distance, or simply hold the weight tall for a set time if space is limited.",
    cues: ["Stand tall throughout.", "Keep breathing steadily.", "Set the weight down with control, don't drop it."],
    mistakes: ["Holding your breath.", "Dropping the weight instead of setting it down."],
    stopSubstituteGuidance: "Stop or substitute if grip, shoulder, or knee discomfort increases.",
    isLowerBody: true,
    allowedLoadTypes: ["weighted"],
    loadBasis: "per_hand",
    defaultLoadType: "weighted",
    repBasis: "total",
    loadingInstructions: "Enter the weight PER HAND.",
    loadPosition: "One dumbbell per hand, hanging at your sides",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "carry", equipmentRequirements: ["dumbbells"], progressionMethods: ["load"], contraindicationTags: ["knee", "shoulder"], isShortOption: true },
    ],
  },
  {
    slug: "gentle_mobility",
    name: "Gentle mobility flow",
    movementPattern: "mobility",
    targetMuscles: ["general mobility"],
    equipment: [],
    setup: "Comfortable clothing, enough space to move both arms and legs freely.",
    execution: "Move gently through cat-cow, hip circles, ankle circles, and shoulder rolls, staying well within a comfortable, pain-free range.",
    cues: ["Move slowly and gently.", "Stay well within a comfortable range.", "Breathe steadily throughout."],
    mistakes: ["Forcing range to a point of discomfort.", "Rushing through the movements."],
    stopSubstituteGuidance: "Stop or ease off any movement that increases knee or other discomfort. This is deliberately non-loaded and safe as a lower-body alternative.",
    isLowerBody: false,
    allowedLoadTypes: ["bodyweight"],
    loadBasis: "bodyweight",
    defaultLoadType: "bodyweight",
    repBasis: "total",
    loadingInstructions: "No load — move gently through comfortable ranges.",
    loadPosition: "Bodyweight",
    startLoadNote: "",
    loadIncrementLb: 5,
    variants: [
      { location: "either", equivalenceGroup: "gentle_mobility", equipmentRequirements: [], progressionMethods: [], contraindicationTags: [], isShortOption: true },
    ],
  },
];

export interface TemplateItemContent {
  ordinal: number;
  equivalenceGroup: string;
  setCount: number;
  repRangeLow: number;
  repRangeHigh: number;
  restSeconds: number;
  isOptional: boolean;
  isFinisher: boolean;
  includeInShortVersion: boolean;
}

export interface TemplateContent {
  slug: string;
  name: string;
  goal: string;
  emphasis: string;
  durationMinutes: number;
  items: TemplateItemContent[];
}

export const TEMPLATES: TemplateContent[] = [
  {
    slug: "strength_a",
    name: "Strength A — lower body, hip stability, push, core",
    goal: "Lower body strength, hip stability, upper push, and core.",
    emphasis: "lower_body_hip_stability",
    durationMinutes: 50,
    items: [
      { ordinal: 1, equivalenceGroup: "squat", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 2, equivalenceGroup: "hinge", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 3, equivalenceGroup: "single_leg", setCount: 3, repRangeLow: 8, repRangeHigh: 10, restSeconds: 75, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 4, equivalenceGroup: "horizontal_push", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 5, equivalenceGroup: "horizontal_pull", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 6, equivalenceGroup: "hip_abductors", setCount: 2, repRangeLow: 12, repRangeHigh: 15, restSeconds: 45, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 7, equivalenceGroup: "core_anti_extension", setCount: 3, repRangeLow: 8, repRangeHigh: 10, restSeconds: 45, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 8, equivalenceGroup: "carry", setCount: 2, repRangeLow: 1, repRangeHigh: 1, restSeconds: 60, isOptional: true, isFinisher: true, includeInShortVersion: false },
    ],
  },
  {
    slug: "strength_b",
    name: "Strength B — full body, posterior chain, upper/core",
    goal: "Full-body strength with a posterior-chain and upper-body/core emphasis.",
    emphasis: "full_body_posterior_chain",
    durationMinutes: 50,
    items: [
      { ordinal: 1, equivalenceGroup: "glutes", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 2, equivalenceGroup: "single_leg", setCount: 3, repRangeLow: 8, repRangeHigh: 10, restSeconds: 75, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 3, equivalenceGroup: "hamstrings", setCount: 3, repRangeLow: 10, repRangeHigh: 12, restSeconds: 60, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 4, equivalenceGroup: "vertical_push", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 5, equivalenceGroup: "vertical_pull", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 6, equivalenceGroup: "hip_abductors", setCount: 2, repRangeLow: 12, repRangeHigh: 15, restSeconds: 45, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 7, equivalenceGroup: "core_anti_rotation", setCount: 3, repRangeLow: 8, repRangeHigh: 10, restSeconds: 45, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 8, equivalenceGroup: "horizontal_push", setCount: 2, repRangeLow: 10, repRangeHigh: 15, restSeconds: 60, isOptional: true, isFinisher: true, includeInShortVersion: false },
    ],
  },
  {
    slug: "upper_core_safety",
    name: "Upper/core safety alternative",
    goal: "Full-body-feeling session that excludes all loaded lower-body work, for days running/lower-body strength is restricted.",
    emphasis: "upper_body_core_safety",
    durationMinutes: 35,
    items: [
      { ordinal: 1, equivalenceGroup: "vertical_push", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 2, equivalenceGroup: "horizontal_push", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 3, equivalenceGroup: "horizontal_pull", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 4, equivalenceGroup: "vertical_pull", setCount: 3, repRangeLow: 8, repRangeHigh: 12, restSeconds: 90, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 5, equivalenceGroup: "core_anti_extension", setCount: 3, repRangeLow: 8, repRangeHigh: 10, restSeconds: 45, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 6, equivalenceGroup: "core_anti_rotation", setCount: 2, repRangeLow: 8, repRangeHigh: 10, restSeconds: 45, isOptional: false, isFinisher: false, includeInShortVersion: false },
      { ordinal: 7, equivalenceGroup: "gentle_mobility", setCount: 1, repRangeLow: 1, repRangeHigh: 1, restSeconds: 0, isOptional: true, isFinisher: true, includeInShortVersion: true },
    ],
  },
  {
    slug: "combined_short",
    name: "Combined short run + strength",
    goal: "Short easy HR-guided run or treadmill warmup, then 3-4 high-value strength movements.",
    emphasis: "combined_run_strength",
    durationMinutes: 30,
    items: [
      { ordinal: 1, equivalenceGroup: "hinge", setCount: 2, repRangeLow: 8, repRangeHigh: 12, restSeconds: 60, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 2, equivalenceGroup: "horizontal_push", setCount: 2, repRangeLow: 8, repRangeHigh: 12, restSeconds: 60, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 3, equivalenceGroup: "horizontal_pull", setCount: 2, repRangeLow: 8, repRangeHigh: 12, restSeconds: 60, isOptional: false, isFinisher: false, includeInShortVersion: true },
      { ordinal: 4, equivalenceGroup: "hip_abductors", setCount: 2, repRangeLow: 12, repRangeHigh: 15, restSeconds: 45, isOptional: false, isFinisher: false, includeInShortVersion: true },
    ],
  },
];
