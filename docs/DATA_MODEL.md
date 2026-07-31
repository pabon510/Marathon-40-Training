# Data Model

Use UUID primary keys, `created_at`/`updated_at` timestamps, and `user_id` on user-owned records. RLS must restrict every record to `auth.uid() = user_id`. Enums may be Postgres enums or checked text columns.

## Core tables

### `profiles`

`user_id`, display name, timezone, target marathon date, phase (`base_rebuilding`), easy HR floor/ceiling, calibration end date, preferred long-run day, default available weekdays, equipment JSON, reminder preferences JSON, baseline version.

### `weekly_setups`

`id`, `user_id`, Monday week date, available dates, intended long-run date, backup date, submitted timestamp. Unique per user/week.

### `plan_versions`

`id`, `user_id`, rolling start date, version number, trigger (`initial`, `check_in`, `post_workout`, `missed`, `edit`, `unplanned`), source event id/type, generated timestamp, active flag.

### `planned_workouts`

`id`, plan version, local date, workout kind, priority, status (`provisional`, `confirmed`, `completed`, `partial`, `skipped`, `blocked`, `replaced`, `incomplete`), goal, planned duration, run prescription JSON, strength template id, location choice, run context (`standard` or `stroller`), shorter alternative JSON, original workout id, completion-credit factor.

Run prescription stores duration, HR target/ceiling, pace context, intervals, walk-break guidance, and calibration flag.

### `plan_changes`

`id`, user, old/new plan versions, local date, old/new workout summaries, reason code, human explanation, triggering values JSON, created timestamp. Display attached to the affected day.

### `morning_check_ins`

`id`, user, local date/time, hours slept, Oura score, energy 1–5, soreness 1–5, stress 1–5, fatigue 1–5, knee 0–10, available minutes, strength location, skipped fields array, refreshed-from id.

Constraints enforce ranges. Only the newest check-in for the day drives the active recommendation.

### `workout_sessions`

`id`, user, planned workout id nullable, type, location, started/completed timestamps, completion state, unplanned flag, override flag/reason, modification reason, overall effort 1–10, expected-feel result, unusual pain flag/details, notes.

### `run_logs`

`workout_session_id`, run type, stroller flag, optional stroller-related discomfort areas, distance miles, duration seconds, calculated pace, pace override, average HR, maximum HR, elevation gain/loss feet, highest knee during, knee immediately after, data source, and optional Garmin screenshot import id.

Screenshot-assisted records may also store moving and elapsed time, moving and
best pace, aerobic and anaerobic training effect, average temperature, average
and maximum cadence, and average stride length. All are nullable so historical
manual records remain valid.

Stroller context is separate from run type so an outdoor run-walk may also be
a stroller run. Stroller runs count normally toward time, mileage, completion,
and progression eligibility, but comparable-run trends partition them from
standard runs.

### `run_imports`

Stores an authenticated user's Garmin screenshot extraction as a reviewable
draft. It records model/parser provenance, screenshot count, structured values,
qualitative chart observations with confidence/evidence, status, and the
confirmed run-log id. A draft has no effect on workout completion, progress, or
adaptation; only the user-confirmed `run_logs` row does.

### `run_import_images`

Tracks source screenshots in a private Supabase Storage bucket. Each row stores
the owning user, import, ordinal, private storage path, media type, size, a
180-day expiration, an explicit keep-permanently choice, and deletion time.
Confirmed metrics and analysis evidence remain after image deletion.

### `run_analyses`

Stores a non-blocking post-run review linked to one run log: generation status,
model, prompt/rules/analysis versions, immutable evidence snapshot, validated
structured narrative, errors, and the deterministic next-morning knee update.
The rules engine owns verdict and progression status; AI explains supplied
evidence but cannot change the plan.

### `weekly_coaching_reviews`

Stores one versioned, evidence-grounded recap for a Monday-through-Sunday
training week. The evidence snapshot contains deterministic consistency,
running, strength, knee, and run-review signals. AI may summarize those facts
and identify one focus, but cannot alter planning, adaptation, progression, or
safety behavior.

### `run_splits`

`id`, run log/session, ordinal, split distance (default 1 mile), duration seconds or pace seconds/mile.

### `strength_logs`

`id`, session, exercise id, ordinal, prescribed variant id, completed sets, representative/min reps, max reps if needed, load value, load unit, difficulty 1–10, substitution exercise id, notes.

One record represents final summarized values, not each set.

### `post_workout_check_ins`

`id`, session, overall effort, highest knee during, knee immediately after, completed-full boolean, expectation result, unusual pain/details, notes, submitted timestamp.

### `exercise_definitions`

`id`, slug, name, movement pattern, target muscles, equipment, setup, execution, cues JSON, mistakes JSON, stop/substitute guidance, active flag.

Phase-one library V2 foundations also store family slug, programming role,
prescription metric (reps/seconds/distance/steps/breaths), side mode, optional
tempo/duration/distance defaults, history compatibility, safety-alternative
eligibility, and new-plan/legacy-display flags. These fields classify future
content without rewriting historical logs.

### `exercise_variants`

`id`, exercise id, location, equipment requirements, progression methods, contraindication tags, home/gym equivalence group.

Variant selection is deterministic: full/short intent, explicit location,
persisted block choice, compatible history, numeric priority, then slug.
Variants also store programming role and rotation eligibility.

### `exercise_history_compatibility`

Explicit reviewed links between old and new exercise definitions. Compatibility
is either display-only or progression-compatible with the same loading
semantics. No numeric history crosses exercises without one of these links.
Phase 2 seeds only display-only links for ambiguous combined records.

### `strength_block_selections`

Persists one concrete exercise variant per template slot for a dated training
block so page reloads and database row order cannot rotate core movements.

### `planned_strength_items`

Materialized exercise/variant prescriptions for a planned workout. This is the
plan-preservation foundation for future template/library changes. Existing
plans are not backfilled because the old unordered resolver cannot prove which
variant was originally displayed.

### `strength_templates` and `strength_template_items`

Template metadata (goal, emphasis, duration) plus ordered items, set/rep ranges, rest, variant group, optional/finisher flag, and short-version inclusion.

### `safety_events`

`id`, user, source type/id, rule code, knee start/current/change, blocked workout types, offered alternatives, acknowledged timestamp.

### `rule_evaluations`

`id`, user, source type/id, rule-set version, inputs snapshot JSON, matched rules, result JSON, explanation, created timestamp. This is the audit trail.

## Derived data

Prefer database views or query-layer calculations initially:

- Weekly minutes and miles.
- Adapted-plan completion denominator and credit.
- Weekly maximum knee and direction.
- Morning-check-in completion rate.
- Strength sessions completed.
- Comparable easy-run pairs and ease outcomes.
- Personal records and streaks (post-launch).

## Scale definitions

- Energy: 1 depleted, 2 low, 3 normal, 4 good, 5 excellent.
- Soreness: 1 none, 2 mild, 3 noticeable, 4 high, 5 severe.
- Stress: 1 very low through 5 overwhelming.
- Fatigue: 1 fresh, 2 slightly tired, 3 normal, 4 very tired, 5 exhausted.
- Effort/difficulty: 1 extremely easy, 5 moderate, 7 hard but controlled, 9 very hard, 10 maximal.
- Knee: 0 no discomfort through 10 worst imaginable.

## Data behavior

- Missing check-in values are `NULL`, never zero/default; persist explicit skip confirmation.
- Store computed pace and raw distance/duration so calculations are reproducible.
- Preserve all historical plan versions.
- Deleting history is not a V1 UI requirement. Editing creates an audit event and may generate a new plan version.
- Application dates use profile timezone; timestamps remain UTC.
