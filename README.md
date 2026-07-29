# Marathon 40 Training

Andrew's private, single-user marathon base-rebuilding training app. Next.js
(App Router) + TypeScript + Tailwind CSS + Supabase (Postgres/Auth) +
Vercel. See `docs/` for the full product specification this app implements,
and `AGENTS.md` for build precedence/rules.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict).
- Tailwind CSS v3.
- Supabase Postgres + Auth (username/password, one manually created account).
- Vitest for unit/integration tests.
- Deployed on Vercel.

## 1. Supabase project setup (no terminal needed)

1. Create a free Supabase project at https://supabase.com/dashboard.
2. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. In **Authentication → Providers**, confirm Email/password is enabled.
4. In **Authentication → Users**, click **Add user** and manually create
   the one account (email + password). This app has no public
   registration by design.
5. Apply the database migrations: open the Supabase dashboard's
   **SQL Editor**, and run each file below **in order**, once each,
   copy-pasting the full contents of each and clicking Run:

   1. `supabase/migrations/0001_extensions_and_helpers.sql`
   2. `supabase/migrations/0002_profiles.sql`
   3. `supabase/migrations/0003_exercise_library.sql`
   4. `supabase/migrations/0004_planning.sql`
   5. `supabase/migrations/0005_checkins_and_sessions.sql`
   6. `supabase/migrations/0006_safety_and_rules.sql`
   7. `supabase/migrations/0007_derived_views.sql`
   8. `supabase/migrations/0008_loading_and_logging_detail.sql`

   Migrations after `0007` are **add-only** — they add columns, tables and
   indexes but never drop, rewrite, or delete existing rows, so they are
   safe to apply to a database that already has logged workouts.

   Open each file directly on GitHub (in this repo, under
   `supabase/migrations/`) and copy its contents into the SQL Editor.

   Every table has row-level security enabled and policies restricting
   rows to `auth.uid() = user_id` (exercise library/template tables are
   shared read-only reference data, readable by any authenticated user).

## 2. Environment variables (Vercel — no local `.env.local` needed)

Set all three of these as Vercel Environment Variables (Project Settings →
Environment Variables), for Production (and Preview if you use it):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

All three are safe to set in Vercel. Only variables prefixed
`NEXT_PUBLIC_` are ever bundled into browser-sent JavaScript;
`SUPABASE_SERVICE_ROLE_KEY` stays server-side and is read only by the
`POST /api/admin/seed` route (see step 3) — nothing in the client bundle
imports it. Redeploy after adding/changing env vars so the running
deployment picks them up.

`.env.example` in this repo documents the same variables for anyone who
also wants to run the app locally, plus `APP_TIMEZONE` and
`SEED_USER_EMAIL`, which only matter for the optional local script covered
at the end of step 3 — most people can ignore both.

## 3. Seed the profile and exercise library — no terminal needed

Once your Supabase project has the migrations applied and Vercel has the
three env vars from step 2 (redeployed), do this entirely in the browser:

1. Sign in to your deployed app with the account you created in step 1.4.
2. You'll land on a page with a **"Set up profile"** button (Today,
   Settings, or wherever you land first — it appears anywhere the app
   notices your profile doesn't exist yet). Click it.
3. That's it. It upserts the curated exercise library (33 exercises, 4
   strength templates) and creates your profile from the app's built-in
   defaults, then refreshes the page.

This is backed by `POST /api/admin/seed`, gated by your login (it uses
your own authenticated session to know which account to seed — no separate
secret needed). It's **idempotent**: safe to click again later (e.g. after
pulling updated exercise content) — it will never overwrite your profile
once it exists, only re-sync the shared exercise-library content.

<details>
<summary>Optional: local script (for local development or CI only)</summary>

If you're running the app locally (`npm run dev`) rather than only using
the deployed Vercel app, `npm run seed` does the same thing from your
machine instead of a browser session. It needs `.env.local` (copy from
`.env.example`) with `SUPABASE_SERVICE_ROLE_KEY` and `SEED_USER_EMAIL` (your
account's email, since there's no browser session to read it from) set
locally:

```
npm install
npm run seed
```

Most people deploying only to Vercel don't need this at all — use the
in-app button above instead.
</details>

## 4. Run locally

```
npm run dev
```

Visit `http://localhost:3000`, sign in with the account created in step
1.4, and complete the weekly setup on `/plan/setup` to generate the first
week's plan.

## 5. Tests, lint, typecheck, build

```
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # vitest (unit + integration, no live DB needed)
npm run build       # next build (production build)
npm run verify       # runs all four in sequence
```

114 automated tests cover, in priority order:

- **Safety hard blocks** (`domain/safety/hardBlock.test.ts`): knee >= 6
  blocks pre-workout; a >=2-point rise or reaching 6 mid-workout stops
  immediately; neither can be bypassed by crafted inputs.
- **Adaptation rules** (`domain/adaptation/*.test.ts`): every
  docs/ADAPTATION_RULES.md knee band × trend combination; general-recovery
  multi-signal gating (stress/one poor night/low-Oura-alone never reduce
  training alone); most-restrictive-wins composition; idempotent
  evaluation.
- **Planning** (`domain/planning/*.test.ts`): 3/4/5-day shapes, strength
  overlap avoidance, threshold-every-other-week, missed-long-run →
  backup-day conversion, no-debt priority dropping, 3-day compression
  reshaping, gym/home/short exercise resolution.
- **Progression** (`domain/progression/*.test.ts`): calibration weeks,
  four-qualifier running progression, 5% ceiling, two-exposure strength
  progression (reps → load, or reps/tempo/pause/range/unilateral at home).
- **Trends** (`domain/trends/*.test.ts`): comparable-run pairing rules,
  4-week/4-of-5 scorecard.
- **Content integrity** (`domain/content/exerciseLibrary.test.ts`): every
  exercise has setup/execution/cues/mistakes/muscles/stop-substitute
  guidance; no Smith-machine exercises; no adjustable-kettlebell swings;
  every lower-body exercise names "knee" in its stop/substitute guidance.

These are unit/fixture tests against the pure domain layer — they don't
require a live Supabase project. Integration tests against a real database
(RLS cross-user isolation, cross-device persistence) require a live
Supabase project and are documented as manual verification steps below,
since this repository has no local Postgres/Supabase instance available in
its build environment.

## 6. Deploy to Vercel

1. Import the repository into Vercel.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
   Environment Variables (Production + Preview).
3. Deploy. Vercel runs `next build` automatically.
4. Open the deployed URL on an iPhone, tap Share → Add to Home Screen to
   verify the installable PWA-like experience.

## Repository structure

```
app/
  (auth)/login/          sign-in (no registration)
  (app)/today/            provisional workout, morning check-in, recommendation
  (app)/plan/             rolling week + change history; plan/setup for weekly availability
  (app)/workouts/         full overview + guided mode, gym/home/short toggle
  (app)/log/run|strength  logging + integrated post-workout check-in; log/skip
  (app)/history/          past sessions; history/[id] edits them with material-change recalculation
  (app)/progress/         weekly totals, ease trend, knee chart, 4-week scorecard
  (app)/settings/         editable profile fields
  api/admin/seed/         session-gated one-click profile/library setup (see step 3)
domain/                   pure, unit-tested deterministic rules (no Supabase imports)
  safety/                 hard-block evaluation
  adaptation/             knee + recovery rules, orchestrator
  planning/               weekly shapes, recalculation/no-debt, gym/home/short mapping
  progression/            running + strength progression eligibility
  trends/                 comparable-run pairing, scorecard
  content/                curated exercise library + strength templates (seed source of truth)
lib/
  supabase/               browser/server/admin clients, hand-authored DB types
  services/                Supabase-backed services that call the domain layer
  seed/                   shared seed logic used by both /api/admin/seed and scripts/seed-profile.ts
  date.ts, labels.ts, env.ts
config/profile.json         seed source for the one profile row
supabase/migrations/         SQL migrations (apply via Supabase SQL Editor)
scripts/seed-profile.ts      optional local/CI seed script (most people use the in-app button instead)
docs/                        product specification (read-only reference)
```

## Known limitations / what's simplified in this pass

- **Rolling plan window**: the product brief describes an always-exactly-7-
  days-from-today rolling plan. This implementation generates one
  Monday-Sunday week at a time from `/plan/setup` (matching the required
  Mon-Sun consistency aggregation, no-debt recalculation, and 3/4/5-day
  shapes exactly), and the `/plan` page shows the current week with its
  change history. A literal continuously-rolling 7-day window spanning two
  calendar weeks is not built; the user sets up the next week from
  `/plan/setup` once the current one is underway.
- **Unplanned-load auto-reshaping**: `domain/planning/recalculate.ts`'s
  `isMeaningfulUnplannedLoad` classifier and priority-based dropping are
  implemented and unit-tested, and unplanned sessions are logged and count
  toward weekly totals/trends. Automatically re-shaping *future* days'
  planned workouts in response to an unplanned session is not wired end-to-
  end in the UI in this pass — recalculation is fully wired for morning
  check-ins (knee/recovery/time) and for explicit skips.
- **Editing completed logs**: available at `/history` (linked from Progress
  and from the confirmation shown after logging). Run and strength sessions
  can be corrected, including their post-workout check-in values. A
  material change — knee scores, effort, completion, distance/duration,
  run classification, or strength load — re-derives completion credit,
  writes a `rule_evaluations` audit row, and raises a safety event if the
  corrected knee values cross the hard-stop threshold. A notes-only edit
  changes nothing else, per `docs/BUILD_PLAN.md`. Two caveats: editing
  sets/reps/load clears any per-set "sets differed" detail for that
  exercise (it would otherwise contradict the summary), and cross-training
  /mobility sessions are not editable yet.
- **Preliminary tomorrow impact**: implemented as an immediate, computed
  (not persisted) preview shown right after logging a run, per
  docs/ADAPTATION_RULES.md's "show preliminary tomorrow impact, then
  confirm after next-morning knee score" — the *confirmed* version happens
  automatically the next morning through the normal check-in flow, which is
  fully wired and tested.
- **Immediate post-launch features** (Resend reminders, web push,
  consistency streak, personal records) are explicitly out of scope for
  this core-launch pass per `AGENTS.md`/`docs/VERSION_1_SCOPE.md` and were
  not built, so as not to delay the core.
- **Dependency pin**: `@supabase/supabase-js` and `@supabase/ssr` are
  pinned to exact versions (`2.55.0` / `0.5.2`) rather than a caret range.
  Newer `@supabase/supabase-js` releases (tested up through the current
  latest, `2.110.9`) have a TypeScript inference regression that makes
  every typed Supabase query resolve to `never`, and the very latest
  `@supabase/auth-js` versions bundled by even-newer `supabase-js` releases
  carry an unrelated advisory (GHSA-8r88-6cj9-9fh5) in the 2.41.1-2.49.10
  range. `2.55.0` is outside that vulnerable range and does not have the
  typing regression. Don't blindly `npm update`/`npm audit fix` these two
  packages without re-verifying `npm run typecheck` stays clean.
- **Unrelated dev-tooling advisories**: `npm audit` also reports
  postcss/sharp advisories bundled *inside* Next.js itself and
  minimatch/brace-expansion advisories inside ESLint's own plugin chain.
  Both only affect the build/lint toolchain (not runtime/production code),
  and the only "fix" npm offers is downgrading Next.js to a 2019-era
  version, which isn't a real fix. Left as-is; revisit when upstream
  publishes a patched Next.js release.
- **Live cross-device/RLS/production-browser verification**: this sandbox
  has no live Supabase project, so RLS isolation, auth flows against a real
  project, and installed-PWA behavior on an actual iPhone were verified by
  code/config review plus a live Playwright screenshot of the (unauthenticated)
  login page at mobile and desktop sizes, not by an end-to-end run against
  your real project. Please run through the smoke test below once deployed.

## Manual smoke test after you deploy

1. Sign in with the one account.
2. `/plan/setup`: pick 3-5 available days + a long-run day → generates the
   week.
3. `/today`: complete the morning check-in (try knee = 7 once, to see the
   hard block) → confirmed/adapted recommendation with a plain-language
   reason appears.
4. `/workouts`: toggle gym/home, open guided mode, step through an
   exercise's full content.
5. `/log/run` or `/log/strength`: log a workout + the integrated post-
   workout check-in.
6. `/plan`: confirm the change history shows the reason for anything that
   was adapted.
7. `/progress`: confirm weekly totals and the 4-week scorecard render.
8. Open the same account in a second browser/device; confirm the same data
   appears (cross-device sync).
9. On iPhone Safari: Share → Add to Home Screen; confirm it opens
   standalone.
