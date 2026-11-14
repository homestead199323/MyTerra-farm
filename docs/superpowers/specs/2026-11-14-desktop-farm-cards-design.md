# Desktop farm cards and live table — design

Approved by Dervis on 14 Nov 2026 ("go", after the two-screen mockup; then "make it more blurred").
Mockup: Claude Design canvas "MyTerra desktop — farm cards on the map" (two artboards: home, editing).

## Why

The map-first home leaves the sides of a desktop screen empty. Dervis wants them filled with
frosted-glass panels in the style of two dispatch-dashboard references: KPI cards, a live table,
and a camera that goes to whatever is clicked. Desktop only. It must give desktop users more
information **and** look very good: useful numbers that are also eye-catching.

A farm changes over days, not seconds, so nothing here pretends to be live telemetry: no ticking
numbers, no "LIVE" badges, no speed charts. Every number comes from the user's own data.

## Goals

- Up to four cards down the left of the desktop home, each one big number plus one small visual.
- The user chooses the cards. The app suggests; the user decides. No cards at all is allowed.
- The docked jobs list becomes one tabbed panel: Jobs / Plantings / Animals.
- Clicking a card or a table row takes the camera there (or opens the matching screen).
- Panels are frosted glass: see-through and blurred, and still easy to read.

## Non-goals

- Phones and tablets: nothing changes below the desktop breakpoint.
- New data, new tracking, charts over time beyond what the Progress page already computes.
- A stage timeline in the crop panel — it already exists (`.g3-crop-track`).

## Anti-goals

- Cards that are empty or meaningless for the user's space (eggs offered to someone with no hens).
- Text that explains the feature. The cards must read at a glance (app copy rule, 11 Nov 2026).
- A heavier map. Blur must not make the desktop home slower on a machine that already struggles.

## When it shows

`desk` = wide stage (`useWideStage`, ≥ 1100 px) **and** viewport height ≥ 700 px, on the home map,
when nothing else owns the screen (`!quiet && !busy`, no build mode, no farm check). Below that the
home is exactly as today.

## Layout (1440 × 900 reference)

- **Top-left**: the weather + streak chip stays where it is.
- **Left column** (`left 12, top 72, width 272`): the cards, then an "Edit cards" button.
- **Right** (`top 12, right 12, width 364`): the tabbed panel, replacing the docked jobs list.
  It keeps the collapse button and the chip that re-opens it.
- **Bottom-left**: the map's own buttons (growth preview, show the farm) stay.
- **Crop details**: the rich crop panel opens top-left as today; while it is open the cards and
  the Edit button are hidden, and return when it closes (CSS `:has`).
- The map frames the farm in the space between the two columns: the home view gets a left inset
  as well as the existing right one, and a focused area is framed clear of both.
- Heights: the column shows as many of the chosen cards as fit above the map buttons
  (4 at ≥ 860 px tall, 3 below that).

## The cards

Eleven kinds. Each is a button; `available` says whether it can be offered for this farm.

| id | Label | Big number | Visual | Click | Offered when |
|---|---|---|---|---|---|
| `jobs` | Today's jobs | done "of N done" | ring | Jobs tab | always |
| `harvest` | Next harvest | days ("Ready" when due) + crop, area | crop art + progress bar | camera to that planting | something is growing |
| `rain` | Rain this week | mm over the next 7 days | 7 day bars | week's weather | a town is set and the forecast loaded |
| `picked` | Harvested | kg this month | last 6 months, bars | Progress | at least one harvest logged |
| `eggs` | Eggs | eggs in the last 7 days | 7 day bars | camera to the coop | the farm has laying birds |
| `growing` | Growing now | plantings in the ground | stage split bar | Plantings tab | something is planted |
| `money` | Money this year | net, with currency | earned vs spent bar | Money | any money entry |
| `cold` | Coldest night | lowest minimum in the forecast + day | 7 night bars | week's weather | forecast loaded |
| `pantry` | Pantry | products in stock | — | Pantry | anything in stock |
| `time` | Time this week | hours/minutes of jobs | 7 day bars | All tasks | always |
| `space` | Space planted | % of growing areas planted | fill bar | Crops | at least one growing area |

Streak is not a card: it is already in the top chip.

**Suggested set** (used until the user edits, and shown first in the picker): `jobs`, `harvest`,
`rain`, then `eggs` if there are laying birds, else `picked`, else `growing` — only kinds that are
`available`, at most four. Unavailable kinds are not offered in the picker at all.

**Editing**: "Edit cards" turns the column into edit mode — dashed outline, a remove button on each
card, drag to reorder (pointer drag; arrow keys move a focused card), a free-slot placeholder when
fewer than four, and a picker panel beside the column: "Suggested" first, then "More", each row
showing the card's current value and a + button. "Done" leaves edit mode. Removing all four is fine.

**Storage**: `data.deskCards` — an array of ids, saved with the farm (so it follows the account).
`undefined` means "never edited": the suggested set is computed live. Unknown ids are ignored.

## The tabbed panel

- **Jobs**: today's list exactly as now (rows, Farm check button, starter kit, reminders prompt,
  "All tasks"). Count on the tab = jobs left today.
- **Plantings**: one row per planting in the ground, soonest harvest first — crop art, name,
  area, stage (dot + word), days to harvest ("Ready" when due). Click: the camera goes to it and
  its crop panel opens (`engine.pickPlot`); a planting with no row on the map falls back to its area.
  Footer: "All crops".
- **Animals**: one row per group — art, name or species, count, where they live. Click: camera to
  that area. Footer: "All animals". The tab is hidden when the farm has no animals.
- The selected row stays highlighted until something else is picked.
- The chosen tab is remembered on the device (`mt_desk_tab`).

## Glass

On `desk`, every floating control on the home (chip, cards, picker, tabbed panel, dock, the map's
labelled buttons, the rich crop panel) uses one frosted recipe: card colour at 58 % over
`backdrop-filter: blur(22px) saturate(1.5)`, a light edge, and darker secondary text so labels keep
contrast. Dark theme uses the dark card colour the same way.

Fallbacks to a solid 92 % panel with no blur: `prefers-reduced-transparency`, no `backdrop-filter`
support, and any device where the map has had to lower its own sharpness because it ran slow
(`mt_g3_ratio` stored, or the `mt-map-slow` event during the visit).

## Approaches considered

1. **Panels inside the 3D scene** (drawn on the canvas). Rejected: text would not be crisp, no
   native buttons, and it re-does what HTML already does well.
2. **A second panel for the table under the jobs list** (as in the references). Rejected: two
   stacked panels on the right crowd a laptop screen, and the jobs list already lives there.
3. **Chosen: HTML panels over the map** — a left card column and the existing right panel turned
   into tabs. Reuses the jobs list, the crop panel and the camera API; the only map change is one
   more inset and one more engine call.

## Parts

- `src/features/home/desk-model.js` — pure: card catalogue, suggested set, add/remove/move,
  per-card values, planting rows, animal rows. Unit tested (`tests/desk-model.test.js`).
- `src/features/home/DeskCards.jsx` — the column, edit mode, picker.
- `src/features/home/DeskPanel.jsx` — the tabs; takes the existing jobs list as its Jobs body.
- `src/features/home/desk.css` — both, plus the frosted recipe.
- `HomeV2.jsx` — decides `desk`, mounts both, passes the map its left inset, sets `body.mt-desk`.
- `Grove3D.jsx` / `GroveScene.jsx` — `homeLeft`, `engine.pickPlot(plotId)`, `mt-map-slow` event.
- `cover.js` — side bars count when framing a focused area.

## Left to the builder

Exact pixel values, animation timings, the small visuals' drawing, and the wording of sub-lines,
within the app's existing look (`--hv2-*` tokens) and copy rules.
