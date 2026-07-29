-- 0008: explicit exercise loading semantics + richer strength logging.
--
-- SAFETY: this migration is ADD-ONLY. It creates new columns (all with
-- defaults or nullable), one new table, and one index. It does not drop,
-- rename, or rewrite any existing column, and it deletes no rows. Existing
-- workout_sessions / strength_logs / run_logs data is untouched.

-- 1. How each exercise is loaded and counted -------------------------------

alter table exercise_definitions
  add column if not exists load_basis text not null default 'bodyweight',
  add column if not exists default_load_type text not null default 'bodyweight',
  add column if not exists rep_basis text not null default 'total',
  add column if not exists loading_instructions text not null default '',
  add column if not exists load_position text not null default '',
  add column if not exists start_load_note text not null default '',
  add column if not exists load_increment_lb numeric(5,2) not null default 5;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercise_definitions_load_basis_check') then
    alter table exercise_definitions add constraint exercise_definitions_load_basis_check
      check (load_basis in ('machine_total', 'per_dumbbell', 'per_hand', 'single_implement', 'bodyweight', 'band'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exercise_definitions_default_load_type_check') then
    alter table exercise_definitions add constraint exercise_definitions_default_load_type_check
      check (default_load_type in ('weighted', 'bodyweight', 'band', 'machine'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exercise_definitions_rep_basis_check') then
    alter table exercise_definitions add constraint exercise_definitions_rep_basis_check
      check (rep_basis in ('total', 'per_side'));
  end if;
end $$;

-- 2. Richer strength logging ----------------------------------------------
-- All nullable: existing rows stay valid exactly as they were logged.

alter table strength_logs
  add column if not exists load_type text,
  add column if not exists band_level text,
  add column if not exists rep_basis text,
  add column if not exists skipped_fields text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'strength_logs_load_type_check') then
    alter table strength_logs add constraint strength_logs_load_type_check
      check (load_type is null or load_type in ('weighted', 'bodyweight', 'band', 'machine'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'strength_logs_band_level_check') then
    alter table strength_logs add constraint strength_logs_band_level_check
      check (band_level is null or band_level in ('light', 'medium', 'heavy'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'strength_logs_rep_basis_check') then
    alter table strength_logs add constraint strength_logs_rep_basis_check
      check (rep_basis is null or rep_basis in ('total', 'per_side'));
  end if;
end $$;

-- 3. Optional per-set detail ("sets differed") -----------------------------
-- The summarized values on strength_logs remain the primary record; these
-- rows are only written when the user explicitly opts into per-set entry.

create table if not exists strength_set_logs (
  id uuid primary key default gen_random_uuid(),
  strength_log_id uuid not null references strength_logs(id) on delete cascade,
  set_number int not null check (set_number > 0),
  reps int check (reps is null or reps >= 0),
  load_value numeric(6,2),
  created_at timestamptz not null default now(),
  unique (strength_log_id, set_number)
);

alter table strength_set_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'strength_set_logs' and policyname = 'strength_set_logs_all_own'
  ) then
    create policy "strength_set_logs_all_own" on strength_set_logs
      for all using (
        exists (
          select 1 from strength_logs sl
          join workout_sessions s on s.id = sl.workout_session_id
          where sl.id = strength_log_id and s.user_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from strength_logs sl
          join workout_sessions s on s.id = sl.workout_session_id
          where sl.id = strength_log_id and s.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- 4. Make the seed non-destructive ----------------------------------------
-- strength_logs.prescribed_variant_id references exercise_variants(id). The
-- seed previously deleted and re-inserted variants, which would fail (or
-- orphan references) once any workout had been logged against them. This
-- natural key lets the seed UPSERT variants in place instead, so logged
-- history keeps pointing at stable variant rows.

create unique index if not exists exercise_variants_natural_key
  on exercise_variants (exercise_id, location, equivalence_group);
