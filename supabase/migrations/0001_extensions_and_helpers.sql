-- Extensions and shared helpers used by all later migrations.

create extension if not exists "pgcrypto";

-- Generic updated_at trigger function, reused by every table with that column.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
