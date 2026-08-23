import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/0022_push_reminders.sql", "utf8");

describe("push reminders migration", () => {
  it("adds private subscription and delivery tables without touching training history", () => {
    expect(migration).toContain("create table push_subscriptions");
    expect(migration).toContain("create table reminder_deliveries");
    expect(migration).toContain("alter table push_subscriptions enable row level security");
    expect(migration).toContain("alter table reminder_deliveries enable row level security");
    expect(migration).toContain("unique (push_subscription_id, reminder_type, local_date)");
    expect(migration).not.toMatch(/delete\s+from/i);
    expect(migration).not.toMatch(/drop\s+(table|column)/i);
    expect(migration).not.toMatch(/update\s+(workout_sessions|run_logs|strength_logs|planned_workouts)/i);
  });
});
