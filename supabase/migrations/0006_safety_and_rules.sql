-- Safety event log and the deterministic rule-evaluation audit trail.

create table safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('morning_check_in', 'workout_session', 'during_workout')),
  source_id uuid,
  rule_code text not null,
  knee_start int check (knee_start is null or (knee_start between 0 and 10)),
  knee_current int check (knee_current is null or (knee_current between 0 and 10)),
  knee_change int,
  blocked_workout_types text[] not null default '{}',
  offered_alternatives text[] not null default '{}',
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index safety_events_user_idx on safety_events (user_id, created_at desc);

alter table safety_events enable row level security;
create policy "safety_events_all_own" on safety_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


create table rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in
    ('morning_check_in', 'workout_session', 'plan_generation', 'edit', 'unplanned')),
  source_id uuid,
  rule_set_version text not null default '2026.1',
  inputs_snapshot jsonb not null,
  matched_rules text[] not null default '{}',
  result jsonb not null,
  explanation text not null,
  created_at timestamptz not null default now()
);

create index rule_evaluations_user_idx on rule_evaluations (user_id, created_at desc);

alter table rule_evaluations enable row level security;
create policy "rule_evaluations_all_own" on rule_evaluations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
