-- Private Garmin screenshot retention and evidence-grounded run reviews.
-- Existing imports and run logs remain unchanged.

insert into storage.buckets (id, name, public)
values ('garmin-run-screenshots', 'garmin-run-screenshots', false)
on conflict (id) do update set public = false;

create table run_import_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_import_id uuid not null references run_imports(id) on delete cascade,
  ordinal int not null check (ordinal between 1 and 5),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size int not null check (byte_size > 0),
  expires_at timestamptz not null default (now() + interval '180 days'),
  keep_permanently boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (run_import_id, ordinal)
);

alter table run_import_images enable row level security;
create policy "run_import_images_all_own" on run_import_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "garmin_screenshots_select_own" on storage.objects
  for select using (
    bucket_id = 'garmin-run-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "garmin_screenshots_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'garmin-run-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "garmin_screenshots_delete_own" on storage.objects
  for delete using (
    bucket_id = 'garmin-run-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table run_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_log_id uuid not null references run_logs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'stale')),
  analysis_version text not null,
  prompt_version text not null,
  rules_version text not null,
  model text not null,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  structured_result jsonb,
  error_message text,
  generated_at timestamptz,
  next_morning_result jsonb,
  next_morning_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_log_id, analysis_version)
);

create trigger run_analyses_set_updated_at
  before update on run_analyses
  for each row execute function set_updated_at();

alter table run_analyses enable row level security;
create policy "run_analyses_all_own" on run_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index run_import_images_expiry_idx
  on run_import_images(user_id, expires_at)
  where keep_permanently = false and deleted_at is null;
create index run_analyses_user_run_idx on run_analyses(user_id, run_log_id);
