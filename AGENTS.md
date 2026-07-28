# AGENTS.md

## Mission

Build Andrew's private V1 marathon training app exactly from the planning documents. Do not invent major product behavior. When documents conflict, use this precedence:

1. `docs/SAFETY_RULES.md`
2. `docs/ADAPTATION_RULES.md`
3. `docs/VERSION_1_SCOPE.md`
4. `docs/DATA_MODEL.md`
5. `docs/PRODUCT_BRIEF.md`
6. `docs/BUILD_PLAN.md`
7. `docs/EXERCISE_LIBRARY.md`
8. `docs/TEST_PLAN.md`

Raise a concise question only for a genuine unresolved conflict or a choice that materially changes scope, safety, cost, or data compatibility.

## Required stack

Next.js App Router, TypeScript strict mode, Tailwind CSS, Supabase Postgres/Auth, Vercel. Use username/password for one manually created account with no registration. Keep the prototype compatible with free tiers.

## Build rules

- Core launch precedes reminders and gamification.
- Deterministic server-side rules; no runtime AI coach.
- Safety blocks take precedence and must be server-enforced.
- Preserve plan versions, rule inputs, codes, and explanations.
- Use migrations, RLS, typed domain services, and seed data.
- Seed profile idempotently and never overwrite live data.
- Use accessible, mobile-first UI; verify iPhone and desktop layouts.
- Never commit secrets or expose service-role keys.
- Do not add Garmin/Oura syncing, native/offline features, social/multi-user/payment features, body measurements, readiness scores, or badges.
- Maintain a short `README.md` with setup, environment, migration, seed, test, and deployment steps.

## Quality workflow

Before claiming completion:

1. Run typecheck, lint, unit/integration tests, and production build.
2. Run relevant end-to-end flows.
3. Verify migrations and RLS.
4. Inspect responsive UI at mobile and desktop sizes.
5. Test safety rules directly, including server-side bypass attempts.
6. Report completed work, verification, and any remaining limitations.

Preserve unrelated user changes. Prefer small, reviewable commits when asked to commit.
