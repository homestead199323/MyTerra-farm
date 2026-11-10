/* DIY PROJECTS — guides + blueprint image refs.
   Phase A Commit 5b, 2026-05-09 */

export const PROJECT_GUIDES = {
  raised_bed: {
    name: "Raised Bed (1.2×2.4m)", cat: "Growing", icon: "🌱",
    difficulty: "Easy", time: "2–4 hours", cost: "€30–80",
    ref: "Adapted from Seymour's Self-Sufficient Life & Coleman's Four Season Harvest",
    overview: "The raised bed is the single best first project for any new homesteader. It solves drainage, soil quality, weed suppression, and back pain in one build. A 1.2×2.4m bed is the ideal size — you can reach the centre from either side without stepping on the soil, and standard timber comes in those lengths with zero waste. Coleman runs his entire four-season farm on raised beds. Seymour considers them essential for any plot with poor native soil.",
    materials: "4× timber planks 2.4m long, 4× timber planks 1.2m long, 24× wood screws 75mm, 3m² weed membrane, 0.7m³ soil/compost mix. Use cedar or larch for 10+ years untreated. Pine needs treatment — never use creosote or CCA-treated wood near food crops.",
    method: "1. LEVEL THE GROUND. Clear sod, rocks, and large roots. Lay weed membrane overlapping 10cm at seams. Don't skip leveling — a wonky bed pools water at one end. 2. BUILD THE FRAME. Lay out planks in rectangle. Pre-drill 2cm from ends to prevent splitting. Screw corners with 2 screws per joint. Clamp a corner square while drilling — once one corner is true, the rest follow. 3. STACK (OPTIONAL). Second layer: offset joints 30cm for strength. Screw top into bottom every 60cm. Taller = less bending but more soil cost. 4. FILL. 60% topsoil, 30% compost, 10% perlite or sharp sand. Fill to 3cm below rim. Seymour's rule: soil you can squeeze into a ball that crumbles when poked is perfect. 5. SETTLE. Water deeply, let settle 5–7 days. Beds shrink 10–15% in year one as organic matter breaks down.",
    maintenance: "Re-fill soil 5–10cm annually. Add compost each autumn. Replace timber every 5–8 years (cedar lasts 10+). Never step inside the bed.",
    tip: "Cardboard under the weed membrane smothers grass even better. Lay overlapping, wet down, then membrane on top. By spring the cardboard is decomposed and the grass is dead."
  },
  chicken_coop: {
    name: "Chicken Coop (6–8 hens)", cat: "Animals", icon: "🐔",
    difficulty: "Intermediate", time: "2–3 days", cost: "€150–400",
    ref: "Based on Ussery's The Small-Scale Poultry Flock & Storey's Guide to Raising Chickens",
    overview: "A proper coop protects from predators, provides ventilation without drafts, and makes cleaning easy. Ussery's key insight: a raised floor with a removable cleanout tray cuts coop cleaning from an hour to ten minutes. Most beginner coops fail on ventilation — ammonia from droppings causes respiratory disease. The #1 rule: ventilation holes go ABOVE the birds' heads, never at perch level.",
    materials: "4× plywood sheets, 8× timber frame 50×50mm, 2× roofing sheets, 5m hardware cloth (NOT chicken wire — foxes tear through it), 3× hinge+latch sets, 2× perch poles 40mm, 2× nesting boxes. Floor space: 0.4m² per bird plus 1–2m² outdoor run per bird.",
    method: "1. FLOOR. Build 1.2×2m frame. Raise 20–30cm off ground on blocks — prevents rot, deters rats. Ussery considers this the most important detail. 2. WALLS. Frame to 1.5m (back), 1.8m (front) for roof slope. Slope AWAY from pop-hole. Leave 60×40cm pop-hole opening. 3. CLADDING + VENTILATION. Plywood walls. Two ventilation holes (15×30cm) near roofline on OPPOSITE walls. Cover with hardware cloth. Ventilation above perch height removes ammonia without drafts — this is what beginners get wrong. 4. PERCHES. 40mm poles at 60–90cm, 25cm per bird. Flat side up — chickens' feet go flat when sleeping. AWAY from nesting boxes. 5. NESTING. 1 box per 3–4 hens, 30×30×30cm, 60cm off floor. Lip at front, angled roof on top so nobody roosts there. 6. RUN. Hardware cloth (welded mesh), NOT chicken wire. Bury 30cm or lay 30cm apron to defeat diggers. 7. SECURITY. Two-step latches defeat raccoons. Auto-closers on pop-holes are worth every cent.",
    maintenance: "Clean bedding weekly. Deep clean + disinfect quarterly. Red mite check monthly (they hide in crevices by day — check at night). Replace all bedding each season.",
    tip: "Chicken wire keeps chickens IN. Hardware cloth keeps predators OUT. This distinction saves lives. If you do one thing right, make it the mesh."
  },
  compost_bin: {
    name: "Compost Bin (3-bay)", cat: "Soil", icon: "♻️",
    difficulty: "Easy", time: "3–5 hours", cost: "€50–120",
    ref: "Based on Rodale's Complete Book of Composting & Dowding's No Dig",
    overview: "Three bays run a continuous system: Bay 1 fresh, Bay 2 composting, Bay 3 finished. Rodale's target is a carbon-to-nitrogen ratio of about 25–30:1 — a chemistry figure, not a bucket count. In practice that means roughly equal volumes, up to 3 parts brown (straw, cardboard, dry leaves) to 1 part green (peelings, grass): alternate armfuls. Dowding says compost happens fastest in warmth but shade prevents drying. Dappled shade under a deciduous tree is ideal.",
    materials: "9× pallets or equivalent timber, 3m² wire mesh (optional liner), 2× hinges, 40× screws. Free pallets from garden centres. HT-stamped (heat treated) are safe. Avoid MB (methyl bromide).",
    method: "1. SITE. Partial shade, bare soil (not concrete — worms need access), near garden. Drainage away. 2. BUILD BAYS. 4 pallets in U-shape for Bay 1. Screw corners. Repeat for Bays 2 and 3 sharing walls. Each ~1m×1m×1m. 3. FRONT ACCESS. Vertical runners inside each opening. Slide horizontal planks between them as bay fills — removable fronts are the secret to easy turning. 4. LINE (OPTIONAL). Staple wire mesh inside pallets to prevent material falling through.",
    maintenance: "Turn every 2–4 weeks. Keep moist as wrung sponge. Move through bays every 2–3 months. Finished compost: dark, crumbly, smells like forest floor. Ready in 3–6 months.",
    tip: "A compost thermometer (€10) pays for itself. Pile should hit 55–65°C centre within a week — this kills weed seeds. Not heating? Too dry (add water), too wet (add brown), or not enough nitrogen (add green)."
  },
  rain_barrel: {
    name: "Rain Barrel System", cat: "Water", icon: "💧",
    difficulty: "Easy", time: "2–3 hours", cost: "€40–100",
    ref: "From Art Ludwig's Water Storage & USDA rainwater harvesting guidelines",
    overview: "Every 1m² of roof captures 1L per 1mm of rain. A 50m² roof in 10mm rain = 500L — one storm fills multiple barrels. Ludwig's principle: elevation = pressure. Barrel on blocks gives gravity flow. Daisy-chain barrels: overflow from #1 feeds #2.",
    materials: "1× food-grade barrel 200L, 1× downpipe diverter, 1× tap with washers, 2m overflow hose, 4× cinder blocks, 1× mesh screen. A full 200L barrel weighs 200kg — platform must be rock solid.",
    method: "1. PLATFORM. Cinder blocks 2 high near downpipe. Level carefully. Soft ground sinks — paving slab underneath. 2. DIVERTER. Cut downpipe at barrel-top height. Install diverter kit. 3. TAP. Drill 5cm from bottom (not AT bottom — sediment settles). Rubber washers both sides. Silicone. Cure 24hr. 4. SCREEN. Mesh over lid opening. Uncovered water breeds mosquitoes in 7 days — not optional. 5. OVERFLOW. Hole near top, hose to drain or second barrel.",
    maintenance: "Clean screen monthly. Scrub annually. Check tap for leaks. Drain before hard frost — ice cracks plastic.",
    tip: "Three daisy-chained barrels = 600L from one downpipe. First-flush diverters (€15) send dirty roof water to waste and fill barrels with clean water only."
  },
  fencing: {
    name: "Perimeter Fencing (per 10m)", cat: "Infrastructure", icon: "🏗",
    difficulty: "Intermediate", time: "1 day per 20m", cost: "€80–200 per 10m",
    ref: "From Storey's Basic Country Skills & USDA livestock fencing standards",
    overview: "Good fencing is the invisible backbone of every homestead. Storey's critical insight: corner posts take ALL the tension. Over-engineer corners — a weak corner means the entire fence sags within a year.",
    materials: "Per 10m: 6× fence posts 1.8m, 10m wire mesh, 30× staples, 1× strainer post (corner), 3× bags postcrete. Goats: 1.2m+ with electric top wire. Sheep: 1m stock fence. Chickens: 1.8m hardware cloth.",
    method: "1. PLAN. Walk the line. Note slopes, wet spots, rock. Stake every 2–2.5m. String line for straightness. 2. CORNERS FIRST. 60cm deep, plumb, postcrete. Diagonal brace at 45°. Wait 24hr before tensioning. 3. INTERMEDIATES. 60cm deep. Rammed earth works — tamp in 10cm layers. Cheaper than concrete. 4. MESH. Unroll from corner outward. Staple at 5 points. Tension FROM corners. Loose on intermediates first, then tension, then staple firm. 5. TOP WIRE. High-tensile for visibility and strength. Livestock: bottom wire pegged every 2m.",
    maintenance: "Walk monthly. Tighten annually. Replace leaning posts immediately — one weak post compromises 4m each side. Oil gate hinges.",
    tip: "Goats treat fencing as a suggestion. Electric top wire is not optional — two strands at nose height and top teaches respect fast."
  },
  tool_shed: {
    name: "Tool Shed / Storage", cat: "Infrastructure", icon: "🏚",
    difficulty: "Intermediate", time: "3–5 days", cost: "€200–600",
    ref: "From Reader's Digest Back to Basics & Popular Mechanics DIY guides",
    overview: "A shed is a force multiplier — tools last longer dry, supplies stay organized, you stop wasting time hunting. Pier foundations let air circulate under the floor, preventing rot. Build bigger than you think — every homesteader says the shed is too small within a year.",
    materials: "12× concrete blocks, 10× timber frame lengths, 8× cladding sheets, 4m² roofing felt + corrugated sheets, 1× door + hardware, 4× shelf bracket sets. Pressure-treated timber for anything within 15cm of ground.",
    method: "1. FOUNDATION. Level ground. 12 blocks in 3×4 grid as piers. Spirit level essential. 2. FLOOR. Treated timber frame on piers. Joists every 40cm. OSB on top. 3. WALLS. Frame on floor, tilt up. Front 2.2m, back 1.8m for pitch. Get a helper for tilt-up. 4. CLADDING. Bottom up, overlapping downward — water runs off, never behind. 5mm expansion gaps on plywood. 5. ROOF. Rafters front to back. OSB, felt, corrugated. Minimum 15° pitch. 10cm overhang all sides. 6. FINISH. Door, hasp, padlock. Shelves, hooks, pegboard.",
    maintenance: "Check roof annually. Treat timber every 2–3 years. Keep blades oiled.",
    tip: "Silhouette outlines on pegboard for each tool — you'll instantly see what's missing. A sharp hoe does the work of three dull ones — keep a stone in the shed."
  },
  cold_frame: {
    name: "Cold Frame / Mini Greenhouse", cat: "Growing", icon: "🏡",
    difficulty: "Easy", time: "2–3 hours", cost: "€20–60",
    ref: "From Eliot Coleman's Four Season Harvest — the definitive cold-frame guide",
    overview: "Coleman built an entire commercial farm in Maine that harvests year-round using cold frames and row covers — no heating. A cold frame traps solar radiation, creating a microclimate 5–10°C warmer than outside. Against a south-facing dark wall, it extends your season 6–8 weeks each end. The simplest and highest-return project on this list. Total cost can be nearly zero with reclaimed materials.",
    materials: "4× timber planks, 1× old window or polycarbonate sheet, 2× hinges, 1× prop stick, 12× screws. Polycarbonate is lighter and shatter-proof. Old windows are free but heavier.",
    method: "1. BUILD BOX. Trapezoid: back 40cm, front 25cm, angled sides. Slope faces south. Coleman: angle should roughly match your latitude (35–45° for most temperate zones). 2. LID. Hinge window/polycarbonate to back edge. Overhang front 2–3cm to shed rain. 3. VENTILATION. Notched prop stick at 3 positions: cracked (5cm), half, full. Coleman's rule: open above 15°C — closed frames hit 40°C+ and cook seedlings. 4. SITE. Against south wall for reflected heat. Dig 10cm into soil for insulation. Paint inside back wall white for light reflection.",
    maintenance: "Open above 15°C daily in spring. Clean glass annually. Replace cracked panels immediately.",
    tip: "Coleman calls this 'the poor man's greenhouse' — more useful than an actual greenhouse for most home growers. A dark stone wall behind it stores heat all day and radiates warmth at night. Free thermal mass heating."
  },
  drip_irrigation: {
    name: "Drip Irrigation Line", cat: "Water", icon: "🚿",
    difficulty: "Easy", time: "2–4 hours", cost: "€30–80 per 20m",
    ref: "From Steve Solomon's Gardening When It Counts & irrigation trade guides",
    overview: "Drip delivers water to roots — no evaporation, no wet foliage, no wasted water between rows. Solomon considers it the biggest labour-saver: set a timer and daily watering is eliminated forever. A €30 kit pays for itself in one season.",
    materials: "20m main hose (16mm), 30× emitters (2L/hr), 4× T-connectors, 4× end caps, 1× battery timer, 1× pressure reducer, 1× tap connector, inline filter. Without pressure reducer, mains pressure blows emitters off — not optional.",
    method: "1. CONNECT. Tap adapter → pressure reducer (drip runs 1–1.5 bar, mains is 3–4) → filter. Thread tape on joints. 2. LAY HOSE. Along bed edges. Warm in sun 30 min to straighten. Lay it on the soil, and mulch over it once you have checked every emitter works. 3. EMITTERS. Punch hole at each plant, push in emitter. 2L/hr standard, 4L/hr for tomatoes. One per plant. 4. CAP ENDS. Fold-back with clamp. Opens for flushing. 5. TIMER. Early morning (4–6 AM). 30 min sandy soil, 15 min clay. 6. TEST. Walk entire line. Cup under emitters for 1hr — should deliver rated litres. Under-delivery = partial clog, soak in vinegar.",
    maintenance: "Monthly: flush open end caps 30 seconds. Quarterly: clean filter. Replace blocked emitters. Winter: drain entire system — frost cracks fittings.",
    tip: "Mulch OVER drip lines. The combination of drip + mulch cuts water use 50–70% vs overhead sprinkler. That's not a typo."
  },
};

export const BLUEPRINT_IMAGES = {
  raised_bed:      "/manuals/1-raised-bed.webp",
  chicken_coop:    "/manuals/2-chicken-coop.webp",
  compost_bin:     "/manuals/3-compost-bin.webp",
  rain_barrel:     "/manuals/4-rain-barrel.webp",
  fencing:         "/manuals/5-perimeter-fencing.webp",
  tool_shed:       "/manuals/6-tool-shed.webp",
  cold_frame:      "/manuals/7-cold-frame.webp",
  drip_irrigation: "/manuals/8-drip-irrigation.webp",
};

