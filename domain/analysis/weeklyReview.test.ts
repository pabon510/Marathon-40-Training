import { describe, expect, it } from "vitest";
import { weeklyReviewResultSchema, weeklyReviewUserPrompt, type WeeklyReviewEvidence } from "./weeklyReview";

const evidence: WeeklyReviewEvidence = {
  rulesVersion: "weekly-evidence-v2",
  period: { weekStart: "2026-07-27", weekEnd: "2026-08-02", complete: false },
  consistency: { planned: 4, credited: 2, completionPercent: 50, checkInDays: 2, workoutDays: 4 },
  remainingPlan: [{ date: "2026-08-01", workoutKind: "long_run", goal: "Build aerobic base." }],
  running: { sessions: 1, minutes: 35, miles: 3.3, strollerRuns: 1, averageEffort: 5, completedAnalyses: 1 },
  strength: { completedSessions: 1, loggedSessions: 1 },
  knee: { recordedDays: 3, maximum: 2, first: 2, latest: 1, direction: "improving" },
  runReviewSignals: { successful: 1, caution: 0, harderThanIntended: 0, pendingNextMorning: 1 },
};

describe("weekly coaching review", () => {
  it("keeps the evidence in the user prompt", () => {
    expect(weeklyReviewUserPrompt(evidence)).toContain('"strollerRuns": 1');
    expect(weeklyReviewUserPrompt(evidence)).toContain('"complete": false');
    expect(weeklyReviewUserPrompt(evidence)).toContain('"workoutKind": "long_run"');
  });

  it("requires one evidence-backed focus", () => {
    expect(weeklyReviewResultSchema.safeParse({
      headline: "A controlled start",
      summary: "The week is still in progress.",
      wins: [], patterns: [],
      nextWeekFocus: { text: "Complete the adapted plan.", evidenceKeys: ["consistency.completionPercent"] },
      dataQualityNote: null, confidence: "medium",
    }).success).toBe(true);
  });
});
