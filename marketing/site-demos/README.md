# Website demo videos (Balcony, Backyard, Farm) and the hero loop

Makes the three demo videos on the homepage and the looping farm shot behind the
headline. Everything is filmed from the real app, frame by frame, so the picture
is steady however slowly the machine draws the 3D map.

Runs in a Linux container (needs Node, Playwright, Chrome, Python 3 with Pillow,
ffmpeg, the Inter font at `/usr/share/fonts/opentype/inter/`). It does not run
on the Mac as it is. `npm i playwright` first (or set `NODE_PATH` to where it is
installed); set `CHROME` if Chrome is not at `/usr/bin/google-chrome`. `logo.png` is
`public/favicon.svg` at 264 px (`rsvg-convert -w 264`).

## How it works

1. **The app runs locally** with no Supabase keys, so there is no sign-in:
   `npx vite --port 5179 --host 127.0.0.1 --strictPort` from the repo root.
2. **`seed.js` + `specs.js` build the three demo gardens** inside the page with
   the app's own code (planting planner, yields, pantry, garden memory), so every
   record has the shape the app itself writes. `mk.js` then opens each garden
   once so the app awards its badges and stores the forecast, and saves it to
   `states/<env>.json`.
3. **`rec2.js` is the recorder.** The page clock is frozen. Each frame moves it
   on 1/30 s, steps CSS animations by the same amount and takes a screenshot.
   Open-Meteo is answered from a fixed, mild week (`weather: 'heat'` adds a 31°C
   Monday). Taps, typing, scrolls and drags are logged with their frame numbers.
4. **`demo_<env>.js` is the script of one demo**: takes (a fresh onboarding, a
   saved garden) and chapters. `cam(true/false)` starts and stops the camera;
   everything else runs off camera.
5. **`record.js <env>`** films it into `frames/<env>/`. Add `rehearse` to run the
   same script off camera and keep a still after every tap (fast: use it first).
6. **`compose.py <env>`** edits the film: 720x1280, the phone screen with the
   caption above it (`captions.json`), a tap marker from the logged taps, a short
   dissolve at chapter changes, an end card. One encoded file per chapter, joined
   with ffmpeg's concat demuxer. Writes `out/<env>-master.mp4` and
   `out/<env>-chapters.json` (chapter start times).
7. **`encode.sh <env>`** makes the web copies: `demo-<env>.mp4`, `.webm` and
   `-poster.webp` in `out/web/`.
8. **`hero.js h|v` + `hero_compose.sh h|v`** film and loop the hero shot: one slow
   push-in on the farm's full-screen map with the buttons hidden; the last second
   dissolves into the first.
9. **`build_landing.py out`** made the homepage change: it rewrites
   `public/landing.html` and `public/landing.js` from the page as it was at commit
   46dbacc (before the demos), with the chapter times from step 6. Edits made to
   the page after that are NOT carried over. After a re-record, the safe route is
   to update the `data-t` chapter times (and the seconds in `.size`) in
   `public/landing.html` by hand from `out/<env>-chapters.json`.
10. **`stills.js <shot> [scroll]`** takes one phone-size still of the real app for the
   "Why MyTerra" cards on the homepage (`jobs`, `map`, `frost`, `animals`, ...) into
   `out/stills/`. The `frost` shot needs a May garden: `node mk.js backyard 2027-05-06`
   and keep the result as `states/backyard_may.json` (mk.js writes `states/backyard.json`,
   so copy the June one aside first). The cards use 780x1080 crops saved as
   `public/landing/why-*.webp` at 720x997.
11. **`verify_site.js <url> <prefix>`** checks the page at desktop and phone size:
   hero loop, each demo plays in view, the last-chapter jump, pause carries over
   between tabs, the hero button, reduced motion, failed requests, console errors.
   Use it on `vite preview` after `npm run build`, then on the live site.

## Make everything again

```
npx vite --port 5179 --host 127.0.0.1 --strictPort &     # repo root
cd marketing/site-demos
for e in balcony backyard farm; do node mk.js $e; done
for e in balcony backyard farm; do node record.js $e rehearse; done   # look at rehearse/<env>/
for e in balcony backyard farm; do node record.js $e && python3 compose.py $e && ./encode.sh $e; done
for f in h v; do node hero.js $f 390 && ./hero_compose.sh $f; done
cp out/web/* ../../public/landing/          # then update the data-t times in public/landing.html
cd ../.. && npm run build && npx vite preview --port 4179 --host 127.0.0.1 --strictPort &
node marketing/site-demos/verify_site.js http://127.0.0.1:4179/ /tmp/check
```

Recording takes about 10 minutes per demo without a graphics card (0.2 s per
frame on flat screens, about 1 s on the 3D map).

## Rules the films follow

- Only what the live app does, with the numbers the app shows. Captions describe
  what is on screen in that chapter.
- One feature per chapter, six chapters, 48 to 51 seconds. Every caption stays up
  for at least five seconds.
- The hero loop is one slow push-in, 12 seconds, with a one-second dissolve back to
  the start. No back-and-forth camera.
- A visible tap marker for every tap. No zoom punches, no shake.
- Demo gardens, never customer data.
