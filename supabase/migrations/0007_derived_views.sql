-- Derived/read-only views for the progress dashboard. Views inherit RLS
-- from their underlying tables via security_invoker, so a user only ever
-- sees rows for auth.uid().

create view v_daily_knee_scores
  with (security_invoker = true) as
  select
    user_id,
    local_date,
    greatest(
      coalesce(max(knee) filter (where source = 'morning'), -1),
      coalesce(max(knee) filter (where source = 'during'), -1),
      coalesce(max(knee) filter (where source = 'after'), -1)
    ) as max_knee_score
  from (
    select user_id, local_date, knee, 'morning' as source
    from morning_check_ins
    where knee is not null
    union all
    select s.user_id, s.local_date, r.highest_knee_during, 'during'
    from run_logs r join workout_sessions s on s.id = r.workout_session_id
    where r.highest_knee_during is not null
    union all
    select s.user_id, s.local_date, r.knee_immediately_after, 'after'
    from run_logs r join workout_sessions s on s.id = r.workout_session_id
    where r.knee_immediately_after is not null
    union all
    select s.user_id, s.local_date, p.highest_knee_during, 'during'
    from post_workout_check_ins p join workout_sessions s on s.id = p.workout_session_id
    union all
    select s.user_id, s.local_date, p.knee_immediately_after, 'after'
    from post_workout_check_ins p join workout_sessions s on s.id = p.workout_session_id
  ) combined
  group by user_id, local_date;

create view v_weekly_knee_summary
  with (security_invoker = true) as
  select
    user_id,
    date_trunc('week', local_date)::date as week_start,
    max(max_knee_score) as weekly_max_knee
  from v_daily_knee_scores
  group by user_id, date_trunc('week', local_date)::date;

create view v_weekly_run_totals
  with (security_invoker = true) as
  select
    s.user_id,
    date_trunc('week', s.local_date)::date as week_start,
    sum(coalesce(r.duration_seconds, 0)) / 60.0 as total_run_minutes,
    sum(coalesce(r.distance_miles, 0)) as total_run_miles
  from workout_sessions s
  join run_logs r on r.workout_session_id = s.id
  where s.session_type = 'run' and s.completion_state in ('full', 'partial')
  group by s.user_id, date_trunc('week', s.local_date)::date;

create view v_weekly_strength_completion
  with (security_invoker = true) as
  select
    user_id,
    date_trunc('week', local_date)::date as week_start,
    count(*) filter (where completion_state in ('full', 'partial')) as completed_sessions,
    count(*) as logged_sessions
  from workout_sessions
  where session_type = 'strength'
  group by user_id, date_trunc('week', local_date)::date;

create view v_weekly_plan_completion
  with (security_invoker = true) as
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
  from planned_workouts pw
  join plan_versions pv on pv.id = pw.plan_version_id and pv.is_active
  where pw.workout_kind <> 'rest'
  group by pw.user_id, date_trunc('week', pw.local_date)::date;

create view v_checkin_completion
  with (security_invoker = true) as
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
  from planned_workouts pw
  join plan_versions pv on pv.id = pw.plan_version_id and pv.is_active
  where pw.workout_kind <> 'rest'
  group by pw.user_id, date_trunc('week', pw.local_date)::date;
