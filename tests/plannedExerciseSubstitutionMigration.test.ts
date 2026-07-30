import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/0011_planned_exercise_substitutions.sql",
  "utf8",
);

describe("planned exercise substitution migration", () => {
  it("is additive and never rewrites plans, templates, or workout history", () => {
    const executable = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();
    expect(executable).not.toMatch(/\bupdate\s+(workout_sessions|strength_logs|planned_workouts|strength_template_items)\b/);
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
  });

  it("scopes one override to one workout ordinal and protects it with RLS", () => {
    expect(migration).toContain("unique (planned_workout_id, ordinal)");
    expect(migration).toContain("alter table planned_exercise_substitutions enable row level security");
    expect(migration).toContain("p.user_id = auth.uid()");
  });
});

