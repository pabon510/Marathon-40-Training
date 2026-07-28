-- Morning check-ins, workout execution sessions, and the detailed logs
-- attached to each session (runs, splits, strength, post-workout check-in).

create table morning_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  check_in_time timestamptz not null default now(),
  hours_slept numeric(4,1),
  oura_score int check (oura_score is null or (oura_score between 0 and 100)),
  energy int check (energy is null or (energy between 1 and 5)),
  soreness int check (soreness is null or (soreness between 1 and 5)),
  stress int check (stress is null or (stress between 1 and 5)),
  fatigue int check (fatigue is null or (fatigue between 1 and 5)),
  knee int check (knee is null or (knee between 0 and 10)),
  available_time text not null check (available_time in ('15','30','45','60','75','90_plus')),
  strength_location text check (strength_location is null or strength_location in ('gym', 'home')),
  skipped_fields text[] not null default '{}',
  refreshed_from_id uuid references morning_check_ins(id),
  created_at timestamptz not null default now()
);

create index morning_check_ins_user_date_idx on morning_check_ins (user_id, local_date, check_in_time desc);

alter table morning_check_ins enable row level security;
create policy "morning_check_ins_all_own" on morning_check_ins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_workout_id uuid references planned_workouts(id),
  local_date date not null,
  session_type text not null check (session_type in
    ('run', 'strength', 'cross_training', 'mobility', 'rest_active')),
  location text check (location is null or location in ('gym', 'home', 'outdoor', 'treadmill', 'n/a')),
  started_at timestamptz,
  completed_at timestamptz,
  completion_state text not null check (completion_state in ('full', 'partial', 'stopped', 'skipped')),
  unplanned boolean not null default false,
  override_flag boolean not null default false,
  override_reason text,
  modification_reason text,
  overall_effort int check (overall_effort is null or (overall_effort between 1 and 10)),
  expectation_result text check (expectation_result is null or expectation_result in ('easier', 'as_expected', 'harder')),
  unusual_pain_flag boolean not null default false,
  unusual_pain_details text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_sessions_user_date_idx on workout_sessions (user_id, local_date);

create trigger workout_sessions_set_updated_at
  before update on workout_sessions
  for each row execute function set_updated_at();

alter table workout_sessions enable row level security;
create policy "workout_sessions_all_own" on workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


create table run_logs (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null unique references workout_sessions(id) on delete cascade,
  run_type text not null check (run_type in ('outdoor', 'treadmill', 'run_walk')),
  distance_miles numeric(5,2),
  duration_seconds int,
  calculated_pace_seconds_per_mile numeric(7,2),
  pace_override_seconds_per_mile numeric(7,2),
  average_hr int,
  maximum_hr int,
  effort int check (effort is null or (effort between 1 and 10)),
  elevation_gain_feet numeric(6,1),
  highest_knee_during int check (highest_knee_during is null or (highest_knee_during between 0 and 10)),
  knee_immediately_after int check (knee_immediately_after is null or (knee_immediately_after between 0 and 10)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger run_logs_set_updated_at
  before update on run_logs
  for each row execute function set_updated_at();

alter table run_logs enable row level security;
create policy "run_logs_all_own" on run_logs
  for all using (
    exists (select 1 from workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid())
  );


create table run_splits (
  id uuid primary key default gen_random_uuid(),
  run_log_id uuid not null references run_logs(id) on delete cascade,
  ordinal int not null,
  split_distance_miles numeric(4,2) not null default 1.0,
  duration_seconds int not null,
  created_at timestamptz not null default now(),
  unique (run_log_id, ordinal)
);

alter table run_splits enable row level security;
create policy "run_splits_all_own" on run_splits
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


create table strength_logs (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercise_definitions(id),
  ordinal int not null,
  prescribed_variant_id uuid references exercise_variants(id),
  completed_sets int,
  representative_reps int,
  max_reps int,
  load_value numeric(6,2),
  load_unit text check (load_unit is null or load_unit in ('lb', 'kg', 'bodyweight', 'band', 'n/a')),
  difficulty int check (difficulty is null or (difficulty between 1 and 10)),
  substitution_exercise_id uuid references exercise_definitions(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_session_id, ordinal)
);

create trigger strength_logs_set_updated_at
  before update on strength_logs
  for each row execute function set_updated_at();

alter table strength_logs enable row level security;
create policy "strength_logs_all_own" on strength_logs
  for all using (
    exists (select 1 from workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid())
  );


create table post_workout_check_ins (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null unique references workout_sessions(id) on delete cascade,
  overall_effort int not null check (overall_effort between 1 and 10),
  highest_knee_during int not null check (highest_knee_during between 0 and 10),
  knee_immediately_after int not null check (knee_immediately_after between 0 and 10),
  completed_full boolean not null,
  expectation_result text not null check (expectation_result in ('easier', 'as_expected', 'harder')),
  unusual_pain_flag boolean not null default false,
  unusual_pain_details text,
  notes text,
  submitted_at timestamptz not null default now()
);

alter table post_workout_check_ins enable row level security;
create policy "post_workout_check_ins_all_own" on post_workout_check_ins
  for all using (
    exists (select 1 from workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from workout_sessions s where s.id = workout_session_id and s.user_id = auth.uid())
  );
