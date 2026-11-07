# MyTerra 3D map — the visual style, locked

**Decided 2026-10-05.** The 3D farm map is a *toy diorama*: rounded, flat-coloured, brightly and softly lit, in the app's own palette. This file is the single source of truth for how anything on the map should look. Read it before touching `src/features/grove/`. Do not re-open the style question in a session — change this file first if the style changes.

Reference that set the direction: Dilum Sanjaya's "WareTrack" warehouse dashboard (X, 3 Oct 2026) — rounded boxes, one brand colour, white/pale ground, soft shadows, floating white UI cards.

## 1. Shape
- **Every box is a rounded box.** `rbox()` from `toy.js`, bevel radius ≈ 24 % of the smallest side, capped at 32 cm. Hard-edged `BoxGeometry` only for pieces under ~6 cm (trims, mullions).
- **Every post is a capsule, every rim a torus, every crown a sphere.** No cones for trees, no flat cut-outs, no planes standing in for objects.
- **Chunky proportions.** Fatter posts and rails than life, thick roofs with rounded ridge caps (`pill()`), oversized doors, big round tree crowns, plump animals with big heads and short legs.
- **Smooth surfaces.** High segment counts (spheres 14×10+, cylinders 16+). The only faceted thing allowed is nothing.
- **Real geometry for everything that is a thing.** Crops (`crops3d.js`), animals (`animals3d.js`), props (`props3d.js`). No sprites, no billboards, no camera-facing quads.

## 2. Surface
- **Flat matte colour only.** `flat(color)` — `MeshStandardMaterial`, roughness ≈ 0.88, metalness 0. No photo textures, no procedural textures, no alpha-gradient masks (retired 2026-10-05: the blurred contact patches and the soft mulch disc looked photoreal next to the flat shapes). Objects are grounded by the sun's soft shadow; the mulch under a tree is a crisp flat disc with a lighter rim.
- Glass (greenhouse, windows, tractor cab) and water are the only glossy materials: `MeshPhysicalMaterial`, low roughness, env map.
- Vertex colours carry variety inside one mesh (crop leaves lighter toward the tip, animal coats, ground patches) — never a texture.

## 2b. Environments (the boundary and the props follow `profile.environment`)
- **Farm:** clipped hedge, post-and-rail fence, stone gate pillars and a green gate, a drive, mailbox, tree border, scarecrow, tractor by the barn.
- **Garden (backyard):** the same hedge, fence and gate — no scarecrow, no tractor.
- **Balcony:** a stone slab against the building's cream wall (green glazed door, white-framed windows) with a slim rounded railing — capsule posts, thin balusters, a chunky white handrail — on the three open sides. No hedge, fence, gate, pillars, drive, mailbox, wheelbarrow, grass or wild flowers.
- Balcony detail: shallow rounded floor tiles with narrow joints, a visible slab edge, wall skirting and a door threshold. Container pots have matching saucers. Existing hanging-pot ornaments hang from three fine supports; the pot and plant swing together gently about the suspension point, following wind strength and direction. Reduced motion leaves them still. Floor tiles are merged by material and capped at 40 × 40.

## 3. Palette (`TOY` in `palette.js` — the one source for both views; `toy.js` turns it into `PAL` numbers for three.js)
- **Backdrop / fog:** sage `#b4c69d` — the land fades into it far away (fog starts well beyond the farm); the canvas background is the same colour.
- **Ground:** meadow green `#6d8f49` with softer patches `#5f7f3e` (set 2026-10-06 so the lit render ≈ `#779849`, close to the old photo map's `#5f7136`); the property inside the hedge a shade lighter `#75984f` with soft irregular lusher/drier patches painted into the vertices (no stripes); pasture / orchard / lawn close variants.
- **Paths:** warm off-white `#ebe5d8` with a `#d9d2c3` edge, round ends. Settings → Path color: *Warm sand* `#e8d8b9` / *Slate* `#bfc4be` override the material's own tone.
- **Soil:** `#886347` (raised beds, rows), lighter `#a07e5e` for in-ground beds, `#b69f82` trampled earth.
- **Buildings:** cream walls `#f2ebdd`, white trims; roofs terracotta `#cf8260` or slate `#6b7784`; barn red `#c7624f` with white boards; coop and sheds warm wood `#cfae82`.
- **Wood:** `#cfae82` / `#b68e63` / `#7c5a3d`. Stone `#d3cfc5`. Zinc `#c6cdd0`.
- **Water** `#7cc0d6`, **glass** `#daf2ef`, **hay** `#e4c66f`, **smoke** `#f2f0ec`.
- **Foliage:** four greens `#4b9150 #3f8446 #5b9f58 #357a3c`, silvery olive `#7d916a`, deep citrus `#33733d`, hedge `#427c41`.
- **The one accent is the brand green `#128147`** (with `#1fa35c` light and `#0c5e33` deep): every door, every gate, the greenhouse door, the tractor, the wheelbarrow, the watering can, the mailbox, the tap wheel, the drinker base. Nothing else is saturated green-blue. Attention stays with `#f7c552` gold (harvest frames, stage tags) and the app's orange (job badges).

## 4. Light
- Hemisphere light: white sky, pale green bounce, intensity 0.85. One warm sun (`#fff3e4`, 2.1) high in the afternoon sky so shadows are short.
- **Shadows are soft and faint**: PCF radius 4, shadow intensity 0.62. Shadows show volume; they never darken the scene.
- RoomEnvironment at 0.22 for a gentle gradient on matte surfaces. ACES, exposure 0.92. Hemisphere ground bounce `#9fb48a`.
- No vignette, no mottle, no cloud-shadow layers, no darkening of the ground anywhere.

## 4b. Live sky and weather (2026-10-14, `sky.js`, `weather-fx.js`)
- The light above is the **fixed afternoon** (`FIXED_SKY`, "Live sky: off" in Settings → Ground & paths). With Live sky on, the sun follows the local clock and the town's latitude (`data.cityGeo`): four presets blended by solar elevation — high (today's look), low (`#ffe2bd`, longer soft shadows), dusk/dawn (`#ffb876`, `#d9c2b2` sky) and night (a `#9fb3d6` "moon" from the mirrored azimuth 40° up, `#5b6a86` sky, exposure 0.8). Night never goes darker than that; window glass and the porch lamp glow warm (`NIGHT` uniform, `nightGlow()` in toy.js). Shadows re-render once a minute.
- Today's weather (Open-Meteo current conditions) flattens the light when cloudy or foggy (less sun, more sky, fainter shadows, nearer fog) and brings **toy clouds**: 3–6 merged rounded white blobs at 16–20 m drifting downwind, **never casting shadows**. Rain is pale instanced streaks, snow slow white flakes, both falling through a box round the camera target; none under reduced motion, half as many on phones.
- **Wind** is one uniform (`WIND`: direction the air moves toward, strength 0.15–1 from km/h ÷ 45). Tree, hedge and crop sway scale with it and travel downwind as a gust wave; smoke bends with it; the barn cupola vane turns into it.
- Crop sway converts world wind into each plant's local orientation, with stable variations in flutter and flexibility. Pond waves follow the wind, with surface normals derived from the same wave as the displacement. Neither changes the sky or lighting presets.

## 5. Motion (all in the vertex shader, one shared clock)
- Tree crowns and hedges sway (tops only). Crops sway above 40 cm. Smoke rises, grows and fades. Bees hover. Harvest frames breathe. Pond water ripples gently (×3 in rain). A ripe fruit tree drops a fruit now and then (it rolls, rests, fades).
- **Animals** (`herd-brain.js` + `animals3d.js`): legs decided by a small brain 4×/s — wander, graze/peck, stand, lie down and chew (cows, sheep, pigs, goats; more at night), swim (ducks and geese on a pond touching their run), scatter when the coop is tapped, and roost: poultry walks to the pop door after dark and is hidden inside until dawn. Pose and interpolation stay in the shader; only changed animals' vertex ranges are re-uploaded.
- **Swallows** (5, 3 on phones) loop and bank high over the farm; **butterflies** flutter over herb beds, hives and wild flowers — real geometry, one instanced mesh each, hidden at night, in rain or (butterflies) under 8 °C.

## 6. Growth and status
- Crops are modelled per family and **per stage**: sprout (sown) → seedling → growing → maturing with small green fruit → harvest window with ripe fruit in full colour. Fruit colour appears only in the harvest window; so does the gold frame round a row and the gold ring round a tree.
- Planted instances have a small, deterministic size variation so a row feels organic. Their positions, spacing and stage stay tied to the grower's actual planting; the same plant keeps its variation across preview dates.
- Lettuce-family plants add a folded inner rosette as they grow; radishes have broad leaves and visible root shoulders; tomatoes carry leaves on visible branches; strawberries have three-leaf clusters and low runners. The same growth-stage and detail-tier budgets apply to these models.
- In the growth preview, plants whose stage changes settle into their new size with a short, stable stagger. Backward previews settle from a larger size; reduced motion switches immediately.
- Changing the system reduced-motion preference while the map is open also stops ambient motion and camera inertia, without requiring a page reload.
- A recorded stage remains the source of truth today. A future preview projects from that stage and labels the result as an estimate; it never changes the recorded observation.
- Row markers: a wooden pole with a rounded tag in the stage colour.
- Selection: a gold rounded frame. Crop pick: the crop's own colour, lighter.

## 6b. Detail pass (2026-10-06) — what every object carries now
- **Trees:** five-blob crowns with a lighter sunlit top blob and two branch forks. **Hedge:** flowering bushes and wild-flower clumps along the outside.
- **House:** window boxes with flowers under the front windows, a doormat, a downpipe at the front corner (plus the existing porch canopy, lamp, chimney smoke, solar panels, clipped hedge and corner bushes).
- **Barn:** a round zinc feed silo with a slate dome behind the back corner (barns ≥ 7 m). **Shed:** woodpile and a rake against the side wall, a green water butt at the back.
- **Pond:** lily pads with pink flowers, reed clumps at the rim, a plank jetty on ponds ≥ 4 × 3 m. **Pasture:** loose hay round the feeder. **Apiary:** wild flowers. **Greenhouse:** a hose reel by the door.
- **Yard / parking** (zone type `yard`): a pale gravel slab `#d9d2c3` with a `#c9c2b3` rim and white bay lines every 2.6 m along the long side when it is 5 m or longer. No props, no tasks.
- **Raised beds:** white cloche hoops with a pale cover while every row is still at seedling stage or younger. **Orchard:** at harvest, a ladder against the first ripe tree and a crate of its fruit.

## 7. UI over the map (`.g3-*` in `quiet.css`)
- Floating panels (growth preview, crop card) never run under the control column; zone labels are clamped inside the view and drop out when their area's centre leaves it.
- The same white cards as the rest of the app: `var(--color-card)`, hairline `var(--color-border)`, `var(--shadow)`-style soft shadow, brand green for selected / pressed, orange job badges. Dark mode follows the tokens. Never dark translucent pills.
- Zone name pills hang 2 px above the **front edge** of the footprint (the edge nearest the viewer), never on a roof. Labels include small matching line icons, except numbered beds, which stay compact. Placement is `labels.js`: selected → pending jobs → biggest footprint; neighbouring labels can shift one row to avoid a collision, and a viewport-sized budget prevents dense farms from being covered. Far out (`ls < .8`) a zone needs 28 px of screen width for a name, 64 px on phones; selected and job-bearing zones take priority. The area selector can focus any area, including one whose label is hidden.
- A thin white footprint follows a mouse hover or keyboard focus, showing which area can be opened. The selected area retains its gold frame; neither effect changes the scene's lighting.
- Hovering a planted row adds a gold row outline and a compact crop card with its stage and area; pointer feedback distinguishes selectable areas from the ground.
- Selecting a planted row focuses its bed and shows the crop's stage-specific picture. An area selection briefly settles into its gold outline; reduced motion displays it immediately.
- Inspection framing fits the actual zone and crop bounds through the perspective camera, including tall plants and roofs. It preserves the current orbit direction and raises low views to 60° for plant areas. Small pots can be inspected at the same close distance on large farms and balconies; Reset still returns to the whole property. This fit reserves space around the object, but does not yet avoid every overlapping information panel or neighbouring building.

## 7b. Phones (2026-10-25) — coarse pointer only (`isCoarse()` → host class `g3-coarse`; harness `?coarse=1`)
- Inline on the home screen the map is a **live preview tile** (aspect ≥ 4:3): no gestures, no pills, no controls, no scroll hint; an "Open map" pill (`.g3-open`) with a job-count badge; one tap anywhere opens full screen; closing it returns to the whole-farm home view. The render-quality tier (`mobile`: coarse pointer OR short screen) is separate and unchanged.
- Full screen in portrait looks straight down the farm's long axis (θ −90°, `FarmControls.fit` `turn`) so a landscape farm fills the screen's height instead of a 45 % band; Reset returns to it. Desktop keeps the 22° three-quarter view (also for a tall farm on a landscape window: turned).
- Controls are a centred bottom bar (Growth · + · − · Reset · Exit, 48 px); the growth panel sits above it; the close X stays top-right.
- Pinch intent lock (`gestures.js`): zoom always applies; rotate needs a ≥ 15° twist with < 8 % scale change; tilt a ≥ 24 px parallel vertical drift; an undecided pinch becomes zoom after 450 ms (review: zoom already applies while undecided, so a long settle costs nothing and keeps slow deliberate twists); the answer is locked until the fingers lift.

## 8. Performance rules that keep the look affordable
- Everything static is merged per material (`bake()`); repeated parts are instanced (fences, pots, tufts, crops, fruit, bees, smoke).
- Crop models have three levels of detail chosen farm-wide by plant count (>350 plants, >900 plants).
- Budget at the home view: ≤ 200 draw calls, ≤ 700 k triangles on the all-zones harness (every zone type at once, the worst case). Verified 2026-10-06 after the detail pass: 171 calls / 662 k all-zones; 136 / 530 k on 36 numbered beds.

## 8b. The flat view and the layout editor (`AerialArtwork.jsx`, `GroveScene.jsx`)
- The same toy style seen straight from above, reading the same `palette.js` colours: flat fills, rounded corners, no photo textures or image sprites, no texture overlays, no sun-tint layer.
- Shadows are soft and faint and fall to the bottom-left, the way the 3D sun's do (`dx < 0, dy > 0`, opacity ≤ 0.2).
- Ground and the property apron, hedge, boundary fence with a green gate and stone pillars, paths with an edge, zone surfaces (soil, pale soil rows, gravel, water with a stone rim, orchard and pasture greens), crops as rounded blobs with fruit only in the harvest window, pots under container plants, animals in the 3D coat colours.
- Labels are the 3D map's white card pills (brand green when selected), job badges are orange with a white rim, selection is a gold frame, edit handles and the grid are brand green.
- SVG text is drawn at real pixel sizes inside a scaled group — never a sub-1 font size (Chrome mis-measures it).

## 8c. Small pictures everywhere else in the app (`src/assets/toy/`, `toy-art.js`)
- Every crop, fruit tree, animal and area picture in lists, cards, popups and the morning walk is **rendered from the 3D map's own models** — same shapes, colours and light — by `scripts/render-icons.mjs` (dev server + Playwright). Re-run it after any change to the models or palette; never hand-draw or import outside artwork.
- Crops: `crop-<family>-<stage>.webp` for stages 2–5 on a soil board sized to the plant; young stages are framed tighter so they still read at 32 px but stay visibly smaller. `crop-planned` / `crop-sown` for stages 0–1. Fruit trees: `tree-<fruit>-<stage>`. Animals: `animal-<species>` (standing, head up). Areas: `zone-<type>` on a rounded meadow tile. Bees use the beehive tile.
- 192 px transparent WebP, kept out of the JS bundle (`assetsInlineLimit` in `vite.config.js`); `tests/artwork.test.js` checks every crop and species has its icons.
- The flat produce icons in `FarmIcon.jsx` use the palette's leaf greens.

## 9. Harnesses (run with Vite, screenshot with Playwright)
`tests/g3-all.html` (every zone type), `tests/g3-zoo.html` (every animal, coop and barn), `tests/g3-beds.html` (36 narrow numbered beds), `tests/g3-crops.html` (every crop family at growing and harvest stage), `tests/g3-balcony.html` (balcony environment). `g3-all` and `g3-balcony` take `?coarse=1` (phone UX tier) and `?full=1` (full screen on mount) besides the sky overrides; `window.__g3.controls.homeFrac` / `homeTurn` report the home fit (dev only).
