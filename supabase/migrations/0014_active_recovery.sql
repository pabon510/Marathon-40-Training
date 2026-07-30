-- Additive support for explicitly planned active-recovery sessions.
-- Existing setup, plan, workout, and history rows are not rewritten.
alter table weekly_setups
  add column active_recovery_choices jsonb not null default '[]'::jsonb;

alter table planned_workouts
  add column recovery_routine_slug text;

alter table planned_workouts
  drop constraint if exists planned_workouts_workout_kind_check;

alter table planned_workouts
  add constraint planned_workouts_workout_kind_check
  check (workout_kind in (
    'long_run', 'easy_run', 'threshold_run',
    'strength_a', 'strength_b', 'strength_full', 'combined_short',
    'upper_core_safety', 'active_recovery', 'rest', 'custom'
  ));
