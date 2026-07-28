-- Curated exercise library, location variants, and strength workout
-- templates. Content (setup/execution/cues/mistakes/stop-substitute
-- guidance) is populated by the seed script per docs/EXERCISE_LIBRARY.md.

create table exercise_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  movement_pattern text not null,
  target_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  setup text not null,
  execution text not null,
  cues jsonb not null default '[]'::jsonb,
  mistakes jsonb not null default '[]'::jsonb,
  stop_substitute_guidance text not null,
  is_lower_body boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lower_body_requires_stop_guidance check (
    not is_lower_body or length(stop_substitute_guidance) > 0
  )
);

create trigger exercise_definitions_set_updated_at
  before update on exercise_definitions
  for each row execute function set_updated_at();

alter table exercise_definitions enable row level security;
-- Library content is shared reference data, readable by any authenticated
-- user, writable only via migrations/seed (service role).
create policy "exercise_definitions_read_authenticated" on exercise_definitions
  for select using (auth.role() = 'authenticated');


create table exercise_variants (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercise_definitions(id) on delete cascade,
  location text not null check (location in ('gym', 'home', 'either')),
  equipment_requirements text[] not null default '{}',
  progression_methods text[] not null default '{}',
  contraindication_tags text[] not null default '{}',
  equivalence_group text not null,
  is_short_option boolean not null default false,
  created_at timestamptz not null default now()
);

create index exercise_variants_group_idx on exercise_variants (equivalence_group, location);

alter table exercise_variants enable row level security;
create policy "exercise_variants_read_authenticated" on exercise_variants
  for select using (auth.role() = 'authenticated');


create table strength_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  goal text not null,
  emphasis text not null,
  duration_minutes int not null,
  created_at timestamptz not null default now()
);

alter table strength_templates enable row level security;
create policy "strength_templates_read_authenticated" on strength_templates
  for select using (auth.role() = 'authenticated');


create table strength_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references strength_templates(id) on delete cascade,
  ordinal int not null,
  equivalence_group text not null,
  set_count int not null,
  rep_range_low int not null,
  rep_range_high int not null,
  rest_seconds int not null default 60,
  is_optional boolean not null default false,
  is_finisher boolean not null default false,
  include_in_short_version boolean not null default true,
  created_at timestamptz not null default now(),
  unique (template_id, ordinal)
);

alter table strength_template_items enable row level security;
create policy "strength_template_items_read_authenticated" on strength_template_items
  for select using (auth.role() = 'authenticated');
