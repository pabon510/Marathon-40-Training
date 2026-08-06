import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0017_workout_fueling.sql", "utf8");

describe("workout fueling migration", () => {
  it("is additive and does not rewrite existing workout history", () => {
    const executable = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
    expect(executable).not.toMatch(/\bupdate\s+(workout_sessions|run_logs|strength_logs)\b/);
  });

  it("keeps fueling private and attached to an existing session", () => {
    expect(migration).toContain("workout_session_id uuid not null unique references workout_sessions(id) on delete cascade");
    expect(migration).toContain("alter table workout_fueling_logs enable row level security");
    expect(migration).toContain('create policy "workout_fueling_logs_all_own"');
  });

  it("distinguishes caffeinated and non-caffeinated Maurten gels", () => {
    expect(migration).toContain("gel_100_count");
    expect(migration).toContain("gel_100_caf_count");
  });
});
