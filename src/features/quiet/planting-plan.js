import { bedLength, bedRows, layoutPlots, axisOf, modernRect } from "./farm-model";
import { crowdingFactor, spacingGuide } from "../../data/spacing.js";
const TREE_NAMES = new Set([
  "Apple",
  "Pear",
  "Olive",
  "Fig",
  "Peach",
  "Plum",
  "Cherry",
  "Apricot",
  "Walnut",
  "Almond",
  "Chestnut",
  "Quince",
  "Persimmon",
  "Lemon",
  "Orange",
  "Hazelnut",
  "Pomegranate",
  "Avocado",
  "Mango",
]);
export const isTreeCrop = (c) =>
  !!c && (TREE_NAMES.has(c.name) || ["Fruit Tree", "Nut Tree"].includes(c.cat));
export function cropFitsZone(c, z) {
  if (!c || !z) return false;
  if (z.type === "orchard") return ["Fruit", "Fruit Tree", "Nut Tree"].includes(c.cat);
  if (isTreeCrop(c)) return z.type === "container";
  if (z.type === "herbs") return c.cat === "Herb";
  return ["veg", "raised", "greenhouse", "container"].includes(z.type);
}
const EPS = 0.00001;
const overlaps = (a, b) => a.x0 < b.x1 - EPS && a.x1 > b.x0 + EPS && a.y0 < b.y1 - EPS && a.y1 > b.y0 + EPS;
/** Footprints of every other planting in a bed, as bed-local rectangles. */
export function occupiedRects(zone, plots, excludeId) {
  const rows = bedRows(zone),
    zoneVertical = zone.rowAxis === "vertical",
    gap = (zoneVertical ? zone.wM : zone.hM) / rows;
  return layoutPlots(zone, plots)
    .filter((p) => p.id !== excludeId)
    .flatMap((p) => {
      const l = p.layout;
      if (l.pattern === "scatter")
        return (l.points || []).map((q) => {
          const r = (l.spacingCM || 100) / 200;
          return { x0: q.xM - r, x1: q.xM + r, y0: q.yM - r, y1: q.yM + r, tree: true };
        });
      if (l.version === 2) return [modernRect(zone, l)];
      const c0 = (l.startRow - 1) * gap,
        c1 = (l.startRow - 1 + l.rowCount) * gap;
      return [
        zoneVertical ? { x0: c0, x1: c1, y0: 0, y1: l.lengthM } : { x0: 0, x1: l.lengthM, y0: c0, y1: c1 },
      ];
    });
}
/** Cross-axis bands used by plantings running in the bed's default direction (kept for older callers). */
export function occupiedBands(zone, plots, excludeId) {
  const vertical = zone.rowAxis === "vertical";
  return occupiedRects(zone, plots, excludeId)
    .filter((r) => !r.tree)
    .map((r) => (vertical ? [r.x0, r.x1] : [r.y0, r.y1]))
    .sort((a, b) => a[0] - b[0]);
}
export function gridCapacity(length, spacing, pattern, row) {
  return Math.max(
    0,
    Math.floor((length - 0.2 - (pattern === "offset" && row % 2 ? spacing / 2 : 0) + 1e-8) / spacing),
  );
}
export function planPlanting(zone, plots, input, crop, excludeId) {
  const fail = (error, field = null) => ({ error, count: 0, rows: 0, problem: { kind: "input", field, canForce: false, fixes: [] } });
  if (!cropFitsZone(crop, zone))
    return fail(
      zone?.type === "orchard"
        ? "Choose a fruit or nut crop for an orchard."
        : "Choose a suitable growing area for this crop.",
    );
  const spacingCM = Number(input.spacingCM ?? crop.spacing),
    spacing = spacingCM / 100;
  const pattern = input.pattern || "rows",
    random = pattern === "scatter";
  const rowSpacingCM = Number(
      input.rowSpacingCM ?? Math.round(spacingCM * (pattern === "offset" ? Math.sqrt(3) / 2 : 1) * 10) / 10,
    ),
    rowGap = rowSpacingCM / 100;
  if (!(spacing > 0) || !Number.isFinite(spacing) || !(rowGap > 0) || !Number.isFinite(rowGap))
    return fail("Enter positive plant and row spacing.", !(spacing > 0) || !Number.isFinite(spacing) ? "spacingCM" : "rowSpacingCM");
  const byRows = input.mode === "rows" && !random,
    value = Number(byRows ? input.rowCount : input.plantCount);
  if (!Number.isInteger(value) || value < 1)
    return fail(`Enter a whole number of ${byRows ? "rows" : "plants"} greater than zero.`, byRows ? "rowCount" : "plantCount");
  if (value > 100000 || (byRows && value > 1000)) return fail("Use a smaller planting group.", byRows ? "rowCount" : "plantCount");
  const yieldFactor = random ? crowdingFactor(crop, spacingCM) : crowdingFactor(crop, spacingCM, rowSpacingCM);
  if (random) {
    if (zone.type !== "orchard") return fail("Scattered planting is available in orchards.");
    const points = scatterTrees(zone, plots, value, spacing, excludeId, crop.name + (input.seed || ""));
    if (points.length !== value)
      return fail(
        `Only ${points.length} additional trees fit at this spacing. Use fewer trees or reduce spacing.`,
      );
    return {
      count: value,
      rows: 0,
      error: "",
      yieldFactor,
      layout: { version: 2, pattern, spacingCM, rowSpacingCM, points, seed: input.seed || "" },
    };
  }
  const axis = input.axis === "vertical" || input.axis === "horizontal" ? input.axis : axisOf(zone),
    vertical = axis === "vertical";
  const alongMax = vertical ? zone.hM : zone.wM,
    cross = vertical ? zone.wM : zone.hM;
  const placeRows = (length) => {
    if (!(length > 0.2) || length > alongMax + EPS) return fail(`Row length must be between 0.3 and ${alongMax} m (the bed's length).`, "lengthM");
    const capacities = [];
    let count = 0;
    while ((byRows ? capacities.length < value : count < value) && capacities.length < 1000) {
      const capacity = gridCapacity(length, spacing, pattern, capacities.length);
      if (!capacity) return fail("The row is too short for even one plant at this spacing.", "lengthM");
      capacities.push(capacity);
      count += capacity;
    }
    if (!byRows && count < value) return fail("This many plants would need more than 1000 rows.", "plantCount");
    const rows = capacities.length,
      height = spacing + (rows - 1) * rowGap;
    const rectAt = (c, a) =>
      vertical
        ? { x0: c, x1: c + height, y0: a, y1: a + length }
        : { x0: a, x1: a + length, y0: c, y1: c + height };
    const taken = occupiedRects(zone, plots, excludeId);
    const fits = (c, a) =>
      c >= 0.1 - EPS && c + height <= cross - 0.1 + EPS && a >= -EPS && a + length <= alongMax + EPS;
    const forcedAt = () => { // "Plant anyway": the first spot that is inside the bed, other plantings ignored
      const c = 0.1, a = 0;
      return height <= cross - 0.2 + EPS && length <= alongMax + EPS ? [c, a] : null;
    };
    const tooWide = () => {
      const free = freeStrip(taken, vertical, cross, alongMax, height);
      const n = byRows ? count : value, needW = height, needL = length;
      const fixes = [];
      // 1. shorter rows that fit the longest free strip (the same plants wrap onto more rows)
      if (free.lengthM >= 0.3 && free.lengthM < length - EPS) {
        const L = Math.floor(free.lengthM * 10) / 10;
        if (!placeRows(L).error) fixes.push({ field: "lengthM", label: `Shorten rows to ${L} m`, patch: { lengthM: L } });
      }
      // 2. fewer rows / fewer plants that fit the free width and length
      const rowsFit = Math.max(0, Math.floor((free.widthM - spacing) / rowGap + EPS) + 1), L2 = Math.min(length, Math.max(0.3, Math.floor(free.lengthM * 10) / 10));
      if (rowsFit >= 1 && free.lengthM >= 0.3) {
        let cap = 0; for (let r = 0; r < rowsFit; r++) cap += gridCapacity(L2, spacing, pattern, r);
        if (byRows && rowsFit < rows) fixes.push({ field: "rowCount", label: `Use ${rowsFit} row${rowsFit === 1 ? "" : "s"}`, patch: { mode: "rows", rowCount: rowsFit, lengthM: L2 < length ? L2 : input.lengthM } });
        else if (!byRows && cap >= 1 && cap < n) fixes.push({ field: "plantCount", label: `Plant ${cap} instead`, patch: { mode: "plants", plantCount: cap, lengthM: L2 < length ? L2 : input.lengthM } });
      }
      // 3. closer spacing so the rows fit the free width (one row: the plant spacing itself)
      if (rows === 1 && free.widthM >= 0.03 && free.widthM < spacing - EPS) { const s = Math.floor(free.widthM * 100); if (s >= 1) fixes.push({ field: "spacingCM", label: `Spacing ${s} cm`, patch: { spacingCM: s, rowSpacingCM: pattern === "offset" ? undefined : input.rowSpacingCM } }); }
      else if (rows > 1 && free.widthM >= spacing + EPS) { const g = Math.floor(((free.widthM - spacing) / (rows - 1)) * 100); if (g >= 1 && g < rowSpacingCM) fixes.push({ field: "rowSpacingCM", label: `Rows ${g} cm apart`, patch: { rowSpacingCM: g } }); }
      const bedFull = free.widthM < 0.03 || free.lengthM < 0.3;
      const error = bedFull
        ? `This bed has no free space left for new rows. ${fixes.length ? "" : "Harvest or remove a planting first, or plant anyway."}`.trim()
        : `This planting needs a strip ${needL.toFixed(1)} m long and ${(needW * 100).toFixed(0)} cm wide. The largest free strip here is ${free.lengthM.toFixed(1)} m × ${(free.widthM * 100).toFixed(0)} cm.`;
      return { error, count: n, rows, tooWide: true, problem: { kind: "space", need: { widthM: needW, lengthM: needL }, free, fixes, canForce: !!forcedAt() } };
    };
    let start, alongStart;
    if (input.force) {
      const at = forcedAt(); if (!at) return fail(`This planting is bigger than the bed itself (${rows} rows × ${length} m).`, rows > 1 ? "rowCount" : "lengthM");
      [start, alongStart] = at;
    } else if (input.startM !== undefined && input.startM !== "") {
      start = Number(input.startM);
      alongStart = Number(input.alongStartM) || 0;
      if (!Number.isFinite(start) || !fits(start, alongStart)) return tooWide();
      if (taken.some((r) => overlaps(r, rectAt(start, alongStart))))
        return { ...fail("This spot overlaps an existing planting. Choose free space."), problem: { kind: "space", need: { widthM: height, lengthM: length }, free: freeStrip(taken, vertical, cross, alongMax, height), fixes: [], canForce: !!forcedAt() } };
    } else {
      // First free spot, scanning across the bed, then along it. Plantings in either direction can share a bed.
      const crossStarts = [...new Set([0.1, ...taken.map((r) => (vertical ? r.x1 : r.y1) + 0.1)])].sort(
        (a, b) => a - b,
      );
      const alongStarts = [...new Set([0, ...taken.map((r) => (vertical ? r.y1 : r.x1))])].sort(
        (a, b) => a - b,
      );
      outer: for (const c of crossStarts)
        for (const a of alongStarts)
          if (fits(c, a) && !taken.some((r) => overlaps(r, rectAt(c, a)))) {
            start = c;
            alongStart = a;
            break outer;
          }
      if (start === undefined) return tooWide();
    }
    if (!byRows) count = value;
    const layout = {
      version: 2,
      pattern,
      across: axis !== axisOf(zone),
      spacingCM,
      rowSpacingCM,
      startM: start,
      alongStartM: alongStart,
      rowCount: rows,
      lengthM: length,
      mode: byRows ? "rows" : "plants",
    };
    if (input.force) layout.forced = true;
    if (zone.type === "orchard") {
      const existing = layoutPlots(zone, plots)
        .filter((p) => p.id !== excludeId && p.layout.pattern === "scatter")
        .flatMap((p) =>
          physicalPoints(zone, p).map((q) => ({ ...q, spacing: (p.layout.spacingCM || spacingCM) / 100 })),
        );
      if (
        existing.length &&
        physicalPoints(zone, { plantCount: count, layout }).some((q) =>
          existing.some((p) => Math.hypot(q.xM - p.xM, q.yM - p.yM) < Math.max(spacing, p.spacing) - EPS),
        )
      )
        return {
          ...fail("These rows would overlap scattered trees. Change spacing or use a scattered arrangement."),
          count,
          rows,
        };
    }
    return { count, rows, error: "", height, layout, yieldFactor, rect: rectAt(start, alongStart) };
  };
  const chosen = input.lengthM !== undefined && input.lengthM !== "" && input.lengthM !== null && !input.lengthAuto;
  const first = placeRows(chosen || input.lengthAuto ? Math.min(Number(input.lengthM), alongMax) : alongMax);
  if (chosen || !first.error || !first.tooWide) return first;
  // No full-length spot: shorten rows in 10 cm steps until the planting fits the free space.
  const from = input.lengthAuto ? Math.min(Number(input.lengthM), alongMax) : alongMax;
  for (
    let length = Math.floor((from - 0.1) * 10) / 10;
    length > 0.25;
    length = Math.round((length - 0.1) * 10) / 10
  ) {
    const next = placeRows(length);
    if (!next.error) return { ...next, shortened: true };
    if (!next.tooWide) break;
  }
  return first;
}
/** The largest free strip in a bed for rows of a given width: { widthM, lengthM } in bed-local metres.
    widthM is the free cross-space at the best spot (capped at the bed), lengthM how far rows can run there. */
export function freeStrip(taken, vertical, cross, alongMax, height) {
  const rects = taken.map((r) => (vertical ? { c0: r.x0, c1: r.x1, a0: r.y0, a1: r.y1 } : { c0: r.y0, c1: r.y1, a0: r.x0, a1: r.x1 }));
  const crossStarts = [...new Set([0.1, ...rects.map((r) => r.c1 + 0.1)])].filter((c) => c <= cross - 0.1 + EPS).sort((a, b) => a - b);
  const alongStarts = [...new Set([0, ...rects.map((r) => r.a1)])].filter((a) => a < alongMax - EPS).sort((a, b) => a - b);
  let best = { widthM: 0, lengthM: 0 };
  crossStarts.forEach((c) => {
    // free width at c: up to the next planting above it (or the bed edge)
    const w0 = Math.min(cross - 0.1 - c, ...rects.filter((r) => r.c0 >= c - EPS).map((r) => r.c0 - 0.1 - c).filter((w) => w > 0));
    const h = Math.min(height, Math.max(0, w0));
    alongStarts.forEach((a) => {
      const blockers = rects.filter((r) => r.c0 < c + h - EPS && r.c1 > c + EPS);
      if (blockers.some((r) => r.a0 < a + EPS && r.a1 > a + EPS)) return; // the strip starts inside a planting
      const L = Math.min(alongMax - a, ...blockers.filter((r) => r.a0 >= a - EPS).map((r) => r.a0 - a));
      const score = (len, wid) => Math.min(len, 50) * 10 + wid;
      if (L > EPS && w0 > EPS && score(L, w0) > score(best.lengthM, best.widthM)) best = { widthM: Math.round(w0 * 1000) / 1000, lengthM: Math.round(L * 1000) / 1000 };
    });
  });
  return best;
}
// Stable, bounded best-candidate placement. Saved coordinates are never re-randomized on render.
export function scatterTrees(zone, plots, count, spacing, excludeId, seedText = "") {
  const occupied = layoutPlots(zone, plots)
    .filter((p) => p.id !== excludeId)
    .flatMap((p) => {
      const points = p.layout?.points || physicalPoints(zone, p);
      return points.map((q) => ({ ...q, spacing: (p.layout?.spacingCM || spacing * 100) / 100 }));
    });
  const margin = Math.max(0.2, Math.min(spacing / 2, 1)),
    w = zone.wM - margin * 2,
    h = zone.hM - margin * 2;
  if (w < 0 || h < 0) return [];
  const need = (p) => Math.max(spacing, p.spacing || spacing) - 0.00001;
  let best = [];
  // Best-candidate sampling: each tree goes to the most open of several random spots, which packs
  // well and still looks natural. A few deterministic restarts keep the attempt that fits the most.
  for (let attempt = 0; attempt < 8 && best.length < count; attempt++) {
    let seed = [...(zone.id + seedText + (attempt ? attempt : ""))].reduce(
      (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
      7,
    );
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const result = [];
    for (let i = 0; i < count; i++) {
      let pick = null,
        room = 0;
      for (let k = 0; k < 40; k++) {
        const q = { xM: margin + rand() * w, yM: margin + rand() * h };
        let slack = Infinity;
        for (const p of occupied.concat(result))
          slack = Math.min(slack, Math.hypot(q.xM - p.xM, q.yM - p.yM) - need(p));
        if (slack >= 0 && slack >= room) {
          room = slack;
          pick = q;
        }
      }
      if (!pick) break;
      result.push(pick);
    }
    if (result.length > best.length) best = result;
  }
  return best;
}
/** Plant rows of a planting in bed-local metres: [{ vertical, atM, fromM, toM, gapM, points }]. */
export function plantingRows(zone, plot) {
  const l = plot.layout || {};
  if (l.pattern === "scatter") return [];
  const modern = l.version === 2,
    vertical = modern ? axisOf(zone, l) === "vertical" : zone.rowAxis === "vertical",
    cross = vertical ? zone.wM : zone.hM,
    along = modern ? (vertical ? zone.hM : zone.wM) : bedLength(zone);
  const n = Math.max(0, Math.floor(plot.plantCount || 0)),
    num = l.rowCount || 1,
    spacing = (l.spacingCM || 30) / 100,
    a0 = modern ? Number(l.alongStartM) || 0 : 0,
    length = l.lengthM || along,
    rows = [];
  let remaining = n;
  for (let row = 0; row < num; row++) {
    const count = modern
      ? Math.min(remaining, gridCapacity(length, spacing, l.pattern, row))
      : Math.floor(n / num) + (row < n % num ? 1 : 0);
    const at = modern
      ? l.startM + spacing / 2 + (row * l.rowSpacingCM) / 100
      : (((l.startRow || 1) - 1 + row + 0.5) * cross) / bedRows(zone);
    const points = [];
    for (let col = 0; col < count; col++) {
      const pos = modern
        ? a0 + 0.1 + spacing / 2 + (col + (l.pattern === "offset" && row % 2 ? 0.5 : 0)) * spacing
        : ((col + 0.5) * length) / Math.max(1, count);
      points.push({ xM: vertical ? at : pos, yM: vertical ? pos : at });
    }
    rows.push({
      vertical,
      atM: at,
      fromM: a0 + (modern ? 0.1 : 0),
      toM: a0 + length - (modern ? 0.1 : 0),
      gapM: modern ? l.rowSpacingCM / 100 : cross / bedRows(zone),
      pitchM: modern ? spacing : length / Math.max(1, count),
      points,
    });
    remaining -= count;
  }
  return rows;
}
export function physicalPoints(zone, plot) {
  if (plot.layout?.points) return plot.layout.points;
  return plantingRows(zone, plot).flatMap((r) => r.points);
}
/** Centre of a planting in bed-local metres, for map pins and walk routing. */
export function plantingCentre(zone, plot) {
  const pts = physicalPoints(zone, plot);
  if (!pts.length) return { xM: zone.wM / 2, yM: zone.hM / 2 };
  const xs = pts.map((p) => p.xM),
    ys = pts.map((p) => p.yM);
  return { xM: (Math.min(...xs) + Math.max(...xs)) / 2, yM: (Math.min(...ys) + Math.max(...ys)) / 2 };
}
/** Bounding box of a planting's plants in bed-local metres, padded by half a plant space. */
export function plantingBounds(zone, plot) {
  const pts = physicalPoints(zone, plot);
  if (!pts.length) return { x0: 0, y0: 0, x1: zone.wM, y1: zone.hM };
  const pad = Math.max(0.08, (plot.layout?.spacingCM || 30) / 200);
  const xs = pts.map((p) => p.xM),
    ys = pts.map((p) => p.yM);
  return {
    x0: Math.max(0, Math.min(...xs) - pad),
    y0: Math.max(0, Math.min(...ys) - pad),
    x1: Math.min(zone.wM, Math.max(...xs) + pad),
    y1: Math.min(zone.hM, Math.max(...ys) + pad),
  };
}
/**
 * Fill a planting form with the grid defaults for its crop, pattern and bed:
 * orchards default to scattered trees; beds to straight rows in the bed's direction;
 * spacing comes from the row / biointensive guide until the grower edits it.
 */
export function plantingInput(form, crop, zone) {
  const pattern = form.pattern || (zone?.type === "orchard" ? "scatter" : "rows");
  const guide = spacingGuide(crop, pattern === "offset" ? "offset" : "rows");
  const spacingCM = form.spacingCM !== undefined && form.spacingCM !== "" ? form.spacingCM : guide.inRowCM;
  const rowSpacingCM =
    form.rowSpacingCM !== undefined && form.rowSpacingCM !== ""
      ? form.rowSpacingCM
      : pattern === "offset"
        ? Math.round(Number(spacingCM) * (Math.sqrt(3) / 2) * 10) / 10
        : guide.rowCM;
  const axis = form.axis || axisOf(zone, form), vertical = axis === "vertical", alongMax = zone ? (vertical ? zone.hM : zone.wM) : 0;
  const ownLength = form.lengthM !== undefined && form.lengthM !== "" && form.lengthM !== null;
  let lengthM = form.lengthM, lengthAuto = false;
  // plants drive the row length: one row of them plus 10 cm each end, never longer than the bed
  const n = Number(form.plantCount);
  if (!ownLength && pattern !== "scatter" && (form.mode || "plants") === "plants" && Number.isInteger(n) && n >= 1 && Number(spacingCM) > 0 && alongMax > 0) {
    lengthM = Math.min(alongMax, Math.max(0.3, Math.ceil((n * Number(spacingCM) / 100 + 0.2) * 10) / 10)); lengthAuto = true;
  }
  return { ...form, pattern, spacingCM, rowSpacingCM, axis, lengthM, lengthAuto };
}
