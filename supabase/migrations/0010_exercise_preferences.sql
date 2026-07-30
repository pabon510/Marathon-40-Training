-- Phase 5B: per-user exercise preferences.
--
-- DATA SAFETY: additive only. This migration does not update or delete any
-- workout, exercise, plan, block-selection, or strength-log row.

create table if not exists exercise_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_slug text not null references exercise_definitions(slug) on delete cascade,
  preference text not null check (preference in ('prefer', 'avoid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_slug)
);

create trigger exercise_preferences_set_updated_at
  before update on exercise_preferences
  for each row execute function set_updated_at();

alter table exercise_preferences enable row level security;
create policy "exercise_preferences_all_own" on exercise_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

