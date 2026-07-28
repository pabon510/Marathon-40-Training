# Training Profile (repository-managed baseline)

This file documents Andrew's original baseline and injury history in
human-readable form. It is not read by the application at runtime — the
seed script (`scripts/seed-profile.ts`) reads `config/profile.json` for the
structured profile fields. This file exists so the qualitative context
behind those numbers isn't lost.

## Baseline (as of program start)

- Sole user: Andrew. Primary device iPhone; tablet at home; desktop for
  overview/trends.
- Current baseline: roughly one six-mile run and one 45-minute strength
  session per week.
- Familiar six-mile pace: about 9:15/mi — not assumed to be easy effort.
- Recent nine-mile run: 9:21/mi, effort 9/10, average HR 160, max HR 174,
  followed by left-knee soreness lasting more than a week.
- Recent controlled 3.85-mile run: about 9:08/mi, average HR 146.
- Garmin-reported zones and max HR are provisional; wrist optical HR is
  used, not a chest strap.
- Comfortable with common bodyweight/loaded movements; core and pushups
  feel weak.

## Injury history

- Prior PT attributed knee symptoms to weak hip abductors and recommended
  band work such as clamshells.
- The nine-mile run above caused left-knee soreness lasting over a week —
  this is the reason the app starts in `base_rebuilding` phase with
  conservative HR guidance (140-150 bpm, provisional 150 bpm ceiling) and
  hard safety blocks at knee discomfort >= 6.

## Goals

Make running feel easier, rebuild consistency, improve knee resilience,
build full-body and core strength, improve upper-body definition, and make
carrying/playing with children easier.

## Editable in-app

Target marathon date, default available days, preferred long-run day,
home/gym equipment, provisional easy-run HR ceiling, and reminder
preferences are all editable from Settings. This baseline/injury history
section is intentionally repository-managed rather than user-editable in
V1.
