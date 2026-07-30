import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("0014 active recovery migration", () => {
  const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/0014_active_recovery.sql"), "utf8").toLowerCase();

  it("adds recovery fields and allows the new workout kind", () => {
    expect(sql).toContain("active_recovery_choices");
    expect(sql).toContain("recovery_routine_slug");
    expect(sql).toContain("'active_recovery'");
  });

  it("does not rewrite or delete workout history", () => {
    expect(sql).not.toMatch(/\b(delete|update|truncate)\b/);
    expect(sql).not.toMatch(/drop\s+(table|column)/);
  });
});
