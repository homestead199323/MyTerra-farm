# Brief: MyTerra 3D map — more detail, smoother on phones

Owner: Dervis (not a developer; judges by looking at it on his phone). Reviewer: Claude.
Read GEMINI.md first. Its rules apply (own branch, never `main`, stage files by name, no secrets).
Do NOT commit this brief file.

## 1. Goal
The 3D farm map (`src/features/grove/`) should look more detailed and "alive" AND run smoother on
phones. Most users open it on a mid-range phone. Smooth on a phone beats pretty on a laptop:
if a change makes phones slower, it is not an improvement.

## 2. How the map is built (read before planning)
- Plain Three.js 0.186 (WebGL2), NOT React Three Fiber. Engine: `Grove3D.jsx` (~2,000 lines);
  models: `toy.js`, `crops3d.js`, `animals3d.js`, `props3d.js`; light/time of day: `sky.js`
  (owns ALL light values, one preset per sun height); weather: `weather-fx.js`; colours: `palette.js`.
- Everything is procedural geometry + flat-colour materials. There are NO image textures in the
  3D scene today. The look is called "toy-v1" (`data-g3-style` on the canvas): soft, matte, clean.
- The 300 icons in `src/assets/toy/*.webp` are snapshots OF the 3D models, made by
  `scripts/render-icons.mjs`. If you change a model, re-render its icons with that script
  (see its header for how to run it). Never hand-paint or AI-generate replacement icons:
  they must match the map.
- A phone/desktop tier already exists: `mobile` / `coarse` flags and `DPR` / `LOW` pixel ratios
  in `Grove3D.jsx`. Build on it.

## 3. Lessons from the rejected attempt (branch gemini/3d-visual-quality — do not reuse it)
It was rejected after a side-by-side review. Do not repeat:
- Tilt-shift / depth-of-field blur: banned. Users must see their beds clearly; labels are sharp
  HTML over blurred ground, which looks broken.
- Fog moved closer (near ≈ camera distance): it washed out the whole farm. Keep fog where it is
  (`st.reset` in Grove3D.jsx: it starts beyond the farthest zoom-out).
- EffectComposer without a multisampled render target lost anti-aliasing: everything went
  fuzzy. Any post-processing must keep edges as sharp as today.
- `PCFSoftShadowMap` no longer exists in three 0.186 (falls back, logs a warning). Don't use it.
- Exposure raised in every `sky.js` preset made day washed out. Change light only per preset,
  with before/after shots of day AND dusk AND night.
- Post-processing ran on every phone. Heavy effects are desktop-only or off.
- +88 KB gzipped bundle for one dependency. See budgets below.

## 4. Baseline (measured 7 Nov 2026 on `main`, test farm `tests/g3-all.html?fixed=1`)
| | phone (`&coarse=1`, 390×844) | desktop (1200×900) |
|---|---|---|
| triangles per frame | 786,808 | 787,560 |
| draw calls | 180 | 180 |
| meshes / instanced meshes / instances | 210 / 55 / 2,100 | same |
| materials / shader programs | 115 / 27 | same |
| shadow map | 2048 | 3072 |
| Grove3D chunk (gzip) | 210 KB | |
Biggest finding: phones draw the SAME ~787k triangles as desktop. There is no detail reduction
for phones. That is the main efficiency win available.

How to measure (do this before and after every phase, same views):
- `npx vite --port 5179`, open `/tests/g3-all.html?fixed=1` (add `&coarse=1` for the phone tier;
  `?hour=20` = dusk/night; `?wx=rain` = weather). `window.__g3` is the engine state in dev:
  `__g3.renderer.info.render` gives calls/triangles after a render.
- Other harnesses in `tests/`: g3-balcony, g3-beds, g3-crops, g3-zoo, g3-task-feedback.
- Screenshots: Playwright with `--use-angle=swiftshader` (see `scripts/render-icons.mjs`).
  Software rendering times are NOT phone times: report counts (triangles, calls, bytes),
  not ms, as the proof of efficiency.

## 5. Budgets (hard limits; a phase that breaks one is not done)
Phone tier on the g3-all test farm:
- triangles ≤ 300,000 (from 787k) and draw calls ≤ 150 (from 180)
- shadow map ≤ 2048; pixel ratio rules unchanged unless you show it helps
- no full-screen post-processing on phones (no SSAO/N8AO, bloom, DoF, tilt-shift)
Desktop: triangles ≤ 900,000; any post-processing keeps MSAA-level edge sharpness.
All tiers:
- Grove3D chunk gzip ≤ 230 KB (today 210). No new npm dependency without asking first.
- Total new image/texture files ≤ 300 KB, all `.webp` (or KTX2 if you justify it).
- Zero new console warnings/errors. `npm run lint`, `npm test`, `NODE_ENV=development npm run build` pass.
- Nothing gets blurrier, foggier or darker at the default view. Labels, tap targets, pop-ups,
  growth preview slider and gestures behave exactly as before.

## 6. Where image generation helps (and where it doesn't)
Use your image-generation tool for:
- (a) STYLE FRAMES (Phase 0): target-look images of a small farm in the toy-v1 style, so Dervis
  approves a direction before any code changes.
- (b) Optional small TILING TEXTURES (Phase 3) for ground surfaces only: grass, soil, gravel,
  wood, roof tiles. Seamless, ≤ 256×256, subtle (detail, not photo-realism).
Do NOT use it for: the icons (they are rendered from the models), replacing the 3D scene with
pictures, or anything with text, logos or real brands. If you have no image-generation tool in
this session, say so at Phase 0 and stop.

## 7. Phases — one branch each, STOP after each phase and report. Never start the next phase until Dervis says "go".

### Phase 0 — Style frames (no code). Branch: none.
1. Screenshot the current map from `tests/g3-all.html?fixed=1` (desktop + `&coarse=1` phone).
   This is the reference: same farm, same camera angle.
2. Generate 3 directions of the SAME farm layout and camera angle, each one an evolution of
   toy-v1, not a new style: (A) "richer toy" — more variation in plant colours and sizes,
   grass tufts, soft contact shadows, slightly warmer light; (B) "storybook diorama" — gentle
   painted feel, softer palette, more props; (C) "crisp miniature" — cleaner shapes, stronger
   but soft shadows, clearer bed and row detail. Plus each direction at dusk.
   No blur, no fog wall, no text in the images.
3. Save to `docs/briefs/out/p0/` (do not commit) with a one-line note per image: what changes,
   and what it would cost to build (cheap / medium / expensive on phones).
4. Stop. Dervis picks a direction (or mixes). Everything after this aims at the approved frame.

### Phase 1 — Efficiency only, no visible change. Branch: `gemini/3d-p1-mobile-perf`
- Add a real phone detail tier: fewer segments for crops, trees, fences, animals and round
  shapes on phones; skip tiny props when zoomed out; reuse/merge identical materials (115 is
  too many); more instancing for repeated objects; merge static geometry where it cuts calls.
- Meet the phone budgets in §5. Desktop may keep today's detail.
- Proof: phone + desktop screenshots before/after that look the same at normal zoom, and the
  numbers table. Also re-run the icon renderer and confirm icons are unchanged
  (icons are rendered on the full-detail path; they must not use the phone tier).

### Phase 2 — Detail that is cheap. Branch: `gemini/3d-p2-detail`
Aim at the approved style frame, using cheap techniques first:
- per-instance colour and size variation (`InstancedMesh.instanceColor`, small random scale)
  for crops, trees, grass, animals — seeded by id so it never flickers between renders;
- vertex-colour variation on the ground and paths instead of textures;
- soft contact shadows under buildings, trees and animals as cheap baked blob shadows
  (a few shared transparent quads / vertex darkening), NOT screen-space AO on phones;
- small life details only where they cost almost nothing (wind sway already exists in
  `Grove3D.jsx`; water shimmer; smoke from the chimney at dusk) — respect
  `prefers-reduced-motion` like the existing code does.
- Desktop-only extra (optional, ask first because it needs a dependency or new passes):
  ambient occlusion with a multisampled render target so edges stay sharp.
- Proof: before/after pairs at afternoon, `?hour=20`, `?wx=rain`, phone + desktop, numbers
  table vs budgets, re-rendered icons for every changed model.

### Phase 3 (optional, only if the approved frame needs it) — Ground textures. Branch: `gemini/3d-p3-textures`
- Generated seamless textures ≤ 256×256 `.webp`, shared across all zones of a type,
  mipmapped, used on ground surfaces only; phones may use a half-size version or none.
- Within the 300 KB total. Show the frame with and without textures side by side.

## 8. Report format at the end of each phase (plain words, Dervis reads it)
1. What changed, in one sentence per item.
2. Numbers table: before / after / budget, phone and desktop.
3. Paths of the before/after screenshot pairs.
4. Branch name and commit hash. Checks run and their result.
5. Anything you could not verify (say so plainly; never claim it works without having run it).
Claude then reviews, builds and compares the branch; Dervis tries it on his own phone before
anything goes live. Merging into `main` is not your job.

## 9. Out of scope
Changing what the map shows (zones, tasks, labels, pop-ups, controls), the 2D/aerial artwork,
the landing page, app screens outside `src/features/grove/`, and any data in `src/data/`.
