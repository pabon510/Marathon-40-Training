# Build Plan

## Architecture

- Next.js App Router with server components by default and client components only for interactive forms/workout mode.
- TypeScript strict mode.
- Tailwind CSS with accessible, touch-friendly components.
- Supabase Auth and Postgres; enforce row-level security even for one user.
- Server-side domain services own plan generation, adaptation, safety evaluation, progression, and comparable-run calculations.
- Persist rule evaluations and human-readable reasons. Do not hide training decisions in UI code.
- Vercel hosts production. Environment variables are stored in Vercel/Supabase, never committed.

## Suggested repository structure

```text
app/
  (auth)/login/
  (app)/today/
  (app)/plan/
  (app)/workouts/
  (app)/log/run/
  (app)/progress/
  (app)/settings/
components/
domain/
  adaptation/
  planning/
  progression/
  safety/
  trends/
lib/
  supabase/
config/profile.json
supabase/migrations/
docs/
```

## Milestones

### 0. Foundation

- Scaffold project, linting, formatting, tests, environment validation, and CI.
- Configure Supabase clients, schema migrations, RLS, manually created account, protected routes.
- Seed structured profile idempotently without overwriting live profile.
- Add responsive shell/navigation and installable manifest/icons.

### 1. Domain model and deterministic rules

- Implement typed domain entities from `DATA_MODEL.md`.
- Encode safety precedence before adaptation and progression.
- Implement a pure rule evaluator returning: allowed workout types, chosen adaptation, reason code, human explanation, and affected plan days.
- Add fixture-based unit tests before UI integration.

### 2. Weekly plan and Today

- Weekly setup/preview and rolling seven-day generation.
- Four-, five-, and three-day plan shapes and compression priorities.
- Provisional Today card before check-in.
- Morning check-in with scale definitions and skip confirmation.
- Primary recommendation, shorter alternative, reasons, and change history.
- Recalculation without workout debt.

### 3. Workout content and execution

- Seed curated exercise library.
- Generate gym/home equivalents and short variants from explicit mappings.
- Full workout overview plus guided strength mode.
- Safety-aware substitution and override flow.

### 4. Logging and feedback

- Run logging, pace calculation/override, optional splits, and classifications.
- Strength summarized logging and per-exercise difficulty.
- Integrated post-workout check-in.
- Skip/unplanned/override flows with reasons.
- Editable logs and material-change recalculation.

### 5. Progress and scorecard

- Monday–Sunday metrics, run minutes/miles, strength completion.
- Daily knee chart and weekly maximum/direction.
- Comparable-run trend with confidence/explanation.
- Four-week 4-of-5 scorecard.

### 6. Hardening and deployment

- Test mobile Safari-sized view, tablet, and desktop.
- Accessibility: labels, keyboard support, contrast, focus, and 44px touch targets.
- Verify cross-device persistence and auth isolation.
- Add empty/loading/error/offline messaging (offline use itself is not supported).
- Deploy to Vercel and complete production smoke test.

### 7. Immediate post-launch

- Resend reminders and optional web push.
- Consistency score/streak UI and PR calculations.
- Reminder delivery/idempotency tests.

## Implementation decisions

- Use database migrations and seed scripts, not manual production schema edits.
- Store time zones and local dates explicitly; use `America/New_York` initially.
- Plan instances are immutable historical records except through versioned recalculation. Preserve the prior prescription in change history.
- Recalculation is idempotent: repeated evaluation of unchanged inputs does not create duplicate changes.
- A “material edit” includes knee score/trend, effort, completion, duration/distance, run/lower-body load, or workout classification. Notes-only edits do not recalculate.
- No generative AI is required in the runtime. Explanations come from deterministic reason templates.

## Definition of done

- All core acceptance tests pass.
- No unresolved TypeScript, lint, migration, or RLS errors.
- Safety logic has direct unit and integration coverage.
- A new browser can sign in and see data created on another device.
- Production URL works as an installed home-screen web app where browser support permits.
- README documents local setup, Supabase setup, seeding, tests, and deployment.
