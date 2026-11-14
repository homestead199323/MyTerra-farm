# Desktop Farm Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the sides of the desktop map home with user-chosen KPI cards and a tabbed live table, in frosted glass, with the camera going to whatever is clicked.

**Architecture:** One pure module computes everything shown (card catalogue, values, rows). Two React components render it over the existing map home; `HomeV2` decides when the desktop layout applies. The map gains a left inset, one engine call (`pickPlot`) and a "ran slow" event.

**Tech Stack:** React 19, Vite 8, three.js map (existing), node:test via `npm test`.

**Spec:** `docs/superpowers/specs/2026-11-14-desktop-farm-cards-design.md`

## Global Constraints

- Desktop only: `desk` = `useWideStage()` (≥ 1100 px) and viewport height ≥ 700 px. Nothing changes below that.
- At most 4 cards. `data.deskCards` is an array of ids; `undefined` = never edited.
- Never offer a card that is not `available` for the farm.
- Copy: short labels, no sentences explaining the feature. Literal UTF-8 only, no unicode escapes.
- JSX rules of this repo: no conditional spread, no IIFE in render, `function ()` callbacks inside `.map()`.
- Glass: card colour at 58 % + `blur(22px) saturate(1.5)`; solid 92 % fallback.
- String markers for live verification: `"Edit cards"`, `"Add a card"`, `mt_desk_tab`.

## Review Focus

1. A brand-new farm (no plantings, no town, no animals): cards must not show `NaN`, `undefined` or empty tiles — unavailable kinds are simply absent.
2. Stored `deskCards` containing unknown or duplicate ids, or more than four: ignored/trimmed, never a crash.
3. A planting with a harvest date in the past: "Ready", not a negative day count.
4. A planting whose area was deleted, or with no row on the map: clicking its table row must not throw; it falls back to the area or does nothing.
5. Forecast still loading or failed: `rain` and `cold` are unavailable rather than showing 0 mm / 0°.

---

### Task 1: The model

**Files:**
- Create: `src/features/home/desk-model.js`
- Test: `tests/desk-model.test.js` (import it from `tests/domain.test.js` after `./crop-icons.test.js`)

**Interfaces — produces:**
- `MAX_CARDS = 4`, `CARD_IDS: string[]` (the eleven ids, spec order), `CARD_LABEL: Record<id,string>`
- `cardValue(id, ctx) → { id, label, available, big, unit, sub, visual, target }` where
  `ctx = { data, tasks, forecast, progress: {done,total,left}, todayKey, crops }`;
  `visual` is `null | {kind:"ring",pct} | {kind:"bars",values:number[],labels?:string[],hi?:number} | {kind:"fill",pct} | {kind:"split",parts:[{n,tone}]} | {kind:"crop",crop,stage,pct}`;
  `target` is `{type:"tab",tab} | {type:"plot",plotId,zoneId} | {type:"zone",zoneId} | {type:"page",page} | {type:"week"}`.
- `allCards(ctx) → value[]` (every id), `suggestedIds(ctx) → string[]`, `shownIds(data, ctx) → string[]`
- `addCard(ids, id)`, `removeCard(ids, id)`, `moveCard(ids, from, to)` → new arrays (pure)
- `plantingRows(data, crops, todayKey) → [{ id, crop, name, zoneId, where, stage, stageLabel, left, ready }]` soonest first
- `animalRows(data) → [{ id, type, name, count, zoneId, where }]`
- `visibleCount(height) → 4 | 3` (4 at ≥ 860)

- [ ] **Step 1: Write the failing tests** — using `tests/fixture.js`:
  - suggested for the fixture (hens, plantings, no forecast) = `["jobs","harvest","eggs"]` (rain unavailable without a forecast; three available + eggs).
  - with `forecast = {days: 7 days of rainMm 1..7, tMin 5..-1}`: `rain.big === "28"`, `rain.unit === "mm"`, `cold.big === "-1°"`, suggested = `["jobs","harvest","rain","eggs"]`.
  - empty farm (`DEF`): `shownIds` = `["jobs","time"]`-free — exactly `["jobs"]`; every `allCards` value has string `big` and no `"NaN"`/`"undefined"` in `big`/`sub`.
  - `shownIds({deskCards:["nope","jobs","jobs","harvest","eggs","time","space"]})` on the fixture = `["jobs","harvest","eggs","time"]`; `shownIds({deskCards:[]})` = `[]`.
  - `harvest` on the fixture: lettuce is one day overdue → `big === "Ready"`, `target.plotId === "lettuce"`.
  - `plantingRows` on the fixture: first row `lettuce` with `ready === true`; a plot whose `zone` is missing gets `where === ""` and still appears.
  - `animalRows`: hens → `where === "Chicken coop"`, `zoneId === "coop"`.
  - `addCard` refuses a fifth and a duplicate; `moveCard([a,b,c],0,2)` = `[b,c,a]`.
- [ ] **Step 2: Run** `npm test` — the new tests fail (module missing).
- [ ] **Step 3: Implement** with existing helpers: `nextHarvest`, `produceTotals`, `plantingCounts`, `moneyTotals` (`lib/progress.js`), `stockLines` (`lib/inventory.js`), `formatMoneyShort` (`lib/money.js`), `weekLoad`/`hm` (`lib/time-budget.js`), `buildZoneSpaceMap` (`lib/farm-calc.js`), `growthOf`/`animalZone`/`STAGES` (`features/quiet/farm-model.js`), `isPlantZone` (`features/farm/living/visuals`). Eggs: pantry `moves` with `kind:"in"`, `unit:"pcs"`, name matching `/egg/i`, last 7 days by date. `time` is computed lazily (only when asked for) because `weekLoad` builds seven task plans.
- [ ] **Step 4: Run** `npm test` — all pass.
- [ ] **Step 5: Commit** `Desktop cards: the numbers behind them`.

### Task 2: The map — left inset, pickPlot, slow event

**Files:**
- Modify: `src/features/grove/cover.js` (`mergeInset`), `src/features/grove/Grove3D.jsx` (props, `bars`, home inset, `st.api`, `saveRatio` call site), `src/features/grove/GroveScene.jsx` (pass `homeLeft`)
- Test: `tests/cover.test.js`

**Interfaces — produces:** `homeLeft` prop (px); `engine.pickPlot(plotId) → boolean`; `window` event `"mt-map-slow"`.

- [ ] **Step 1: Failing test** — `mergeInset(null, {top:92,bottom:108,left:296,right:384}, {w:1440,h:900})` → `left ≈ 296/1440`, `right ≈ 384/1440`; a cover inset that already has `right` keeps its own `right`; bars without `left`/`right` behave exactly as before.
- [ ] **Step 2: Run** — fails.
- [ ] **Step 3: Implement.** `pickPlot` finds the hit in `st.plotHits` by `userData.plot.id`, calls `pickRow` and focuses its zone, returns `false` when the planting has no row on the map.
- [ ] **Step 4: Run** `npm test` — pass.
- [ ] **Step 5: Commit** `Map: keeps clear of a left column, can be sent to a planting`.

### Task 3: Cards, picker, tabbed panel, glass

**Files:**
- Create: `src/features/home/DeskCards.jsx`, `src/features/home/DeskPanel.jsx`, `src/features/home/desk.css`
- Modify: `src/features/home/HomeV2.jsx`

**Interfaces — consumes** Task 1 and Task 2 as written above.
- `DeskCards({ ctx, data, setData, onTarget })` — renders the column, edit mode and picker; writes `data.deskCards`.
- `DeskPanel({ data, crops, todayKey, jobs, jobsLeft, onCollapse, onTarget, setPage })` — `jobs` is the existing jobs list body + header actions.
- `HomeV2`: `desk`, `body.mt-desk` / `body.mt-solid`, `onTarget(target)` dispatching to `engine.pickPlot` / `engine.focusZone` / `setPage` / week overlay / tab; `homeLeft = 296` when the cards are on screen.

- [ ] **Step 1:** Build `DeskCards` + `DeskPanel` + CSS; mount in `HomeV2` under `desk`.
- [ ] **Step 2:** `npm run build` and `npx eslint src/features/home src/features/grove/cover.js` — clean.
- [ ] **Step 3:** Run the app locally (demo farm) at 1440 × 900 and 1280 × 720; check: cards show real values, edit/add/remove/reorder persists after reload, each tab lists rows, clicking a planting moves the camera and opens the crop panel (cards step aside), no card at phone width.
- [ ] **Step 4: Commit** `Desktop home: farm cards you choose, and a live table`.

### Task 4: Ship

- [ ] `npm test`, `npm run build`; add a dated entry to `DESIGN_PLAN.md`.
- [ ] Push `main`; wait for the Vercel deployment to be READY; grep the live bundle for the three markers; check the CSP header is unchanged.
