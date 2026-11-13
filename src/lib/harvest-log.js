/* ═══════════════════════════════════════════
   HARVEST LOG — "I picked something" from the + menu or the Pantry.
   One record does both jobs: the yield is remembered for the planting
   (Progress, Insights, the bed's history) and the produce goes into the
   Pantry as farm stock. Bought or gifted stock stays on "Add stock".
   ═══════════════════════════════════════════ */
import { addStock } from "./inventory.js";
import { recordHarvest } from "./memory.js";
import { rCM } from "./regional.js";
import { isRecurringCrop, afterRecurringHarvest } from "./perennial.js";
import { isAwaitingSowing } from "./sowing.js";
import { appendLog } from "./utils.js";

/** Plantings that can be picked from: in the ground, not finished, not still waiting to be sown. */
export function harvestablePlots(data) {
  const plots = (data && data.garden && data.garden.plots) || [];
  return plots.filter(function (p) {
    return p && p.status !== "harvested" && p.status !== "planned" && !isAwaitingSowing(p);
  });
}

/**
 * h: { plotId?, name?, qty, unit?, date?, last? }
 * - plotId: the planting it came from (its crop name and kg are used).
 * - name/unit: produce that is not on the map yet ("Something else").
 * - last: the final pick — an annual planting is closed; a tree or perennial stays.
 */
export function logHarvest(data, h, todayKey) {
  const qty = Math.round((Number(h && h.qty) || 0) * 1000) / 1000;
  if (!(qty > 0)) return data;
  const plots = (data.garden && data.garden.plots) || [];
  const plot = h.plotId ? plots.find(function (p) { return p.id === h.plotId; }) : null;
  const name = plot ? plot.crop : String(h.name || "").trim();
  if (!name) return data;
  const date = h.date && h.date <= todayKey ? h.date : todayKey;
  const unit = plot ? "kg" : h.unit || "kg";
  const crop = rCM(data.region).get(name);
  let next = data;
  if (plot) {
    const recurring = isRecurringCrop(crop);
    next = recordHarvest(next, plot, qty, date, plot.expectedYieldKg || null, !!h.last && !recurring, false);
    if (h.last) {
      next = {
        ...next,
        garden: { ...next.garden, plots: plots.map(function (x) {
          if (x.id !== plot.id) return x;
          return recurring ? afterRecurringHarvest(x, crop, date) : { ...x, status: "harvested" };
        }) },
      };
    }
  }
  next = addStock(next, { name, category: h.category || "Fresh Produce", qty, unit, source: "farm", storageNote: (crop && crop.storage) || "" }, date);
  const amount = unit === "kg" ? qty + " kg" : qty + " " + unit;
  return { ...next, log: appendLog(next.log, { text: "🧺 Harvested " + amount + " " + name }) };
}
