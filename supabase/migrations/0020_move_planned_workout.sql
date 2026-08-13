-- Atomically move one unlogged workout onto another planned day, replacing
-- the target without creating workout debt or losing either plan's history.
create or replace function move_planned_workout(
  source_workout_id uuid,
  target_local_date date,
  move_reason_code text,
  move_reason_text text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  source_workout planned_workouts%rowtype;
  target_workout planned_workouts%rowtype;
  new_version_id uuid;
  new_workout_id uuid;
  next_version integer;
  latest_knee integer;
begin
  if actor_id is null then raise exception 'Not signed in.'; end if;
  if move_reason_code not in ('family_conflict','schedule_change','time','fatigue','knee_discomfort','illness','personal_choice') then
    raise exception 'Choose a valid reason.';
  end if;
  if nullif(trim(move_reason_text), '') is null then raise exception 'A reason is required.'; end if;

  select * into source_workout from planned_workouts
  where id = source_workout_id and user_id = actor_id and superseded_at is null
  for update;
  if not found then raise exception 'The workout to move is no longer available.'; end if;

  select * into target_workout from planned_workouts
  where user_id = actor_id and local_date = target_local_date and superseded_at is null
  order by created_at desc limit 1 for update;
  if not found then raise exception 'No workout is scheduled on the replacement day.'; end if;
  if source_workout.local_date = target_local_date then raise exception 'That workout is already scheduled on this day.'; end if;
  if date_trunc('week', source_workout.local_date)::date <> date_trunc('week', target_local_date)::date then
    raise exception 'Workouts can only move within the same Monday-to-Sunday week.';
  end if;
  if source_workout.status in ('completed','partial','blocked') or target_workout.status in ('completed','partial','blocked') then
    raise exception 'Completed, partial, or safety-blocked workouts cannot be replaced.';
  end if;
  if exists (select 1 from workout_sessions where planned_workout_id in (source_workout.id, target_workout.id)) then
    raise exception 'A workout with an existing log cannot be moved or replaced.';
  end if;

  select knee into latest_knee from morning_check_ins
  where user_id = actor_id and local_date = target_local_date
  order by check_in_time desc limit 1;
  if coalesce(latest_knee, -1) >= 6 and source_workout.workout_kind in
    ('long_run','easy_run','threshold_run','combined_short','strength_a','strength_b','strength_full') then
    raise exception 'Today''s knee score blocks running and lower-body work.';
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version from plan_versions where user_id = actor_id;
  update plan_versions set is_active = false where user_id = actor_id and is_active = true;
  insert into plan_versions (user_id, rolling_start_date, version_number, trigger, source_event_type, source_event_id, is_active)
  values (actor_id, target_local_date, next_version, 'edit', 'workout_move', source_workout.id, true)
  returning id into new_version_id;

  insert into planned_workouts (
    plan_version_id, user_id, local_date, workout_kind, priority, status, goal,
    planned_duration_minutes, run_prescription, strength_template_id,
    recovery_routine_slug, location_choice, run_context, shorter_alternative,
    original_workout_id, completion_credit_factor
  ) values (
    new_version_id, actor_id, target_local_date, source_workout.workout_kind,
    source_workout.priority, 'confirmed', source_workout.goal,
    source_workout.planned_duration_minutes, source_workout.run_prescription,
    source_workout.strength_template_id, source_workout.recovery_routine_slug,
    source_workout.location_choice, source_workout.run_context,
    source_workout.shorter_alternative, source_workout.id, 1.0
  ) returning id into new_workout_id;

  insert into planned_strength_items (
    planned_workout_id, ordinal, template_item_id, exercise_variant_id, exercise_id,
    set_count, rep_range_low, rep_range_high, rest_seconds, prescription_metric,
    selection_reason_code
  ) select new_workout_id, ordinal, template_item_id, exercise_variant_id, exercise_id,
    set_count, rep_range_low, rep_range_high, rest_seconds, prescription_metric,
    selection_reason_code
  from planned_strength_items where planned_workout_id = source_workout.id;

  insert into planned_exercise_substitutions (
    planned_workout_id, ordinal, original_exercise_id, substitute_exercise_id,
    reason_code, substitution_quality
  ) select new_workout_id, ordinal, original_exercise_id, substitute_exercise_id,
    reason_code, substitution_quality
  from planned_exercise_substitutions where planned_workout_id = source_workout.id;

  update planned_workouts set superseded_at = now()
  where id in (source_workout.id, target_workout.id);

  insert into plan_changes (
    user_id, old_plan_version_id, new_plan_version_id, local_date,
    old_workout_summary, new_workout_summary, reason_code, explanation, triggering_values
  ) values
  (
    actor_id, source_workout.plan_version_id, new_version_id, source_workout.local_date,
    jsonb_build_object('workoutKind', source_workout.workout_kind, 'status', source_workout.status),
    jsonb_build_object('workoutKind', source_workout.workout_kind, 'status', 'moved', 'movedTo', target_local_date),
    'WORKOUT_MOVED',
    format('%s moved to %s because %s.', initcap(replace(source_workout.workout_kind, '_', ' ')), target_local_date, move_reason_text),
    jsonb_build_object('reasonCode', move_reason_code, 'sourceDate', source_workout.local_date, 'targetDate', target_local_date)
  ),
  (
    actor_id, target_workout.plan_version_id, new_version_id, target_local_date,
    jsonb_build_object('workoutKind', target_workout.workout_kind, 'status', target_workout.status),
    jsonb_build_object('workoutKind', source_workout.workout_kind, 'status', 'confirmed', 'movedFrom', source_workout.local_date),
    'WORKOUT_REPLACED_BY_MOVE',
    format('%s replaced %s today because %s. The replaced workout was dropped without creating debt.', initcap(replace(source_workout.workout_kind, '_', ' ')), initcap(replace(target_workout.workout_kind, '_', ' ')), move_reason_text),
    jsonb_build_object('reasonCode', move_reason_code, 'sourceDate', source_workout.local_date, 'targetDate', target_local_date, 'droppedWorkoutKind', target_workout.workout_kind)
  );

  return new_workout_id;
end;
$$;

revoke all on function move_planned_workout(uuid, date, text, text) from public;
grant execute on function move_planned_workout(uuid, date, text, text) to authenticated;
