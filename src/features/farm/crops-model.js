/* The Crops page list (pure, unit tested): what is growing, grouped by kind, and which groups start open. */
import { isTreeCrop } from "../quiet/planting-plan.js";
import { localDateFromKey } from "../../lib/utils.js";

/** A short list is shown whole; a long one starts as closed groups so the page reads at a glance. */
export const OPEN_ALL_UP_TO = 6;

const sum = (list, key) => list.reduce((s, p) => s + (+p[key] || 0), 0);

/** Days until the planting's harvest date (Infinity when it has none yet). */
export function dueIn(plot, todayKey) {
  const h = localDateFromKey(plot.harvestDate), t = localDateFromKey(todayKey);
  return h && t ? Math.round((h - t) / 864e5) : Infinity;
}

/** Ready to pick: in the ground and at (or past) its harvest date. */
export function isReady(plot, todayKey) {
  return !plot.sowPending && plot.status !== "planned" && !!plot.plantDate && dueIn(plot, todayKey) <= 0;
}

function kindOf(plot, zones, cropMap) {
  const z = zones.find((q) => q.id === plot.zone), c = cropMap.get(plot.crop);
  if (z?.type === "orchard" || isTreeCrop(c)) return "orchard";
  if (c?.cat === "Herb" || z?.type === "herbs") return "herbs";
  return "beds";
}

/**
 * The groups of the Crops page, soonest harvest first inside each. Empty groups are left out.
 * → [{ key, title, unit, plots, count, kg, ready }]
 */
export function cropSections(data, cropMap, todayKey, environment = "farm") {
  const zones = data.zones || [];
  const active = (data.garden?.plots || []).filter((p) => p.status !== "harvested");
  const titles = [
    ["beds", environment === "balcony" ? "Pots and planters" : "Vegetable beds", "plants"],
    ["herbs", "Herbs", "plants"],
    ["orchard", "Fruit trees", "trees"],
  ];
  return titles.map(([key, title, unit]) => {
    const plots = active.filter((p) => kindOf(p, zones, cropMap) === key).sort((a, b) => dueIn(a, todayKey) - dueIn(b, todayKey));
    return { key, title, unit, plots, count: sum(plots, "plantCount"), kg: sum(plots, "expectedYieldKg"), ready: plots.filter((p) => isReady(p, todayKey)).length };
  }).filter((s) => s.plots.length > 0);
}

/**
 * Is this group open? The user's own choice wins; otherwise a short page shows everything, and a long one
 * opens only the group that holds the crop being looked at.
 */
export function sectionOpen(key, { choice, total, selectedKey }) {
  if (choice && typeof choice[key] === "boolean") return choice[key];
  if (total <= OPEN_ALL_UP_TO) return true;
  return !!selectedKey && selectedKey === key;
}

/** The group a planting is listed in (null when it is not on the page). */
export function sectionOfPlot(sections, plotId) {
  const s = sections.find((sec) => sec.plots.some((p) => p.id === plotId));
  return s ? s.key : null;
}

/** What to say on the right of a crop row: the one thing worth knowing now. → { text, tone: "ready" | "wait" | "" } */
export function rowStatus(plot, growth, todayKey) {
  if (growth.waiting) return { text: growth.label, tone: "wait" };
  if (plot.status === "planned" || !plot.plantDate) return { text: "Planned", tone: "wait" };
  const d = dueIn(plot, todayKey);
  if (d <= 0) return { text: "Ready to pick", tone: "ready" };
  if (d === Infinity) return { text: growth.label, tone: "" };
  if (d <= 14) return { text: `${d} ${d === 1 ? "day" : "days"} to harvest`, tone: "" };
  if (d <= 84) return { text: `${Math.round(d / 7)} weeks to harvest`, tone: "" };
  return { text: `${Math.round(d / 30)} months to harvest`, tone: "" };
}
