-- Weekly setup, rolling plan versions, planned workouts, and plan change
-- history (the audit trail shown attached to affected days).

create table weekly_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null, -- Monday
  available_dates date[] not null,
  intended_long_run_date date not null,
  backup_long_run_date date not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create trigger weekly_setups_set_updated_at
  before update on weekly_setups
  for each row execute function set_updated_at();

alter table weekly_setups enable row level security;
create policy "weekly_setups_all_own" on weekly_setups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


create table plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rolling_start_date date not null,
  version_number int not null,
  trigger text not null check (trigger in
    ('initial', 'check_in', 'post_workout', 'missed', 'edit', 'unplanned')),
  source_event_type text,
  source_event_id uuid,
  generated_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, version_number)
);

create index plan_versions_active_idx on plan_versions (user_id, is_active);

alter table plan_versions enable row level security;
create policy "plan_versions_all_own" on plan_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


create table planned_workouts (
  id uuid primary key default gen_random_uuid(),
  plan_version_id uuid not null references plan_versions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  workout_kind text not null check (workout_kind in
    ('long_run', 'easy_run', 'threshold_run', 'strength_a', 'strength_b',
     'strength_full', 'combined_short', 'upper_core_safety', 'rest', 'custom')),
  priority int not null default 0,
  status text not null default 'provisional' check (status in
    ('provisional', 'confirmed', 'completed', 'partial', 'skipped', 'blocked',
     'replaced', 'incomplete')),
  goal text not null,
  planned_duration_minutes int not null,
  run_prescription jsonb,
  strength_template_id uuid references strength_templates(id),
  location_choice text check (location_choice in ('gym', 'home', 'unspecified')) default 'unspecified',
  shorter_alternative jsonb,
  original_workout_id uuid references planned_workouts(id),
  completion_credit_factor numeric(3,2) not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_version_id, local_date)
);

create index planned_workouts_user_date_idx on planned_workouts (user_id, local_date);
create index planned_workouts_plan_version_idx on planned_workouts (plan_version_id);

create trigger planned_workouts_set_updated_at
  before update on planned_workouts
  for each row execute function set_updated_at();

alter table planned_workouts enable row level security;
create policy "planned_workouts_all_own" on planned_workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


create table plan_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  old_plan_version_id uuid references plan_versions(id),
  new_plan_version_id uuid not null references plan_versions(id) on delete cascade,
  local_date date not null,
  old_workout_summary jsonb,
  new_workout_summary jsonb not null,
  reason_code text not null,
  explanation text not null,
  triggering_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index plan_changes_user_date_idx on plan_changes (user_id, local_date);

alter table plan_changes enable row level security;
create policy "plan_changes_all_own" on plan_changes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
