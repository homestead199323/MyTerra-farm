# Map-first home (game HUD) — design

Date: 2026-11-12. Approved by Dervis from the mockups ("love it, start implementing").
Mockups: claude.ai artifact "MyTerra — map-first home (phone + desktop proposal)", 12 screens.

## Why

The phone is carried around the real farm, so the phone app should BE the farm: one map, the
jobs on it, everything else one tap away. Today / Tasks / Farm were three tabs showing the same
thing three ways. First run asked 12 questions before showing anything.

## What the user sees

### Phone home
- The 3D map fills the screen. No page scroll.
- Three controls float on it (glass, white-card look):
  1. top left — weather and day streak in one capsule;
  2. top right — jobs chip: done/total for today with a progress bar;
  3. bottom — a floating dock: Farm · Calendar · **+** · Ask · More.
- Areas with jobs carry a round marker with the count (gold when something is ready to pick).
  Tapping it opens that area's jobs (the existing zone job popup: verbs, amounts, rewards).
- Tapping the jobs chip drops a glass list of every job due today. A row with a place opens
  that area's popup; "Start walk" starts the morning walk; "All tasks" opens the Tasks page.
- Tapping **+** fans five round buttons out of it: Plant, Animal, Build, Job, Harvest.
  The map dims; + turns into ×. No sheet slides up.
- When the last job of the day is ticked: a "Day done!" card with the streak, once per day.
- More holds: Crops, Animals, All tasks, Learn, Progress, Pantry, Money, Insights, Account.

### Desktop home
- Same map, full width of the content area, same three controls. The dock keeps Learn and
  Progress. The jobs list floats on the map (glass) and can be collapsed to the chip.

### First run
- One setup screen: where do you grow (balcony / backyard / farm), how big, location
  (detected, one line, changeable), Start. Everything else gets sensible defaults and is asked
  later in context.
- Then three cues on the map, each a bubble with a pulsing target and a Skip:
  plant your first crop → add an animal → tick off a job.

## Rules kept from earlier decisions
- Forms that need typing (plant a crop, add animal, add job) keep their full sheet.
- Tap outside closes any floating card.
- No explanatory sentences in the UI.
- Text never under 12 px except dock labels (11 px); touch targets 44 px or more.
- Growth preview and "show the whole map" stay reachable on the home map.

## How it is built

- `src/lib/home-v2.js` — the switch. `mt_home_v2` in localStorage; `?home=new` / `?home=old`
  set it; Settings has a toggle. Default OFF until Dervis has tried it on his iPhone, then ON,
  then the old layout is deleted.
- `src/features/home/HomeV2.jsx` + `home-v2.css` — the home screen: map + capsule + jobs chip +
  jobs list + day-done card. Pure helpers in `src/features/home/home-model.js` (unit tested).
- `src/features/home/GameDock.jsx` — the dock, the + fan and the More sheet. Replaces
  `BottomNav` on phones when the switch is on (every page, not only home).
- `Grove3D` gets a `home` prop: always full-size, sits under the app's overlays (z-index 5,
  not 6500), no Exit / Close / area picker / zoom buttons; Growth and Reset stay as two small
  buttons on the right.
- Existing pieces reused as they are: `tasksByZone`, `ZoneTaskPopup`, `WalkOverlay`,
  `WeatherWeek`, `applyTaskCompletion`, the streak in `data.gamify`.
- Deep links for the fan: `setPage("crops",{add:true})`, `setPage("live",{add:true})`,
  `setPage("map",{edit:true})`, `setPage("tasks",{addJob:true})`, `setPage("pantry",{add:true})`.

## Slices (each ships on its own)
1. Phone home: map, capsule, jobs chip + list, dock + fan, day-done. Behind the switch.
2. Desktop home.
3. One-screen setup + three cues.
4. Switch ON for everyone; remove the old Today layout, BottomNav and the 12-step onboarding.

## Not in this work
- Points, levels or any new reward currency (the streak is the only one).
- A new Insights tab (Insights stays under More / Progress).
- Changes to the 3D engine's look.

## Open risks
- 3D map as the first thing that loads on a phone: start-up time and battery, never measured
  on a real iPhone.
- Glass panels in direct sunlight: panels are kept at about 85 % white for that reason.
