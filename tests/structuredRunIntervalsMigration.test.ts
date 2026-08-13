import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("structured run intervals migration", () => {
  const sql = readFileSync("supabase/migrations/0021_structured_run_intervals.sql", "utf8");

  it("is additive, protected by RLS, and leaves existing run rows untouched", () => {
    expect(sql).toContain("create table if not exists run_interval_steps");
    expect(sql).toContain("alter table run_interval_steps enable row level security");
    expect(sql).toContain('create policy "run_interval_steps_all_own"');
    expect(sql).not.toMatch(/delete\s+from\s+run_logs/i);
    expect(sql).not.toMatch(/update\s+run_logs/i);
    expect(sql).not.toMatch(/drop\s+table/i);
  });
});
