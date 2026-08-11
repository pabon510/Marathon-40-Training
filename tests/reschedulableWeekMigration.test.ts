import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0019_reschedulable_week_plans.sql", "utf8");

describe("reschedulable week migration", () => {
  it("adds non-destructive supersession metadata and updates weekly views", () => {
    const executable = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();
    expect(migration).toContain("add column if not exists superseded_at timestamptz");
    expect(migration).toContain("create or replace view v_weekly_plan_completion");
    expect(migration).toContain("create or replace view v_checkin_completion");
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
  });
});
