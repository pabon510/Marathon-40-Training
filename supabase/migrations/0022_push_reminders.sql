-- Phase 7A: browser push subscriptions and an idempotent reminder-delivery
-- audit trail. Existing profile and training-history rows are untouched.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  user_agent text,
  active boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_active_idx
  on push_subscriptions (user_id, active);

create trigger push_subscriptions_set_updated_at
  before update on push_subscriptions
  for each row execute function set_updated_at();

alter table push_subscriptions enable row level security;
create policy "push_subscriptions_all_own" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  push_subscription_id uuid not null references push_subscriptions(id) on delete cascade,
  reminder_type text not null check (reminder_type in
    ('daily_checkin', 'weekly_planning', 'unlogged_workout')),
  local_date date not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  title text not null,
  body text not null,
  target_path text not null,
  attempt_count int not null default 1 check (attempt_count > 0),
  provider_status_code int,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (push_subscription_id, reminder_type, local_date)
);

create index reminder_deliveries_user_date_idx
  on reminder_deliveries (user_id, local_date, reminder_type);

create trigger reminder_deliveries_set_updated_at
  before update on reminder_deliveries
  for each row execute function set_updated_at();

alter table reminder_deliveries enable row level security;
create policy "reminder_deliveries_select_own" on reminder_deliveries
  for select using (auth.uid() = user_id);

-- Replace the obsolete email-shaped seed value only when the profile still
-- has that exact legacy default. Custom/live preference objects are preserved.
update profiles
set reminder_preferences = '{
  "daily_checkin_push": false,
  "weekly_planning_push": false,
  "unlogged_workout_push": false
}'::jsonb
where reminder_preferences = '{
  "morning_checkin_email": false,
  "weekly_planning_email": false,
  "unlogged_workout_email": false
}'::jsonb;
