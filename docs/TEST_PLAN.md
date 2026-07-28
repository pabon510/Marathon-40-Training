# Test Plan

## Test layers

- Unit tests for pure rules, pace/metric calculations, scale validation, comparisons, and progression.
- Integration tests for Supabase persistence/RLS, plan versioning, recalculation, edits, and auth.
- End-to-end tests for core user journeys on mobile and desktop viewports.
- Manual production smoke test on iPhone Safari/home-screen mode and desktop.

## Critical rule cases

1. Knee 0–2 stable keeps plan.
2. Knee 3–5 improving permits easy/no increase.
3. Knee 3–5 stable downgrades threshold.
4. Knee 3–5 worsening removes running/lower-body.
5. Knee 6 hard-blocks running/lower-body in UI and server API.
6. During-workout rise by 2 triggers hard stop.
7. Energy 1 + low Oura + fatigue 4 reduces; low Oura alone does not.
8. High stress alone does not reduce.
9. Good check-in never increases today.
10. Same inputs do not duplicate plan changes.

## Planning cases

- Correct four-, five-, and compressed three-day mixes.
- Threshold replaces easy run and appears only every other week in month one.
- Strength overlap avoidance.
- Missed workout recalculates without debt.
- Missed long run becomes shorter run.
- Unplanned meaningful run/lower load recalculates; easy walk does not.
- Plan history retains old/new prescriptions and explanation.
- Preliminary post-workout change is confirmed/revised next morning.

## Progression cases

- No progression during calibration weeks.
- Run progresses only with all four qualifications.
- Increase one running variable only and cap near 5%.
- Strength requires two similar successes; reps before weight.
- Knee increase, effort >7, or incomplete work prevents progression.
- Home progression uses tempo/pauses/unilateral options.

## Logging and metrics

- Pace correctly derives from distance/duration and override is retained.
- Optional fields remain null and require skip confirmation where specified.
- Treadmill warmup adds mileage but not run completion.
- Recommended short/home/substitute earns full credit.
- Self-shortened work earns partial credit as configured.
- Scorecard computes each criterion and success at 4/5.
- Comparable runs exclude mismatched duration (>~10 minutes), environment, and workout type.
- Weekly maximum knee is not replaced by average.
- Material edit recalculates; notes-only edit does not.

## UX and accessibility

- Provisional workout before check-in; cannot start until check-in.
- Primary and short alternative visible with brief goal/reason.
- Full workout view precedes guided mode.
- Location remembered for the day.
- Missing/empty/error/loading states are understandable.
- Form inputs have labels, definitions, correct numeric keyboards, focus states, and 44px minimum targets.
- Charts have text summaries and do not rely on color alone.

## Security

- Unauthenticated routes redirect to login.
- No public registration.
- User cannot read/write another user’s rows using direct Supabase requests.
- Service-role key absent from client bundle.
- Hard blocks cannot be bypassed with crafted client requests.

## Cross-device and deployment

- Create check-in/log on phone-sized session; verify on separate desktop session.
- Refresh/re-login retains active plan and history.
- Timezone boundaries produce correct local workout date.
- PWA manifest/icons install successfully where supported.
- Online-only failure message is clear when network is unavailable.

## Post-launch tests

- Reminder schedules use local time and send once only.
- Weekday/weekend reminder timing differs correctly.
- Reminder deep link offers Start / Log / Skip.
- Streak uses 75% of adapted plan.
- PRs exclude inappropriate incomparable records.

## Launch exit criteria

All critical safety and adaptation tests pass; no high-severity accessibility/security issues; production smoke test passes on iPhone and desktop; cross-device sync is verified; known limitations are documented.
