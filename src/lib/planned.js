/* ═══════════════════════════════════════════
   PLANNED — plantings saved without a plant date (2026-11-11)

   The planting form saves a dateless planting as a plan. Until this file
   those plans carried no waiting flag (lib/sowing.js), so they made no job
   on Today, never showed under "waiting to go in" on Plan, and the calendar
   called them "Growing". Now every plan says when it can go in.
   ═══════════════════════════════════════════ */
import { CROPS } from "../data/crops.js";
import { sowTiming } from "./suggest.js";
import { waitingFields } from "./sowing.js";
import { localDateFromKey } from "./utils.js";

const BY_NAME = new Map(CROPS.map(function (c) { return [c.name, c]; }));

/** The waiting fields (`sowPending` or `sowFrom`) for a crop planned on `todayKey` in this region. */
export function plannedFields(cropName, region, todayKey) {
  const crop = BY_NAME.get(cropName);
  if (!crop) return { sowPending: true };
  return waitingFields(sowTiming(crop, region, localDateFromKey(todayKey)), todayKey);
}

/**
 * Plans saved before the fix get their flag on load. Left alone: plantings with a date,
 * plans that already wait, and nursery plantings (they follow their seedling batch).
 */
export function migratePlanned(data, todayKey) {
  const plots = data && data.garden && data.garden.plots;
  if (!Array.isArray(plots) || plots.length === 0) return data;
  const fromNursery = new Set(((data.nursery && data.nursery.batches) || []).map(function (b) { return b.plotId; }).filter(Boolean));
  let changed = false;
  const next = plots.map(function (p) {
    if (!p || p.status !== "planned" || p.plantDate || p.plannedDate || p.sowPending || p.sowFrom) return p;
    if (fromNursery.has(p.id) || !Array.isArray(p.steps) || p.steps.length === 0) return p;
    changed = true;
    return { ...p, ...plannedFields(p.crop, data.region, todayKey) };
  });
  return changed ? { ...data, garden: { ...data.garden, plots: next } } : data;
}
