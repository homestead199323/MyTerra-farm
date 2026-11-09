# 3D map refinement — design (2026-11-09)

Owner request: "Revisit the whole 3d map and assets. Refine the graphics, UX and UI of it."
Scope approved in chat on 2026-11-09: three slices, in this order, each shipped and tested on the owner's
iPhone separately. Style stays as locked in `docs/MAP_STYLE.md` (toy diorama, look A). Balcony and back
garden get priority: most users are expected to pick them.

## Audit (main at `7000c8c`, harnesses at 390 × 844 and 1280 × 900)

Framing
- Balcony on a phone: the slab spanned about a quarter of the screen height; the top third was empty land.
- Back garden: three house roofs filled about half the frame; the view target sat 3.3 m behind the garden's
  centre (`fH / 2 − patio − 1.5`), toward the house.
- Name pills covered the small beds they named.

UI over the map
- Tapping an area opens a near full-screen sheet that hides the bed the camera has just flown to.
- That sheet: "Growth stage" overlaps "Edit spacing & layout" on desktop; two dividers with nothing between;
  heavy green outline; five near-identical stage pictures for leafy crops.
- The area selector is a native `<select>`; phone full screen has two close controls and + / − next to pinch.
- The phone home tile said "Drag to look around" although the tile takes no gestures.

Graphics
- Phone detail tier (.45) made round things polygons: hexagonal tomatoes, octagonal shrubs and crowns.
- The balcony facade was a bare 0.3 m wall; at dusk every window is the same blank rectangle.
- The apartment block stands in a meadow; festoon wire reads as black dashes by day; harvest frames are heavy.

## Slice 1 — framing and phone readability (this commit)

- `home-view.js` (new, pure, tested): `fitView(points, view)` centres the projected points in the safe part
  of the screen and touches the frame on one axis; `homeView(space)` picks the view per environment.
  - Balcony on a portrait screen: seen along its length from outside, up to 58° round, picked in 4° steps
    for the largest height share. Wide windows keep 22°.
  - Back garden: framed on the garden and its patio; the house is cropped by the top of the frame.
  - Farm: same rule as before (long axis up a portrait screen).
  - Phone full screen passes its bars as insets (92 px top, 108 px bottom).
- `detailFor()` in toy.js: phones keep full detail on a balcony or back garden (≤ 12 areas, ≤ 250 plants);
  the lighter tier stays for farms, where tree crowns keep at least 10 × 7 segments.
- `labels.js`: a small area's pill hangs in front of it when that ground is free; otherwise it stays put.
- Balcony block gets depth and a flat roof (the turned view shows the top of the wall).
- No boulders in the far clumps round a back garden.
- Phone tile hint: "Tap the map to open it".

Measured (headless Chrome, software GL; not a real phone):

| Harness, 390 × 844 full screen | Before | After |
|---|---|---|
| Balcony 4 × 1.5 m: floor share of screen height | 20 % | 35 % |
| Balcony 4 × 1.5 m: camera distance | 24.3 m | 20.2 m |
| Balcony 11 × 4.5 m: floor share (22° view vs chosen view, same fit) | 24 % | 40 % |
| Back garden 8 × 5 m: bottom fence width on screen (read off the screenshots) | about 46 % | about 60 % |
| Balcony 4 × 1.5 m triangles (phone) | 38 k (faceted) | 60 k (smooth) |
| Back garden triangles (phone) | 117 k (faceted) | 218 k (smooth) |
| All-zones farm triangles (phone) | 393 k | 423 k |
| Draw calls, all-zones farm | 185 | 185 |

Not in this slice: a wide garden on a portrait phone is limited by its width; it stays about a fifth of the
screen height. Turning it side-on was rejected on 2026-10-25 (the house became a strip of roofs).

## Slice 2 — map UI (shipped 2026-11-09)

Design approved in chat ("go with 2").

- `ZoneSheet.jsx` replaces the centred modal for the area card. Phones and windows under 760 px: a bottom
  sheet 52 % of the screen high, pulled up to full height by its handle. Wider: a 400 px panel on the right.
  Not modal; closes with X or Escape only. Departure from the app's "small centred card" rule, limited to this
  card because its job is to keep the 3D bed in view; the job pop-up stays a centred card.
- `cover.js` (pure, tested): the card reports what it covers; `focusZone` frames the area in the rest
  (`fitView` with insets, fill 0.8). Closing the card re-centres the area.
- Card content: "1 row" not "1 rows"; the generic stage key is gone, each planting shows its own five stage
  pictures with the current one framed; "Edit spacing & layout" and the stage select no longer collide; the
  double divider and the green focus outline are gone.
- Area selector: white chip + own menu with job counts. Phones: bar is Growth · Reset; the X is the one close
  control. Crop card and hint sit below the chip. Growth legend wraps on phones.

Not in this slice: swipe-to-dismiss (cards close with X only, an earlier owner decision); a panel that moves
with the inline desktop map (it is fixed to the window's right edge).

## Slice 3 — graphics polish (shipped 2026-11-09)

- Balcony block: warm plaster instead of cream-gone-grey; plinth, cornice, downpipes, corbels; shutters on
  some neighbours' windows.
- Night: lit windows are amber everywhere (pane tinted, glow lowered so it no longer clips to white); on the
  apartment block about half the neighbours' windows are lit, the rest go navy.
- Town: a neighbouring block either side, a hedge closing the courtyard, pavement, street, street trees and
  two lamps. The street only shows in low side-on views of a large balcony.
- Festoon cord pale by day; harvest frames slim on small containers.
- Balcony turn limit of 80 degrees either side: from behind, the block hides the balcony.

Dropped: the street behind the back-garden houses. Since slice 1 the house is cropped by the top of the frame,
so the street would never be in view. Not needed: re-rendering the small pictures — no crop, animal or area
model changed, and day colours are untouched (the icons are rendered by day).

Measured: balcony 4 x 1.5 m on a phone 60 k -> 88 k triangles, 47 -> 56 draw calls; balcony 11 x 4.5 m on
desktop 144 k -> 173 k, 69 -> 78; garden and farm unchanged (218 k; 423 k phone / 835 k desktop, 185 calls).

## Verification per slice

`npm test`, ESLint, Vite build; Playwright screenshots of `g3-balcony` (`?small=1` too), `g3-garden`,
`g3-all` at 390 × 844 (`?coarse=1&full=1`) and 1280 × 900, day and `?hour=21`; triangles and draw calls
from `renderer.info`; then the live bundle is checked for the slice's string markers. A real phone is the
owner's check.
