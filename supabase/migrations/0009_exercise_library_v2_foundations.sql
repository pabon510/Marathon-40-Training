-- Phase 1 exercise-library foundations.
--
-- DATA SAFETY: add-only. This migration does not update or delete any
-- workout, log, plan, exercise, variant, or template row. Existing IDs and
-- recorded values remain unchanged.

-- 1. Explicit exercise taxonomy and prescription semantics ----------------

alter table exercise_definitions
  add column if not exists family_slug text,
  add column if not exists programming_role text,
  add column if not exists prescription_metric text not null default 'reps',
  add column if not exists side_mode text not null default 'bilateral',
  add column if not exists default_tempo text,
  add column if not exists default_duration_seconds int,
  add column if not exists default_distance_feet int,
  add column if not exists history_compatibility text not null default 'exact_only',
  add column if not exists safety_alternative_eligible boolean not null default false,
  add column if not exists active_for_new_plans boolean not null default true,
  add column if not exists legacy_display_only boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercise_definitions_programming_role_check') then
    alter table exercise_definitions add constraint exercise_definitions_programming_role_check
      check (programming_role is null or programming_role in
        ('primary','secondary','accessory','regression','progression','safety_alternative','warmup'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exercise_definitions_prescription_metric_check') then
    alter table exercise_definitions add constraint exercise_definitions_prescription_metric_check
      check (prescription_metric in ('reps','seconds','distance_feet','steps','breaths'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exercise_definitions_side_mode_check') then
    alter table exercise_definitions add constraint exercise_definitions_side_mode_check
      check (side_mode in ('bilateral','alternating','per_side'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exercise_definitions_history_compatibility_check') then
    alter table exercise_definitions add constraint exercise_definitions_history_compatibility_check
      check (history_compatibility in ('exact_only','same_family'));
  end if;
end $$;

alter table exercise_variants
  add column if not exists selection_priority int not null default 100,
  add column if not exists programming_role text,
  add column if not exists rotation_eligible boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercise_variants_programming_role_check') then
    alter table exercise_variants add constraint exercise_variants_programming_role_check
      check (programming_role is null or programming_role in
        ('primary','secondary','accessory','regression','progression','safety_alternative','warmup'));
  end if;
end $$;

create index if not exists exercise_variants_deterministic_selection_idx
  on exercise_variants (equivalence_group, location, is_short_option, selection_priority, exercise_id);

-- 2. Conservative progression inputs and non-repetition results -----------
-- Nullable means unknown. Unknown values must never silently qualify an
-- exposure for progression.

alter table strength_logs
  add column if not exists completed_seconds int,
  add column if not exists completed_distance_feet int,
  add column if not exists completed_steps int,
  add column if not exists tempo_used text,
  add column if not exists assistance_note text,
  add column if not exists pain_increased boolean,
  add column if not exists form_failed boolean,
  add column if not exists recovery_acceptable boolean;

-- 3. Explicit, reviewed history compatibility -----------------------------

create table if not exists exercise_history_compatibility (
  source_exercise_id uuid not null references exercise_definitions(id),
  target_exercise_id uuid not null references exercise_definitions(id),
  compatibility_scope text not null check (
    compatibility_scope in ('display_only', 'progression_same_loading')
  ),
  notes text not null,
  created_at timestamptz not null default now(),
  primary key (source_exercise_id, target_exercise_id),
  constraint exercise_history_compatibility_not_self check (source_exercise_id <> target_exercise_id)
);

alter table exercise_history_compatibility enable row level security;
create policy "exercise_history_compatibility_read_authenticated"
  on exercise_history_compatibility for select
  using (auth.role() = 'authenticated');

-- 4. Stable exercise choices within a training block ----------------------

create table if not exists strength_block_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_start_date date not null,
  block_end_date date not null,
  template_slug text not null,
  slot_key text not null,
  exercise_variant_id uuid not null references exercise_variants(id),
  reason_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, block_start_date, template_slug, slot_key),
  constraint strength_block_selections_dates_check check (block_end_date >= block_start_date)
);

create trigger strength_block_selections_set_updated_at
  before update on strength_block_selections
  for each row execute function set_updated_at();

alter table strength_block_selections enable row level security;
create policy "strength_block_selections_all_own" on strength_block_selections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Plan-preservation groundwork -----------------------------------------
-- New plan generation can materialize concrete exercises here before active
-- templates are changed. This table is intentionally not backfilled: doing
-- so would pretend we know which unordered variant an old plan displayed.

create table if not exists planned_strength_items (
  id uuid primary key default gen_random_uuid(),
  planned_workout_id uuid not null references planned_workouts(id) on delete cascade,
  ordinal int not null,
  template_item_id uuid references strength_template_items(id),
  exercise_variant_id uuid not null references exercise_variants(id),
  exercise_id uuid not null references exercise_definitions(id),
  set_count int not null,
  rep_range_low int not null,
  rep_range_high int not null,
  rest_seconds int not null default 60,
  prescription_metric text not null default 'reps' check (
    prescription_metric in ('reps','seconds','distance_feet','steps','breaths')
  ),
  selection_reason_code text not null,
  created_at timestamptz not null default now(),
  unique (planned_workout_id, ordinal)
);

alter table planned_strength_items enable row level security;
create policy "planned_strength_items_all_own" on planned_strength_items
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
