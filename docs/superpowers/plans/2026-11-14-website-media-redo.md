# Website media redo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every film and still on myterra.farm with footage of the map-first app, and rebuild the page around one "first minute" film, nine short loops and eight stills.

**Architecture:** The frame-by-frame recorder in `marketing/site-demos/` films the real app (frozen clock, mocked forecast, seeded demo gardens). Python + ffmpeg turn frames into web files in `public/landing/`. `public/landing.html` and `public/landing.js` are edited by hand.

**Tech Stack:** Node 22, Playwright + Chrome (software GL), Python 3 + Pillow, ffmpeg (libx264, libvpx-vp9, libwebp), Vite 8.

**Spec:** `docs/superpowers/specs/2026-11-14-website-media-redo-design.md`

## Status — 14 November 2026, 13:00

Recording was stopped by Dervis the same day: he is changing visuals in the app, so no film, clip or still is to be
made until he says the app is ready. Done so far, on branch `website-media-redo` (not pushed, not on `main`):

- [x] Task 1 — app fix (growth panel and its date on phones). Commit `Growth preview on phones…`. Old pantry-icon bug: already fixed.
- [x] Task 2 — pipeline runs in place; `finger.py`; demo gardens build with the 14 Nov app (states are not in git: run `mk.js`).
- [~] Task 3 — `first_minute.js` rehearsed start to finish and works (setup → map → lettuce, plan for today → job → "Day done!"). Not filmed.
- [~] Task 4 — `record_loop.js`, `loops_compose.py` written; `loops.js` is a DRAFT, not rehearsed.
- [~] Task 5 — `hero.js`, `hero_compose.py` DRAFT, not run.
- [~] Task 6 — `stills.js` shot list DRAFT, `stills_web.py` written, not run.
- [x] Task 7 — the page, built and tested with stand-ins (`placeholders.sh`). Old media removed from the branch.
- [x] Task 8 — `verify_site.js` and `check_media.py`: on the built site every check passes except the FILM-SECONDS
  token, which `apply_times.py` fills once the film exists.
- [ ] Task 9 — show, then ship.

Still to do at media time, besides recording: rewrite the `alt` text of the nine stills in `landing.html` to describe
the new pictures; re-check each clip's line on the page against what the clip shows.

## Global Constraints

- Only what the live app does, with the numbers the app shows. Demo gardens, never customer data.
- No "only app" claims, no competitor names, no invented reviews or user counts.
- Muted, looping, inline video: MP4 (H.264) + WebM (VP9) + WebP poster. No GIF. No sound.
- Nothing under `/landing/` is fetched before its section is near the screen (hero excepted).
- Reduced motion or data saver: posters and a play button, nothing autoplays.
- Sizes: loop ≤ 600 kB (MP4), film ≤ 2.5 MB, hero ≤ 1.6 MB per copy, all landing media < 15 MB.
- A visible tap marker for every tap. No zoom punches, no shake.
- Balcony first: first film, first tab.
- Nothing reaches `main` before Dervis has seen the page and said go.
- App fixes are separate commits from website commits. One feature per commit.

## Review Focus

1. A loop whose last frame differs from its first: the restart must not jump (compose cross-fades the tail into the head).
2. A phone on data saver / Low Power Mode: autoplay refused → poster and play button must be there and work.
3. Three loops playing at once on a slow desktop: loops off screen and in hidden tabs must be paused.
4. A visitor arriving on an old link (`#how`, `#tour`, `#spaces`, `#demo`): anchors still land on a section.
5. Narrow phones (320 px): the loop row must swipe, not overflow sideways.

Each is a check in `verify_site.js` (Task 8).

## Files

| File | Job |
|---|---|
| `src/features/home/home-v2.css` (+ test) | growth panel no longer under the Next-job card |
| `marketing/site-demos/package.json` | `{"type":"commonjs"}` so scripts run in place |
| `marketing/site-demos/finger.py` | tap-marker maths and drawing, shared (moved out of `compose.py`) |
| `marketing/site-demos/first_minute.js` | the film's script (replaces `demo_*.js`) |
| `marketing/site-demos/loops.js` | nine loops: `{ id, state, time, weather, run(r,p) }` |
| `marketing/site-demos/record_loop.js` | `node record_loop.js <id> [rehearse]` → `frames/loop-<id>/` |
| `marketing/site-demos/loops_compose.py` | frames → 540×960 master with tap marker and tail→head fade; web copies |
| `marketing/site-demos/hero.js`, `hero_compose.sh` | three spaces, dissolves, `hero5-{h,v}` |
| `marketing/site-demos/stills.js` | eight shots for the current app |
| `marketing/site-demos/verify_site.js` | checks for the new page |
| `public/landing.html`, `public/landing.js` | new sections and players |
| `public/landing/*` | new media in, `demo-*`, `hero4-*`, `p4-*`, `why-*` out |
| deleted | `demo_balcony.js`, `demo_backyard.js`, `demo_farm.js`, `build_landing.py` |

## Tasks

### Task 1: App fix — growth panel vs Next-job card
- [ ] Reproduce at 390 px (seeded balcony, open Growth): legend row hidden behind `.hv2-next`.
- [ ] Fix in CSS/JSX so the whole panel is visible (hide the Next-job card while the growth panel is open).
- [ ] Check the two bugs seen on 12 Nov (preview date chip; pantry icons for Honey, Eggs, Goat Milk); fix those still present.
- [ ] `npm test`, ESLint on touched files, `npm run build`. Screenshot before/after. Commit.

### Task 2: Pipeline runs in place; demo gardens
- [ ] Add `package.json`; move `Finger`/`draw_finger` to `finger.py`; `compose.py` imports it.
- [ ] `node mk.js balcony|backyard|farm` and `node mk.js backyard 2027-05-06` → `states/backyard_may.json`.
- [ ] Open each garden at 390 px: home draws, badges present, no console errors. Commit.

### Task 3: "Your first minute" film
- [ ] `first_minute.js`: four chapters `setup`, `map`, `plant`, `job`; captions per the spec table in `captions.json` under key `first`.
- [ ] Rehearse; look at every still; fix taps. Record. `compose.py first`. Encode to `first-minute.{mp4,webm}`, `first-minute-poster.webp`.
- [ ] Watch the result (contact sheet of frames every 1 s + size check ≤ 2.5 MB).

### Task 4: Nine loops
- [ ] `loops.js` ids: `b-jobs`, `b-growth`, `b-pots`, `y-build`, `y-eggs`, `y-frost`, `f-check`, `f-milk`, `f-orchard`.
- [ ] `record_loop.js` + `loops_compose.py` (tail→head fade 12 frames; 540×960; MP4 crf tuned to ≤ 600 kB; WebM; poster = frame 0).
- [ ] Rehearse each; where the app does not do what the line says, change the line or the loop and note it.
- [ ] Record, compose, contact-sheet check for each.

### Task 5: Hero loop
- [ ] `hero.js <h|v>`: 4 s push-in per space (balcony, backyard, farm), controls hidden; `hero_compose.sh` cross-fades the three and the loop point. Output `hero5-{h,v}.{mp4,webm,webp}`.

### Task 6: Stills
- [ ] `stills.js` shots `why-jobs`, `why-map`, `why-frost`, `why-all`, `kh-guide`, `kh-calendar`, `kh-learn`, `kh-ask` → 720-wide WebP in `public/landing/`.

### Task 7: The page
- [ ] `landing.html`: sections per the spec sketch; `#how`, `#tour`, `#spaces`, `#demo` anchors kept; copy fixes for the one-screen setup; remove "How it works".
- [ ] `landing.js`: film player (existing chapter logic, one film), loop players (play in view, pause off screen / hidden tab, poster + play on reduced motion), tabs.
- [ ] Remove old media; `npm run build`.

### Task 8: Verify
- [ ] `verify_site.js` for the new page incl. the five Review Focus checks; run on `vite preview` at 1440×900, 390×844, 320 px, reduced motion.
- [ ] Screenshots of every section at desktop and phone size, looked at.

### Task 9: Show, then ship
- [ ] Send Dervis the films and page screenshots. Wait for go.
- [ ] Bundle → Mac repo → push → Vercel READY → live files byte-identical → `verify_site.js` on www.myterra.farm.
- [ ] Project doc `claude/website-media-redo-2026-11-14.md`; LAUNCH_PLAN entry.
