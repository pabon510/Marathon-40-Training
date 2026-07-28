# Product Brief

## Product

Andrew's private, single-user marathon training application. Version 1 is a responsive, mobile-first web app that recommends today's workout, maintains a rolling seven-day plan, records training and recovery, and adjusts future work using transparent rules.

The initial phase is **base rebuilding**, even when a target marathon date is stored. The product must not imply that Andrew is currently following a complete marathon plan.

## User and baseline

- Sole user: Andrew.
- Primary device: iPhone; tablet at home; desktop for overview and trends.
- Current baseline: roughly one six-mile run and one 45-minute strength session per week.
- Familiar six-mile pace: about 9:15/mi, but this is not assumed to be easy effort.
- Recent nine-mile run: 9:21/mi, effort 9/10, average HR 160, maximum HR 174, followed by left-knee soreness lasting more than a week.
- Recent controlled 3.85-mile run: about 9:08/mi and average HR 146.
- Garmin-reported current zones and maximum HR are provisional; wrist optical HR is used.
- Comfortable with common bodyweight and loaded movements; core and pushups feel weak.
- Prior PT attributed knee symptoms to weak hip abductors and recommended band work such as clamshells.
- Goals: make running feel easier, rebuild consistency, improve knee resilience, build full-body and core strength, improve upper-body definition, and make carrying/playing with children easier.

## Product principles

1. **Show one clear recommendation.** Home begins with a primary workout and a shorter alternative.
2. **Explain changes plainly.** Example: “Knee discomfort increased from 2 to 4, so today’s threshold run became an easy run.”
3. **No workout debt.** Missed work causes recalculation; it is not endlessly pushed forward.
4. **Maintain or reduce only day-to-day.** A good check-in never increases that day’s prescription.
5. **Reward the adapted plan.** A recommended shorter, substitute, or home workout earns full credit.
6. **Track trends, do not diagnose.** Knee data guides conservative training changes but does not identify a condition.
7. **Minimize entry burden.** Morning and post-workout flows should normally take about one minute.
8. **Preserve intent across locations.** Gym-to-home conversion retains movement pattern, muscle groups, and difficulty intent.

## Core user journeys

1. Sign in to a private account and see a provisional recommendation.
2. Complete the required morning check-in; receive a confirmed or adapted workout.
3. Review a rolling seven-day plan, including small change histories.
4. Start from the full workout overview, then optionally use guided exercise-by-exercise mode.
5. Convert strength work between Planet Fitness and home, with a shorter version available in either location.
6. Log a run or strength workout and complete the integrated post-workout check-in.
7. Log unplanned training, skip a workout with a reason, or override a recommendation where permitted.
8. Review weekly minutes/miles, comparable-run ease trend, strength consistency, daily knee scores, and the four-week scorecard.

## Success after four weeks

The first month is successful when at least **4 of 5** criteria are met:

1. Complete at least 6 of 8 planned strength sessions, including recommended home or shortened versions.
2. Complete at least 75% of the adapted weekly plan in at least three of four weeks.
3. Record at least one comparable easy run showing improved pace at similar HR, lower HR at similar pace, or longer duration without higher effort or next-morning knee discomfort.
4. Weekly maximum knee discomfort is stable or trending downward by week four.
5. Complete the required morning check-in on at least 80% of workout days.

The scorecard is visible from day one.

## Technical direction

- Next.js (App Router), TypeScript, Tailwind CSS.
- Supabase Postgres and username/password authentication.
- One account created manually; no registration, password-reset, or multi-user product flows.
- Vercel deployment.
- Responsive, mobile-first, installable PWA-like experience; online use only.
- Hosted data and cross-device sync.
- Free-tier prototype.

## Delivery phases

### Core usable launch

Daily recommendation, morning check-in, rolling plan, gym/home/short variants, guided strength workflow, run and strength logging, post-workout check-in, rules-based adaptation, safety blocks, basic trends, scorecard, private authentication, and responsive deployment.

### Immediate post-launch

Email reminders (Resend), optional web push if straightforward, weekly consistency score/streak presentation, and personal records. These may not delay the core usable release.

## Explicit non-goals

No Garmin or Oura syncing, Garmin publishing, social features, multiple users, payments, marketplace, autonomous AI coaching, two-year daily calendar, native app, offline mode, body-weight/waist tracking, structured Garmin file import, screenshot parsing, full run-split analytics, readiness score, or badge system.
