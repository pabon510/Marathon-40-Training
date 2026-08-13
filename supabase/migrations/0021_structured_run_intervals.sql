-- Add reviewed Garmin interval steps without rewriting existing run history.

create table if not exists run_interval_steps (
  id uuid primary key default gen_random_uuid(),
  run_log_id uuid not null references run_logs(id) on delete cascade,
  ordinal int not null check (ordinal > 0),
  step_type text not null check (step_type in ('warmup', 'work', 'recovery', 'cooldown', 'unknown')),
  repetition_number int check (repetition_number is null or repetition_number > 0),
  duration_seconds numeric(8,2) check (duration_seconds is null or duration_seconds >= 0),
  distance_miles numeric(7,3) check (distance_miles is null or distance_miles >= 0),
  average_pace_seconds_per_mile numeric(8,2) check (average_pace_seconds_per_mile is null or average_pace_seconds_per_mile >= 0),
  average_hr int check (average_hr is null or average_hr between 30 and 250),
  maximum_hr int check (maximum_hr is null or maximum_hr between 30 and 250),
  included boolean not null default true,
  extraction_confidence text not null check (extraction_confidence in ('high', 'medium', 'low')),
  source_evidence text not null default '',
  source_image_index int check (source_image_index is null or source_image_index between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_log_id, ordinal)
);

create trigger run_interval_steps_set_updated_at
  before update on run_interval_steps
  for each row execute function set_updated_at();

alter table run_interval_steps enable row level security;
create policy "run_interval_steps_all_own" on run_interval_steps
  for all using (
    exists (
      select 1 from run_logs l
      join workout_sessions s on s.id = l.workout_session_id
      where l.id = run_log_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from run_logs l
      join workout_sessions s on s.id = l.workout_session_id
      where l.id = run_log_id and s.user_id = auth.uid()
    )
  );

create index if not exists run_interval_steps_run_log_idx
  on run_interval_steps(run_log_id, ordinal);
