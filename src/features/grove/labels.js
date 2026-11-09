/* Zone-name pills on the 3D map: who gets a label and where it sits.

   Each item is one zone already projected to the screen: (x, y) is the midpoint
   of the zone's front edge (the footprint edge nearest the viewer), the pill
   hangs above that point. Placement order is selected → has pending jobs →
   biggest footprint; neighbouring pills may shift one row to avoid overlap,
   while labels that still collide are hidden. A screen-sized label budget keeps
   large farms legible; selected areas and pending jobs take priority. Far out on phones a zone must be at least 64 px
   wide on screen to earn a name (28 px otherwise), unless it is selected or
   has jobs. Pure: no DOM, no three.js. */

export const LABEL = { minPx: 28, minPxFarMobile: 64, pad: 3, edge: 4 };

/** items: [{ id, x, y, cx, cy, w, h, badge, px, area, sel, jobs, on, box?, below?, thin? }]; opts: { W, H, far, mobile }.
    `box` is the footprint's screen box, `below` the anchor for a pill hung in front of a small area.
    (x, y) is the front-edge anchor the pill hangs from; (cx, cy) is the footprint centre on screen and decides
    whether the zone counts as on screen (defaults to the anchor), so a zone you zoom into keeps its name while
    its centre is in view even when its front edge has left the bottom. Returns one { id, x, y, show } per item,
    in the input order; x/y are the clamped anchor. */
export function placeLabels(items, { W, H, far = false, mobile = false }) {
  const minPx = far && mobile ? LABEL.minPxFarMobile : LABEL.minPx;
  const maxVisible = Math.max(5, Math.min(18, Math.floor(W * H / 35000)));
  // A small area would disappear under its own pill, so the pill hangs in front of it (`below`, just under the
  // footprint on screen) when that spot is not another area's ground; a thin strip always hangs it in front.
  const area = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
  const shared = (a, b) => area({ x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1) });
  items = items.map((it) => {
    if (!it.below) return it;
    const b = { x0: it.below.x - it.w / 2, x1: it.below.x + it.w / 2 + (it.badge || 0), y0: it.below.y - it.h, y1: it.below.y };
    const taken = !it.thin && items.some((o) => o !== it && o.box && shared(b, o.box) > area(b) * .3);
    return taken ? it : { ...it, x: it.below.x, y: it.below.y };
  });
  const order = items.map((it, i) => ({ it, i })).sort((u, v) => (v.it.sel - u.it.sel) || ((v.it.jobs ? 1 : 0) - (u.it.jobs ? 1 : 0)) || (v.it.area - u.it.area));
  const placed = [], out = new Array(items.length);
  for (const { it, i } of order) {
    const { w, h, badge = 0 } = it;
    const cx = it.cx ?? it.x, cy = it.cy ?? it.y;
    const inside = cx > 0 && cx < W && cy > 0 && cy < H && (it.sel || it.jobs || it.px >= minPx);
    const x = clamp(it.x, w / 2 + LABEL.edge, W - w / 2 - badge - LABEL.edge), anchorY = clamp(it.y, h + badge * .4 + LABEL.edge, H - LABEL.edge);
    let y = anchorY, box;
    const makeBox = (atY) => ({ x0: x - w / 2 - LABEL.pad, x1: x + w / 2 + LABEL.pad + badge, y0: atY - h - badge * .4, y1: atY, anchorX: it.x, anchorY: it.y });
    const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    box = makeBox(y);
    let collision = placed.find((q) => overlaps(box, q));
    // A small vertical shift keeps neighbouring zones labelled without stacking
    // labels that share the same anchor or sending them far from their object.
    if (collision && Math.hypot(it.x - collision.anchorX, it.y - collision.anchorY) >= 8) {
      for (const delta of [-(h + badge * .4 + 4), h + badge * .4 + 4]) {
        const candidate = anchorY + delta;
        if (candidate < h + badge * .4 + LABEL.edge || candidate > H - LABEL.edge) continue;
        const next = makeBox(candidate);
        if (!placed.some((q) => overlaps(next, q))) { y = candidate; box = next; collision = null; break; }
      }
    }
    const free = it.sel || !collision;
    const show = !!(it.on && inside && free && (it.sel || placed.length < maxVisible));
    if (show) placed.push(box);
    out[i] = { id: it.id, x, y, show };
  }
  return out;
}

const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
