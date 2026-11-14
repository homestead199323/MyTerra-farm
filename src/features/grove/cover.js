/* What an open area card hides.
   The card (ZoneSheet) reports the part of the screen it covers; the 3D map frames the selected area in
   what is left, so the bed stays in view above a phone's bottom sheet or beside a desktop side panel.
   Pure helpers + a one-value store: no DOM reads here, no three.js. MARKER: MAP_COVER_V1 */
let rect = null;
const subs = new Set();
/** rect: { left, top, right, bottom } in viewport px, or null when no card is open. */
export function setCover(next) { rect = next || null; subs.forEach((f) => f(rect)); }
export const getCover = () => rect;
export function onCover(f) { subs.add(f); return () => subs.delete(f); }

const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Share of `canvas` (its viewport rect) hidden at each edge by `cover`, as { top, bottom, left, right }.
    A sheet across the bottom gives a bottom inset, a panel down one side a left or right inset.
    Returns null when nothing is hidden, or when so little of the map is left (under 22 % of either
    dimension) that reframing would only shrink the area to a speck. */
export function coverInset(canvas, cover) {
  if (!canvas || !cover) return null;
  const w = canvas.right - canvas.left, h = canvas.bottom - canvas.top; if (w <= 0 || h <= 0) return null;
  const x0 = Math.max(canvas.left, cover.left), x1 = Math.min(canvas.right, cover.right), y0 = Math.max(canvas.top, cover.top), y1 = Math.min(canvas.bottom, cover.bottom);
  if (x1 <= x0 || y1 <= y0) return null;
  const fx = (x1 - x0) / w, fy = (y1 - y0) / h, out = { top: 0, bottom: 0, left: 0, right: 0 };
  if (fx >= .7) { // spans the width: a sheet
    if (fy > .78) return null;
    if (y1 >= canvas.bottom - 1) out.bottom = clamp01(fy); else if (y0 <= canvas.top + 1) out.top = clamp01(fy); else return null;
  } else if (fy >= .5) { // runs down a side: a panel
    if (fx > .78) return null;
    if (x1 >= canvas.right - 1) out.right = clamp01(fx); else if (x0 <= canvas.left + 1) out.left = clamp01(fx); else return null;
  } else return null; // a small card floating over the map: leave the view alone
  return out;
}

/** Add the phone's own bars (px) to a cover inset. Bars only count on an edge the card does not already hide. */
export function mergeInset(inset, bars, size) {
  const out = { top: 0, bottom: 0, left: 0, right: 0 }; if (inset) Object.assign(out, inset);
  if (bars && size?.h > 0) { out.top = Math.max(out.top, bars.top / size.h); if (!inset?.bottom) out.bottom = Math.max(out.bottom, bars.bottom / size.h); }
  // a desktop home's side columns (px): each counts on a side the card does not already hide
  if (bars && size?.w > 0) { if (bars.left && !inset?.left) out.left = bars.left / size.w; if (bars.right && !inset?.right) out.right = bars.right / size.w; }
  return out.top || out.bottom || out.left || out.right ? out : null;
}

/** Which form the area card takes: a bottom sheet on phones and narrow windows, a side panel otherwise. */
export const sheetMode = (width, coarse) => (coarse || width < 760 ? "sheet" : "panel");

/** The area card's outside-click check. A tap on another area of the 3D map opens that area on pointer-up,
    so by the time its click arrives the card already shows the new area: that tap swapped the card and must
    not close it. `atDown`: the card's title when the pointer went down (null: none seen), `atClick`: now. */
export const tapSwappedCard = (atDown, atClick) => atDown != null && atClick !== atDown;
