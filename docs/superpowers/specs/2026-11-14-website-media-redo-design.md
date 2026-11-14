# Website media redo for the map-first app — design

Date: 2026-11-14. Status: waiting for Dervis's approval.
Approach picked by Dervis: "2" — rebuild the page around the new media.

## Why

Every film and still on myterra.farm was made on or before 12 Nov 15:24 (commit `bddde99`).
The map-first game home, the one-screen setup, the dock with the + fan, build mode on the map
and the farm check all shipped after that. The site shows an app that no longer exists.

Dervis's brief: redo the videos and images; make them easy to follow; show the first steps;
sell to millennials; promote the extra features and how simple it is to grow vegetables on a
balcony, in a backyard or on a small farm. Gifs or videos, whichever is best for a site that
should still look right in 2027.

## Who it is for, and what that means for the page

Millennials are 31 to 46 in 2027. What we know and how the page answers it:

| Trait | Evidence | What the page does |
|---|---|---|
| They want it simple | UK survey: 84 % of millennials look for simplicity in gardening (older survey, 2019) | The first film is "three taps to your map". Every caption is one short line. |
| They are the keenest group | Axiom 2026 study: millennials lead on time spent gardening (66.7 %) and on plans to spend more (63.9 %) | No need to sell gardening. Sell that this makes it work. |
| Phone first, sound off | Standard advice for 2026: muted, captioned, 8–15 s loops | Portrait clips, short loops, text on the page, nothing needs sound. |
| They distrust adverts | — (our own call) | Real app footage only, labelled so. "Try it now — no sign-up" beside every film. No invented reviews or user counts. |
| They grew up on farm games | — (our own call; the app's tagline already says it) | Lead with the game feel: map, badges, the + fan, streak, "Day done". |
| Small spaces | Dervis expects most users on a balcony | Balcony is first everywhere: first film, first tab. |
| They watch grocery prices | 2026 US survey: 57 % say growing food saves money | One line in copy ("food you grew, not bought"). No savings numbers we cannot back. |
| Hens are a millennial thing | 2026 homesteading report: millennials lead on backyard chickens | The backyard tab has an eggs loop. |
| Afraid of killing plants | — (our own call) | "It only offers what really grows in your space" and "it tells you what to do today". |

Surveys are US and UK; the primary market is wider (Western Europe, US, Canada). They guide
tone, they are not quoted on the page.

## Goals

- All media on the page come from the app as it is today.
- A visitor understands the first minute of using the app without reading a paragraph.
- Each space (balcony, backyard, farm) shows what is special for it, in clips short enough to
  be watched.
- The page is no heavier than today (23 MB of media now; target under 15 MB, and nothing
  loads until it is near the screen).

## Not in this work

- A new visual identity, logo, colours or pricing.
- Sound, voiceover, music.
- TikTok cuts of the same footage.
- Testimonials, user counts, press logos (there are none to show honestly).

## What would make it a failure

- Footage that is rushed, shaky or hard to follow (the complaint about the October video).
- Anything on film that the live app does not do, or numbers the app does not show.
- "Only app that…" claims or competitor names (rule from 12 Nov).
- A page that loads slower than today's, or video that plays with sound.

## Approaches considered

1. **Media swap only.** Same sections, re-record the three 48-second films, re-shoot the
   stills. Fastest. Keeps three long films, which is the wrong shape for this audience.
2. **Rebuild the page around the new media (picked).** One "first minute" film, short loops
   per space, fresh stills elsewhere.
3. **Whole new site.** New look and copy from scratch. Most work; the look is not the problem.

## Format: looping video, not GIF

Muted, looping, inline MP4 (H.264) with a WebM (VP9) copy and a WebP poster. A GIF of the
same clip is several times heavier, limited to 256 colours and cannot be paused. Loops start
when they scroll into view and stop when they leave. With "reduce motion" or data saver on,
the visitor gets the poster and a play button. This is what the page already does for the
current films; the code in `public/landing.js` is kept and extended.

## The page, top to bottom

```
1 HERO            Everyone can be a farmer.           [Try it now — no sign-up]
                  background loop: balcony → backyard → farm, 12 s

2 YOUR FIRST      one film, ~35 s, balcony, 4 parts   | 1 Pick your space
  MINUTE          (phone picture + caption above it)  | 2 Your balcony appears in 3D
                                                      | 3 Plant your first crop
                                                      | 4 Tick your first job
                                                      [Try it now — no sign-up]

3 PICK YOUR SPACE [Balcony] [Backyard] [Farm]
                  three loops per tab, 6–10 s each, one line of text under each
                  desktop: three phones in a row · phone: swipe

4 WHY MYTERRA     the four cards from 12 Nov, same text, new stills

5 KNOW-HOW        counts row + four new stills (guide, calendar, Learn, Ask)

6 PRICING         unchanged
7 FAQ             unchanged, except answers that describe the old setup
8 FINAL CTA       unchanged
```

Removed: the "How it works" section with four stills. The first-minute film and its part
list say the same thing, with the real screens. Its anchor (`#how`) points at section 2.

### 1. Hero loop

One 12-second loop, filmed on the full-screen map with the controls hidden: a slow push-in
on the balcony, dissolve to the backyard, dissolve to the farm, dissolve back to the start.
Four seconds each. It says "any size" before a word is read. No rocking, no orbit.
Landscape and portrait copies as today (`hero5-h`, `hero5-v`). Headline, sub-line and the two
floating chips stay; the chips' text is checked against the current app.

### 2. "Your first minute" film

Balcony, a new visitor, simulated date in April 2027 so the "plant now" list is full.
About 35 seconds, portrait 720×1280, caption above the phone picture, visible tap marker,
part list beside it that follows the film and jumps to a part (the player that exists today).

| Part | On screen | Caption |
|---|---|---|
| 1 Pick your space | Setup card: Balcony, Medium, Create my starter map | Three taps. No account. |
| 2 Your balcony appears in 3D | Map draws; the cue "Tap here to plant your first crop" | Your space, drawn for you. |
| 3 Plant your first crop | Crop list (plant now) → Lettuce → "8 plants · 1 row" → Save → lettuce on the map | It works out how many fit. |
| 4 Tick your first job | Jobs chip → the job → tick → done | It tells you what to do today. |

Part 4 needs a job on day one. A crop saved as "already sown" has none that day ("Nothing
due"). The film uses the path that gives a real first job (a planting planned for today, so
the job is "Sow lettuce"). Whatever is filmed is what a new user gets by the same taps.

### 3. Pick your space: nine loops

Each loop shows one thing, 6 to 10 seconds, starts and ends on the same picture so the loop
is clean. Portrait, encoded at 540×960. No caption burnt in; the line of text is on the page
(sharper, readable by screen readers and search engines). Tap marker on every tap.
Gardens are the demo gardens (seeded with the app's own code), simulated date late June 2027.
The frost loop uses the same backyard in early May with a frosty week in the mocked forecast.

| Tab | Loop | Line under it |
|---|---|---|
| Balcony | Tap a planter badge, water, harvest strawberries | Each pot has its own jobs. |
| Balcony | Growth preview: today → +1 month → +2 months | Watch it grow before you plant. |
| Balcony | Plant a crop: the list offers pot crops only | Only what really grows in pots. |
| Backyard | + → Build → drag a raised bed onto the lawn | Lay it out like a game. |
| Backyard | Coop badge → collect eggs → pantry count goes up | Eggs, counted into your pantry. |
| Backyard | Weather capsule → the week → frost warning with the beds to cover | Weather that knows what you grow. |
| Farm | Farm check: the camera moves from job to job | A morning round, one stop at a time. |
| Farm | Milk the goats → pantry → sell → Money | From the goat to the ledger. |
| Farm | Orchard: pick cherries, trees stay for next year | Trees that crop every year. |

The exact taps are settled in rehearsal against the live app. If a loop cannot be filmed
honestly (the app does not do it the way the line says), the line changes or the loop is
replaced. The table is the plan, not a promise of wording.

### 4 and 5. Stills

Eight phone-size stills of the current app, made with `stills.js`: four for the Why cards
(jobs list, living map, frost warning, pantry and money) and four for know-how (crop guide,
calendar, Learn with the real crop pictures, Ask). Card text stays as approved on 12 Nov
unless it describes a screen that changed.

## Copy

Plain, warm, short. "You", not "users". Numbers only as the app shows them. Section text
that still describes the old twelve-question setup ("how sunny, how much time you have") is
rewritten to the one-screen setup. Label kept under the films: "Real app footage. Demo
gardens, not customer data."

## App fixes needed before filming

Small, each its own commit, because the camera would show them:

1. On a phone the growth-preview panel's legend sits behind the "Next job" card
   (`.hv2-next` over `.g3-time`). Found today at 390 px.
2. Check whether the two bugs seen in the 12 Nov films are still there (growth-preview date
   chip behind the area selector; empty pantry icons for Honey, Eggs, Goat Milk). Fix what is.

Anything larger found while filming is reported, not fixed in this work.

## How it is built

- Recording pipeline in `marketing/site-demos/` is reused: frozen clock, frame by frame, mocked
  Open-Meteo, demo gardens from `seed.js` + `specs.js`. Checked today: it starts against the
  current app, `mk.js balcony` builds the garden, the new home and setup are reachable.
- New: `first_minute.js` (the film), `loops.js` (the nine loops, one function each),
  a loop mode in `compose.py` (no caption band, 540×960, last frame = first frame),
  `hero.js` extended to three spaces. `demo_*.js` for the old 48-second films are deleted.
- The scripts are CommonJS and the repo is `"type": "module"`: add
  `marketing/site-demos/package.json` with `{"type":"commonjs"}` so they run in place.
- `public/landing.html` and `public/landing.js` are edited by hand. `build_landing.py` is
  out of date and is deleted.
- Old files removed from `public/landing/`: `demo-*`, `hero4-*`, `p4-*`, `why-*` once
  nothing links to them.
- Encoding targets: loops ≤ 600 kB each (MP4), film ≤ 2.5 MB, hero ≤ 1.6 MB per copy.

## Checks before it goes live

- `verify_site.js` updated for the new players, run on the built site at 1440×900 and
  390×844: hero plays, the film plays in view, part jumps work, each tab's loops play and
  stop off screen, reduced motion shows posters, no failed requests, no console errors.
- Every clip watched start to finish by Claude at full size before it is used.
- `npm test`, `npm run build`, ESLint for the app fixes.
- Dervis sees the finished page (screenshots and the films in chat; a preview link if Vercel
  gives one for a branch) and says go before anything reaches `main`.
- After deploy: deployment READY, live HTML and every `/landing/` file byte-identical to the
  repo, security headers present, `verify_site.js` against www.myterra.farm.
- Not checkable from here: a real iPhone in Safari, Low Power Mode.

## Calls made by Claude (not asked)

- Headline "Everyone can be a farmer." stays.
- "Go live in 2027" read as: built to current best practice, demo dates in 2027.
- Why cards and know-how use stills, not loops: eleven moving clips on one page is enough.
- The first-minute film is on a balcony, not shown three times for three spaces.
- "How it works" section removed (replaced by the film).
- Captions burnt into the film (it is watched on phones where the part list is below it);
  loops carry their text on the page.

## Left to the builder

Exact taps and timings, camera framing per loop, encoder settings, CSS of the loop row and
swipe, poster frames, alt text.
