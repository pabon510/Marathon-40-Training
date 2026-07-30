/**
 * Human-readable names for workout kinds and plan statuses.
 *
 * This lives in `domain/` because domain-level result text (the post-check-in
 * outcome message) needs it, and `domain/` deliberately never imports from
 * `lib/`. `lib/labels.ts` re-exports these so UI code has one import site.
 */
export const WORKOUT_KIND_LABELS: Record<string, string> = {
  long_run: "Long run",
  easy_run: "Easy run",
  threshold_run: "Threshold run",
  strength_a: "Strength A",
  strength_b: "Strength B",
  strength_full: "Full-body strength",
  combined_short: "Short run + strength",
  upper_core_safety: "Upper/core (safety alternative)",
  active_recovery: "Active recovery",
  rest: "Rest",
  custom: "Custom",
};

export const STATUS_LABELS: Record<string, string> = {
  provisional: "Provisional",
  confirmed: "Confirmed",
  completed: "Completed",
  partial: "Partial",
  skipped: "Skipped",
  blocked: "Blocked",
  replaced: "Replaced",
  incomplete: "Incomplete",
};
