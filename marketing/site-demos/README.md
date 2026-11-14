# Website films, clips and stills (homepage)

Everything that moves or shows the app on myterra.farm is made here, from the real app, frame by frame, so
the picture is steady however slowly the machine draws the 3D map.

| On the page | Files in `public/landing/` | Made by |
|---|---|---|
| Hero background loop (balcony → backyard → farm) | `hero5-{h,v}.{mp4,webm,webp}` | `hero.js`, `hero_compose.py` |
| "Your first minute" film, 4 parts | `first-minute.{mp4,webm}`, `first-minute-poster.webp` | `first_minute.js`, `record.js`, `compose.py`, `encode.sh`, `apply_times.py` |
| Nine clips, three per space | `loop-<id>.{mp4,webm}`, `loop-<id>-poster.webp` | `loops.js`, `record_loop.js`, `loops_compose.py` |
| Nine stills (hero phone, Why cards, know-how) | `s5-*.webp` | `stills.js` |

Runs in a Linux container (Node, Playwright, Chrome, Python 3 with Pillow, ffmpeg, the Inter font at
`/usr/share/fonts/opentype/inter/`). It does not run on the Mac as it is. Set `NODE_PATH` to where Playwright
is installed (`export NODE_PATH=$(npm root -g)`), and `CHROME` if Chrome is not at `/usr/bin/google-chrome`.
The scripts are CommonJS; `package.json` here says so (the repo itself is ES modules).

## How it works

1. **The app runs locally** with no Supabase keys, so there is no sign-in:
   `npx vite --port 5179 --host 127.0.0.1 --strictPort` from the repo root.
2. **`seed.js` + `specs.js` build the three demo gardens** inside the page with the app's own code (planting
   planner, yields, pantry, garden memory). `mk.js <env> [date]` opens each garden once so the app awards its
   badges and stores the forecast, and saves it to `states/<env>.json`.
3. **`rec2.js` is the recorder.** The page clock is frozen. Each frame moves it on 1/30 s, steps CSS
   animations by the same amount and takes a screenshot. Open-Meteo is answered from a fixed, mild week
   (`weather: 'frost'` or `'heat'` changes it). Taps, typing, scrolls and drags are logged with their frames.
4. **The film**: `first_minute.js` is its script (one take, four chapters; `cam(true/false)` starts and stops
   the camera). `node record.js first_minute rehearse` runs it off camera and keeps a still after every tap:
   look at `rehearse/first_minute/` first (`python3 sheet.py rehearse/first_minute/take1` makes one sheet).
   `node record.js first_minute` films it, `python3 compose.py first_minute` edits it (720x1280, caption from
   `captions.json` above the phone picture, tap marker, end card), `./encode.sh` makes the web copies and
   `python3 apply_times.py` writes the chapter times and the length into `public/landing.html`.
5. **The clips**: one entry per clip in `loops.js` (`id`, saved garden, date, what to tap). 
   `node record_loop.js <id> rehearse`, then `node record_loop.js <id>` and `python3 loops_compose.py <id>`.
   540x960, no caption (the line of text is on the page), tap marker drawn in, and the last half second
   dissolves into the first so the loop restarts without a jump.
6. **The hero**: `node hero.js h` and `node hero.js v`, then `python3 hero_compose.py h` and `v`.
7. **The stills**: `node stills.js <shot>` → `out/stills/`, then `python3 stills_web.py` → `out/web/s5-*.webp`.
8. Copy `out/web/*` to `public/landing/`, run **`python3 check_media.py`** (every file the page names exists,
   is not a stand-in, fits its size budget), then `npm run build`, `npx vite preview --port 4179` and
   **`node verify_site.js http://127.0.0.1:4179/ /tmp/check/v`**. After a deploy, run it on the live address.

## Where this stands (14 November 2026)

The page (`public/landing.html`, `public/landing.js`) is rebuilt for the new media and tested with stand-ins.
No real film, clip or still has been made yet: recording was paused the same day because the app's visuals
were being changed. `first_minute.js` was rehearsed start to finish against the 14 November app and worked.
`loops.js`, `hero.js` and the shot list in `stills.js` are drafts that have not been run. To finish: rebuild the
gardens (`mk.js`), rehearse and correct each script, record, then steps 4 to 8 below.

## Stand-ins

`./placeholders.sh` cuts stand-in files from the old (November 12) footage, stamped PLACEHOLDER, so the page
can be built and tested before the real films exist. They land in `public/landing/` and must never be
committed. `check_media.py` fails while any of them is still in place.

## Rules the films follow

- Only what the live app does, with the numbers the app shows. Text on the page describes what is on screen.
- One thing per clip, 6 to 10 seconds. The film: four parts, about 35 seconds, every caption up at least 5 s.
- The hero is slow push-ins with dissolves. No back-and-forth camera.
- A visible tap marker for every tap. No zoom punches, no shake.
- Demo gardens, never customer data. Simulated dates in 2027.
- Balcony first.
