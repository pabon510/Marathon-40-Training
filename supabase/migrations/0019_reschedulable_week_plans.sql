-- Preserve old planned-workout rows for audit/history while allowing a later
-- weekly edit to remove them from the authoritative schedule.
alter table planned_workouts
  add column if not exists superseded_at timestamptz;

create index if not exists planned_workouts_current_user_date_idx
  on planned_workouts (user_id, local_date, created_at desc)
  where superseded_at is null;

comment on column planned_workouts.superseded_at is
  'When set, this historical planned row has been replaced or removed by a later weekly edit.';

create or replace view v_weekly_plan_completion
  with (security_invoker = true) as
  with current_workouts as (
    select * from (
      select pw.*, row_number() over (
        partition by pw.user_id, pw.local_date order by pw.created_at desc
      ) as recency
      from planned_workouts pw
      where pw.superseded_at is null
    ) ranked
    where ranked.recency = 1
  )
  select
    pw.user_id,
    date_trunc('week', pw.local_date)::date as week_start,
    count(*) as planned_count,
    sum(
      case
        when pw.status = 'completed' then pw.completion_credit_factor
        when pw.status = 'partial' then pw.completion_credit_factor * 0.5
        else 0
      end
    ) as credited_count
  from current_workouts pw
  where pw.workout_kind <> 'rest'
  group by pw.user_id, date_trunc('week', pw.local_date)::date;

create or replace view v_checkin_completion
  with (security_invoker = true) as
  with current_workouts as (
    select * from (
      select pw.*, row_number() over (
        partition by pw.user_id, pw.local_date order by pw.created_at desc
      ) as recency
      from planned_workouts pw
      where pw.superseded_at is null
    ) ranked
    where ranked.recency = 1
  )
  select
    pw.user_id,
    date_trunc('week', pw.local_date)::date as week_start,
    count(*) as workout_days,
    count(*) filter (
      where exists (
        select 1 from morning_check_ins mc
        where mc.user_id = pw.user_id and mc.local_date = pw.local_date
      )
    ) as checked_in_days
  from current_workouts pw
  where pw.workout_kind <> 'rest'
  group by pw.user_id, date_trunc('week', pw.local_date)::date;
