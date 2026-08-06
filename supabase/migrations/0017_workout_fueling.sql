-- Additive workout-fueling support. Existing profiles and workout history are
-- preserved; all new profile fields are nullable/defaulted and fueling records
-- attach to a completed session without altering that session.

alter table profiles
  add column body_weight_kg numeric(5,2) check (body_weight_kg is null or body_weight_kg between 30 and 300),
  add column preferred_weight_unit text not null default 'lb'
    check (preferred_weight_unit in ('lb', 'kg')),
  add column typical_daily_caffeine_mg int
    check (typical_daily_caffeine_mg is null or typical_daily_caffeine_mg between 0 and 1000),
  add column caffeine_sensitivity text not null default 'normal'
    check (caffeine_sensitivity in ('low', 'normal', 'high', 'avoid')),
  add column caffeine_cutoff_hour int
    check (caffeine_cutoff_hour is null or caffeine_cutoff_hour between 0 and 23),
  add column dietary_restrictions text[] not null default '{}',
  add column lactose_tolerant boolean;

create table workout_fueling_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_session_id uuid not null unique references workout_sessions(id) on delete cascade,
  rules_version text not null,
  recommendation_snapshot jsonb not null default '{}'::jsonb,
  pre_intake text check (pre_intake is null or pre_intake in ('meal', 'snack', 'gel', 'nothing', 'other', 'not_sure')),
  pre_timing text check (pre_timing is null or pre_timing in ('under_30', '30_60', '1_2_hours', '2_4_hours', 'over_4_hours', 'not_sure')),
  gel_100_count numeric(3,1) not null default 0 check (gel_100_count between 0 and 10),
  gel_100_caf_count numeric(3,1) not null default 0 check (gel_100_caf_count between 0 and 5),
  fluid_intake text check (fluid_intake is null or fluid_intake in ('none', 'some', 'planned_amount', 'not_sure')),
  post_recovery text check (post_recovery is null or post_recovery in ('shake_only', 'shake_plus_carb', 'meal', 'snack', 'nothing_yet', 'other')),
  post_timing text check (post_timing is null or post_timing in ('under_30', '30_60', '1_2_hours', 'over_2_hours', 'not_yet')),
  gi_response text check (gi_response is null or gi_response in ('comfortable', 'mild_issue', 'significant_issue', 'not_sure')),
  energy_response text check (energy_response is null or energy_response in ('steady', 'faded', 'too_full', 'not_sure')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_fueling_logs_user_created_idx
  on workout_fueling_logs (user_id, created_at desc);

create trigger workout_fueling_logs_set_updated_at
  before update on workout_fueling_logs
  for each row execute function set_updated_at();

alter table workout_fueling_logs enable row level security;
create policy "workout_fueling_logs_all_own" on workout_fueling_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
