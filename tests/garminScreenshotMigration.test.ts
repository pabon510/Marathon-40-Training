import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0013_garmin_screenshot_import.sql", "utf8");

describe("Garmin screenshot import migration", () => {
  it("is additive and does not rewrite workout history", () => {
    const executable = migration.replace(/--.*$/gm, "").replace(/\s+/g, " ").toLowerCase();
    expect(executable).not.toMatch(/\bdelete\s+from\b/);
    expect(executable).not.toMatch(/\btruncate\b/);
    expect(executable).not.toMatch(/\bdrop\s+(table|column)\b/);
    expect(executable).not.toMatch(/\bupdate\s+(workout_sessions|run_logs)\b/);
  });

  it("preserves historical run logs as manual records and protects imports with RLS", () => {
    expect(migration).toContain("data_source text not null default 'manual'");
    expect(migration).toContain("alter table run_imports enable row level security");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("run_logs_import_id_unique");
  });
});
