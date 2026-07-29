# Exercise Library

## Library rules

- Curated V1 library only; consistent main movements for four weeks with limited accessory rotation.
- Each implemented exercise record must include setup, steps, 2–3 cues, common mistakes, target muscles, and stop/substitute guidance.
- No Smith-machine exercises. No adjustable-kettlebell swings.
- Lower-body entries always instruct stopping/substituting if knee discomfort increases.
- Exercise resolution must be deterministic and must not rely on database row
  order. Core selections remain stable within a training block; rotation is
  opt-in for approved accessories only.
- Historical progression stays attached to the exact exercise unless an
  explicit reviewed compatibility mapping confirms identical loading
  semantics.
- Prescription metadata supports reps, seconds, distance, steps, and breaths.
  Existing V1 records remain reps-based until the visible library expansion.

## Phase 2: precise records and legacy history

Ambiguous records remain in the database for historical display but are marked
`active_for_new_plans = false` and `legacy_display_only = true`. They are never
deleted or repurposed. New plans use precise replacements:

- Bench hip thrust and floor glute bridge are separate.
- Seated and lying leg curl machines are separate.
- Hamstring bridge walkout no longer also means a band curl.
- Standing cable and seated-machine hip abduction are separate.
- Machine chest press and flat dumbbell bench press are separate.
- Short-range dead bug no longer also means an elevated plank.
- Farmer carry, suitcase carry, and suitcase hold are separate.

Compatibility links from ambiguous history are display-only. Numeric load
progression does not cross into a precise replacement because the prior
variation cannot be proven.

## Core movement map

| Intent | Planet Fitness | Home | Short/easier option |
|---|---|---|---|
| Squat | Leg press or dumbbell goblet squat | Goblet squat (DB/KB) | Bench box squat |
| Hip hinge | Dumbbell RDL or cable pull-through | DB/KB RDL | Reduced-range DB RDL |
| Single-leg | Step-up or supported split squat | Step-up or supported split squat | Lower step / assisted split squat |
| Glutes | Hip thrust/glute bridge | Bench hip thrust/glute bridge | Floor bridge |
| Hamstrings | Seated/lying curl | Slider/band curl or bridge walkout | Isometric bridge |
| Hip abductors | Cable hip abduction/abduction machine | Band lateral walk/clamshell | Clamshell |
| Horizontal push | DB bench/chest press | DB bench press/pushup incline | High-incline pushup |
| Horizontal pull | Seated cable row/one-arm DB row | One-arm DB row | Bench-supported row |
| Vertical push | DB shoulder press/machine press | Seated DB press | Half-kneeling single-arm press |
| Vertical pull | Lat pulldown | Band pulldown if anchored safely | One-arm row substitute |
| Core anti-extension | Plank/dead bug | Plank/dead bug | Elevated plank/dead bug |
| Core anti-rotation | Pallof press | Band Pallof press | Tall-kneeling band hold |
| Carry | Farmer/suitcase carry | DB/KB suitcase carry | Shorter carry/hold |

## Initial templates

### Strength A — lower body, hip stability, push, core

Warmup; goblet squat/leg press; DB RDL; step-up; DB bench/chest press; row; clamshell or lateral walk; dead bug/plank; optional carry.

### Strength B — full body, posterior chain, upper/core

Warmup; hip thrust/glute bridge; supported split squat; hamstring curl/bridge walkout; shoulder press; lat pulldown/row; hip abduction; Pallof press; optional upper-body finisher.

### Upper/core safety alternative

Seated DB press; chest press; supported row; pulldown or safe band substitute; dead bug; Pallof press; gentle mobility. Exclude loaded lower-body work.

### Combined short run + strength

Short easy HR-guided run or treadmill warmup, then 3–4 high-value movements: hinge or pain-neutral squat, push, pull, core/hip abductor.

## Prescription defaults

- Main strength: generally 2–4 sets within a documented rep range.
- Difficulty target: controlled, usually 6–8/10; preserve form and stop shy of maximal effort.
- Rest is explicit.
- Short version keeps warmup/safety work and the highest-priority movement patterns; optional accessories/finisher are removed first.
- A treadmill mile before strength counts as mileage, not a completed run.

## Required content example

### Banded clamshell

- **Setup:** Side-lying, hips/knees bent, band above knees, feet together, pelvis stacked.
- **Perform:** Keep feet together and lift the top knee without rolling the pelvis; lower with control.
- **Cues:** “Stack the hips.” “Move from the side glute.” “Use a small controlled range.”
- **Mistakes:** Rolling backward, separating feet, rushing.
- **Targets:** Gluteus medius/hip abductors.
- **Stop/substitute:** Stop if knee or hip pain increases; use an unbanded smaller range or another pain-neutral abductor movement.

All other library entries must meet this content depth before being exposed in the app.
