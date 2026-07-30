-- Stroller running is a context layered onto the existing run environment.
-- Existing plans and logs remain standard runs unless explicitly changed.

alter table planned_workouts
  add column if not exists run_context text not null default 'standard'
  check (run_context in ('standard', 'stroller'));

alter table run_logs
  add column if not exists is_stroller boolean not null default false,
  add column if not exists stroller_discomfort_areas text[] not null default '{}';

comment on column planned_workouts.run_context is
  'Optional context for easy/long run guidance. Stroller is never valid for threshold work.';
comment on column run_logs.is_stroller is
  'Separate from run_type so outdoor/run-walk and stroller context can coexist.';

