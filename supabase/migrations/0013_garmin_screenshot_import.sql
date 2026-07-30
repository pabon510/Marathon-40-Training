-- Screenshot-assisted Garmin imports. Images are never stored: only the
-- structured extraction draft, provenance, and user-confirmed values remain.

create table if not exists run_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'garmin_screenshot'
    check (provider = 'garmin_screenshot'),
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'discarded')),
  model text not null,
  parser_version text not null,
  image_count int not null check (image_count between 1 and 5),
  extracted_payload jsonb not null default '{}'::jsonb,
  run_log_id uuid,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger run_imports_set_updated_at
  before update on run_imports
  for each row execute function set_updated_at();

alter table run_imports enable row level security;
create policy "run_imports_all_own" on run_imports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table run_logs
  add column if not exists import_id uuid references run_imports(id),
  add column if not exists data_source text not null default 'manual'
    check (data_source in ('manual', 'garmin_screenshot')),
  add column if not exists moving_duration_seconds int,
  add column if not exists elapsed_duration_seconds int,
  add column if not exists moving_pace_seconds_per_mile numeric(7,2),
  add column if not exists best_pace_seconds_per_mile numeric(7,2),
  add column if not exists elevation_loss_feet numeric(8,2),
  add column if not exists aerobic_training_effect numeric(3,1),
  add column if not exists anaerobic_training_effect numeric(3,1),
  add column if not exists average_temperature_f numeric(5,1),
  add column if not exists average_cadence_spm numeric(6,1),
  add column if not exists maximum_cadence_spm numeric(6,1),
  add column if not exists average_stride_length_meters numeric(5,2);

alter table run_imports
  add constraint run_imports_run_log_id_fkey
  foreign key (run_log_id) references run_logs(id) on delete set null;

create unique index if not exists run_logs_import_id_unique
  on run_logs(import_id) where import_id is not null;
