# MyTerra Architecture Plan

**Goal:** prepare MyTerra for web, iOS, and Android without rebuilding the app from zero.

This is the living checklist for architecture work. When a task is finished, change `[ ]` to `[x]` and add a short note if needed.

**Last updated:** 2026-06-11 — **Phase 7 (Capacitor iOS): native shell scaffolded & builds locally; NOT on any device, TestFlight, or App Store. App Store work is PAUSED — no paid Apple Developer account yet, and the app itself is still in active development.** ⚠️ Repo local path (moved during the 2026-06-10 macOS-update Documents reshuffle) is `/Users/dervis/Documents/Documents - MacBook Pro (3)/Claude/Projects/Farming project/homestead` (the old `.../Documents/Claude/Projects/...` path no longer exists — use the new one for all Desktop Commander work). Full Phase 7 state is in the Phase 7 section + Decision Log (2026-06-11). Prior milestone retained: 2026-06-07 — **Phase 6 (offline sync) SHIPPED.** `SyncStatus` indicator (synced/syncing/offline/error) live in sidebar + More drawer; multi-device pull-on-focus (last-write-wins via `updated_at`, dirty-guarded so in-progress edits aren't clobbered); offline write-queue + reconnect drain. DB dependency verified: `farms.trg_farms_touch` bumps `updated_at` on every UPDATE, RLS has INSERT/SELECT/UPDATE policies. Deployed `7aba33b` → `dpl_AiAe4NzovLtzVsD7ad7nyHpehsPc` READY; 4 markers confirmed in live bundle. Phases 0–5 FINAL. **Not yet verified — needs a live signed-in session:** the indicator's on-screen look + a real two-device sync (Playwright MCP was down this session). **Phase 5 leftover still open:** Google OAuth not configured (button errors on click). Next: finish Phase 7 native work once a paid Apple Developer account + a final bundle ID exist, then Phase 8 (payments).

---

## North Star

MyTerra should become:

> One shared farming brain powering the web app, the iOS app, and the Android app.

That means crop rules, animal rules, task rules, pantry logic, financial logic, and offline sync should live in shared code. The web, iPhone, and Android versions should use the same brain, not three separate copies.

---

## Simple Picture

```text
                         MyTerra Shared Brain
              crops, animals, tasks, seasons, pantry,
              financials, storage, sync, user farm data

                    /             |             \
                   /              |              \
              Web App        iOS App        Android App
             browser UI     phone shell     phone shell
```

The app should work first on the device, then sync to the cloud when internet is available.

```text
User action
   ↓
Save immediately on this device
   ↓
App keeps working offline
   ↓
When internet returns, sync with cloud
   ↓
Other devices update
```

---

## Actual Current Folder Structure (as of 2026-05-11)

This is what exists on disk right now, not the target.

```text
src/
  App.jsx                  ← 386 lines — UI shell + routing only
  main.jsx
  index.css

  app/                     ← Phase 3.9 + 3.10 — App.jsx scaffolding
    navigation.js          ← Phase 3.9 (commit c09ba81) — NAV, BOTTOM_TABS, MORE_ITEMS + lucide icons
    state.js               ← Phase 3.10 (commit 2fdc02b) — DEF + dataReducer

  features/                ← screen components extracted from App.jsx
    pantry/
      Pantry.jsx           ← Phase 3.1 (commit 4a17087)
    financials/
      Financials.jsx       ← Phase 3.2 (commit c42a1aa)
    manuals/
      Manuals.jsx          ← Phase 3.3 (commit 33a7a14) — also contains
                             Preserving, SeasonalCalendar, Blueprint, Projects
    animals/
      Livestock.jsx        ← Phase 3.4 (commit 930e9d0)
      AnimalOverlay.jsx    ← Phase 3.4 (commit 930e9d0) — shared popup,
                             imported by TaskQueue + TodayScreen
    tasks/
      TaskQueue.jsx        ← Phase 3.5 (commit 49011b3) — TaskRow + TaskQueue
    farm/
      Farm.jsx             ← Phase 3.6 (commit fb8d6e3) — Setup + Farming +
                             FarmMapHero + FarmTab (FarmTab default-exported)
      PlotOverlay.jsx      ← Phase 3.5 (commit 49011b3) — shared popup,
                             imported by Farm + TodayScreen + TaskQueue
    today/
      TodayScreen.jsx      ← Phase 3.7 (commit 5425623) — Dashboard / Today screen
    assistant/
      AIAssistant.jsx      ← Phase 3.8 (commit 29cf39d) — floating chat +
                             autocomplete dropdown + quick-prompt rail
    feedback/
      FeedbackSurvey.jsx   ← Phase 3.11 (commit 9e93789) — 4-question survey
                             (default export) + 7-day FeedbackPrompt toast
                             (named export)

  components/
    ui.jsx                 ← Btn, Card, Inp, Sel, Txt, Overlay, Pill,
                             Tooltip, Ring, Stat, StepChecklist,
                             WaterCard, StorageCard (13 components)

  data/                    ← pure data constants, no logic
    crops.js               ← CROPS, CROP_MAP, CROP_COLORS (75 crops)
    zones.js               ← ZT, ZT_MAP
    regions.js             ← REGIONS, REGION_MAP
    regional-overrides.js  ← RO (crop overrides), LDB_RO (livestock overrides)
    varieties.js           ← VARIETIES, VAR_RO
    companions.js          ← COMP
    breeds.js              ← BREEDS
    livestock.js           ← LDB, POULTRY_SPECIES, HOOFED_SPECIES,
                             GRAZER_SPECIES, animalPlural (14 animals)
    livestock-calendar.js  ← LIVESTOCK_CALENDAR (14 animals × 12 months)
    preservation.js        ← PRESERVATION (13 methods)
    badges.js              ← BADGES
    projects.js            ← PROJECT_GUIDES, BLUEPRINT_IMAGES
    cities.js              ← CITY_DB, searchCity

  lib/                     ← logic/helpers, no UI
    storage.js             ← DB, uid (localStorage wrapper)
    theme.js               ← C (colors), F (fonts), SX (style helpers)
    utils.js               ← appendLog, toLocalDateKey, todayLocalKey,
                             localDateFromKey, addDaysToLocalKey,
                             daysBetweenLocalKeys, markTaskDone
    regional.js            ← getRegionalCrop, getRegionalCrops,
                             getRegionalCropMap, rCM, rCR,
                             getRegionalVarieties, getRegionalCalendar
    farm-calc.js           ← cropMeasureType, plantsFromArea, expectedYield,
                             zoneAreaM2, plotAreaM2, zoneSpaceStats,
                             buildZoneSpaceMap
    task-queue.js          ← buildTaskQueue (crop tasks, animal tasks,
                             species grouping, sorting)
    calendar.js            ← MN_FULL, MN_ABR, parseSowMonths,
                             parseHarvestMonths, CROP_DIFFICULTY,
                             getCropDifficulty
    migrations.js          ← migrateZones, migrateGamify,
                             migrateCompletions, updateGamify
    ai.js                  ← farmKnowledgeEngine, buildAISuggestions
                             (offline assistant, no API key)
```

What App.jsx still contains (deliberately kept — App.jsx is now the UI shell):
- `ErrorBoundary` class component
- `BottomNav` + `MoreDrawer` (mobile navigation UI)
- `AppInner` (top-level state owner + page router)
- `App` default export (just wraps AppInner in ErrorBoundary)

---

## Commit History (all meaningful commits to date)

### Phase A — Data Extraction (Jan–May 2026)

| Commit | Message | App.jsx lines |
|--------|---------|---------------|
| `303a93c` | Phase A.1: extract DB, uid + C, F, SX into src/lib/ | – |
| `b302ad0` | Phase A.2: extract ZT, COMP, BREEDS to src/data/ | – |
| `f267e10` | Phase A.3: extract VARIETIES, CROPS, REGIONS to src/data/ | – |
| `58cdf57` | Phase A.4: extract RO + LDB_RO to src/data/regional-overrides.js | 5950 → 5546 |
| `ce2455c` | Phase A.5a: extract livestock data + LIVESTOCK_CALENDAR | 5785 → 5544 |
| `5f64804` | Phase A.5b: extract PRESERVATION, BADGES, PROJECT_GUIDES, BLUEPRINT_IMAGES | 5544 → 5218 |
| `51ad979` | Phase A.7: extract utils, cities, regional, farm-calc | 5218 → 4878 |
| `4369a91` | Phase A.8: extract UI primitives + buildTaskQueue | 4878 → 4601 |
| `d049add` | Phase A.9: extract calendar helpers + migrations | 4601 → 4485 |
| `10038c8` | Phase A.10: extract farmKnowledgeEngine + buildAISuggestions into lib/ai.js | 4485 → 4031 |

### UI/UX Design Phases (DESIGN_PLAN.md)

| Commit | Message |
|--------|---------|
| `d9fc48f` | Phase 1.1–1.3: design tokens, refined palette, type scale |
| `69c2e98` | Phase 1.4: component audit — fix stray inline buttons |
| `0147277` | Phase 2.2: responsive nav — bottom tabs / icon rail / full sidebar |
| `c2a448a` | Phase 2.3+2.4+2.6: stack grids, bottom-sheet Overlay, 44px touch targets |
| `d467218` | Phase 3.1-3.2: Lucide React icons — nav, bottom tabs, controls |
| `9b1c23f` | Phase 3.4: Lucide icon swap — Leaf for brand/FAB, Trash2 for delete |
| `f867ee9` | Phase 3.5: pill/badge consolidation — 14 inline spans replaced |
| `4816ca8` | Phase 4: IA rethink — Today tab, merged Farm tab, calm greeting, profile avatar |

### Phase 4 — Storage Layer (May 2026)

| Commit | Message |
|--------|---------|
| `701adc6` | Docs: update ARCHITECTURE_PLAN to reflect Phase A completion |
| `3815979` | Phase 4: storage layer — clean API + UI pref helpers, zero raw localStorage in App.jsx |
| `0431ca4` | Docs: ARCHITECTURE_PLAN — mark Phase 4 done, add commit row, append decision-log entries |
| *(this commit)* | Phase 4 close-out: delete unused DB shim + mark Phases 0/1/2/4 FINAL |

### Phase 3 — Screen Extraction (May 2026)

| Commit | Message | App.jsx lines |
|--------|---------|---------------|
| `667c78b` | Docs: ARCHITECTURE_PLAN — Phase 3 starts (overrides defer note), lock Phase 5 inputs in decision log | – |
| `4a17087` | Phase 3.1: extract Pantry into src/features/pantry/ | 4037 → 3952 |
| `c42a1aa` | Phase 3.2: extract Financials into src/features/financials/ | 3952 → 3876 |
| `33a7a14` | Phase 3.3: extract Manuals (+ Preserving/SeasonalCalendar/Blueprint/Projects) | 3876 → 3348 |
| `930e9d0` | Phase 3.4: extract Livestock + AnimalOverlay into src/features/animals/ | 3348 → 3189 |
| `49011b3` | Phase 3.5: extract Tasks (TaskQueue + TaskRow) + PlotOverlay into src/features/{tasks,farm}/ | 3189 → 2380 |
| `fb8d6e3` | Phase 3.6: extract Farm (Setup + Farming + FarmMapHero + FarmTab) into src/features/farm/Farm.jsx | 2380 → 1378 |
| `9dbd2b5` | Cleanup: remove 4 orphan comment headers in App.jsx (BADGE DEFINITIONS, TASK QUEUE ENGINE, FarmMap removed, WEATHER DASHBOARD CARD) | 1378 → 1359 |
| `5425623` | Phase 3.7: extract TodayScreen into src/features/today/TodayScreen.jsx | 1359 → 788 |
| `f359230` | fix: restore Seasonal nav button (export SeasonalCalendar from Manuals.jsx) | 788 |
| `ff60873` | cleanup: drop 47 unused imports from App.jsx | 775 |
| `29cf39d` | Phase 3.8: extract AIAssistant into src/features/assistant/AIAssistant.jsx | 775 → 558 |
| `c09ba81` | Phase 3.9: extract NAV/BOTTOM_TABS/MORE_ITEMS into src/app/navigation.js | 558 → 529 |
| `2fdc02b` | Phase 3.10: extract DEF + dataReducer into src/app/state.js | 529 → 491 |
| `9e93789` | Phase 3.11: extract FeedbackSurvey + FeedbackPrompt into src/features/feedback/ | 491 → 386 |

### Infrastructure / Fixes

| Commit | Message |
|--------|---------|
| `ef5b45a` | CSP: extract inline scripts to external files |
| `34e60b8` | Refactor: local date helpers + fix react-hooks deps + dead code removal |
| `b5cfb12` | Fix: rename lucide Map import to MapIcon (crash fix) |
| `befd4da` | Fix: restore getRegionalCalendar lost during Phase A extraction |
| `b8e887c` | Fix: add missing getRegionalVarieties function |
| `730c627` | Feat: dark mode toggle — persists to localStorage, respects system pref |
| `e13c41a` | Docs: add ARCHITECTURE_PLAN.md |

---

## Target Folder Structure (what we're moving toward)

```text
src/
  app/
    App.jsx
    navigation.js    ← NAV, BOTTOM_TABS, MORE_ITEMS (currently in App.jsx)
    state.js         ← DEF, dataReducer (currently in App.jsx)
    migrations.js    ← already exists at src/lib/migrations.js

  core/              ← NOT STARTED — farming brain
    crops/
    animals/
    tasks/
    calendar/
    yields/
    pantry/
    financials/

  data/              ← ✅ DONE — all pure data constants extracted
    (see actual structure above)

  services/          ← NOT STARTED
    storage/         ← src/lib/storage.js exists but is minimal
    auth/
    sync/
    database/
    payments/
    weather/
    notifications/

  features/          ← PARTIAL — 8 of ~9 screens extracted
    today/           ← ✅ DONE (Phase 3.7)
    farm/            ← ✅ DONE (Phase 3.6)
    tasks/           ← ✅ DONE (Phase 3.5)
    animals/         ← ✅ DONE (Phase 3.4)
    pantry/          ← ✅ DONE (Phase 3.1)
    financials/      ← ✅ DONE (Phase 3.2)
    manuals/         ← ✅ DONE (Phase 3.3)
    assistant/       ← ✅ DONE (Phase 3.8)

  components/        ← PARTIAL — all in one file (ui.jsx) not split per component
    ui.jsx           ← exists, contains all 13 components
    (target: Button.jsx, Card.jsx, Overlay.jsx, Pill.jsx, etc.)

  lib/               ← ✅ DONE — all shared logic extracted
    (see actual structure above)

  platform/          ← NOT STARTED
    web/
    mobile/
```

---

## Phase 0 — Protect The Working App

**Status: FINAL (2026-05-09)** — discipline maintained throughout Phase A and Phase 4. Production verified live and smoke-tested by Dervis.

- [x] Confirm `npm run build` passes before each architecture change.
- [x] Confirm the app opens locally after each architecture change. *(2026-05-09: live app at https://myterra-sigma.vercel.app/app smoke-tested post-Phase-4)*
- [x] Avoid changing product behavior during pure architecture cleanup.
- [x] Keep each change small enough to understand and undo.
- [x] Do not start mobile packaging until the shared app brain is separated from screen code. *(constraint satisfied — `src/lib/` brain and `src/data/` constants are already separated from screens; Capacitor remains independently deferred to Phase 7)*

---

## Phase 1 — Split The Reusable UI Pieces

**Status: FINAL (2026-05-09)** — All 7 required components extracted into `src/components/ui.jsx`, plus 6 bonus components (Tooltip, Ring, Stat, StepChecklist, WaterCard, StorageCard). Single-file structure deliberately retained — splitting 13 components into 13 files would add boilerplate (shared theme imports) without functional benefit at this scale (10 KB total).

- [x] Create `src/components/`.
- [x] Move `Btn` into components. *(in ui.jsx, not Button.jsx)*
- [x] Move `Card` into components. *(in ui.jsx)*
- [x] Move `Overlay` into components. *(in ui.jsx)*
- [x] Move `Pill` into components. *(in ui.jsx)*
- [x] Move form fields `Inp`, `Sel`, `Txt` into components. *(in ui.jsx)*
- [x] Replace imports in `App.jsx`.
- [x] Run `npm run build`.
- [x] Open the app and check Today, Farm, Animals, Pantry, Financials, and Assistant.
- [ ] *(optional, deliberately not done)* Split ui.jsx into individual component files. *Splitting 13 components into 13 files would add 13 identical theme-import blocks for zero bundle-size or maintenance benefit. Tree-shaking already works on named exports from a single file. Re-evaluate only if ui.jsx grows past ~30 components.*

**Note:** splitting into individual files has no functional benefit at this stage. Leave it.

---

## Phase 2 — Create The Shared Farming Brain

**Status: FINAL (2026-05-09)** — All farming logic extracted into `src/lib/` (9 modules). Zero brain logic remains in App.jsx (verified: every top-level function in App.jsx is either a React component or the `dataReducer` state machine). Test work was reassigned to Phase 10 to keep architecture-completion and test-coverage as separate concerns.

- [x] Create `src/lib/` *(used instead of src/core/ — same outcome)*
- [x] Move date helpers into calendar. *(`src/lib/calendar.js` for month names + sow/harvest parsing; `src/lib/utils.js` for local-date helpers)*
- [x] Move crop yield helpers. *(`src/lib/farm-calc.js` — cropMeasureType, plantsFromArea, expectedYield, zoneAreaM2, plotAreaM2, zoneSpaceStats, buildZoneSpaceMap)*
- [x] Move regional crop helpers. *(`src/lib/regional.js` — getRegionalCrop, getRegionalCrops, getRegionalCropMap, rCM, rCR, getRegionalVarieties)*
- [x] Move animal care/calendar helpers. *(`src/lib/regional.js` — getRegionalCalendar; lost during Phase A.5a, restored at commit `befd4da`)*
- [x] Move task generation. *(`src/lib/task-queue.js` — buildTaskQueue)*
- [x] Move AI knowledge engine. *(`src/lib/ai.js` — farmKnowledgeEngine, buildAISuggestions)*
- [x] Run `npm run build`.
- [x] ~~Add simple tests for the most important rules.~~ *(moved to Phase 10 — testing is a separate concern from extraction; Phase 10 already lists test runner setup + tests for crop timing, yield, task generation, storage migrations, and import/export)*

**Bonus extracted beyond the original list:** `src/lib/theme.js` (C, F, TS, SX), `src/lib/migrations.js` (migrateZones, migrateGamify, migrateCompletions, updateGamify), `src/lib/utils.js` (appendLog, local-date helpers, markTaskDone), `src/lib/storage.js` (Phase 4).

---

## Phase 3 — Split Screens Into Feature Folders

**Status: FINAL (2026-05-11)** — All 9 screens extracted, plus navigation config + default state + reducer. App.jsx 4037 → 386 lines (-3651 in Phase 3 alone, -5614 from original ~6000-line monolith). The "Recommendation: do this AFTER Supabase integration" advice from the original plan was overridden by Dervis on 2026-05-09 and the feature-folder-first approach proved correct — when Supabase comes in Phase 5, each feature can be touched independently without rewiring everything.

Screens to extract: ~~TodayScreen~~, ~~TaskQueue~~, ~~FarmTab (Farming + Setup + FarmMapHero)~~, ~~Livestock~~, ~~Pantry~~, ~~Financials~~, ~~Manuals (Manuals + Preserving + SeasonalCalendar + Blueprint + Projects)~~, ~~AIAssistant~~, ~~FeedbackSurvey~~.

- [x] Create `src/features/`. *(Phase 3.1)*
- [x] Move `Pantry` into `src/features/pantry/`. *(commit `4a17087`, 4037 → 3952)*
- [x] Move `Financials` into `src/features/financials/`. *(commit `c42a1aa`, 3952 → 3876)*
- [x] Move `Manuals` into `src/features/manuals/`. *(commit `33a7a14`, 3876 → 3348 — also moved Preserving, SeasonalCalendar, Blueprint, Projects)*
- [x] Move `Animals` into `src/features/animals/`. *(commit `930e9d0`, 3348 → 3189 — Livestock + shared AnimalOverlay)*
- [x] Move `Tasks` into `src/features/tasks/`. *(commit `49011b3`, 3189 → 2380 — TaskQueue + TaskRow; PlotOverlay extracted alongside into `src/features/farm/` because TaskQueue depends on it — same shared-overlay pattern as Phase 3.4 with AnimalOverlay)*
- [x] Move `Farm` into `src/features/farm/`. *(commit `fb8d6e3`, 2380 → 1378 — Setup + Farming + FarmMapHero + FarmTab; only FarmTab default-exported, others are file-internal)*
- [x] Move `Today` into `src/features/today/`. *(commit `5425623`, 1359 → 788 — TodayScreen default-exported)*
- [x] Move `Assistant` into `src/features/assistant/`. *(commit `29cf39d`, 775 → 558 — AIAssistant default-exported; floating chat + autocomplete dropdown + quick-prompt rail)*
- [x] Extract `NAV`, `BOTTOM_TABS`, `MORE_ITEMS` into `src/app/navigation.js`. *(Phase 3.9 — 558 → 529, 11 lucide icons moved alongside config; App.jsx keeps Download/Upload/Leaf/Moon/Sun/User)*
- [x] Extract `DEF`, `dataReducer` into `src/app/state.js`. *(Phase 3.10 — commit `2fdc02b`, 529 → 491; pure source reorg, byte-identical bundle vs Phase 3.9)*
- [x] Extract `FeedbackSurvey` + `FeedbackPrompt` into `src/features/feedback/FeedbackSurvey.jsx`. *(Phase 3.11 — commit `9e93789`, 491 → 386; FeedbackSurvey default-exported, FeedbackPrompt named-exported. Dropped Btn + markFeedbackDone from App.jsx imports.)*
- [x] Run `npm run build` after each feature is moved. *(established workflow)*

**Recommendation:** do this AFTER Supabase integration, not before. Extracting screens while the data layer is still localStorage makes the migration harder.

---

## Phase 4 — Build A Real Storage Layer

**Status: FINAL (2026-05-09)** — `src/lib/storage.js` is the single persistence layer for the whole app. UI never imports `localStorage` directly. Adapter pattern (kvGet/kvSet/kvRemove) is the swap point for Capacitor on mobile or Supabase later. Verified live in production. DB shim removed (zero consumers, dead code) at follow-up commit.

- [x] Create `src/services/storage/`. *(done as `src/lib/storage.js`)*
- [x] Keep current browser storage working.
- [x] Move migration logic into a module. *(`src/lib/migrations.js`)*
- [x] Add clean storage API: `loadFarm()`, `saveFarm()`, `saveFarmImmediate()`, `flushFarm()`, `exportFarm()`, `importFarm()`.
- [x] Make the app talk only to the storage service, not directly to `localStorage`. *(grep src/App.jsx for `localStorage` and `DB.` both return zero hits)*
- [x] Prepare for Capacitor/mobile storage later. *(adapter is the single point of replacement; Capacitor's async API will require turning callers async — that's the natural mobile boundary)*
- [x] Run `npm run build`. *(1753 modules, 659.94 kB, 192.38 kB gz; Mac and sandbox produced byte-identical bundle hashes)*

What landed in commit `3815979`:
- Adapter: `kvGet`, `kvSet`, exported `kvRemove` (for future logout/reset)
- Centralized `KEYS` constant (every storage key lives here)
- Farm data: `loadFarm`, `saveFarm` (debounced 500ms), `saveFarmImmediate`, `flushFarm`, `exportFarm` (returns raw JSON for crash-safe ErrorBoundary backup), `importFarm` (validates by parse, writes raw)
- UI prefs: `loadPage/savePage`, `loadTheme/saveTheme`, `loadFeedbackDone/markFeedbackDone`, `loadFeedbackDismissed/markFeedbackDismissed`, `loadFirstUse/saveFirstUse`
- App.jsx migrated 14 raw `localStorage` calls + 4 `DB.*` calls to zero

Follow-up close-out (2026-05-09): `DB` shim deleted — 12 lines of dead code removed after grep confirmed zero consumers anywhere in `src/`. Bundle dropped from `index-Dp0cxPzd.js` (659.95 kB) to `index-Bvkwd3vE.js` (659.94 kB).

---

## Phase 5 — Add Accounts And Cloud Backup

**Status: SHIPPED & VERIFIED LIVE (2026-05-24).** Mandatory sign-in wall before `/app`, email signup working end-to-end on production, farm data persisting to Supabase per-user behind RLS. Commits `c426672` (auth wall + lib files) + `a6acc18` (CSP fix). **One piece outstanding: Google OAuth not configured — the "Continue with Google" button errors on click until a Google Cloud OAuth client is set up in Supabase.**

Architecture as built:
- Document model — whole farm-data blob stored as a single JSONB column in `farms` (one row per user), not relational tables. Chosen for speed + matches the app's single-object data shape. Tradeoff: last-write-wins at document level (multi-device clobber risk, acceptable for solo users).
- One farm per user (`user_id` PK on `farms`).
- `profiles` + `farms` tables; `handle_new_user` trigger auto-provisions both rows on signup; RLS scopes select/insert/update to `auth.uid()`.
- `src/lib/db.js` (Supabase client, VITE_ env), `src/lib/auth.js` (signUp/signIn/Google/signOut/session), `src/lib/sync.js` (pull-on-login reconcile + debounced offline-aware push, last-write-wins via `updated_at`).
- `AuthGate` in App.jsx: Option X — reconcile cloud vs local before mount, 3s timeout fallback to local. Local-only escape hatch when Supabase env absent.
- Onboarding gated purely on `setupDone` flag (no mid-onboarding resume — deferred as post-launch follow-up).

- [x] Create `src/services/auth/`. *(done as `src/lib/auth.js` per hybrid-extraction decision)*
- [x] Create `src/services/database/`. *(done as `src/lib/db.js` + `src/lib/sync.js`)*
- [x] Create Supabase project. *(project `fosqnppqcsoowqvrlkul`)*
- [x] Design database tables: users, farms, zones, plots, animals, pantry, costs, log. *(document model instead — single JSONB `data` column on `farms` holds zones/plots/animals/pantry/costs/log; `profiles` for user/tier. Relational split deferred unless query needs arise.)*
- [x] Add email login. *(verified live: signup → session → farm persisted)*
- [ ] Add Google login. *(NOT DONE — button wired + UI present, but no Google Cloud OAuth client configured; clicking it errors. Independent of everything else, can be done anytime.)*
- [x] ~~Let users keep using app without login.~~ *(OVERRIDDEN by 2026-05-09 decision — mandatory sign-in wall.)*
- [x] Demo mode (2026-10-26, commit `7da5b97`, verified live). "Try the demo first" on the sign-in wall and `/app?demo` deep link (landing hero + final CTA, TikTok). AuthGate phase `demo`: local cache only, owner stamp `demo`, no entitlement fetch, no cloud push, AI assistant off (needs a session), Pro screens open. Demo banner + every upgrade path → "Create free account"; `reconcileAndReady` adopts the demo farm ONLY into an empty cloud row (fresh signup) — an existing cloud farm always wins and the demo farm is discarded. Settings in demo: "Exit demo", no sign-out / reminders / delete. **Unverified:** the demo→signup handoff end-to-end on production (needs a real signup; local flows verified in Chrome).
- [x] No sign-in wall for new visitors (2026-10-26, commit `8cf75d2`, verified live). Supersedes the 2026-05-09 mandatory-wall decision for first visits: `/app` with no session opens the demo. Auth screen only for `?signup` / `?signin` / `?reset`, expired email links, or a returning user whose own farm is cached on the device (owner stamp ≠ `demo`). Demo banner has "Sign in" + "Create free account". Landing hero + final CTA "Try it now — no sign-up" → `/app`; pricing cards → `/app?signup`; nav "Sign in" → `/app?signin`. TikTok captions keep plain `myterra.farm`.
- [x] Add cloud backup for logged-in users. *(pushFarm on every setData + initial push on mount + flush on beforeunload)*
- [x] Keep local offline data as source of truth. *(storage.js localStorage path untouched; sync rides alongside, 3s reconcile timeout falls back to local)*

---

## Phase 6 — Add Offline Sync

**Status: SHIPPED (2026-06-07).** Commits `97b32b0` (sync status machine + multi-device pull + `SyncStatus` indicator) and `7aba33b` (drop unused `layoutId` prop from `Overlay`). Deployed `dpl_AiAe4NzovLtzVsD7ad7nyHpehsPc` READY on SHA `7aba33b`; all 4 marker strings present in live bundle `index-ByCedOTm.js`. Sync FSM behaviorally tested 13/13 in a stubbed-Supabase Node harness. **Not yet confirmed with a live signed-in session: the indicator's on-screen appearance + a real two-device sync** (Playwright MCP was unresponsive; auth wall blocks a headless signed-in render).

- [x] Create `src/services/sync/`. *(done as `src/lib/sync.js` per the 2026-05-09 hybrid-extraction decision — no parallel folder)*
- [x] Track local changes while offline. *(latest-wins pending-data queue; `flushPush` no-ops + keeps `_dirty` while `navigator.onLine === false`)*
- [x] Sync changes to Supabase when internet returns. *(`initSyncReconnect` wires the `online` event → `flushPush` drains the queue)*
- [x] Handle same user on two devices. *(`pullIfRemoteNewer` on tab focus/visibility; code shipped + logic unit-tested — live two-device confirmation pending human verification)*
- [x] Decide conflict resolution (agreed: last-write-wins via `updated_at`). *(verified: `farms.trg_farms_touch` BEFORE UPDATE bumps `updated_at = now()`, so the document-level LWW timestamp actually advances on every write)*
- [x] Show sync status in the app. *(`src/components/SyncStatus.jsx` — dot + label for synced/syncing/offline/error; hidden in local/signed-out; compact variant on the tablet rail; replaced the old `isOffline` banners)*
- [x] Add backup/export fallback if sync fails. *(push failure → `error` status surfaced in the indicator; the existing Export Backup button is the manual recovery path; data stays safe in localStorage)*

---

## Phase 7 — Prepare For Mobile App Stores

**Status: IN PROGRESS — iOS native shell scaffolded and builds locally (2026-06-11). It is NOT running on a physical device, NOT on TestFlight, and NOT submitted to the App Store. App Store work is paused until the app is further along AND a paid Apple Developer account exists.**

Done (2026-06-11 — toolchain now macOS 26.5.1 + Xcode 26.5):
- [x] Add Capacitor to the project. — `@capacitor/core` + `@capacitor/cli` + `@capacitor/ios` 8.4.0. Capacitor 8 uses Swift Package Manager, so **no CocoaPods / Homebrew** needed.
- [x] Create iOS project. — `npx cap add ios` scaffolded `ios/` (SPM-based Xcode project, `appId: app.myterra`, `webDir: dist`). `npm run build:native` is plain `vite build` with **no** landing-page swap (so the app — not the landing page — is served as `index.html`); `npx cap sync ios` copies `dist/` into `ios/App/App/public` (which Capacitor's own `ios/.gitignore` excludes, so the web bundle is not committed twice).
- [x] **Native build verified.** Installed the iOS 26.5 SDK + simulator runtime (~7.9 GB) via `xcodebuild -downloadPlatform iOS`, then `xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build` → `** BUILD SUCCEEDED **`.
- [x] Clean commit + deploy. Commit `25c2668` staged exactly `package.json`, `package-lock.json`, `capacitor.config.json`, and `ios/` (22 files). The two stray `public/zones/` cooking-class poster files were deliberately left untracked. Pushed → Vercel `dpl_4WsbQGtHtpwPGhQVk6ooyuA23qBQ` **READY**; live `/app` returns 200 with bundle `index-B3HgLi1B.js`, landing intact at `/` (the iOS commit did not affect the web build).

Not done — Android:
- [ ] Create Android project.
- [ ] Move platform-specific code into `src/platform/`. (Not needed yet — there is no platform-divergent code.)
- [ ] Test local storage / offline on real iOS + Android devices. (Only a **simulator build** is verified so far — the app has not actually been *run* on a device or simulator yet.)

**App Store submission gate — NONE of this is done (hard blockers, mostly require Dervis):**
- [ ] **Paid Apple Developer Program account ($99/yr).** Dervis does NOT have one as of 2026-06-11. Nothing below is possible without it.
- [ ] **Bundle ID `app.myterra` is a PLACEHOLDER — not final, not registered with Apple, no App Store Connect record.** It is still costless to change until a record is created. Confirm the final ID before registering anything.
- [ ] Distribution signing (certificate + provisioning profile) — needs signing into Xcode with the paid Apple ID.
- [ ] App icons — the scaffold ships blank/placeholder icons; a full icon set is required.
- [ ] Native config beyond the basic `capacitor.config.json` (splash screen, status-bar style/color, allowed orientations).
- [ ] Signed archive + upload (Xcode Organizer / Transporter), TestFlight, and the App Store listing (screenshots, description, privacy-policy URL, age rating).
- [ ] Run the app in the iOS Simulator to catch native-only bugs (offered 2026-06-11, not yet done).

Infra note (ex-corporate Mac): the Xcode platform download was blocked by a `0.0.0.0 gdmf.apple.com` line in `/etc/hosts`. Only that line was removed (backup at `/etc/hosts.bak`); the three MDM/DEP enrollment blackholes (`deviceenrollment` / `mdmenrollment` / `iprofiles.apple.com`) were KEPT — they keep this ex-corporate Mac out of the previous owner's device management. See Decision Log 2026-06-11.

---

## Phase 8 — Payments And Subscriptions

**Status: IN PROGRESS (8.1 shipped 2026-07-12).**

**Decisions (2026-07-12):**
- Processor: **Paddle** (Merchant of Record). Stripe is NOT available to
  Albanian sellers (verified 2026-07: 46 supported countries, AL absent;
  Atlas/Delaware route rejected as overhead). Lemon Squeezy rejected —
  being folded into Stripe Managed Payments (public preview), roadmap risk.
  Paddle explicitly supports AL sellers and takes UK/EU VAT liability.
- Post-trial behavior: **read-only** — data visible + pull-sync works,
  writes rejected (DB-enforced, not just UI).
- Trial derives from `profiles.trial_started_at` (set at signup). 7 days,
  full Pro during trial.

**8.1 SHIPPED (commit c13fb74 + Supabase migrations
`phase8_subscription_schema_and_entitlement_rls`,
`phase8_revoke_anon_has_write_access`):**
- profiles: + paddle_customer_id, paddle_subscription_id,
  subscription_status, current_period_end (+ CHECK constraints).
- `profiles_update_own` policy DROPPED — tier was client-writable
  (self-serve free Pro from devtools). tier now changes only via
  service_role (future Paddle webhook edge function).
- `public.has_write_access(uid)` SECURITY DEFINER fn (grants:
  authenticated + service_role only); farms INSERT/UPDATE policies now
  require it. past_due (Paddle dunning) keeps access; canceled/paused/
  lapsed → read-only.
- `src/services/payments/entitlements.js` — client mirror of the SQL
  predicate + 72h offline grace cache (hfm_entitlement_v1). 19 unit
  tests pass. NOT imported anywhere yet.
- Founder accounts (dervis + elvia) set tier='lifetime' (trials had
  expired; write-block would have locked them).

Pricing (canonical — verified in public/landing.html line 954):
- 7-day free trial, no card required
- Basic $4.99/mo
- Pro $9.99/mo (AI assistant, multi-zone, analytics)
- Lifetime $190 one-time (early adopter)

Remaining:
- [x] Create `src/services/payments/` (8.1).
- [x] 8.2 SHIPPED (commit ef30ccc → dpl_349yGMNBPxHAkFQfxH6TooJPuZ6E, 5
      bundle markers verified live): entitlements wired into App —
      setData guarded (locked → upgrade sheet, no mutation), TrialBanner
      (countdown / read-only / dunning), UpgradeSheet (PADDLE_ENABLED=false
      until 8.5), AI assistant Pro-gated via LockedAssistantFab,
      resetEntitlement() beside both resetSync() call sites. Bonus fix:
      db.js no longer hard-crashes the app when env vars are missing
      (createClient throws on falsy url — local-only escape hatch was
      dead code). Validated: eslint + 5-state Playwright smoke suite.
      NOT yet gated: zone-count limit for Basic (multi-zone) and
      analytics — needs product decision on Basic's zone cap and what
      "analytics" maps to in Financials.
- [x] 8.3 SHIPPED (commit 7ac952b -> dpl_Aix4r9qG16T46VWPqZDLpiq3Fs3Z):
      /terms /privacy /refunds live (verified 200 + content), landing
      footer links, AuthScreen signup consent line (verified in live
      bundle). Facts baked in: Supabase Frankfurt EU storage, offline AI,
      Umami cookieless, Paddle MoR, food-preservation disclaimer, 14-day
      refunds + EU withdrawal, deletion-by-email until in-app flow.
      Drafted from product facts, NOT legal advice - Dervis to read.
- [x] 8.4 SHIPPED (2026-07-13): myterra.farm purchased + DNS live,
      Paddle account verified, 3 products/prices created.
- [x] 8.5 SHIPPED (2026-07-13): Paddle checkout overlay + webhook →
      Supabase edge function live, signature verified both directions.
      NOT yet click-tested by a real signed-in user; website/domain
      approval still pending in Paddle (blocks real transactions).
- [x] 8.6 VERIFIED (2026-07-12, no code change): RLS write-block tested
      against the LIVE database via role impersonation (SET LOCAL ROLE
      authenticated + request.jwt.claims — same mechanism supabase-js
      uses), using a synthetic auth.users fixture (deleted after,
      cascade + real-account integrity confirmed). Matrix, each state
      committed + verified before its impersonated write:
      trial fresh → write OK; trial expired → 42501 blocked, reads OK,
      sees ONLY own farm/profile, self-UPDATE tier='pro' hits 0 rows;
      basic+canceled → blocked; basic+past_due → write OK (dunning);
      basic+active → write OK; lifetime → write OK.
      GOTCHA reconfirmed: execute_sql rolls back the entire call on any
      statement error — NEVER bundle admin state changes with an
      impersonated statement that is expected to fail; verify state in a
      separate call first.
- [ ] Research Apple App Store subscription rules before iOS payments
      (web Paddle purchases can't be sold inside the iOS app — Apple IAP
      rules; revisit at Phase 7 resumption).
- [ ] Research Google Play subscription rules before Android payments.
- [x] Keep paid-feature checks in shared code (entitlements.js is the
      shared brain; UI imports it, never re-implements rules).
- [x] Add subscription status service (8.1: fetchEntitlement /
      computeEntitlement / hasFeature).
- [x] 72h offline grace token for subscribers (8.1: cached verifiedAt
      in hfm_entitlement_v1; live behavior verified at 8.6).

---

## Phase 9 — Weather, Notifications, And Reminders

**Status: NOT STARTED.**

Agreed: Open-Meteo API (free, no key, 7-day forecast). No push notifications needed yet.

- [ ] Create `src/services/weather/`.
- [ ] Create `src/services/notifications/`.
- [ ] Add Open-Meteo weather for web.
- [ ] Add mobile-safe weather access.
- [ ] Add local reminders for daily farm tasks.
- [ ] Add notification permission screens for iOS and Android.
- [ ] Make reminders use shared task engine from `src/lib/task-queue.js`.

---

## Phase 10 — Testing And Quality Gates

**Status: NOT STARTED.**

- [ ] Make `npm run lint` pass cleanly.
- [ ] Add a test runner.
- [ ] Add tests for crop timing.
- [ ] Add tests for expected yield.
- [ ] Add tests for task generation.
- [ ] Add tests for storage migrations.
- [ ] Add tests for import/export backup.
- [ ] Add a manual release checklist.

---

## What Not To Do Yet

- [ ] Do not rewrite the whole app in React Native yet.
- [ ] Do not create separate farming logic for web, iOS, and Android.
- [ ] Do not add a complicated backend before the local app brain is cleaned up.
- [ ] Do not move everything at once.
- [ ] Do not let payments, sync, and login logic spread randomly through screens.

---

## Decision Log

| Date | Decision |
|------|----------|
| 2026-05-07 | Long-term target is web, iOS, and Android. |
| 2026-05-07 | Best architecture is offline-first, feature-based, with one shared farming brain. |
| 2026-05-07 | Use Capacitor for iOS/Android (not React Native rewrite). |
| 2026-05-07 | Keep current React/Vite app and refactor gradually instead of rebuilding from zero. |
| 2026-05-09 | Supabase migration moved from Phase 6 → Phase 4 (next priority after Phase A). |
| 2026-05-09 | Offline architecture: online-first, localStorage as cache, Supabase as source of truth, mutation queue, last-write-wins via updated_at. |
| 2026-05-09 | Auth: email + Google OAuth via Supabase. |
| 2026-05-09 | Weather: Open-Meteo API (free, no key, 7-day forecast). No push notifications needed yet. |
| 2026-05-09 | Phase A complete. App.jsx reduced from ~6000 to 4031 lines. All data in src/data/, all logic in src/lib/. |
| 2026-05-05 | Market pivot: Western Europe is now the base climate layer (USDA 7-9, maritime temperate). Mediterranean is an override layer, not the base. Default region: western_europe. |
| 2026-05-09 | Screen extraction (Phase 3) deferred until after Supabase integration. Extracting screens while data layer is still localStorage makes migration harder. |
| 2026-05-09 | Phase 4 (storage layer) shipped at commit `3815979`. `src/lib/storage.js` is now the single persistence layer with adapter pattern, centralized `KEYS`, full farm-data API, and UI pref helpers. App.jsx has zero raw `localStorage` and zero `DB.*` references. Verified live: bundle hash matches sandbox build byte-for-byte; all six storage keys appear exactly once in the live bundle inside the minified `KEYS` object. |
| 2026-05-09 | `DB` shim kept in storage.js as a thin alias for backward compat. No remaining call sites in the codebase. Can be deleted in a follow-up commit when we're confident no future feature work reaches for it. |
| 2026-05-09 | Phase 0/1/2/4 walkthrough — every required bullet verified against actual codebase, all four phases marked FINAL. `DB` shim deleted (zero consumers confirmed). Phase 2's "add tests" bullet reassigned to Phase 10. Phase 1's "split ui.jsx" optional bullet deliberately not done — would add boilerplate without benefit at 13 components / 10 KB. Phase 3 deferred to a separate chat per Dervis. |
| 2026-05-09 | Phase 3 (screen extraction) starts now, ahead of Phase 5. Overrides the earlier "defer until after Supabase" note — Dervis chose to go feature-folder-first. |
| 2026-05-09 | Phase 5 inputs locked: **no production users to migrate** — clean-slate Supabase rollout, no migration script needed. |
| 2026-05-09 | Phase 5 inputs locked: **mandatory sign-in** — auth wall before any app access. Phase 5 bullet "Let users keep using app without login" is OVERRIDDEN. Landing CTA goes to sign-up, not directly to /app. |
| 2026-05-09 | Phase 5 inputs locked: **hybrid extraction** — `src/lib/db.js` (Supabase client), `src/lib/sync.js` (mutation queue), `src/lib/auth.js` (auth wrapper). UI remains in feature folders post-Phase-3. |
| 2026-05-09 | Phase 3.2 (Financials extraction) shipped at commit `c42a1aa`. Local + live bundle md5 byte-identical (`1b3570aae9d44ba9e5c80fdb5224256c`). All 6 marker strings verified in deployed `index-CofRtakY.js`. App.jsx 3952 → 3876 lines. 4 pre-existing eslint unused-import warnings in App.jsx flagged for separate cleanup commit. |
| 2026-05-09 | Phase 3.3 (Manuals extraction) shipped at commit `33a7a14`. Moved Manuals + 4 sibling screens (Preserving, SeasonalCalendar, Blueprint, Projects) into `src/features/manuals/Manuals.jsx`. App.jsx 3876 → 3348 lines (-527). Bundle 652 kB / 189 kB gz. Deployed READY at `dpl_AEjewBcyiz7ZcyBybXPsecjWjQ11`. *(Doc update for this commit was rolled into the Phase 3.4 doc commit, since 3.3 → 3.4 happened back-to-back.)* |
| 2026-05-09 | Phase 3.4 (Animals extraction) shipped at commit `930e9d0`. Moved Livestock + shared AnimalOverlay into `src/features/animals/`. AnimalOverlay imported back into App.jsx because TaskQueue and TodayScreen still consume it (will resolve when those screens are extracted in later 3.x commits). App.jsx 3348 → 3189 lines (-159). BREEDS import dropped from App.jsx (no remaining consumers). Bundle filename `index-J0lGSxWP.js` byte-identical between sandbox and Mac. All 8 marker strings ("Manage your animals, collect produce", "Layer Flock A", "Tap for guide", "Care Guide", "Egg production: ~", "Injuries & Treatment", "Suggested daily", "🥚 Collect Eggs") verified in live bundle on `myterra-sigma.vercel.app`. Deployed READY at `dpl_7kFLEXGgtj7T6YLqM5GKeBKPWAph`. The same 8 pre-existing eslint unused-import warnings in App.jsx (untouched by this commit) still pending a separate cleanup. |
| 2026-05-09 | Phase 3.5 (Tasks + PlotOverlay extraction) shipped at commit `49011b3`. Moved TaskRow + TaskQueue into `src/features/tasks/TaskQueue.jsx` (695 lines) and PlotOverlay into `src/features/farm/PlotOverlay.jsx` (137 lines). PlotOverlay extracted alongside because TaskQueue depends on it — keeping it in App.jsx would create a circular import. Farming and TodayScreen still consume PlotOverlay via the new feature import; this prepares the `src/features/farm/` folder for Phase 3.6 Farm extraction. App.jsx 3189 → 2380 lines (-809). Dropped now-unused symbols from App.jsx imports: `POULTRY_SPECIES`, `HOOFED_SPECIES`, `GRAZER_SPECIES`, `animalPlural`, `plotAreaM2`. Bundle 1760 modules, 652.17 kB / 189.44 kB gz, filename `index-CZA0h12s.js` byte-identical between Mac and live deployment (md5 `6c4b258274a4c9c07ee5a308352e34f0`). All 7 marker strings ("Task Calendar", "Needs Attention", "Daily Routine", "Hive inspection", "Hoof check", "Crop data not found", "Companions in zone") verified in live bundle. Deployed READY at `dpl_B1BapLjGFxqkbx6uA88CWJXXocfK`. 1 newly-orphaned eslint unused-import warning (`toLocalDateKey`) on top of the 8 pre-existing — total 9, still pending a separate cleanup commit. *Note: a parallel Codex chat had been making CSS-variable refactor edits across 12 files; per Dervis these were discarded entirely (stash dropped, every Codex-touched file reverted) and Phase 3.5 was shipped clean against the original HEAD `0a937d4`.* |
| 2026-05-09 | Phase 3.6 (Farm extraction) shipped at commit `fb8d6e3`. Moved Setup + Farming + FarmMapHero + FarmTab into `src/features/farm/Farm.jsx` (1016 lines). Only FarmTab is default-exported; the other three are file-internal since FarmTab is the only external consumer. Setup and FarmMapHero used CROP_COLORS + ZT_MAP which stay in App.jsx (still consumed by TodayScreen). App.jsx 2380 → 1378 lines (-1002). Dropped now-unused symbols from App.jsx imports: `uid`, `appendLog`, `searchCity`, `CITY_DB`, `REGIONS`, `REGION_MAP`, `getRegionalCrops`, `ZT`, `COMP`, `cropMeasureType`, `plantsFromArea`, `expectedYield`, `getRegionalVarieties` (13 symbols total). Bundle 1761 modules, 652.19 kB / 190.43 kB gz, filename `index-CIxUaiWF.js` byte-identical between Mac and live deployment (md5 `92804c0cf74cc5aaa3f6a3352d881004`). All 8 marker strings ("Farm Designer", "HOW MUCH ARE YOU PLANTING?", "Small Homestead", "Medium Farm", "Edit Layout", "Plant a Crop", "Active Crops", "Climate Region") verified in live bundle. Deployed READY at `dpl_8YaaHVS156zPDm4ZPQwqXpzZm5Yu`. Eslint clean (`npx eslint src/App.jsx src/features/farm/Farm.jsx` returned exit 0 with zero output). |
| 2026-05-10 | Phase 3.7 (TodayScreen extraction) shipped at commit `5425623`. Moved TodayScreen into `src/features/today/TodayScreen.jsx` (581 lines, default-exported). Only the function body and the `DASHBOARD` comment header were removed from App.jsx; no other restructuring. App.jsx 1359 → 788 lines (-571). TodayScreen.jsx imports: react hooks (useState, useEffect, useMemo), C/F/SX from lib/theme, ZT_MAP from data/zones, CROPS+CROP_COLORS from data/crops, BADGES, todayLocalKey/localDateFromKey/addDaysToLocalKey/daysBetweenLocalKeys/markTaskDone from lib/utils, rCM from lib/regional, buildZoneSpaceMap from lib/farm-calc, Card/Pill/Tooltip/Ring from components/ui, AnimalOverlay from features/animals, PlotOverlay from features/farm. No lucide-react icons needed. Bundle 1762 modules, 652.19 kB / 190.43 kB gz, filename `index-DqJAPVGt.js` byte-identical between Mac dist and live deployment (md5 `137f6097175d949f0ff62c6afe10f208` via direct curl). All 10 marker strings ("Today's Work", "Task Pipeline", "Click a task or zone", "Recent Activity", "Achievements", "Your garden awaits", "Edit Map", "ready to harvest", "no transactions", "MyTerra") verified in live bundle on `myterra-sigma.vercel.app`. Deployed READY at `dpl_FULLwXi8bPWaP8i8nuZRtVj2PTXf`. Unused imports in App.jsx grew to ~37 (28 newly-orphaned by this commit + 9 pre-existing) — deferred to a separate cleanup commit per established pattern. |
| 2026-05-10 | **Pre-existing bug discovered (NOT introduced by Phase 3.7):** `<SeasonalCalendar>` is referenced at App.jsx switch case `"season"` but isn't imported — it lives inside `src/features/manuals/Manuals.jsx` without being exported. Bug introduced in Phase 3.3 (commit `33a7a14`, 2026-05-09): SeasonalCalendar was extracted into Manuals.jsx as a file-internal helper without re-exporting it, and the App.jsx switch case wasn't updated. The Seasonal nav button (sidebar + mobile More drawer) has been broken in production since May 9 — clicking it triggers `Element type is invalid` and lands the user in the ErrorBoundary. Fix held back from this commit to keep Phase 3.7 a clean extraction. Fixed in commit `f359230` (2026-05-10) by exporting SeasonalCalendar from Manuals.jsx and adding `{ SeasonalCalendar }` to the named-import in App.jsx. |
| 2026-05-10 | Phase 3.8 (AIAssistant extraction) shipped at commit `29cf39d`. Moved AIAssistant + autocomplete dropdown + quick-prompt rail into `src/features/assistant/AIAssistant.jsx` (225 lines, default-exported). App.jsx 775 → 558 lines (-217). Dropped from App.jsx imports: `useRef` (only consumer was AIAssistant) and the entire `./lib/ai` import line (`farmKnowledgeEngine`, `buildAISuggestions` — only consumers were inside AIAssistant). AIAssistant.jsx imports: react hooks (useState, useEffect, useMemo, useRef), Leaf from lucide-react, C/F/SX from lib/theme, LDB from data/livestock, rCR from lib/regional, farmKnowledgeEngine + buildAISuggestions from lib/ai. Bundle 1763 modules, 659.77 kB / 194.51 kB gz, filename `index-e_P-vcqi.js` byte-identical between Mac dist and live deployment (md5 `688f167e1e708339287d8f2f11ca0f6c` via direct curl). All 8 marker strings ("Farm Assistant", "What should I plant now", "Type 2+ letters to see suggestions", "Type a crop or animal name", "Companion planting tips", "How to grow tomatoes", "Watering tips for my crops", "Chicken care guide") verified in live bundle on `myterra-sigma.vercel.app`. Deployed READY at `dpl_3yHicwYZcpEtmW5v3iFzBfne8Hh1`. Eslint clean on both App.jsx and AIAssistant.jsx. All 8 feature screens now live in `src/features/`; only FeedbackSurvey + FeedbackPrompt + AppInner + ErrorBoundary + BottomNav + MoreDrawer remain in App.jsx alongside DEF / dataReducer / NAV config. |
| 2026-05-11 | Phase 3.9 (NAV config extraction) shipped at commit `c09ba81`. Moved `NAV`, `BOTTOM_TABS`, and `MORE_ITEMS` out of App.jsx into a new `src/app/navigation.js` (38 lines). App.jsx 558 → 529 lines (-29). The 11 lucide-react icons that were only used by navigation config (Home, ClipboardList, Sprout, Rabbit, CalendarDays, Package, TrendingUp, BookOpen, MessageSquare, MoreHorizontal, PawPrint) moved alongside the config. App.jsx now imports only the 6 lucide icons it still renders directly: Download, Upload, Leaf, Moon, Sun, User (sidebar brand, export/import buttons, dark-mode toggle, MoreDrawer profile avatar). New `src/app/` directory introduced — first non-`features/`, non-`lib/`, non-`data/`, non-`components/` location for code that organises App.jsx itself. Bundle 1764 modules, 659.77 kB / 194.51 kB gz, filename `index-CrkbOzjf.js` byte-identical between Mac sandbox build and live deployment (md5 `7d5546a81a811c9bbdf799ea00342a09` confirmed via direct curl). All 6 marker strings — "Animals" (4×, BOTTOM_TABS), "Livestock" (4×, NAV), "Task Queue" (1×, MORE_ITEMS only), "Give Feedback" (1×, NAV+MORE_ITEMS), "Seasonal" (4×), "Financials" (3×) — verified in live bundle on `myterra-sigma.vercel.app`. Deployed READY at `dpl_9Ra97hejzrrbwDrXrRX5o9JUR3xR`. Eslint clean on both App.jsx and navigation.js. Remaining Phase 3 work: `DEF` + `dataReducer` → `src/app/state.js`. FeedbackSurvey/FeedbackPrompt extraction not yet scheduled. |
| 2026-05-11 | Phase 3.10 (state extraction) shipped at commit `2fdc02b`. Moved `DEF` (default farm-data shape) and `dataReducer` (pure (state, action) → newState) into a new `src/app/state.js` (45 lines). App.jsx 529 → 491 lines (-38). Both are pure JS — no React, no external deps — which sets them up cleanly for unit tests in Phase 10. **Bundle byte-identical to Phase 3.9:** same filename `index-CrkbOzjf.js`, same md5 `7d5546a81a811c9bbdf799ea00342a09`, verified live via curl. That's the strongest possible signal that this is a pure source reorganisation with zero semantic change — Vite's deterministic minifier produces the same compiled output for the same dependency graph regardless of which source file each symbol came from. All 4 marker strings — `western_europe` (2×, DEF region default), `TOGGLE_STEP` (1×, dataReducer action), `SET_ALL` (1×, dataReducer action), `schemaVersion` (1×, DEF property) — verified in live bundle. Deployed READY at `dpl_2GFPcEWr5LAy5Ydnh2UnBic656hU`. Eslint clean. |
| 2026-05-11 | Phase 3.11 (Feedback extraction) shipped at commit `9e93789`. Moved `FeedbackSurvey` (the 4-question survey page, default-exported) and `FeedbackPrompt` (the 7-day toast, named-exported) into `src/features/feedback/FeedbackSurvey.jsx` (109 lines). App.jsx 491 → 386 lines (-105). Two App.jsx imports trimmed because their only consumers were inside the feedback components: `Btn` from `./components/ui` (used by both feedback components for buttons) and `markFeedbackDone` from `./lib/storage` (used by FeedbackSurvey's submit handler). Bundle 1765 modules, 659.77 kB / 194.53 kB gz, new filename `index-Bdu8v4CQ.js` byte-identical between Mac sandbox build and live deployment (md5 `efa70ddda56b3d505eebf4ee797ca4e0` confirmed via direct curl). All 5 marker strings — "Help Us Improve", "How's it going", "Send Feedback via Email", "Maybe Later", "Back to Today" — verified in live bundle (1× each). Note: the literal `"MyTerra App Feedback"` does NOT appear in the bundle because Vite's minifier constant-folded `encodeURIComponent("MyTerra App Feedback")` into the percent-encoded `"MyTerra%20App%20Feedback"` at build time — an optimization, not a bug. Deployed READY at `dpl_AzNMSX3Nyz6H7UkRyK5QyyA2fjtG`. Eslint clean. **Phase 3 is now FINAL** — App.jsx is purely the UI shell (ErrorBoundary, BottomNav, MoreDrawer, AppInner, App). All 9 feature screens live in `src/features/`; navigation config, default state, and reducer live in `src/app/`. Next: Phase 5 (Supabase auth + cloud backup). |
| 2026-05-11 | **Sandbox mishap during Phase 3.11 deployment:** While editing App.jsx on the Mac with a one-liner pipeline `awk 'NR<=386' src/App.jsx > /tmp/x && mv /tmp/x src/App.jsx`, the redirect emptied src/App.jsx to 0 bytes because the shell opened the output file (truncating it) before awk could finish reading the input. Recovered immediately with `git restore src/App.jsx` (last commit was Phase 3.10's `2fdc02b`, so no work was lost). The earlier in-process import edits had to be re-applied, which I did by writing the validated full sandbox file directly over the Mac copy via Desktop Commander:write_file. Lesson: never use `cmd > file && mv file orig` on the file being read — always write to a temp path first, then rename atomically with `mv`, OR use a different output path entirely. Direct file overwrite via the file-writer tool is safer than shell pipelines for files-with-spaces-in-the-path. |
| 2026-05-12–05-21 | **Architecture work paused while UX/UI shipped.** Phase 5 (Supabase) was the documented "next step" after Phase 3.11 but did not start. Instead, ~30 commits landed against the design phases tracked in `DESIGN_PLAN.md`: Phase 7 (onboarding), Phase 8 (motion polish — `framer-motion` added then removed again 4 days later in commit `1db4515`), Phase 6.9 (PNG-based Living Farm Map), and an unplanned Phase 6.10 polish loop (Living Farm Map redesigned to "minimal living planner" + stage-aware crop patches + Walk Overlay portal fixes). `App.jsx` grew slightly from 386 to 412 lines as a result. No architectural regression — `src/lib/` brain + `src/data/` constants + storage adapter all untouched. New feature subfolder `src/features/farm/living/` (6 files) cleanly slots under the existing feature-folder pattern. **Cosmetic gap:** `DESIGN_PLAN.md` was accidentally deleted in commit `bf92dee` ("Clean up codecheck findings", 2026-05-20) and restored on 2026-05-21 with corrections for stale 8.2/8.3/6.9.6 entries. |
| 2026-05-21 | **Phase 5 starts.** Audit pass complete (DESIGN_PLAN restored + ARCHITECTURE_PLAN refreshed). All three Phase 5 inputs locked from the 2026-05-09 decision still hold: no production users to migrate (clean-slate Supabase), mandatory sign-in (auth wall before `/app`), hybrid extraction (`src/lib/db.js` + `src/lib/sync.js` + `src/lib/auth.js`, UI stays in features/). Next action: create Supabase project and design the database tables (users, farms, zones, plots, animals, pantry, costs, log). |
| 2026-05-24 | **Phase 5 SHIPPED & VERIFIED LIVE.** Commits `c426672` (auth wall + db.js/auth.js/sync.js + AuthScreen + AuthGate) and `a6acc18` (CSP fix — added Supabase https+wss to connect-src; the pre-Phase-5 CSP was silently blocking all auth/sync requests, caught by inspecting live response headers not just the bundle). Schema applied directly to Supabase via MCP: `profiles` + `farms` (single JSONB `data` column, one row per user, `updated_at` for last-write-wins), `handle_new_user` trigger auto-provisions rows on signup, RLS scoped to `auth.uid()` (read+write isolation tested live via throwaway users — 0 lint advisories after hardening). **Decisions made this session:** document model over relational (Option 1), one farm per user (Option A), Option X reconcile (gate app mount on cloud pull, 3s timeout → local fallback), onboarding gated purely on `setupDone` (mid-onboarding resume deferred post-launch). Verified end-to-end on production `myterra-sigma.vercel.app/app`: signup → session → onboarding → farm written to `farms` table under the new user (confirmed by direct SQL query of the live row), then test user cleaned up (DB pristine: 0 users, 0 farms). Bundle grew 733 → 943 kB (gz 216 → 270 kB) from `@supabase/supabase-js` — code-split is a possible follow-up, not urgent. **Vercel env vars** `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` added to Production (newer Vercel UI nests env vars inside each Environment's detail page, not a separate sidebar item). **Gotcha for testers:** `npm run dev` (:5173) crashes with `$RefreshSig$ is not defined` when a wallet extension's SES lockdown freezes globals before Vite Fast Refresh defines them — production build + `npm run preview` (:4173) are immune; test there. **Still outstanding:** (1) Google OAuth not configured — button errors on click until a Google Cloud OAuth client is created and pasted into Supabase; (2) Supabase "Confirm email" set OFF (signup → immediate session) — fine for now, revisit before scale; (3) mid-onboarding resume deferred. |
| 2026-06-07 | **Phase 6 (offline sync) SHIPPED.** Commits `97b32b0` (sync + indicator) + `7aba33b` (drop unused `layoutId` in `Overlay`). No `src/services/sync/` folder — collapsed into `src/lib/sync.js` per the 2026-05-09 hybrid-extraction decision. **Built:** (1) sync status machine in `sync.js` — `synced`/`syncing`/`offline`/`error`/`local`, with `subscribeSyncStatus`/`getSyncStatus`; (2) `pullIfRemoteNewer()` — multi-device pull on tab focus/visibility, last-write-wins via `updated_at`, guarded by `_dirty` so an in-flight local edit is never clobbered; (3) `noteAppliedUpdatedAt()` baseline tracking, set by `AuthGate` after the reconcile pull; (4) push/flush now drive status + capture the server `updated_at` via `.upsert().select("updated_at")`; (5) `online`+`offline` events wired (truthful offline at load); (6) new `SyncStatus.jsx` indicator in sidebar + More drawer, replacing the old `isOffline` banners; (7) Export Backup already serves as the sync-failure fallback. **DB dependency verified via Supabase MCP:** `farms` has `trg_farms_touch` (BEFORE UPDATE → `new.updated_at = now()`) + RLS with INSERT/SELECT/UPDATE policies — so the `.select()` round-trip is permitted and `updated_at` actually advances on every update (the linchpin for multi-device). No schema change needed; Phase 5 already had it right. **Verified:** clean build (1829 modules); eslint clean project-wide (also fixed the pre-existing `ui.jsx` unused-`layoutId` error); sync FSM behaviorally tested 13/13 in a stubbed-Supabase Node ESM-loader harness; live bundle `index-ByCedOTm.js` on `myterra-sigma.vercel.app` contains all 4 markers (`Offline · saved on device`, `Not synced · saved locally`, `Sync status:`, `Syncing`); deployment `dpl_AiAe4NzovLtzVsD7ad7nyHpehsPc` READY on SHA `7aba33b`. **Not verified — needs human eye / live session:** the indicator on-screen while signed in, and a real two-device sync (Playwright MCP unresponsive this session; auth wall blocks a headless signed-in render). **Incidental:** project `fosqnppqcsoowqvrlkul` had auto-paused (free-tier) and was restored this session; it now shows 2 auth users (the 2026-05-24 note recorded 0 — likely real early sign-ups or leftover test accounts). |
| 2026-06-10 | **Full audit + 4 production bugs fixed (commit pending verification).** (1) **SW stale builds:** `public/sw.js` was cache-first for everything incl. `app.html` + hashed bundles — returning users ran old code indefinitely (caught live: a June-7 bundle served on June 10 over a fresh dist). Rewritten: network-first for HTML/navigations, cache-first for `/assets/*`, SWR for other same-origin GETs, non-GET/cross-origin passthrough; `register-sw.js` adds `updateViaCache:'none'`. Verified: post-fix, every new build is picked up in ONE reload. (2) **Remount-on-focus:** supabase-js v2 re-emits SIGNED_IN on tab focus; AuthGate re-ran reconcileAndReady → sessionKey bump → full AppInner remount (onboarding wizard reset to step 0 — reproduced; overlays closed; "Loading your farm…" flash). Fixed with `reconciledFor` ref deduping by user id. Verified: wizard survives focus churn. (3) **Onboarding ghost plots:** wizard wrote `cropName/plantedDate/zoneId/plants` (no `status`); canonical schema is `crop/plantDate/zone/plantCount/qty/measureType/status` — no consumer matched, so first-time users' plants generated zero tasks/growth/yield. **Both real users affected** (1 legacy plot each). Onboarding now emits canonical shape + sets starter `farmW/farmH` (was defaulting 100×60 m, rendering a 6 m² bed as a speck); new `migratePlotSchema` in migrations.js heals legacy plots, wired into all 3 chains (initData, focus-pull hydrate, import). Verified live: 3 legacy cloud plots → tasks/yield/rings populated after one reload. (4) **Dark-mode + polish:** `grdLight`/`grdWarm` were hardcoded light gradients (7 empty states unreadable in dark) → new `--grd-light`/`--grd-warm` tokens with dark variants; `.skeleton` tokenized (`--skeleton-base/sheen`); `nav button:hover !important` no longer washes out the active item (scoped `:not([aria-current="page"])`, `aria-current` added to all 3 nav variants — also an a11y win); Safari export-download fix (revokeObjectURL delayed 1.5 s); TodayScreen "Tasks 0/N" relabeled "Steps" (it counts grow-guide steps). **Multi-account leak guard re-verified clean** on current code via adversarial seeded-localStorage signup (the leak observed this session ran on the stale pre-fix bundle; one contaminated row created under a throwaway test user, deleted after audit along with both test accounts). **Also closed:** Phase 6 open item — sync indicator confirmed on-screen ("Synced") in a live signed-in session. **Incidental:** local clone moved to `/Users/dervis/Documents/Documents - MacBook Pro (3)/Claude/Projects/Farming project/homestead` (macOS-update iCloud reshuffle); bundle now 1,240 kB (code-split still a follow-up). |
| 2026-06-11 | **Phase 7 iOS scaffold shipped.** Toolchain now macOS 26.5.1 + Xcode 26.5 with the iOS 26.5 SDK + simulator runtime installed (`xcodebuild -downloadPlatform iOS`, ~7.9 GB). `npx cap add ios` (Capacitor 8, SPM-based — no CocoaPods) scaffolded `ios/`; native build verified `** BUILD SUCCEEDED **` on the iphonesimulator SDK (`CODE_SIGNING_ALLOWED=NO`). Commit `25c2668` staged exactly package.json, package-lock.json, capacitor.config.json, ios/ (22 files); the two stray `public/zones/` cooking-class posters were left untracked. Pushed → Vercel `dpl_4WsbQGtHtpwPGhQVk6ooyuA23qBQ` READY; live `/app` 200 + bundle `index-B3HgLi1B.js`, landing intact at `/` (web build unaffected). `appId: app.myterra` is a PLACEHOLDER — NOT registered with Apple. **App Store work PAUSED** — no paid Apple Developer account yet (a hard gate), and the app is still in active development. The app has only been *built* for the simulator, not yet *run* on a device/simulator. (Repo path was already recorded in the 2026-06-10 entry.) |
| 2026-06-11 | **`/etc/hosts` Apple blocks on this ex-corporate Mac.** A `0.0.0.0 gdmf.apple.com` line (Apple's software-update catalog) was blackholing Xcode's iOS-platform download. Only that line was removed (backup at `/etc/hosts.bak`). The three MDM/DEP enrollment blackholes — `deviceenrollment.apple.com`, `mdmenrollment.apple.com`, `iprofiles.apple.com` — were deliberately KEPT; they keep this ex-corporate Mac out of the previous owner's device management. Verified the Mac is NOT currently DEP/MDM-enrolled (`profiles status -type enrollment` → both No). **Do not remove those three lines.** Permanent fix = the old company releasing the device from Apple Business Manager (needs their cooperation). |
| 2026-07-13 | **8.4 SHIPPED (Dervis):** domain `myterra.farm` purchased on Porkbun, DNS pointed at Vercel (A `@`→216.198.79.1, CNAME `www`→93b2921e45492488.vercel-dns-017.com.), live + SSL verified. Paddle account created, 3 products + prices created: Basic `pri_01kxdcntw2905t5fky81fy8cp0` $4.99/mo, Pro `pri_01kxdcqpgjd5z1qrpd6hxgmxr2` $9.99/mo, Lifetime `pri_01kxdcrgmy4jnxycc4h9fa2jsp` $190 one-time (initially mis-entered $179, corrected same session). Basic's zone cap decided: veggie garden + house + pond + coop only; Pro/Lifetime get orchard, herb garden, greenhouse, all features (not yet enforced in code — still needs the zone-count gate flagged open since 8.2). **8.5 SHIPPED same session:** `Paywall.jsx` — real Paddle.js v2 checkout (`PADDLE_ENABLED=true`), price-ID map, `openPaddleCheckout()` loads Paddle.js, gets the signed-in user via `supabase.auth.getUser()`, opens the overlay with `customData:{user_id}` for webhook attribution. `supabase/functions/paddle-webhook/index.ts` deployed (v2, `verify_jwt=false`) — HMAC-SHA256 verifies `Paddle-Signature` (timing-safe compare), updates `profiles.tier/subscription_status/current_period_end/paddle_customer_id/paddle_subscription_id` via service_role on `subscription.created/updated/canceled` + `transaction.completed` (Lifetime one-time). Webhook destination registered in Paddle, `PADDLE_WEBHOOK_SECRET` set as an Edge Function secret. **Bug caught before Dervis hit it live:** the pre-launch CSP (from the 2026-07-11 hardening pass) didn't allow-list any Paddle domain — `cdn.paddle.com` would have been silently blocked from loading and the overlay iframe (`buy.paddle.com`) would have been blocked from framing. Fixed in the same commit (`script-src` +cdn.paddle.com, `connect-src` +*.paddle.com, new `frame-src buy.paddle.com`) and reverified live via response headers. **Both deploys verified live:** eslint clean, `vite build` clean, bundle grepped for all 5 markers (client token, 3 price IDs, cdn.paddle.com) each exactly once, old "Checkout coming soon" string confirmed gone. Webhook mechanically tested both directions with hand-signed HMAC payloads: valid signature → 200 `{"ok":true}`; forged signature → 401 `{"error":"invalid signature"}`. **NOT yet verified — needs a human click-through:** no real signed-in user has opened the live overlay or completed an actual Paddle transaction yet. **Still blocking real revenue:** Paddle's separate **website/domain approval** (distinct from the account verification already done) has not been submitted for `myterra.farm` — Dervis action. Zone-count gating for Basic and the "analytics" feature definition (flagged open since 8.2) also still unenforced in code. |

