import { KNEE_HARD_BLOCK_THRESHOLD } from "@/domain/types";

export type KneeTrend = "improving" | "stable" | "worsening" | "unknown";

/**
 * "Worsening" means higher than the prior recorded daily knee score. With no
 * prior score, trend is unknown and progression is prohibited (but the
 * workout itself is not downgraded on trend alone).
 */
export function computeKneeTrend(current: number, prior: number | null): KneeTrend {
  if (prior === null) return "unknown";
  if (current > prior) return "worsening";
  if (current < prior) return "improving";
  return "stable";
}

/** Ordered so that a later tier is always at least as restrictive. */
export type AdaptationCategory = "full" | "easy_cap" | "upper_core_only" | "blocked";

const CATEGORY_ORDER: AdaptationCategory[] = ["full", "easy_cap", "upper_core_only", "blocked"];

export function moreRestrictive(a: AdaptationCategory, b: AdaptationCategory): AdaptationCategory {
  return CATEGORY_ORDER.indexOf(a) >= CATEGORY_ORDER.indexOf(b) ? a : b;
}

export interface KneeAdaptationResult {
  category: AdaptationCategory;
  progressionAllowed: boolean;
  requiresPainNeutralLowerBody: boolean;
  reasonCode:
    | "NO_CHANGE"
    | "KNEE_WORSENING_0_2"
    | "KNEE_IMPROVING_3_5_NO_INCREASE"
    | "KNEE_STABLE_3_5_THRESHOLD_DOWNGRADE"
    | "KNEE_WORSENING_3_5"
    | "KNEE_HARD_BLOCK";
  explanation: string;
}

/**
 * Applies the knee rules from docs/ADAPTATION_RULES.md. This function only
 * covers the knee layer; it does not know about the caller's planned
 * workout kind, so `evaluateAdaptation` maps `category` onto the actual
 * planned workout afterward.
 */
export function evaluateKneeAdaptation(kneeScore: number, trend: KneeTrend): KneeAdaptationResult {
  if (kneeScore >= KNEE_HARD_BLOCK_THRESHOLD) {
    return {
      category: "blocked",
      progressionAllowed: false,
      requiresPainNeutralLowerBody: false,
      reasonCode: "KNEE_HARD_BLOCK",
      explanation: `Knee discomfort is ${kneeScore}/10, which hard-blocks running and lower-body strength today.`,
    };
  }

  if (kneeScore >= 3) {
    // 3-5 band
    if (trend === "worsening") {
      return {
        category: "upper_core_only",
        progressionAllowed: false,
        requiresPainNeutralLowerBody: false,
        reasonCode: "KNEE_WORSENING_3_5",
        explanation: `Knee discomfort is ${kneeScore}/10 and worsening, so today's running and lower-body strength became upper-body/core, mobility, walking, or rest.`,
      };
    }
    if (trend === "stable" || trend === "unknown") {
      return {
        category: "easy_cap",
        progressionAllowed: false,
        requiresPainNeutralLowerBody: true,
        reasonCode: "KNEE_STABLE_3_5_THRESHOLD_DOWNGRADE",
        explanation: `Knee discomfort is ${kneeScore}/10 and stable, so today's threshold/interval work became an easy run, and any lower-body strength is limited to pain-neutral movements.`,
      };
    }
    // improving
    return {
      category: "easy_cap",
      progressionAllowed: false,
      requiresPainNeutralLowerBody: false,
      reasonCode: "KNEE_IMPROVING_3_5_NO_INCREASE",
      explanation: `Knee discomfort is ${kneeScore}/10 and improving. Easy running is fine, but no duration/intensity increase today.`,
    };
  }

  // 0-2 band
  if (trend === "worsening") {
    return {
      category: "full",
      progressionAllowed: false,
      requiresPainNeutralLowerBody: false,
      reasonCode: "KNEE_WORSENING_0_2",
      explanation: `Knee discomfort is low (${kneeScore}/10) but worsening, so today's plan is retained without progression; other recovery inputs may still shorten it.`,
    };
  }

  return {
    category: "full",
    progressionAllowed: true,
    requiresPainNeutralLowerBody: false,
    reasonCode: "NO_CHANGE",
    explanation: "Knee discomfort is low and stable or improving, so today's planned workout is kept.",
  };
}
