-- Single-user profile. One row per auth user (in practice, exactly one row
-- for the sole manually created account).

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Andrew',
  timezone text not null default 'America/New_York',
  target_marathon_date date,
  phase text not null default 'base_rebuilding' check (phase in ('base_rebuilding')),
  easy_hr_floor int not null default 140 check (easy_hr_floor > 0 and easy_hr_floor < 220),
  easy_hr_ceiling int not null default 150 check (easy_hr_ceiling > 0 and easy_hr_ceiling < 220),
  calibration_end_date date,
  preferred_long_run_day text not null default 'saturday'
    check (preferred_long_run_day in ('saturday', 'sunday')),
  default_available_weekdays text[] not null default array['tuesday','thursday','friday','saturday'],
  equipment jsonb not null default '{
    "home": {
      "dumbbells_lb": [15, 25],
      "bands": true,
      "bench": true,
      "adjustable_kettlebell_lb": [15, 25, 35, 45]
    },
    "gym": "planet_fitness"
  }'::jsonb,
  reminder_preferences jsonb not null default '{
    "morning_checkin_email": false,
    "weekly_planning_email": false,
    "unlogged_workout_email": false
  }'::jsonb,
  baseline_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_ceiling_above_floor check (easy_hr_ceiling >= easy_hr_floor)
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = user_id);
-- No delete policy: profile deletion is not a V1 requirement.
