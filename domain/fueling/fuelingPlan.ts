import type { WorkoutKind } from "@/domain/types";

export const FUELING_RULES_VERSION = "fueling-v1.0";

export interface FuelingProfile {
  bodyWeightKg: number | null;
  typicalDailyCaffeineMg: number | null;
  caffeineSensitivity: "low" | "normal" | "high" | "avoid";
  caffeineCutoffHour: number | null;
  dietaryRestrictions: string[];
  lactoseTolerant: boolean | null;
  workoutTimingPreference: "early_morning" | "standard";
}

function beforeStrength(profile: FuelingProfile): string {
  if (profile.workoutTimingPreference === "early_morning") {
    return "Early-morning option: after waking, have water and one small, familiar carbohydrate serving such as a banana, toast with jam, or applesauce. Start when comfortable and save the protein shake for afterward. If you tolerate the shake before lifting, pair it with carbohydrate rather than using it alone.";
  }
  return "Have a normal meal with carbohydrate and protein 1–4 hours beforehand. If your last meal was more than 3–4 hours ago, use a light snack such as a banana or toast alongside the shake.";
}

function beforeShortRun(kind: WorkoutKind, profile: FuelingProfile): string {
  if (profile.workoutTimingPreference === "early_morning") {
    if (kind === "threshold_run") {
      return "Early-morning quality-run option: have water and one small, familiar carbohydrate serving immediately after waking, then begin when comfortable. A banana, toast with jam, applesauce, or a small sports drink works; avoid testing a new food today.";
    }
    return "Early-morning option: water may be enough if this short easy run feels good without food. If you wake hungry or tend to fade, have one small, familiar carbohydrate serving and begin when comfortable.";
  }
  return "Use your normal meal or a familiar carbohydrate snack if you are hungry or have not eaten for several hours.";
}

function beforeLongerRun(profile: FuelingProfile, isOver90: boolean): string {
  if (profile.workoutTimingPreference === "early_morning") {
    return isOver90
      ? "Early-morning option: after waking, drink water and have one small, low-fiber carbohydrate serving. If solid food is uncomfortable, one non-caffeinated Gel 100 immediately before starting may replace that snack; count it as the first planned gel and delay the next gel by about 40–45 minutes."
      : "Early-morning option: after waking, drink water and have one small, familiar carbohydrate serving such as a banana, toast with jam, or applesauce. If solid food is uncomfortable, use one non-caffeinated Gel 100 immediately before starting and do not automatically add another gel during this 60–90 minute run.";
  }
  return isOver90
    ? "Eat a familiar carbohydrate-focused meal 1–4 hours before the run. Do not test unfamiliar foods on a long run."
    : "Eat a familiar carbohydrate-focused meal 1–4 hours before the run. Keep fat and fiber moderate if they bother your stomach.";
}

export interface FuelingPlan {
  applies: boolean;
  workoutKind: WorkoutKind;
  durationMinutes: number;
  before: string;
  during: string;
  after: string;
  productPlan: {
    gel100Count: number;
    gel100CafCount: number;
    gelTiming: string | null;
    shakeRecommended: boolean;
    shakeNeedsCarbohydratePairing: boolean;
  };
  carbohydrateTargetPerHour: { low: number; high: number } | null;
  proteinTargetGrams: { low: number; high: number } | null;
  cautions: string[];
  rulesVersion: string;
}

const RUN_KINDS = new Set<WorkoutKind>(["easy_run", "long_run", "threshold_run"]);
const STRENGTH_KINDS = new Set<WorkoutKind>([
  "strength_a",
  "strength_b",
  "strength_full",
  "combined_short",
  "upper_core_safety",
]);

function proteinTarget(profile: FuelingProfile): { low: number; high: number } {
  if (!profile.bodyWeightKg) return { low: 20, high: 40 };
  const personalized = Math.round(profile.bodyWeightKg * 0.25);
  return { low: Math.max(20, Math.min(40, personalized)), high: 40 };
}

function caffeineCautions(profile: FuelingProfile): string[] {
  const cautions: string[] = [];
  if (profile.caffeineSensitivity === "avoid") {
    cautions.push("Your profile says to avoid caffeine, so use Gel 100 rather than Gel 100 CAF 100.");
  } else if (profile.caffeineSensitivity === "high") {
    cautions.push("You marked high caffeine sensitivity. Prefer Gel 100 unless you deliberately choose a tested caffeine dose.");
  }
  if (profile.typicalDailyCaffeineMg !== null) {
    cautions.push(`Your profile estimates ${profile.typicalDailyCaffeineMg} mg caffeine on a typical day before workout gels are counted.`);
  }
  if (profile.caffeineCutoffHour !== null) {
    const suffix = profile.caffeineCutoffHour >= 12 ? "p.m." : "a.m.";
    const hour = profile.caffeineCutoffHour % 12 || 12;
    cautions.push(`Avoid the CAF 100 at or after your saved caffeine cutoff of ${hour}:00 ${suffix}`);
  }
  cautions.push("Each Gel 100 CAF 100 adds 100 mg caffeine. Count coffee, tea, and other sources in the day's total.");
  return cautions;
}

export function buildFuelingPlan(
  kind: WorkoutKind,
  durationMinutes: number,
  profile: FuelingProfile,
): FuelingPlan {
  const targetProtein = proteinTarget(profile);
  const base = {
    workoutKind: kind,
    durationMinutes,
    proteinTargetGrams: targetProtein,
    rulesVersion: FUELING_RULES_VERSION,
  };

  if (kind === "rest" || kind === "active_recovery" || kind === "custom") {
    return {
      ...base,
      applies: false,
      before: "No special workout fuel is needed. Eat regular balanced meals and hydrate normally.",
      during: "Water as desired.",
      after: "Continue normal meals; recovery work does not require a sports product.",
      productPlan: {
        gel100Count: 0,
        gel100CafCount: 0,
        gelTiming: null,
        shakeRecommended: false,
        shakeNeedsCarbohydratePairing: false,
      },
      carbohydrateTargetPerHour: null,
      cautions: [],
    };
  }

  if (STRENGTH_KINDS.has(kind)) {
    return {
      ...base,
      applies: true,
      before: beforeStrength(profile),
      during: "Water is normally enough for this strength session.",
      after: `One available protein shake supplies 30 g protein and covers today's ${targetProtein.low}–${targetProtein.high} g recovery target. If a normal meal is not coming soon, pair it with a carbohydrate food.`,
      productPlan: {
        gel100Count: 0,
        gel100CafCount: 0,
        gelTiming: null,
        shakeRecommended: true,
        shakeNeedsCarbohydratePairing: true,
      },
      carbohydrateTargetPerHour: null,
      cautions: profile.lactoseTolerant === false
        ? ["Your shake contains milk. Use it only if it fits your tolerance or choose another protein source."]
        : [],
    };
  }

  if (RUN_KINDS.has(kind) || kind === "combined_short") {
    if (durationMinutes < 60) {
      return {
        ...base,
        applies: true,
        before: beforeShortRun(kind, profile),
        during: "No gel is normally needed for this duration. Bring water when conditions or thirst call for it.",
        after: `A normal meal is sufficient. If using the 30 g protein shake, pair it with carbohydrate when the run was demanding or a meal is delayed.`,
        productPlan: {
          gel100Count: 0,
          gel100CafCount: 0,
          gelTiming: null,
          shakeRecommended: false,
          shakeNeedsCarbohydratePairing: true,
        },
        carbohydrateTargetPerHour: null,
        cautions: [],
      };
    }

    if (durationMinutes < 90) {
      return {
        ...base,
        applies: true,
        before: beforeLongerRun(profile, false),
        during: "Fueling is optional at this duration, but marathon practice is useful: take 1 non-caffeinated Maurten Gel 100 with water around 30–40 minutes.",
        after: `Within about 2 hours, have carbohydrate plus ${targetProtein.low}–${targetProtein.high} g protein. Your shake supplies 30 g protein but only 5 g carbohydrate, so pair it with a banana, bagel, oatmeal, cereal, or a normal meal.`,
        productPlan: {
          gel100Count: 1,
          gel100CafCount: 0,
          gelTiming: "30–40 minutes",
          shakeRecommended: true,
          shakeNeedsCarbohydratePairing: true,
        },
        carbohydrateTargetPerHour: null,
        cautions: [
          "Gel 100 CAF 100 may replace the Gel 100 only when you intentionally want 100 mg caffeine and it fits your daily total and sleep timing.",
          ...caffeineCautions(profile),
        ],
      };
    }

    const gel100Count = Math.max(2, Math.ceil(durationMinutes / 45));
    return {
      ...base,
      applies: true,
      before: beforeLongerRun(profile, true),
      during: `Target 30–60 g carbohydrate per hour. Start with ${gel100Count} non-caffeinated Maurten Gel 100 servings, approximately one every 40–45 minutes, with water. Each gel provides 25 g carbohydrate.`,
      after: `Within about 2 hours, have carbohydrate plus ${targetProtein.low}–${targetProtein.high} g protein. One shake covers 30 g protein; add a meaningful carbohydrate food or meal.`,
      productPlan: {
        gel100Count,
        gel100CafCount: 0,
        gelTiming: "First at 30–40 minutes, then every 40–45 minutes",
        shakeRecommended: true,
        shakeNeedsCarbohydratePairing: true,
      },
      carbohydrateTargetPerHour: { low: 30, high: 60 },
      cautions: [
        "Do not replace every gel with Gel 100 CAF 100. If caffeine is intentionally used, substitute at most one planned gel initially and keep the rest non-caffeinated.",
        ...caffeineCautions(profile),
      ],
    };
  }

  return {
    ...base,
    applies: false,
    before: "Use normal meals and hydration.",
    during: "No specific plan available.",
    after: "Use a normal balanced meal.",
    productPlan: {
      gel100Count: 0,
      gel100CafCount: 0,
      gelTiming: null,
      shakeRecommended: false,
      shakeNeedsCarbohydratePairing: false,
    },
    carbohydrateTargetPerHour: null,
    cautions: [],
  };
}
