-- Versioned, evidence-grounded weekly coaching recaps.
-- Existing training data remains unchanged.

create table weekly_coaching_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'stale')),
  review_version text not null,
  prompt_version text not null,
  rules_version text not null,
  model text not null,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  structured_result jsonb,
  error_message text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start, review_version)
);

create trigger weekly_coaching_reviews_set_updated_at
  before update on weekly_coaching_reviews
  for each row execute function set_updated_at();

alter table weekly_coaching_reviews enable row level security;
create policy "weekly_coaching_reviews_all_own" on weekly_coaching_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index weekly_coaching_reviews_user_week_idx
  on weekly_coaching_reviews(user_id, week_start desc);
