# Codex Kickoff Prompt

Build the core usable release of Andrew's personal marathon training application in this repository.

Read `AGENTS.md` and every file under `docs/` before implementation. Treat those documents as the resolved product specification. Use the required stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase database/auth, and Vercel. The app is private and single-user; use a manually created username/password account and do not build registration.

Start by auditing the repository, then create a concise implementation plan mapped to `docs/BUILD_PLAN.md`. Implement through the production-ready core launch without pausing for minor technical choices. Ask only if a true specification conflict would materially affect safety, scope, cost, or persisted data.

Non-negotiable outcomes:

- Responsive mobile-first Today, rolling plan, workout, logging, progress, and settings experiences.
- Required morning check-in and deterministic transparent adaptation.
- Server-enforced knee safety hard stops.
- Four-/five-/three-day flexible planning with no workout debt.
- Time/HR-guided running, two-week calibration, every-other-week threshold, and guarded progression.
- Gym, home, and short strength variants with written exercise guidance.
- Run/strength/post-workout logging, unplanned/skip/override reasons, editable history, and material recalculation.
- Cross-device hosted persistence, RLS, plan/rule audit history, basic trends, and four-week scorecard.
- Installable PWA-like web experience, online only.

Do **not** let reminders or gamification delay the core. After the core is verified, implement immediate post-launch work as a separate milestone only if time/scope permits: Resend reminders, optional straightforward web push, consistency streak, and personal records.

Use database migrations and an idempotent structured profile seed. Add a complete README and automated tests, prioritizing safety/adaptation tests. Run typecheck, lint, tests, build, responsive checks, and a production-ready deployment review before declaring completion. Clearly report the files changed, verification performed, environment values the user must supply, Supabase setup steps, and any remaining limitations.
