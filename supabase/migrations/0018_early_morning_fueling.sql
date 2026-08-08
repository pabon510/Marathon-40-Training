-- Add an early-morning fueling preference without rewriting existing profiles
-- or any workout and fueling history. Existing users retain standard guidance
-- with the user's established early-morning preference. It remains editable.

alter table profiles
  add column fueling_timing_preference text not null default 'early_morning'
    check (fueling_timing_preference in ('early_morning', 'standard'));
