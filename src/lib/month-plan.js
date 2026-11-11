// The calendar's month plan: what a month asks of you, split by the job — start seedlings indoors, sow
// outside, plant seedlings out, plant trees and perennials, harvest — plus the tips that go with it.
// Sowing and harvest months come from the crop data (crops.js, regional overrides); how a crop is started
// and when it can go outside come from the nursery model (propagation.js, the region's frost dates).
import { MN_ABR, MN_FULL, parseSowMonths, getCropDifficulty } from "./calendar.js";
import { rCR } from "./regional.js";
import { propagationOf, PERENNIALS } from "../data/propagation.js";
import { frostDates, plantOutWindow, activeBatches } from "../features/nursery/nursery-model.js";
import { localDateFromKey, addDaysToLocalKey } from "./utils.js";

const PLANTED_CATS = new Set(["Fruit Tree", "Nut Tree", "Fruit"]);
const ALL_MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const pad = (n) => String(n).padStart(2, "0");

/** Months (0–11) of a "Mar-May, Sep" string; "Year-round" is every month. */
export function monthsOf(text) {
  return /year/i.test(String(text || "")) ? ALL_MONTHS : parseSowMonths(text);
}
/** "Jul-Oct" → "Jul–Oct" for display. */
export const seasonText = (text) => String(text || "").replace(/-/g, "–");

/** How a crop gets into the ground: "indoors" (raised in trays), "outside" (sown direct) or "plant" (bought as a plant). */
export function startOf(crop) {
  const p = propagationOf(crop);
  if (p.method === "transplant") return "indoors";
  if (PLANTED_CATS.has(crop.cat) || PERENNIALS.has(crop.name)) return "plant";
  return "outside";
}

/**
 * Months a tray-raised crop goes outside: each sowing month plus its weeks in trays, and never before the
 * crop may go out after the last spring frost (hardy crops a few weeks before it, tender ones after).
 */
export function plantOutMonths(crop, frost, year) {
  const p = propagationOf(crop);
  if (p.method !== "transplant") return [];
  const w = plantOutWindow(crop, year, frost),
    earliest = localDateFromKey(w.earliest).getMonth(),
    firstFrost = Number(frost.first.slice(0, 2)) - 1;
  const out = new Set();
  for (const m of monthsOf(crop.sowIn)) {
    const ready = localDateFromKey(addDaysToLocalKey(`${year}-${pad(m + 1)}-15`, p.weeks * 7)).getMonth();
    // A spring sowing that is ready too soon waits for the window. A hardy crop sown in summer or autumn goes
    // out when it is ready; one that does not stand frost is kept under cover until the window opens in spring.
    const early = ready >= m && ready < earliest,
      tooLate = !p.hardy && (ready < m || ready >= firstFrost);
    out.add(early || tooLate ? earliest : ready);
  }
  return [...out].sort((a, b) => a - b);
}

/** The year a month refers to when planning ahead from today: this year, or next year once the month has passed. */
export function planYear(month, todayKey) {
  const t = localDateFromKey(todayKey);
  return t.getFullYear() + (month < t.getMonth() ? 1 : 0);
}

const RANK = { Easy: 0, Medium: 1, Advanced: 2 };
const byEase = (a, b) => Number(a.mine) - Number(b.mine) || RANK[a.diff.l] - RANK[b.diff.l] || a.name.localeCompare(b.name);

/**
 * Everything the calendar shows for one month.
 * { year, indoors, outside, plantOut, plant, harvest } — each a list of
 * { name, crop, diff, mine, note } with the easy crops first and the ones already growing last
 * (harvest: your own crops first).
 */
export function monthPlan(data, month, todayKey) {
  const year = planYear(month, todayKey),
    frost = frostDates(data);
  const growing = new Set((data?.garden?.plots || []).filter((p) => p.status !== "harvested").map((p) => p.crop));
  (activeBatches(data || {}) || []).forEach((b) => growing.add(b.crop));
  const plan = { year, indoors: [], outside: [], plantOut: [], plant: [], harvest: [] };
  for (const crop of rCR(data?.region)) {
    const start = startOf(crop),
      p = propagationOf(crop),
      mine = growing.has(crop.name),
      base = { name: crop.name, crop, diff: getCropDifficulty(crop.name), mine },
      season = `Harvest ${seasonText(crop.harvest)}`;
    if (monthsOf(crop.sowIn).includes(month)) {
      if (start === "indoors") {
        const sowOn = `${year}-${pad(month + 1)}-15`,
          ready = localDateFromKey(addDaysToLocalKey(sowOn, p.weeks * 7)).getMonth(),
          outs = plantOutMonths(crop, frost, year),
          out = outs.find((m) => m >= ready) ?? outs.find((m) => m >= month) ?? outs[0];
        plan.indoors.push({ ...base, note: `${p.weeks} weeks in trays · plant out ${MN_ABR[out]}` });
      } else if (start === "plant") plan.plant.push({ ...base, note: season });
      else plan.outside.push({ ...base, note: p.method === "either" ? `${season} · or start in trays` : season });
    }
    if (start === "indoors" && plantOutMonths(crop, frost, year).includes(month)) plan.plantOut.push({ ...base, note: season });
    if (monthsOf(crop.harvest).includes(month)) plan.harvest.push({ ...base, note: `${mine ? "Yours · " : ""}${seasonText(crop.harvest)}` });
  }
  for (const k of ["indoors", "outside", "plantOut", "plant"]) plan[k].sort(byEase);
  plan.harvest.sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name));
  return plan;
}

const dayMonth = (mmdd) => {
  const [m, d] = mmdd.split("-").map(Number);
  return `${d} ${MN_ABR[m - 1]}`;
};
/** One line about the month, from the farm's frost dates. */
export function monthTip(data, month) {
  const f = frostDates(data),
    last = Number(f.last.slice(0, 2)) - 1,
    first = Number(f.first.slice(0, 2)) - 1;
  const before = (m, n) => (m - n + 12) % 12;
  if (month === last) return `Last frost around ${dayMonth(f.last)}. Tender plants go outside after it, not before.`;
  if (month === before(last, 1) || month === before(last, 2)) return `Last frost around ${dayMonth(f.last)}. Start tender crops indoors now so they are ready for it.`;
  if (month === first) return `First frost around ${dayMonth(f.first)}. Pick tender crops before it.`;
  if (month === before(first, 1)) return `First frost around ${dayMonth(f.first)}. Sow now only what stands the cold.`;
  const frostFree = last < first ? month > last && month < first : month > last || month < first;
  return frostFree
    ? `Frost-free until about ${dayMonth(f.first)}. Water in the evening and pick often.`
    : `Frost likely until about ${dayMonth(f.last)}. Good time to plant bare-root trees and plan your beds.`;
}

/** The one-line tip under each job. */
export const JOB_TIPS = {
  indoors: "Bright windowsill, damp compost.",
  outside: "Rake fine, water the row, sow thinly.",
  plantOut: "Harden off for a week first.",
  plant: "Water in well, then mulch.",
  harvest: "Pick little and often.",
};
export const JOB_TITLES = { indoors: "Start indoors", outside: "Sow outside", plantOut: "Plant out", plant: "Plant", harvest: "Harvest" };
export const JOBS = ["indoors", "outside", "plantOut", "plant", "harvest"];

/** A crop's year, for the 12-cell bar: { sow, out, harvest } as month lists, and what "sow" means for it. */
export function cropYear(crop, data, year) {
  const start = startOf(crop);
  return {
    start,
    sow: monthsOf(crop.sowIn),
    out: plantOutMonths(crop, frostDates(data), year),
    harvest: monthsOf(crop.harvest),
  };
}

/** Short facts for the crop sheet: how to start it and when it goes outside. */
export function cropTips(crop, data, year) {
  const p = propagationOf(crop),
    f = frostDates(data),
    tips = [];
  if (p.method === "transplant" || p.method === "either") {
    tips.push(`Seed comes up in about ${p.germDays} days.`);
    tips.push(p.method === "either" ? `Sow direct, or give it ${p.weeks} weeks in trays for a head start.` : `Raise it in trays for ${p.weeks} weeks${p.potOn ? ", moving it to a bigger pot once" : ""}.`);
    const w = plantOutWindow(crop, year, f),
      when = localDateFromKey(w.earliest),
      rel = p.frostWeeks === 0 ? "at the last frost" : `${Math.abs(p.frostWeeks)} week${Math.abs(p.frostWeeks) === 1 ? "" : "s"} ${p.frostWeeks < 0 ? "before" : "after"} the last frost`;
    tips.push(`${p.method === "either" ? "Tray-raised plants go" : "Goes"} outside from about ${when.getDate()} ${MN_ABR[when.getMonth()]} (${rel}).`);
  }
  if (crop.waterNote) tips.push(crop.waterNote);
  return tips;
}

/** What next month asks for, so seed and compost can be bought in time: { month, name, year, indoors, outside, plant, tip }. */
export function nextMonthPreview(data, month, todayKey) {
  const next = (month + 1) % 12,
    plan = monthPlan(data, next, todayKey);
  const tip = plan.indoors.length ? "Buy seed, trays and seed compost now." : plan.outside.length ? "Clear and weed the bed now." : plan.plant.length ? "Order plants now: nurseries sell out." : "";
  return { month: next, name: MN_FULL[next], year: plan.year, indoors: plan.indoors.length, outside: plan.outside.length, plantOut: plan.plantOut.length, plant: plan.plant.length, tip };
}
