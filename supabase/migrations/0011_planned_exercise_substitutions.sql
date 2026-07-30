-- Workout-specific exercise substitutions. These rows are additive overrides:
-- they never rewrite templates, block selections, completed logs, or history.

create table if not exists planned_exercise_substitutions (
  id uuid primary key default gen_random_uuid(),
  planned_workout_id uuid not null references planned_workouts(id) on delete cascade,
  ordinal int not null,
  original_exercise_id uuid not null references exercise_definitions(id),
  substitute_exercise_id uuid not null references exercise_definitions(id),
  reason_code text not null check (
    reason_code in ('prefer_machine','equipment_unavailable','uncomfortable','different_exercise','home_conversion')
  ),
  substitution_quality text not null check (
    substitution_quality in ('exact','close','general')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (planned_workout_id, ordinal),
  constraint planned_exercise_substitution_distinct check (
    original_exercise_id <> substitute_exercise_id
  )
);

create trigger planned_exercise_substitutions_set_updated_at
  before update on planned_exercise_substitutions
  for each row execute function set_updated_at();

alter table planned_exercise_substitutions enable row level security;
create policy "planned_exercise_substitutions_all_own"
  on planned_exercise_substitutions
  for all using (
    exists (
      select 1 from planned_workouts p
      where p.id = planned_workout_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from planned_workouts p
      where p.id = planned_workout_id and p.user_id = auth.uid()
    )
  );

