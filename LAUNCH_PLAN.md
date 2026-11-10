# MyTerra Launch Plan (Public Launch Transformation)

**Source brief:** `docs/LAUNCH_BRIEF.md` (full canonical text — read it before working on any stage).
**Locked decisions (Dervis, 2026-07-14):**
- Pricing stays as shipped: Basic $4.99/mo, Pro $9.99/mo, Lifetime $190 (Paddle live). Brief's €6.99/€59.99 pricing is REJECTED.
- Trial: 7-day Pro trial → paywall. No permanent free plan.
- Staged rollout, one stage per Full-ship cycle. No "implement everything at once."

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Architecture assessment (Stage 1 — done 2026-07-14)

- React 19 + Vite 8. App.jsx = UI shell. Features in `src/features/`, data `src/data/`, logic `src/lib/`.
- Auth/sync: Supabase (Phase 5/6 FINAL). Cloud source of truth, localStorage cache `hfm_data_v7`.
- Payments: Phase 8 substantially shipped (Paddle checkout + webhook verified; domain approval pending).
- Existing onboarding: `src/features/onboarding/Onboarding.jsx` (409 lines, 4 steps:
  welcome → region+city → zone type → starter plants). Reusable as skeleton for the 12-step flow.
- Migrations: idempotent shape-fixers in `src/lib/migrations.js`, chained at TWO call sites in
  App.jsx (~L194 local load, ~L306 cloud pull). Any new field MUST be added at both.
- Map: single Farm-style environment (Grove engine + Living Farm Map in `src/features/farm/living/`).
  No Balcony/Backyard environments exist. This is the largest gap vs the brief.
- Nav: 7 sidebar items / 5 bottom tabs (`src/app/navigation.js`). Brief wants
  Today / My Space / Plan / Learn / Progress. Regroup = mapping exercise, no data change.
- Tasks: generated in `src/lib/` (buildTaskQueue). No per-task reason/duration/map-link schema yet.
- Analytics: Umami. Brief's event taxonomy not implemented.
- Gating: tier columns live in `profiles` (Supabase); in-app feature gating NOT built.

## Migration risks

1. `hfm_data_v7` key must NOT change. All new fields via idempotent migrations, defaults preserved.
2. Cloud pull path (App.jsx ~L306) rebuilds from `{...DEF, ...fresh}` — new DEF keys are safe,
   but nested objects need explicit migration (spread does not deep-merge).
3. Existing users must land as environment `farm` with their map untouched.
4. Sync last-write-wins: ship data-model changes BEFORE any UI that writes them, so an old
   client can't clobber new fields with `undefined` (old clients spread unknown keys through — verify).

## Stage plan

- [x] **Stage 1 — inspection + this plan** (2026-07-14)
- [x] **Stage 2 — data model** (2026-07-14, commit c695356). Add `profile` block to DEF (environment, dimensions, sunlight,
  goals, experience, timeBudget, household, onboardingVersion) + `migrateProfile` at both
  call sites. Existing users → environment `farm`.
- [x] **Stage 3 — onboarding** (2026-07-14). 12-step flow shipped (environment,
  dimensions, location, sunlight, goals, experience, time, household, assets, plant
  suggestions, initial map, 7-day plan). All answers → `profile` (onboardingVersion 2);
  suggestions consume environment/sunlight/experience/dislikes via `src/lib/suggest.js`
  (reusable for Plan screen + Stage 6). Starter zone + canvas generated per environment
  (`buildStarterZone`); assets stored in `profile.assets` but do NOT auto-create zones
  (Basic zone-cap decision pending). Legacy skip loop bug fixed (skip now sets
  setupDone:true). Finish lands on populated Today via existing buildTaskQueue.
- [x] **Stage 4 — map environments.** (completed 2026-07-14) Balcony + Backyard visual environments on the shared
  data model; current map becomes Farm environment. Scale/objects/animations per brief §6–7.
  Multiple sessions. Lazy-load per-environment assets.
  - [x] **4a (2026-07-14):** environment plumbing + first visual pass. `src/lib/environment.js`
    (resolveEnvironment, farm fallback). GroveScene + LivingFarmMap render per environment:
    balcony = decking ground, apartment wall + railing frame, no border trees/roads/gate/tufts;
    backyard = lawn + perimeter fence, no farm gate/roads/border trees; farm unchanged.
    Fixed Stage 3 regression: zone types `raised`/`container` registered in ZT (onboarding wrote
    unregistered `contain`/`raised` — balcony/backyard users couldn't plant into starter zones);
    `contain`→`container` normalized in migrateZones; all 5 plant-zone lists extended; new
    raised/container surfaces in visuals.js; migrateProfile added to backup-import path.
    Map animations pause when tab hidden (§17). jsdom e2e: 3 envs + legacy user + migration.
  - [x] **4b (2026-07-14, commit 827db47):** per-env map FX. New `src/features/grove/MapFX.jsx`
    (shared by GroveScene + LivingFarmMap): live rain/snow from cached Open-Meteo forecast,
    sun-direction glow from `profile.sunDirection` (morning/afternoon/allday) with ☀️ badge;
    balcony railing planters + wall shelf, backyard trees, env-aware decor palette, watering
    drips. Hidden in edit mode (§7). Verified live in bundle index-BRWIEMGE.js
    (grove-rain-drop, grove-snow-flake, data-map-fx, "Morning sun"/"Sun all day" all present).
  - [x] **4c (2026-07-14, commit 29329a6):** environment switcher in Settings (brief §18 —
    existing users may change env). SettingsPanel "My Space" section writes
    `profile.environment` ONLY — zones, plots, canvas, dimensions untouched, no layout
    regeneration. Farm designer size editing made env-aware: label "Total space size"
    for balcony/backyard, MeterField min 2 m (balcony) / 4 m (backyard) — old 10 m floor
    locked balcony users out of editing real-space dimensions. Lazy-loaded image assets:
    N/A — all env surfaces are CSS/SVG. Vercel webhook missed 29329a6; retriggered via
    05c72e6. Verified live in bundle index-Br4oa1nD.js ("Total space size", switcher
    helper text, "My Space" all present; CSP header intact).
  - [x] **4z (2026-09-27, commit 96bff87): real 3D farm map.** `src/features/grove/Grove3D.jsx`
    renders the map with three.js (lazy chunk Grove3D-*.js, ~170 kB gz): one camera, one sun,
    shadows; every zone type built from geometry (buildings with roofs/windows/doors/solar,
    framed glass greenhouse, beds with dense instanced crop rows, water reserve, compost,
    hives, nursery, pasture shelter), perimeter hedge, curved kerbed paths, trees/rocks/flowers.
    GroveScene uses it when `mapStyle.camera` is "3d" (default); edit mode, walk focus and
    missing WebGL fall back to the flat SVG. Designer option "View: 3D / Flat overhead" under
    Ground & paths. Labels match the field-sign style, colliding names hidden. Verified: ESLint,
    46+3 tests, Vite build; live bundle index-CNRP_iZ_.js references Grove3D-DKLJOoeW.js
    (649,674 B; "g3-pill", "prop-bush", "RoomEnvironment" present); zone-card click works in 3D.
    NOT yet verified on a phone (frame rate while dragging ~1,300–1,600 meshes). Revert = set
    View to "Flat overhead" per farm, or `git revert 96bff87`.
  - [x] **4z-2 (2026-09-27, commit 99781e1): map-game controls + performance pass.** Custom
    FarmControls: drag pans with inertia, pinch/twist/two-finger tilt anchored between the
    fingers, wheel zooms to cursor, tap opens, double-tap zooms, keys pan/zoom; view clamped to
    the farm. Inline map is cooperative (one finger scrolls the page + hint, two fingers move
    the map, Ctrl/Cmd+wheel zooms); full-screen mode with zoom/reset/close buttons. Static
    meshes merged per material (≈1,500 → ≈110 meshes; ≈360 draw calls/frame), shadows rendered
    once, render on change only, lower resolution during gestures, world rebuilt only when map
    data changes, taps via one hit box per area. Quality: polygon-offset ground layers (no
    z-fighting), fog tied to fit distance, top-view crop planes, selection outline, labels
    under an area's front edge with size-based decluttering. Verified: 30 synthetic gesture
    checks (Playwright, inline + full screen), ESLint, 46+3 tests, build; live bundle
    index-m0JK4sjp.js → Grove3D-C955PL0-.js ("g3-coop", "Use two fingers to move the map",
    "Full screen map" present; CSS "g3-ctl"). Real-device frame rate still unmeasured.
  - [x] **4z-3 (2026-09-27, commit 4b58929): growth made visible.** Row markers with
    stage-coloured tags on every planted row (Planned/Sown/Seedling/Growing/Maturing/Harvest
    window), gold halo on rows in their harvest window, sprouts for sown rows, stage dots under
    area names, mouse tooltips per row (crop, stage, days to harvest, count), growth-preview
    panel (chips + 0–120-day slider, legend with counts; badges hidden while previewing).
    Layout fix after the "menu disappeared" report: inline map height capped at 78% of the
    window, controls moved to the map's top-right, body scroll always restored. Verified:
    ESLint, 46+3 tests, build, 30 gesture checks, app screenshots at 1440/900/390 px with the
    nav visible; live bundle index-wB2IpMT0.js → Grove3D-BB0FU84v.js ("Growth preview and
    legend", "in its harvest window", "+2 wk" present; CSS g3-time/g3-tip). Still open:
    real-device frame rate; exact cause of the reported missing menu not reproduced.
  - [x] **4z-4 (2026-09-27, commit 0051b67): rendering quality, animations, efficiency.**
    Quality: crossed crop sprites and tree leaf discs fade by view angle (ordered dither) so
    beds seen from above show clean top-view art and trees seen low keep a solid three-sphere
    crown; edge-on planes dropped (no dark stem lines); animals/props lean back toward a high
    camera; lower afternoon sun for readable shadows. Animations, all in the vertex shader from
    one clock (loop only while the map is on screen and the tab visible; 30 fps idle desktop /
    20 phone, full rate during gestures; reduced-motion honoured): crop/tuft/canopy sway, water
    drift, harvest-halo pulse, bee hover, hen hop, chimney smoke, drifting cloud shadows.
    Efficiency: home view 380 → 168 draw calls (transparent double-sided materials no longer
    drawn twice; camera-facing sprites instanced per artwork; fences/tufts/pots/markers/crops
    collected farm-wide; crossed quads merged; per-call materials memoised). Design (user
    reports): labels sit on the thing they name (footprint centre at roof/bed height) so
    numbered narrow beds read unambiguously, compact pills/badges, shrink when zoomed out;
    bed-detail stage key shows the bed's own crops (one row per crop). Verified: ESLint,
    46+3 tests, build, 30/30 gesture checks, all-zone-type + numbered-beds harnesses, app
    screenshots 1440/390 with nav; live index-B-YJRLUB.js → Grove3D-B770U796.js (g3bayer,
    proc:puff, g3size, uFadeV, forceSinglePass, IntersectionObserver present; CSS g3-far,
    q-stage-key-crop, pill/badge min-height:0). Not verified: real-device frame rate and
    battery; animation timing only reasoned about (headless RAF is starved).
  - [x] **4z-5 (2026-09-30, commit 3c54f92): animals in real 3D, rolling terrain.**
    `src/features/grove/animals3d.js` (MARKER `GROVE_ANIMALS_3D`) replaces the camera-facing
    animal sprites with procedural geometry for all 14 species (cow, horse, donkey, alpaca, pig,
    goat, sheep, rabbit, chicken, duck, goose, turkey, quail, guinea fowl): body, neck, head,
    muzzle, eyes, ears, horns, legs with hooves, tail plus species details (udder, mane, wool,
    beard, comb, wattle, snood, fan tail, floppy ears, curly tail). Four coat variants per
    species (cow/goat patches by 3D noise, per-vertex colours). The whole herd is ONE merged
    mesh (one draw call + one shadow pass); motion lives in the vertex shader on the shared
    clock: each animal walks a slow loop inside its arena (paddock clear of shelter/trough/
    feeder, or the apron in front of a coop/barn), turning with its direction of travel, legs
    swinging in a trot, then stops to graze (neck down, nibbling) — hens strut and peck, tails
    swish, rabbits hop. Terrain: the ground is now a warped-grid mesh (dense near the farm,
    coarse far out) with rolling hills beyond a flat apron (`terrainHeightFn`), vertex-tinted
    drier on high ground, plus tree clumps and boulders out on the hills; the farm itself stays
    flat so every zone/road/fence is unchanged. Mobile pixel ratio capped at 1.5 (was 2).
    Verified in sandbox: ESLint, 61+3 tests, Vite build, Playwright harnesses (`tests/g3-all`,
    new `tests/g3-zoo` with every species) at 1280 and 390 px, zero console errors, walking
    loop + turning + leg swing seen across frames, draw calls unchanged at the home view (178).
    Live: index-Bv4YQo2A.js → Grove3D-CnrdgTkt.js (684,773 B; `g3animalDepth`, `g3pose`,
    `atan(tng.x, tng.y)` present; CSP header intact). NOT verified: real-device frame rate.
    Revert: `git revert 3c54f92` (flat SVG map untouched).
- [x] **Stage 5 — navigation regroup (built 2026-09-28, live 2026-09-30; commit b128c72, label
  follow-up 475fc64).** `src/app/navigation.js` now
  defines SECTIONS: Today (home "Overview" + tasks "All tasks"), My Space (map, crops, live),
  Plan (new `src/features/plan/PlanScreen.jsx`), Learn (manuals), Progress (new
  `src/features/progress/ProgressScreen.jsx` + pantry + fin). Page ids unchanged; saved pages map
  over (`normalizePage`: farm→map, season→plan). Phones: 5 bottom tabs (More removed), area pages
  as tabs on top (SectionBar) + account button (Settings, feedback, plan, Admin for the owner);
  tablets: icon rail + the same tabs; desktop: areas with their pages in the sidebar. Plan: waiting
  plantings with "I sowed it", this month's picks from suggest.js with the reason, "Coming up" by
  month, six-month season strip, the seasonal calendar (moved from Manuals). Progress: next
  harvest, food grown from pantry intake moves (kg, harvests, eggs, milk, ~portions at 80 g),
  harvest per month, pantry, money, badges; empty states say how numbers start appearing. Pure
  helpers `src/lib/plan.js`, `src/lib/progress.js`. No data changes, no deleted screens. Live check:
  see the UX follow-up entry below.
- [ ] **Stage 6 — task engine upgrade.** Task schema: reason, duration, map ref, priority,
  postpone/skip/not-relevant responses feeding future scheduling. Environment-aware
  frequency (container vs bed).
- [ ] **Stage 7 — trial + gating.** 7-day Pro trial from account creation, expiry →
  read-only + paywall (data preserved), 72h offline grace token. Uses existing Paddle
  tiers. Basic zone-cap decision still open (blocker for this stage).
- [ ] **Stage 8 — sharing + referral attribution.** Share cards from map; referral data
  model + attribution events first, rewards later.
- [ ] **Stage 9 — homepage.** 3-environment hero, new copy ("Grow food without the
  guesswork"), remove unsubstantiated claims. Pricing section keeps $4.99/$9.99/$190.
- [ ] **Stage 10 — verification.** Lint, build, migration tests, onboarding e2e, offline,
  trial expiry, mobile map editing, accessibility (remove user-scalable=no etc).

**Scope freeze:** per brief §19 — no new crops/animals/guides/modules until Stages 2–10 done.

- [x] **Scope-freeze exception (2026-09-28, owner request, commit 99e7683): cheese + prosciutto
  recipes in Manuals → Preserving.** `src/data/recipes.js`: 8 cheeses (ricotta, paneer, labneh,
  mascarpone, chèvre, 30-minute mozzarella, halloumi, feta) + 3 prosciutto-style cures (duck
  prosciutto, lonzino, whole-leg prosciutto crudo), each with safety, ingredients, numbered
  steps, storage/shelf life, troubleshooting, sources; linked to their parent methods, own
  filter chips. `cheese_making`: rennet dose corrected (¼ tsp per 4 L, was per 10 L) + raw-milk
  pasteurisation line. Detail header labels wrap on phones. Facts checked by an independent
  review pass (Parma spec 2025, Santé publique France, USDA/FSIS, FDA, NHS, CDC, Oregon State /
  NMSU / UAF / UCCE extension, Guelph). Verified: ESLint, 46+3 tests, build (sandbox + Mac), all
  24 Preserving pages open at 360 px with no errors or horizontal overflow; live bundle
  index-BZAVYMD4.js on myterra-sigma.vercel.app and www.myterra.farm contains "Cured Meat
  Recipes", "RAW MILK FROM YOUR OWN ANIMALS", "READY WHEN BOTH ARE TRUE". Not verified: the live
  screen itself (behind sign-in). Open: `oil_preservation` says "Dried herbs in oil: 2–3 weeks";
  Oregon State Extension says dried herbs/garlic in oil must be used within 4 days.
- [x] **Scope-freeze exception #2 (2026-09-28, owner request, commit bd9a3a5 — its commit message
  was mistakenly a copy of 99e7683's; this entry is the correct description): Balkan, Turkish and
  Mediterranean recipes.** Cheeses: kajmak, gjizë/urdë/lor (+ çökelek), burrata, kashkaval/kaşar
  (aged), Balkan white cheese (djathë i bardhë / sirene / beyaz peynir). Cured meats: pastırma,
  bresaola, pancetta + guanciale, sucuk/suxhuk (fermented; always cooked; pH ≤5.3 within 72 h at
  22–24°C). Cooked meats (new "Cooked Meat Recipes" filter): prosciutto cotto, kavurma. Origin
  shown on every recipe; Balkan pršut note on the whole-leg recipe; step labels with Turkish
  capitals render bold. Independent fact-check pass applied (CFIA/BCCDC degree-hours, 9 CFR
  424.21, FSIS cooling, foodsafety.gov, Kayseri GI, Bresaola IGP, Dalmatinski pršut PGI, NHS).
  Verified: ESLint, build and tests (sandbox 46+3, Mac 56+3 on top of 85c9f6e), all 35 Preserving
  pages open at 360 px with no errors/overflow. Total recipes: 22.
- [x] **UX pass (2026-09-28, owner request "full UX/UI testing", commit 096dfa5).** Walkthrough
  as the target user (backyard + balcony beginners, skip-setup, established farm; phone 390/360,
  tablet, desktop 1440, dark mode, trial day 1 / last day / expired) → findings in
  `docs/UX_AUDIT_2026-09-28.md` (24, severity-ranked, with open items). Shipped: sign-up funnel
  (landing CTAs → `/app?signup`, Create account / Sign in tabs, forgot password + PASSWORD_RECOVERY
  "choose a new password", landing.js forwards auth hashes to /app, sign-up no longer hangs on
  "Please wait…" when email confirmation is on, Enter submits); real plan label instead of the
  hard-coded "Free plan"; trial banner shows the end date. Onboarding honesty: "now" = sowing window
  open or opening within ~2 weeks, off-season picks become "Sow from <month>" plans; picks wait as
  "Ready to sow" and the sow job stays until done, which starts the growing clock that day
  (`src/lib/sowing.js`); starter bed sized by time budget, 1.2 m wide, rows laid out with
  planPlanting; starter-kit shopping list (plan step + Home checklist); live 3D preview on the map
  step. Tasks: calm "Do today", ~minutes per job, done toast with next step + Undo, Tasks-screen
  completions stock eggs/milk like the map popup. Also: full-screen map hides tab bar + assistant,
  nothing renders under onboarding, crop card (human dates, "I sowed it today", delete confirm),
  currency from device locale + Settings, space-name setting shows on Home, US-timezone
  harvest-day fix. New optional data fields (no migration): `plot.sowPending`, `plot.sowFrom`,
  `data.starterKit`, `data.currency`. Verified: ESLint, 56+3 tests (10 new), build (sandbox + Mac),
  Playwright walkthroughs before/after incl. mocked-Supabase sign-up, wrong password, reset request
  and recovery link; live index-DSA2_H-R.js (+ Grove3D-D4Br-Orz.js) contains "Start your 7-day free
  trial", "Choose a new password", "I sowed it today", "Your starter kit", "myterra:toast",
  "g3-full-open"; live `/` has 6 `/app?signup` links; CSP header unchanged. Not verified: real
  email delivery (Supabase SMTP) and the auth redirect allow-list (see audit doc), real-device
  frame rate of the onboarding 3D preview. Revert: `git revert 096dfa5`.
- [x] **UX follow-up: the audit's open items (built 2026-09-28, live 2026-09-30; commits 130338a,
  290737a, d8d256c, 5857e80, 3384d85, b128c72, fd1e149, 475fc64).** Import Backup confirms (backup vs current farm, download first,
  Undo; rejects non-backups); "+ Plant Crop" hidden until a bed exists ("+ Add a bed/planter");
  map buttons labelled (Growth / Reset / Expand, ≥44 px on touch); walk intro down to one choice
  (Options collapsed); Settings → Change password (current password first) and Delete account
  (type DELETE; new Edge Function `supabase/functions/delete-account`, deployed as v1 with
  verify_jwt on: cancels a live Basic/Pro Paddle subscription via `PADDLE_API_KEY` or refuses with
  409 so nobody is charged for a deleted account, then deletes farm row, profile row, auth user;
  privacy policy updated); Stage 5 navigation (above); landing on phones 14,746 → 13,197 px
  (plans swipe, Pro first; repeated stat tiles hidden; tighter spacing); leftover "Manuals" /
  "Seasonal" labels renamed (crop card link, assistant, feedback survey). Details and remaining
  items: `docs/UX_AUDIT_2026-09-28.md`. Verified: ESLint, 61+3 tests (5 new), build; Playwright at
  390/820/1440 px incl. dark mode, mocked-Supabase password change (wrong + right current password)
  and deletion (409 then 200: sign-in screen shows the deleted notice, local farm/session/entitlement
  caches empty); Edge Function paths run locally under Deno against a mock (trial, lifetime, no
  profile, canceled, live sub without key → 409, with key → cancel then delete, Paddle error → 409,
  bad/missing JWT → 401, no confirm → 400); live function answers CORS preflight and rejects
  unauthenticated calls. Pushed from the Mac after its build, 61+3 tests and ESLint passed there. Live
  2026-09-30: production deployment READY for 1432937; myterra-sigma.vercel.app and www.myterra.farm
  serve index-EkoHv9p5.js (+ Grove3D-COHP0spy.js) containing "Replace your farm with this backup?",
  "Delete my account", "Save new password", "Waiting to go in", "Food from your space", "Read the
  full guide in Learn", "Checking from indoors", "Show the whole map again" (Grove3D: "See how your
  plants grow over the coming weeks"); live `/` has "Swipe to compare Pro, Basic and Lifetime"; live
  `/privacy` has the in-app deletion wording; CSP header unchanged (Supabase host allowed for the
  function call). Live smoke test at 390 px with a simulated sign-in (every Supabase call answered
  by a mock, analytics blocked, no real account touched): five tabs Today / My Space / Plan / Learn /
  Progress, Plan and Progress render, Settings shows Change password and Delete account. Not
  verified: a real deletion on production; whether `PADDLE_API_KEY` is set.

- [x] **Website audit of landing v2 (2026-09-30, owner request; commits 1e05fd7, 4e768fc, 06701df,
  c6acfea).** Checked at 390/360/820/1440 px (links, assets, SEO/OG/structured data, robots/sitemap,
  keyboard, tour video, counts vs `src/data/`). Fixed: six app screenshots re-captured from the current
  app as `p2-*.webp` (five-tab menu, labelled map buttons; know-how card shows Plan "For you"); hero
  chips off the coop pop-up; final CTA small print centred; Basic "All 9 modules" → "Your 3D map, crops,
  animals and pantry"; tour poster picked in landing.js (phones: one poster, −127 KB); privacy policy
  no longer says "once paid plans launch"; branded `404.html`. App: coop pop-up rows fit 320–400 px,
  growth-preview pill on one line. Verified: ESLint, 61+3 tests, build (sandbox + Mac); deployment
  READY for c6acfea; www.myterra.farm and myterra-sigma.vercel.app serve landing.js?v=20260930, the
  six p2 images (200; old ones 404), `/some/missing-page` → 404 with the branded page, updated
  `/privacy`, app CSS index-C24mi1bD.css with the pop-up fixes; Playwright on the live site at the four
  widths: one poster request, small print centred, no horizontal overflow, tour plays. Stage 9 stays
  open: the Pro list still claims "Multi-zone management" and "Advanced analytics", which don't exist
  (owner decision, see audit doc). Deploy note: `/usr/bin/git` on the Mac now stops at the Xcode
  licence prompt; this push used `DEVELOPER_DIR=/Library/Developer/CommandLineTools` (no system
  change). Fix once on the Mac: `sudo xcodebuild -license accept` (also needed for the iOS build).

- [x] **Homepage v2 (2026-09-30, owner request: "redo the website with real screenshots and a 15-second
  video"; commits de98e16, 79e7c20).** New landing page: a live 3D-map hero loop (real app footage,
  vertical on phones), Balcony / Backyard / Farm tabs with map shots, a 15-second tour video recorded
  from the app (9:16 on phones, 16:9 elsewhere; MP4 + WebM; plays only while in view; pause button),
  how-it-works steps, know-how stats with four phone screens, features, pricing with a trial timeline
  (phones swipe the plans, Pro first), FAQ and a final call to action. 79e7c20 re-shot the tour video,
  the three space maps and the starter-map step for the five-tab menu and labelled map buttons (closes
  the audit's tour-video item), swapped the know-how Plan shot for the demo balcony, and moved "Watch
  real food pile up" to the Progress screen. New file names (`d2-*`, `p2-ob-map`, `p3-plan`,
  `og-image-v4.jpg`) so the service worker and link previews can't serve old images. Verified for
  79e7c20: ESLint and build (sandbox + Mac); production deployment READY; www.myterra.farm and
  myterra-sigma.vercel.app serve the new references (myterra.farm → 308 to www); the 14 new or changed
  files return 200 with the right type and byte size, the five replaced ones 404; CSP header identical
  to `vercel.json`; Playwright on the live site at 390 and 1440 px: no console errors, no broken
  images, both videos play, 6 sign-up links, no horizontal overflow, phones request only the vertical
  poster and videos. Not verified: playback in real iPhone Safari (the Chromium here has no H.264, so
  only the WebM path ran). Stage 9 stays open: the Pro list claims and the contact address (see the
  audit doc), plus the season-blind "food in ~N months" line, which still shows in the matched-plants
  shot and the tour video's set-up segment.

- [x] **Top-10 #1, #2, #4 from the competitor analysis (2026-09-30, owner request; commits b1d0e6f,
  0b7d423, b087a37).** #1 Weather alerts that know the plan: 7-day Open-Meteo forecast (daily + hourly
  humidity, 3 h cache, offline fallback); frost / heat / gale / heavy-rain / blight (Hutton criteria)
  jobs only for what is actually growing or kept; frost holds sowing and planting out of tender crops
  and turns "harvest in N days" into "Pick X before the frost"; rain today replaces outdoor watering with
  one note; Home "Next 7 days" strip (`lib/weather-alerts.js`, `data/frost.js`). #2 Reminders: web-push
  morning digest built from the real task engine for the next 7 mornings (`lib/digest.js`,
  `buildTaskPlan(data,{now})`), Settings → Reminders (hour, test, off) + one-time Home card (iPhone:
  Add to Home Screen first); Edge Function `push` (verify_jwt off, own auth: public-key / user-JWT test /
  cron secret), VAPID keys generated server-side into Vault, tables `push_subscriptions` +
  `push_digests` (RLS, cascade on account delete), pg_cron hourly `push-digest-hourly`
  (`supabase/migrations/2026093012*`). Email digest deferred (needs an email provider account).
  #4 Garden memory + Pro Insights: `data.memory` (harvests per planting/bed, bed history, eggs/milk/meat
  per species per month; optional field, no migration); Progress → Insights (Pro via
  `hasFeature('analytics')`, locked card otherwise; recording on every plan): crop and bed yields vs
  the per-planting estimate, kg/m², lay rate, cost per dozen / litre / kg from expenses tagged with the
  new Money "For" field, what grew where by year, CSV export (formula-safe); rotation warning in the
  planting form (RHS families, 3 years, `data/families.js`). Verified: ESLint, 73+3 tests (12 new),
  build (sandbox + Mac); Playwright at 390/1440 (weather strip + frost/gale/rain jobs with a mocked
  forecast; reminders enable/test/hour/off against a mocked Supabase; Insights, CSV download, Money
  "For"); push function live: public-key stable, unauthorised send/test → 401, cron → function 200,
  pipeline run with dummy endpoints on the owner's account (201 sent once and not re-sent, 410
  removed; rows deleted afterwards); web-push payload decrypted by an independent RFC 8291
  implementation. Live: both domains serve index-Bv4YQo2A.js with "Next 7 days",
  "save_push_subscription", "Insights are part of Pro", "For (optional)"; `/sw.js` has the push
  handlers. Not verified: a notification on a real phone; signed-in production screens. Stage 9 note:
  "Advanced analytics" on the Pro list is now real (Insights); "Multi-zone management" still isn't.

- [x] **Top-10 #6 and #7 (2026-09-30, owner request "continue with implementation"; commits 016cb0e,
  0705408).** #6 Your own jobs: `data.customTasks` (`lib/own-tasks.js`) — once / daily / weekly /
  every 2 weeks / monthly / every N days, optional map area, minutes, note, pause; due jobs join the
  queue as type `own` (map markers and walk when they have an area; push digest includes them);
  one-offs stay due with "N days late" until ticked, then `doneOn` keeps them closed; Tasks screen:
  "+ Add your own job" (ideas from the map), "Your own jobs" list, calendar/this-week, Done + Undo.
  #7 Time budget (`lib/time-budget.js`): the task engine run for the next 7 days × per-job minutes
  (harvests/late steps once, daily care and repeating own jobs each time) vs the onboarding answer
  (5 min/day = 35 min/wk, 15 = 105, weekends ≈ 3 h, 30–60 min/day ≈ 5¼ h); Tasks card (by day, where
  the time goes, one-tap "less often" trims for own jobs, tips, "Time you have" picker), Home line
  when over. Generated animal care and harvests are never dropped to fit. Verified: ESLint, 75+3
  tests (2 new), build (sandbox + Mac); Playwright at 390 px (add from an idea, trim applied and
  saved, over-budget line on Home, no console errors). Live: both domains serve index-BnJKVkTp.js
  with "Add your own job", "Where the time goes", "over your time". Not verified: signed-in
  production screens.
- [x] 2026-09-30 — Coop and barn split (045d068): new zone type `coop` (poultry + rabbits), `barn` is
  grazers + pigs, each falls back to the other; old poultry-named barn zones migrate to coop on load.
  3D map: both built as a building at the back + fenced run/yard in front inside the zone footprint,
  hollow walls with open doors, animals indoors and out (coop: raised house, pop door + ramp, nest
  boxes, roosts, mesh run, feeder, drinker, dust bath; barn: sliding door, stalls, trough, loft +
  ladder, yard with fence, trough, hay rack, lean-to, muck heap). Verified: ESLint clean, 3 tests,
  Mac build, Playwright harness screenshots (coop / barn / small barn + tiny coop, no console
  errors). Live: /app serves index-GnKsVh3a.js + Grove3D-D9vbAnZ_.js with "Chicken Coop", the
  migration regex and the g3y shader attribute. Not verified: signed-in production screens, flat
  designer map with a coop zone.

- [x] **Fixes after owner check (2026-09-30; commits 1bed2da, 1890453).** Weather: towns saved as
  "City, Country" (Farm city search) returned nothing from Open-Meteo's place search, so weather and
  warnings were silently missing (owner's farm had no town at all). Now the name is searched and the
  result in the named country picked (never another country); counties/provinces map to a town; all
  221 `data/cities.js` entries resolve (checked against the live API). Home shows a "Frost and storm
  warnings" town field when no town is set, and loading / not-found / offline states. Insights
  soundness (independent review, 11 findings): default amounts flagged `est` and kept out of
  "% of the estimate" and lay rate; crop-card Harvest asks the amount; `migrateMemory` backfills older
  pantry logs once (both load paths + backup) with move pairing — dry run on the owner's cloud data:
  48 September eggs (not 14 or 62), Cherry 62 kg + Cabbage 112.5 kg as pantry-log harvests; Done-today
  Undo reverses pantry + memory + planting; Animals-page collect ticks the day's job; lay rate over
  days covered, current year, birds kept now; unit costs running costs only (`capital` on animal
  purchases). Verified: ESLint, 79+3 tests, build (sandbox + Mac); Playwright: town picker → real
  Bristol forecast with a real blight alert, "Couldn't find" state. Live: both domains serve
  index-D7xnE6TC.js with "Frost and storm warnings", "How much did you pick?", "Running costs only".
  Not fixed (architecture): whole-document last-write-wins can drop one device's offline ticks.

- [x] **2026-10-05 — 3D map restyled as a toy diorama (every object, every crop, every animal, the
  overlay UI).** Direction: the rounded, flat-coloured, soft-lit look of the "WareTrack" warehouse
  dashboard (Dilum Sanjaya, X, 3 Oct 2026), in the app's own palette; the rules are written down in
  `docs/MAP_STYLE.md` (read it before touching `src/features/grove/`). Engine
  (`Grove3D.jsx`, MARKER GROVE_3D_ENGINE_V4_TOY): every photo and procedural texture gone; one flat matte
  material per palette colour (`toy.js`: rounded-box / capsule / torus kit, `PAL`, `flat()`); every zone
  builder rewritten with rounded bodies, chunky roofs with capped ridges, white trims, brand-green doors and
  gates; terrain one colour with vertex-painted patches (vignette, mottle and cloud layers removed);
  bright soft light (hemisphere .85 + sun 2.1, shadow intensity .62, PCF radius 4, env .22) fading into
  the page colour `#eef3ec`. Crops (`crops3d.js`, GROVE_CROPS_3D_V1): 47 crop entries in 13 families
  cover all 70 crops as rounded plant models per growth stage (sprout → seedling → growing → maturing
  with green fruit → harvest window with ripe fruit), vertex-coloured, instanced per crop+stage,
  swaying in the shader, three farm-wide levels of detail by plant count. Props (`props3d.js`,
  GROVE_PROPS_3D_V1): all 11 ornaments as geometry plus detail props placed by the builders — wheelbarrow
  by the first bed, rain barrel and bird bath by the house, crates by the shed, mailbox by the gate,
  scarecrow in the biggest vegetable area, a green tractor in a barn yard ≥ 6 × 4 m; chimney smoke and
  bees are animated instanced spheres. Animals (`animals3d.js`, GROVE_ANIMALS_3D_V2): same rig and
  walking shader, plump rounded bodies with a round chest and rump, heads ×1.3, eyes with a highlight,
  chunky legs with rounded hooves, 16–18-segment surfaces, matte standard material. Harvest halo is now
  a pulsing gold rounded frame round the row (ring round a tree). Overlay UI (`quiet.css`,
  G3_UI_CARDS_V1): labels, buttons, growth panel, crop card, tooltip and hints are the app's white
  cards with hairline borders, green for selected / pressed, orange job badges; canvas background
  `#eef3ec`. New harnesses `tests/g3-crops.html` (every family, growing + harvest) and
  `tests/g3-balcony.html`; `g3-zoo` now has a real `coop` zone. Verified in sandbox: ESLint clean,
  79+3 tests, Vite build (Grove3D chunk 716 kB, +31 kB), Playwright on g3-all / g3-zoo / g3-beds /
  g3-crops / g3-balcony at 1280 px and 390 px with zero console errors or warnings; home-view draw
  calls 157 (was 178), 561 k triangles; 36 numbered beds 119 calls / 447 k; world build 0.4–0.5 s on
  the sandbox CPU; growth panel + crop card opened by a synthetic tap. Not verified: real-device frame
  rate and battery; the landing-page hero video still shows the old look (re-record). Shipped as
  commit bc509e6 (deployment dpl_23meGF4TFDVk9NyGrfroqbH5cJfg READY): myterra-sigma.vercel.app and
  www.myterra.farm (myterra.farm 308-redirects there) both serve index-B2I6Nf1d.js →
  Grove3D-CXZBlAUH.js (712,090 B) with `toy-v1`, `g3crop`, `g3motion`, `g3f|`, "Building your farm";
  index-Q2FsQoDh.css carries `--g3-accent` and no trace of the old dark pills; CSP header intact.
  Signed-in production screen checked in the owner's Chrome: the real farm (house, kitchen workshop,
  greenhouse, chicken-coop barn, 11 numbered beds, orchard, beehive) renders in the new style with
  job badges, no console errors on load.

- [x] **Website imagery re-shot in the toy 3D style (2026-10-12, owner request; commit 0184c67).**
  Every homepage picture and video still showed the old photoreal map. Re-captured from build 2e83498
  (demo gardens, Open-Meteo mocked, clock fixed to 7 Oct): hero loop + posters (`hero3-*`), 15-second
  tour 16:9 + 9:16 with posters (`tour3-*`), Balcony/Backyard/Farm maps (`d3-*`), nine phone screens
  (`p4-*`), final CTA background (`final-bg2.webp`), OG image (`og-image-v5.jpg`); alt text, tour
  transcript and hero chip (+3 eggs) match the new screens; 28 old landing assets + og-image-v4 removed.
  Verified: deployment `dpl_6y4spZPMMaixsa6kXDURdQ9KhHiH` READY; www.myterra.farm and
  myterra-sigma.vercel.app serve the new HTML; all 29 referenced assets 200 with the same byte size as
  the repo; old names 404; Playwright on the live site at 390 and 1440 px: both videos load and the tour
  plays in view. Not verified: real iPhone Safari playback. Still on screen (app bug, not website):
  Broad Bean "food in ~5 months" in October (matched-plants shot, tour) — `describeSuggestion()` open item.
  Deploy note: Claude on the Mac has lost access to ~/Documents, so this push went from a separate clone
  in ~/myterra-push; the Documents clone needs `git pull`.

- [x] **Pre-launch code audit (2026-10-12, owner request "thorough code analysis, fix all bugs";
  commits 421b3c5, 7f4668c, 93a8d52, df5a472, cdbcc91, dc9f0a1).** Whole-repo review (shell, sync,
  auth, payments, task engine, map, nursery, pantry/money, data, PWA, edge functions, DB policies).
  Fixed: (1) DATA LOSS — AuthGate's 3 s reconcile timeout and any pull error seeded a blank DEF farm,
  showed onboarding again and the mount-time push overwrote the real cloud farm; now empty / error /
  timeout are distinguished, 12 s deadline, no push unless the cloud row was confirmed empty, own
  offline cache or a "Can't reach your farm" retry screen otherwise. (2) Sign-out while offline/unsynced
  wiped the local cache although supabase-js had kept the session (edits only in memory) — confirm +
  check the sign-out result. (3) Financials crashed on an entry with a blank date; months bucketed by
  UTC parse (1st of month a month early in US/CA). (4) DST: `daysBetweenLocalKeys` undercounted a day
  all summer; animal stagger `dayNum` and the calendar projection repeated/skipped a day at the clock
  change (`localDayNumber`); days-to-harvest off by one. (5) "Done today" never listed plot/animal
  completions (keys split on "-" but ids are UUIDs). (6) Harvest fallback used kg PER PLANT as the whole
  bed; 0 kg harvests kept. (7) Undo: step ticks now reversible; every Undo reverses its own change on the
  current farm (functional setData) instead of restoring a stale snapshot. (8) Nursery: deleting a bed
  planting unlinks its batch; bed-prep follows the real plant-out day. (9) Payments: checkout.completed
  closes the sheet and polls the entitlement; active/past-due subscribers can't open a second checkout
  (double billing); checkout failures surface; Permissions-Policy lets Paddle use Apple/Google Pay;
  webhook handles every subscription.* event, keeps Lifetime, skips out-of-order deliveries via
  `profiles.paddle_event_at` (migration applied, function v4 deployed). (10) Regional variety lists
  (`VAR_RO`) were dead since the Phase A extraction — restored. (11) Service worker: install no longer
  fails on one bad icon, hashed assets persist across deploys (shell cache per build + `myterra-assets`),
  stale lazy chunk after a deploy reloads once. (12) Grove3D leaked InstancedMesh buffers on every world
  rebuild. Plus ~25 smaller fixes (Manuals calendar strip, duplicate cities, pantry units/ids/residues,
  honey/wool collect default, forms, weather timeouts/stale cache, aria labels, badge queue, day tick after
  midnight) and removal of the unreachable TodayScreen/LivingFarmMap modules. Tests: +9 regression tests
  (88 + 3), `npm test` now runs under TZ=Europe/London. Verified: ESLint clean, tests on the sandbox in
  4 time zones and on the Mac, Vite build, Playwright on the dist build (SW install/activate, offline
  reload, onboarding → every nav page, mobile dock, zero console errors); live deployment
  `dpl_8PtC3JU48cefEzMJFusx1o2x79Bn` READY — bundle index-DNpdjfXu.js carries the new string markers,
  Grove3D-DzWhP48N.js has the dispose path, sw.js lists 3 required + 253 optional assets, CSP intact,
  Permissions-Policy updated; production /app in headless Chromium: sign-in screen, SW activated with
  both caches, no console errors. Not verified: real-device (phone) run; Paddle checkout end to end
  (needs a real purchase). Open: Supabase "leaked password protection" is off (dashboard toggle); plan
  changes for live subscribers go via email until a Paddle customer-portal link exists; the Mac clone
  holds untracked Finder duplicates (`src/assets/toy/* 2.webp`, `src/app/navigation 2.js`,
  `src/app/state 2.js`) that bloat local builds (535 vs 253 assets) — delete them.

- [x] **Living farm map (2026-10-14, owner request "improve all 3D rendering, dynamics, logic, UI,
  mobile" → scope chosen: scene quality & motion; spec `docs/superpowers/specs/2026-10-13-living-farm-map-design.md`,
  plan `docs/superpowers/plans/2026-10-13-living-farm-map.md`; commits 47f2a16, ebe372f, d69c53b, 80c39e4,
  9f1a9b8, cdb82fb, bf2e469, dbcc784, 0e47e49).** (1) Live sky: the sun follows the local clock and the
  town's latitude/longitude (`sky.js`; solar time = UTC + lng/15), four light presets, night with lit
  windows and the porch lamp; Settings → Ground & paths → "Live sky" (off = the original fixed afternoon,
  verified 0.07 % scene-pixel diff on the all-zones harness). (2) Weather: `fetchWeather` passes wind,
  is_day and the geocode; App stores `data.cityGeo`; cloudy/fog flatten the light and bring toy clouds
  (no shadows); rain/snow instanced; wind drives gust waves, smoke and the barn vane. (3) Animals:
  `herd-brain.js` legs (wander, graze, lie, swim, scatter on coop tap, roost at night), shader-interpolated,
  per-range attribute updates; swallows and butterflies. (4) Pond ripple, falling fruit, zone type
  `yard` ("Yard / parking") with icon, flat-map and 3D rendering; `migrateYardLine` replaces the one
  25-point zig-zag path (x 46–79, y 46–50) with a Parking yard. Verified: ESLint clean, `npm test`
  112 + 3 pass, Vite build, harness 170–179 draw calls / ≤ 714 k tris, zoo brain tick 0.005 ms, Playwright
  iPhone-13 emulation (counts halved, 0 console errors), fresh-reviewer pass with 4 Important findings
  fixed (0e47e49). Live: `dpl_5jYPVJ7xkxSsYffCSCDYShL2Jw58` READY, index-iqAHL638.js + Grove3D-E6kU0c3l.js
  carry "Live sky", "Yard / parking", "g3rain", "herd-brain", "g3cloud", "g3ripple", "g3night", CSP
  unchanged; owner farm shows the Parking slab, 0 console errors. NOT verified: a real phone; persistence
  of the migrated farm and `cityGeo` on the owner account (it is read-only — "subscription ended" banner —
  and the cached forecast predates `lat/lng`, so the sun runs at 50° N until the 3 h cache expires).
  Deferred minors (reviewer): swim height assumes rim .5; roosting only for coop-zone poultry; behaviour
  weights differ slightly from the spec; brain resets on world rebuild; herd shadows lag (static shadow
  map, once a minute); dusk light clamps at 4° then jumps to the moon; weather not refetched while open;
  fruit drop = one draw call per colour. Next slice: crops legible at the home view.

- [x] **Phone map (2026-10-25, owner request "continue 3D improvements" → scope chosen: phone rendering & UX;
  spec `docs/superpowers/specs/2026-10-14-phone-map-design.md`, plan `docs/superpowers/plans/2026-10-14-phone-map.md`;
  commits f10af3d, 95f1854, 1a125c1, efbb43d, bb302df).** Owner's phone complaints: "too small to read / use" and
  "pinch also rotates/tilts by accident" (iPhone 14+). (1) Pinch intent lock (`gestures.js`): the first clear
  two-finger movement decides zoom / rotate (≥ 15° twist, < 8 % scale) / tilt (≥ 24 px parallel drift) and locks;
  zoom always applies; undecided → zoom after 450 ms (reviewer raised it from 180 so slow deliberate twists still turn). (2) Labels (`labels.js`): pills hang above the front edge of
  the footprint instead of the roof; order selected → pending jobs → biggest; no overlaps; far out on phones a
  zone needs 64 px of screen width for a name (28 px elsewhere). (3) Portrait full screen looks straight down the
  farm's long axis (θ −90°): the all-zones farm spans 58 % of a 390×844 screen (was 38 %); phone controls become
  a centred 48 px bottom bar; desktop camera verified pixel-identical. Phone UX tier = coarse pointer only (host
  class `g3-coarse`); the short-screen rule stays only for render quality. (4) Phone inline map = live 4:3 preview
  tile: no gestures/labels/controls, "Open map" pill + job badge, one tap opens full screen, close restores the
  home view (dist ratio 1.000). (5) Found and fixed a pre-existing bug: `flat()` shared the trough and pond
  materials and `ripple()` re-wrapped itself on every world build → uTime/uRipple declared twice → invalid
  program → pond vanished after any rebuild (planting, day tick, growth preview). Verified: ESLint clean,
  `npm test` 142 pass, Vite build, harness `?coarse=1` / `?full=1` at 390×844 (`tmp/phone-tile-after.png`,
  `tmp/phone-full-after2.png`), 0 shader errors across two rebuilds, 25/25 GL programs linked.
  NOT verified: a real phone (owner check pending: tile tap, portrait fill, pinch feel, bottom bar).
  Note: Mac builds run with NODE_ENV=development, which makes Vite's `import.meta.env.DEV` true locally —
  dev-only hooks (`window.__g3`, `__g3harness`) appear in local `dist/` but not in Vercel's bundle.
- [x] **Onboarding starter map = real land + owned assets (2026-10-25, commit a32b4e6).** Farm canvas was a box
  around the first bed (40×25 m land showed "Your farm 17 × 12 m" under "your space at its real size"); it is now the
  entered land, capped at 100×60 m with "A 100 × 60 m part of your land" when bigger. Ticked greenhouse / chicken
  coop / fruit trees / compost / raised bed become zones packed beside the first bed (farm + backyard sizes; left off
  if they don't fit; balconies none). Verified: ESLint, 143+3 tests (new regression test), Vite build (sandbox + Mac),
  Playwright run through onboarding at 390 px (map shows all four areas, "Also on your map" line), production
  dpl_5mYkkHMDjGRNbmkYyrMb2ZLYTvtQ READY, live bundle index-c0CWUE3Q.js carries the new strings. NOT verified: a real
  phone. Open: no Basic zone cap exists yet — if one is added, decide how these starter zones count.
  Seen, not fixed: growth-preview panel re-wraps (+3 mo drops to a 2nd line) when the label changes from "Today" to
  "In 60 days".
- [x] **Short-video generator (2026-10-25).** `marketing/video/` records the real app frame by frame (frozen clock,
  1/30 s per frame) and edits 9:16 shorts with AI voice, captions, finger marks, loop ending. Viral rules:
  `marketing/video/PLAYBOOK.md`. Part 1 ("I let a farming app design my entire farm") rendered, 35 s.
- [x] **Farm size / type of space edits reverting (2026-11-05).** Reported: a changed farm size jumps back (Mac
  browser). Cause: the hourly forecast refresh in `App.jsx` called `setData` with the farm unchanged and `setData`
  still saved and pushed it, so every open tab or phone uploaded its own (possibly older) copy of the whole farm
  once an hour and on every page load; another device's newer edit was overwritten and pulled back on the next
  focus. Fix (`e4237a6`): `setData` returns early when an updater hands back the same object. Also added the
  Balcony / Backyard / Farm picker to Farm Designer → ⚙ next to the size (profile.environment only).
  Verified: ESLint, 143+3 tests, Vite build on Mac, production dpl_DLwPzSFgn6FX8VWkWxx9a4UUaS4J READY, live bundle
  index-MR2FBlMr.js carries the new strings; on the live signed-in farm a page load now sends only the GET (before:
  GET + full-farm POST) and a real size edit still POSTs 200 and survives reload; demo: picker switches to Backyard
  and survives reload. NOT verified: the exact revert he saw (not reproduced end to end — needs two devices or a
  tab left open for an hour). Remaining risk: whole-document last-write-wins — a device that edits before its
  focus pull lands can still overwrite a newer edit made elsewhere; a compare-and-swap on `updated_at` would close it.
- [x] **3D release from the Codex chat (2026-11-07).** Cherry-picked Codex commit `d9789ca` (base `feca8a6`) onto
  main as `de73ef7`; auto-merged, the farm size/type fix (`e4237a6`) is intact. Contents: map area selector +
  camera focus, crop-row selection card, label collision handling, Growth closes back to today, compact phone
  timeline, stage-aware growth preview, task feedback, animal reactions, Farm Designer "Preview 3D", wind sway,
  balcony tiles/saucers/hanging pots, new lettuce/tomato/radish/strawberry models, runtime reduced-motion.
  Pictures re-rendered with `scripts/render-icons.mjs` (`2bf8c25`, 299 of 300 changed). Verified: 154+3 tests,
  Vite build, ESLint on touched files, Playwright on g3-balcony/crops/all/beds at 1280 px and 375 px
  (`?coarse=1&full=1`) incl. reduced motion — no console errors, crop card opens, Growth +2 mo shows the preview
  and closing it returns to today, Reset returns to the whole space; production dpl_95eUhbT1YD4V8z4KLfwLbwUQp4U9
  READY, live Grove3D chunk carries the new strings on both domains. NOT verified: a real iPhone. Seen, not fixed:
  on phones the crop card covers the full-screen close button; the Growth legend's last stage label is clipped at
  375 px; focused phone view still lets some area labels overlap; `tests/g3-beds.html` ignores `?full=1`.
- [x] **Full app QA pass (2026-11-07).** Ran lint, 157 → 160 tests in five time zones, Vite build, and Playwright on
  the demo (`/app` with no session) at 390 px, 1440 px and dark mode: five onboarding personas (London backyard,
  Amsterdam balcony, 100 km "farm", 30 × 20 ft Toronto garden, 0.3 × 0.2 m), every page, morning walk, map
  pop-ups, growth preview, planting form, animals, pantry sell, Money, backup export/import, Learn search,
  landing / legal / 404 / auth screens, with a frost + gale forecast mocked. Fixed (`84771dd`…`ff67bc6`): map
  pop-up 0 kg saved the estimate, 0 eggs saved 1, negatives became the estimate, 1e9 kg went straight in
  (now 0 = failed crop / empty round, invalid amounts explained, huge ones need a second tap); add-animal and
  Money accepted 100,000 goats / £1e12 and Money's Add did nothing silently on a missing field; "process for
  meat" turned a typed 0 into 1 animal and had no Undo; onboarding accepted 100 km sides and put a blackberry
  (2.5–3.5 m) in a 2 × 1.2 m starter bed; a focus pull could drop an edit made while it was in flight; space-only
  crop searches; vibrate console error on load; garlic depth, blossom end rot and blackberry spacing vs RHS.
  Verified on production `dpl_G6cx9BBnpj841BFDEoqM6dA7vfP8` (READY, bundle `index-DUcK9fEi.js` carries the new
  strings, CSP unchanged) by re-running the same Playwright checks against www.myterra.farm. NOT verified: a
  real phone; the sync race fix (needs two devices). Seen, not fixed: in the full-screen phone map the chimney
  smoke puffs look oversized and cover the house (3D lane, Codex); the starter-map canvas is bigger than very
  small or narrow spaces (4 × 1.5 m balcony shows as 4 × 2 m; a 0.3 × 0.2 m "garden" gets a 1 m² bed); Money
  totals have no thousands separators and transactions show ISO dates; the Growth legend's last label is
  clipped at 375 px (already noted above). GitHub reports the repo moved to `homestead199323/MyTerra-farm`
  (pushes still redirect).
- [x] **3D map refinement (2026-11-09, owner request "revisit the whole 3D map and assets; refine graphics, UX and UI").**
  Audit + three slices in `docs/superpowers/specs/2026-11-09-map-refine-design.md`: (1) framing and phone
  readability, (2) map UI, (3) graphics polish. **Slice 1 shipped (`14d64d9`):** `home-view.js` works out the
  home view (tested): a balcony on a portrait phone is seen along its length (4 × 1.5 m: floor 20 % → 35 % of
  the screen height, camera 24 m → 20 m), a back garden is framed on the garden and patio instead of the roofs,
  the phone's bars are kept clear; phones build balconies and back gardens at full detail (no more hexagonal
  tomatoes), farm tier keeps crowns round (all-zones phone 393 k → 423 k triangles, 185 calls); small areas hang
  their pill in front of the bed; balcony block has depth and a roof; phone tile hint "Tap the map to open it".
  Verified: 172 + 3 tests, ESLint, Vite build (sandbox and Mac); Playwright on g3-balcony (`?small=1` new),
  g3-garden, g3-all at 390 × 844 and 1280 × 900, day and `?hour=21`; production `dpl_Bx1PJEXo3QDVdAm6PRzwA4gEkgfL`
  READY, live `index-CTEKPECF.js` carries the new hint, live `Grove3D-tROKO_0a.js` carries `minSeg`, no harness
  strings, CSP header present; the demo on www.myterra.farm run as a 4 × 1.5 m balcony at 390 px shows the new
  framing in the starter map, the Today tile and full screen. NOT verified: a real phone, gestures, frame rate.
  Seen, not fixed (slice 3): festoon wire reads as black dashes by day; at dusk every facade window is the same
  blank rectangle; a wide garden on a portrait phone is still limited by its width.
  **Slice 2 shipped (`41d995c`):** the area card is `ZoneSheet` — a bottom sheet 52 % of the screen high on
  phones and windows under 760 px (handle pulls it to full height), a 400 px right-hand panel on wider windows;
  not modal, closes with X or Escape only; `cover.js` tells the camera what the card hides and `focusZone` frames
  the area in the rest. Card content: per-planting stage pictures with the current stage framed (the generic
  stage key is gone), "1 row" grammar, no colliding "Edit spacing" / stage select, no double divider or focus
  outline. Area selector is a white chip with the app's own menu and job counts; phone bar is Growth · Reset (X
  is the one close control); crop card and hint sit below the chip; Growth legend wraps on phones. Verified:
  180 + 3 tests, ESLint, Vite build (sandbox and Mac); Playwright at 390 × 844 (balcony, garden, farm, dark)
  and 1280 × 900; production `dpl_5XgiqzakbY317X24XfjWQqJyhusJ` READY, live `index-CiBNWtLL.js` carries "Make
  this card taller", live `Grove3D-BrO58iqe.js` carries "Areas on the map", live CSS carries `q-growth-steps`;
  the demo on www.myterra.farm run as a 4 × 1.5 m balcony at 390 px: sheet 439 px high over the framed planter,
  Escape closes the card and keeps the map open, bar shows Growth and Reset. NOT verified: a real phone, the
  handle drag by finger, VoiceOver. Departure to know about: this card is not a small centred card (the app's
  rule for pop-ups); the job pop-up still is.
  **Slice 3 shipped (`f746b63`):** balcony block in warm plaster `#f3dcb8` with plinth, cornice, downpipes,
  corbels and shutters on some neighbours' windows; lit windows are amber everywhere (pane tinted, glow ×0.55
  instead of ×1.6, which clipped to white) and on the apartment block about half the neighbours' windows are
  lit, the rest navy; a neighbouring block either side, courtyard hedge, pavement, street, street trees and two
  lamps; festoon cord pale by day; harvest frame bars 4–9 cm by frame size; a balcony turns at most 80° either
  side (`turnLimit`), because from behind its block hides it. Dropped: the street behind the back-garden houses
  (cropped out of view since slice 1). Icons not re-rendered: no crop, animal or area model changed and day
  colours are untouched. Verified: 181 + 3 tests, ESLint, Vite build (sandbox and Mac); Playwright day and
  `?hour=21` on balcony (both sizes), garden and farm; balcony 4 × 1.5 m phone 60 k → 88 k triangles, 47 → 56
  calls; 11 × 4.5 m desktop 144 k → 173 k, 69 → 78; garden and farm unchanged; production
  `dpl_5AKXsYFncyFrykcedN9nEX8WeJHE` READY, live `Grove3D-B6lha05Y.js` carries `facadeB`, `winDark` and
  `maxTheta`, CSP header present; the demo on www.myterra.farm as a 4 × 1.5 m balcony at 390 px renders the new
  block at dusk with amber windows. NOT verified: a real phone, frame rate, the turn limit by finger. Known: the
  street only shows in low side-on views of a large balcony; all-zones desktop is 835 k triangles against the
  800 k budget in MAP_STYLE (it was 835 k before this work).
  **Rendering pass shipped 2026-11-10 (`11c4945`):** asked to fix bugs and make the 3D fast. Measured first.
  The scene environment map was about 61 % of each frame and Standard shading on matte surfaces a further
  30 % on the balcony, so: no scene environment, matte surfaces are Lambert, the room map's fill is folded
  into the hemisphere light (`fillLight`), glossy surfaces keep the map for reflections only
  (`setEnvironment`). `bake()` now merges welded, indexed geometry (`bakeSource`, `mergeBaked`). Bug fixed:
  every world rebuild leaked about three geometries (a cloned shape kept its `shared` flag, so the disposer
  skipped it). Before → after on headless Chrome with a software rasteriser (relative only, NOT phone frame
  rates): balcony 4 × 1.5 m phone frame 2028 → 560 ms, vertices 179 k → 67 k, geometry 5.1 → 1.9 MB; garden
  phone 1608 → 592 ms, 449 k → 196 k, 11 → 3.9 MB; all-zones phone 2302 → 963 ms, 856 k → 515 k, 15.9 →
  6.4 MB; all-zones desktop 2977 → 1363 ms, 1.48 M → 796 k, 30.8 → 11.6 MB; growth-preview rebuild 308 →
  109 ms. Triangles and draw calls unchanged. Picture: mean difference 2.5–6 of 255 against the old render;
  plaster and animals read a touch flatter and lighter. Small pictures NOT re-rendered (the icon harness now
  uses the same light; a re-render would shift them by 6–14 of 255). Sweep with no findings: all-zones at
  four hours with rain, snow and overcast, zoo, beds, crops, growth steps, card open and Escape, resize,
  expand, orbit. Verified: 185 + 3 tests, ESLint, Vite build (sandbox and Mac), built bundle walked locally;
  production `dpl_7RNUxASju6NyiUQV2fSwiQm6nHJX` READY, live `Grove3D-BucxeKTL.js` carries `g3gloss`, no
  `__g3harness`, CSP header present; demo on www.myterra.farm as a 4 × 1.5 m balcony at 390 px draws the map,
  opens the card, Escape closes it. NOT verified: any real GPU or phone, frame rate, battery, heat. Not done:
  fewer triangles (crops and trees are the bulk; all-zones desktop still 835 k against the 800 k budget),
  partial rebuilds (the whole world still rebuilds on any change).
  **Look C, slice 1 — true-to-life crops, shipped 2026-11-10 (`d6ca0a0`):** Dervis asked for "more quality
  and more realistic" assets. He rejected two sample strengths (A toy-finish, B botanical) and chose C from
  side-by-side pictures of a pepper, an apple tree and a cow: leaf veins, bark, glossy fruit, real leaf
  blades, baked shade. Order: crops first (balcony crops), then trees, then animals. This slice: `plantkit.js`
  (leaf blades, lathed fruit, per-pixel surface detail, two materials: solid + double-sided blades) and
  `crops-real.js` (tomato, sweet and hot pepper, lettuce, rocket, spinach, chard, kale, radish, basil, parsley,
  sage, mint, oregano, thyme, rosemary, strawberry — every crop in `CONTAINER_FRIENDLY`). Five levels of detail
  by plant count (`cropTier`), triangle budgets per plant 8,000 / 2,300 / 950 / 650 / 650 in
  `tests/crops-real.test.js`. Parsley, sage, oregano, rocket and hot pepper got their own `FAMILIES` entries and
  pictures; 68 small pictures re-rendered or added, plus the herbs / raised / container area tiles. Style doc:
  MAP_STYLE §0 and §10. Cost, software rasteriser, phone tile, ±10 %: balcony 4 × 1.5 m 284 → 320 ms; balcony
  11 × 4.5 m 370 → 454 ms; 36-bed farm 657 → 754 ms (triangles went DOWN on the bigger scenes; the extra time
  is leaf blades overlapping). Verified: 194 + 3 tests, ESLint, build (sandbox and Mac); production
  `dpl_7RDn4QRrNRSMkY3ia1YYrRFymPXP` READY, live Grove3D bundle carries `g3plant-v1`, no `__g3harness`, CSP
  present; demo balcony draws the map. NOT verified: the new plants on production itself (the demo balcony
  starts with empty troughs; they were seen in the harnesses only), any real phone or GPU. Open: Grove3D chunk
  is 229.7 KB gzip against the 230 KB budget (226.9 KB as served) — the next crop batch needs the budget
  raised or crops-real.js loaded as its own chunk; the other 30-odd crops, all trees and all animals are still
  the toy models, so a mixed bed shows both looks; fine-leaved herbs are harder to read in the small pictures.
  **Look C, slice 2 — every remaining crop, shipped 2026-11-10 (`654d478`):** eggplant, okra, potato, sweet
  potato, celery, rhubarb, cabbage, broccoli, cauliflower, Brussels sprouts, carrot, parsnip, fennel, dill,
  chamomile, beetroot, turnip, leek, garlic, chives, onion, pumpkin, squash, courgette, cucumber, watermelon,
  melon, broad bean, lentil, bean and pea, maize, grain, sunflower, lavender, raspberry, blackberry, grape,
  asparagus, artichoke. 56 entries in `REAL`; an unknown crop grows as a plain leafy rosette. The old family
  kits are deleted from crops3d.js. All 212 crop pictures re-rendered (142 changed) plus five area tiles. Software rasteriser,
  phone tile, ±10 %: 36-bed farm 657 ms before look C → 689 ms now, 433 k → 348 k triangles; back garden
  376 → 396 ms. Grove3D chunk 231.8 KB gzip (228.9 KB as served); budget raised from 230 to 240 KB instead of
  splitting the file, which would not shrink the download. Verified: 194 + 3 tests, ESLint, build (sandbox
  and Mac); production `dpl_BVhkF8Q2jNKdyULrncAcz218AzTv` READY, live bundle carries the new crop list, CSP
  present, demo balcony draws the map. NOT verified: the new plants on production itself, any real phone.
  Known weak points: thin crops (onion, garlic, carrot, grain) leave beds looking emptier on a zoomed-out farm
  than the chunky models did; fine-leaved crops are small in the list pictures; okra pods hide in the leaves.
  Still toy models: all 19 fruit and nut trees and all 14 animals (next slices).
  **Look C, slice 3 — fruit and nut trees, shipped 2026-11-10 (`b98c94e`):** 19 species in `trees-real.js`,
  each with its own habit, bark, separate leaves and fruit in the harvest window; drawn through `buildCrops`
  as instanced meshes with five levels of detail by tree count (budget 16,000 / 6,500 / 3,200 / 2,200 / 2,000
  triangles a tree). 76 tree pictures and the orchard tile re-rendered. All-zones farm 396 k triangles,
  635 ms on the software rasteriser (696 ms before). Production `dpl_DM7dWaxG8vjpY4y5qyWbdziVGWgk` READY.
  **Look C, slice 4 — animals, shipped 2026-11-10 (`88bd1c5`):** same rig, brain and one-mesh herd; new models
  and material in `animals3d.js` (marker `GROVE_ANIMALS_3D_V3`). Lofted trunk with chest and belly, lofted
  legs with knee and hock, cupped ears, hair and feather blades, toes, breed patches cut crisp per pixel from
  a field in the vertices, coat grain, shine on eyes, hooves, horns and beaks. Leaner trunks, smaller heads,
  shorter-backed horse. New levels of detail by herd size (`animalTier`: 0 up to 6 animals, 1 up to 16, 2 up
  to 40, 3 beyond; phone on a big farm one lower), budgets in `tests/animals-real.test.js`. 14 animal
  pictures and the barn, coop and pasture tiles re-rendered. Zoo harness, 25 animals, phone level, software
  rasteriser: herd 17.6 k → 28.6 k triangles, 312 → 322 ms (inside the noise); a desktop herd of seven or
  more is lighter than before (a cow was 5,168 triangles at every herd size). Verified: 203 + 3 tests,
  ESLint, build (sandbox and Mac); production `dpl_HtQWC3E1cpTzszTB8QRwvgihFzTd` READY, live Grove3D bundle
  carries `g3animal-c1`, no `__g3harness`, CSP present, demo balcony draws the map. NOT verified: animals or
  trees on production itself (the demo balcony has neither; seen in the harnesses only), any real phone or
  GPU. Honest limits: the animals are simplified anatomy (no shoulders, muscle or face modelling) — clearly
  better surfaces and silhouettes than the toy build, well short of a sculpt. The decoration trees round the
  farm and in gardens are still toy models. Grove3D chunk 237.5 KB gzip of the 240 KB budget: the next
  addition to the 3D map has to split the chunk or remove something.
- [x] **Knowledge base audit (2026-11-10, owner request "go through all knowledge base about animals, crops,
  plants, everything; make sure it's correct and consistent"; commits `7d7b871`, `d502fb3`).** Read every file in
  `src/data/` (recipes spot-checked on safety figures only), the knowledge text in `src/lib/`, and ran a
  cross-file check (names, months, steps, spacing, yields, livestock keys). Fixed: base-list pests that do not
  occur in Western Europe (squash vine borer, squash bug, cucumber beetle, pepper weevil, corn earworm, armyworm,
  sweet potato weevil; Colorado beetle relabelled, late blight is #1) with the American ones kept in the US
  regions; per-plant yields of dry bean, lentil, chickpea and sunflower seed (10–400× too high); wheat seed rate
  (150 → about 20 g/m²); potato storage 4–7°C; olive and watermelon variety yields (Mediterranean numbers were
  shown in Western Europe); a cherry-tree pH/feed line that had leaked into the Cherry tomato variety;
  Mediterranean leftovers (broad bean, fennel, dill, lemon). Northern Europe: aubergine, melon, watermelon,
  peach, apricot, fig, sweet potato, lentil no longer "not viable" (the region holds Germany, Poland, Austria,
  Hungary). Animals: cow breeding moved June (283 d → March calves), pig breeding November (114 d → March
  litters), goat drying-off before kidding; kitchen scraps illegal for hens and pigs in UK/EU; foulbrood
  notifiable; goat disbudding vet-only in the UK; live-plucking banned; donkey 0.2 ha; Merino fleece 4–5 kg;
  egg/milk prefill per species. Preserving: tomatoes need added acid; botulism spore temperatures; curing salt
  for all smoked/air-dried meat; garlic/herbs in oil 4 days; honey not under 12 months; compost ratio; drip
  under mulch. Assistant: preserving chips/answers no longer print internal keys and `undefined`.
  Verified: 185 + 3 tests, ESLint, Vite build (sandbox and Mac); production `dpl_FwCUWEziGuQeCdkBkxRfmJrZCWW8`
  READY on www.myterra.farm, live `index-qPxzYcG7.js` carries eight new string markers and none of three removed
  ones, CSP header present. NOT verified: the screens in a browser. Left for the owner (report in Project doc
  `claude/knowledge-audit-2026-11-10.md`): several vegetable yields are optimistic rather than conservative and
  the offset grid multiplies them; Pacific NW cities sit in the hot-South US region; copper is the stock answer in many crop cards although the RHS lists no fungicide
  amateurs can buy for peach leaf curl (other uses and countries not checked); no apple or pear in the crop list.
- [x] **Conservative yields, Pacific Northwest region, apple + pear (2026-11-10, owner decisions on the audit's
  open items: "always go for conservative… recalibrate", "fix", "fix"; commits `4f7ff79`, `d3673bd`, `dd99043`).**
  Yields: 65 of 70 base per-plant figures lowered (tomato 3.5 → 2, potato 2.5 → 0.7, carrot 0.1 → 0.025, pea
  0.2 → 0.03, plum 15 → 12, walnut 30 → 10), 105 regional figures rescaled, 266 variety figures re-centred on
  the crop's own yield (−30% / +25%, none raised); a region borrowing the base variety list scales it by the
  regional crop yield. Bed estimate: standard rows are the reference, so the biointensive grid no longer
  estimates more per m² than rows (tomato on that grid 19.9 → 5.3 kg/m²; a note under the estimate explains
  the per-plant figure). Animals: eggs 0.7 → 0.6/day, goat milk 2.5 → 2 L, cow 15 → 12 L, honey 15 → 11 kg, breed egg rates
  at the low end. Harvest task no longer falls back to 3 kg for small yields. Regions: Seattle, Portland,
  Vancouver, Victoria, OR, WA, BC → Western Europe base; MD, DE, DC, VA, KY → northern US (frost-safe side,
  matches Baltimore); US/Canada town keeps dollars. Crops: Apple and Pear added (cards from the RHS grow
  guides, regional notes, US pest lists, 5 varieties per region), counts 70 → 72 in landing and
  ARCHITECTURE_PLAN. Sources: Kings Seeds yield guide, Rutgers FS129, Cornell planting guide, fruit-tree-form
  yield ranges, RHS apple and pear guides; herb yields, animal trims, regional variety notes and US pest lists
  are judgment, not source-checked. Verified: 189 + 3 tests, ESLint, Vite build (sandbox and Mac); built app
  walked in headless Chrome (demo): onboarding region screen, Apple card, apple planting 1 tree ≈ 15 kg
  (Bramley 18), 6 tomatoes ≈ 12 kg in rows and ≈ 5.6 kg on the biointensive grid with the note, no page errors;
  production `dpl_4CtBJMkBcqhbWy34UJ9jiAyDbn8t` READY, live `index-C2uxhq0t.js` carries the new yields
  (tomato 2, potato .7, carrot .025, apple 15), Seattle → `western_europe`, Maryland → `us_cold`, the new
  strings, none of three removed ones; landing shows 72; CSP header present. NOT verified: a phone or a signed-in
  account; Settings town search by hand. Known limits: plantings saved before today keep their old estimate
  until edited; saved farms keep their region; a Seattle farm sees the "Western Europe" label and UK-flavoured
  variety names; project instructions still say 70 crops.
