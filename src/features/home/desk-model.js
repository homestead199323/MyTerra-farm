/* The desktop home's cards and live table (spec: docs/superpowers/specs/2026-11-14-desktop-farm-cards-design.md).
   Pure: every number comes from the farm's own data. Nothing here is written, nothing ticks. */
import { produceTotals, plantingCounts } from "../../lib/progress.js";
import { stockLines, stockValue } from "../../lib/inventory.js";
import { formatMoneyShort } from "../../lib/money.js";
import { weekLoad } from "../../lib/time-budget.js";
import { buildZoneSpaceMap } from "../../lib/farm-calc.js";
import { isAwaitingSowing } from "../../lib/sowing.js";
import { addDaysToLocalKey, localDateFromKey, localDayNumber } from "../../lib/utils.js";
import { POULTRY_SPECIES } from "../../data/livestock.js";
import { growthOf, animalZone, STAGES } from "../quiet/farm-model.js";
import { isPlantZone } from "../farm/living/visuals.js";

export const MAX_CARDS = 4;
export const CARD_IDS = ["jobs", "harvest", "rain", "picked", "eggs", "growing", "money", "cold", "pantry", "time", "space"];
export const CARD_LABEL = {
  jobs: "Today’s jobs", harvest: "Next harvest", rain: "Rain this week", picked: "Harvested", eggs: "Eggs", growing: "Growing now",
  money: "Money this year", cold: "Coldest night", pantry: "Pantry", time: "Time this week", space: "Space planted",
};

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayOf = (key) => { const d = localDateFromKey(key); return d ? DAY[d.getDay()] : ""; };
const dayNo = (key) => { const d = localDateFromKey(key); return d ? localDayNumber(d) : null; };
const tidy = (n) => { const v = Math.round((Number(n) || 0) * 10) / 10; return Number.isInteger(v) ? String(v) : v.toFixed(1); };
const plural = (n, one, many) => (n === 1 ? one : many);
const off = { available: false, big: "", unit: "", sub: "", visual: null };

/** Plantings in the ground, soonest harvest first (ready ones lead; no harvest date goes last). */
export function plantingRows(data, crops, todayKey) {
  const zones = (data && data.zones) || [], zoneById = new Map(zones.map((z) => [z.id, z])), now = dayNo(todayKey);
  const rows = [];
  (((data && data.garden) || {}).plots || []).forEach((p) => {
    if (!p || p.status === "harvested" || p.status === "planned" || isAwaitingSowing(p)) return;
    const g = growthOf(p, crops && crops.get ? crops.get(p.crop) : null, todayKey), due = dayNo(p.harvestDate);
    const left = due == null || now == null ? null : due - now, ready = g.index === 5 || (left != null && left <= 0);
    const zone = zoneById.get(p.zone);
    rows.push({ id: p.id, crop: p.crop, name: p.name || p.crop, zoneId: zone ? zone.id : null, where: zone ? zone.name || "" : "",
      stage: ready ? 5 : g.index, stageLabel: ready ? "Ready" : STAGES[g.index], progress: ready ? 1 : g.progress, left, ready });
  });
  const rank = (r) => (r.ready ? -1e6 + (r.left || 0) : r.left == null ? 1e6 : r.left);
  return rows.sort((a, b) => rank(a) - rank(b));
}

/** One row per group of animals, with the area they live in. */
export function animalRows(data) {
  const zones = (data && data.zones) || [];
  return ((((data && data.livestock) || {}).animals) || []).filter(Boolean).map((a) => {
    const zone = animalZone(a, zones);
    return { id: a.id, type: a.type, name: a.name || a.type, count: Number(a.count) || 1, zoneId: zone ? zone.id : null, where: zone ? zone.name || "" : "" };
  });
}

const forecastDays = (ctx) => (ctx.forecast && Array.isArray(ctx.forecast.days) ? ctx.forecast.days.slice(0, 7) : []);
const weekCache = new WeakMap(); // the week's workload builds seven task plans: once per data object
function loadOf(ctx) {
  const hit = weekCache.get(ctx.data);
  if (hit && hit.forecast === ctx.forecast && hit.day === ctx.todayKey) return hit.load;
  let load = { total: 0, days: [] };
  try { load = weekLoad(ctx.data, ctx.forecast, ctx.todayKey); } catch { /* a farm the planner cannot read still gets its other cards */ }
  weekCache.set(ctx.data, { forecast: ctx.forecast, day: ctx.todayKey, load });
  return load;
}

const VALUE = {
  jobs(ctx) {
    const p = ctx.progress || { done: 0, total: 0, left: 0 }, total = p.total || 0, done = p.done || 0, left = p.left || 0;
    return { available: true, big: String(done), unit: total ? `of ${total} done` : "jobs today", sub: left ? `${left} left` : total ? "All done" : "Nothing due",
      visual: { kind: "ring", pct: total ? done / total : 0 }, target: { type: "tab", tab: "jobs" } };
  },
  harvest(ctx) {
    const row = plantingRows(ctx.data, ctx.crops, ctx.todayKey).find((r) => r.ready || r.left != null);
    if (!row) return { ...off, target: { type: "tab", tab: "plantings" } };
    return { available: true, big: row.ready ? "Ready" : String(row.left), unit: row.ready ? "" : plural(row.left, "day", "days"), sub: row.where ? `${row.name} · ${row.where}` : row.name,
      visual: { kind: "crop", crop: row.crop, stage: row.stage, pct: row.progress }, target: { type: "plot", plotId: row.id, zoneId: row.zoneId } };
  },
  rain(ctx) {
    const days = forecastDays(ctx);
    if (!days.length || !ctx.data.city) return { ...off, target: { type: "week" } };
    const values = days.map((d) => Number(d.rainMm) || 0), sum = values.reduce((a, b) => a + b, 0), top = values.indexOf(Math.max(...values));
    return { available: true, big: String(Math.round(sum)), unit: "mm", sub: sum >= .5 ? `Wettest on ${dayOf(days[top].date)}` : "Dry week",
      visual: { kind: "bars", values, labels: days.map((d) => dayOf(d.date).slice(0, 1)) }, target: { type: "week" } };
  },
  picked(ctx) {
    const t = produceTotals(ctx.data, ctx.todayKey, 6), now = localDateFromKey(ctx.todayKey) || new Date();
    return { available: t.harvests > 0, big: tidy(t.byMonth[5].kg), unit: "kg", sub: `${MONTH[now.getMonth()]} so far`,
      visual: { kind: "bars", values: t.byMonth.map((m) => m.kg), labels: t.byMonth.map((m) => m.label.slice(0, 1)), hi: 5 }, target: { type: "page", page: "progress" } };
  },
  eggs(ctx) {
    const birds = (((ctx.data.livestock || {}).animals) || []).filter((a) => a && POULTRY_SPECIES.has(a.type));
    const zone = birds.length ? animalZone(birds[0], ctx.data.zones || []) : null, now = dayNo(ctx.todayKey), values = [0, 0, 0, 0, 0, 0, 0];
    (((ctx.data.pantry || {}).moves) || []).forEach((m) => {
      if (!m || m.kind !== "in" || m.unit !== "pcs" || !/egg/i.test(m.name || "")) return;
      const ago = now - dayNo(m.date);
      if (ago >= 0 && ago < 7) values[6 - ago] += Number(m.qty) || 0;
    });
    const sum = Math.round(values.reduce((a, b) => a + b, 0));
    return { available: birds.length > 0, big: String(sum), unit: plural(sum, "egg", "eggs"), sub: "Last 7 days",
      visual: { kind: "bars", values, labels: values.map((_, i) => dayOf(addDaysToLocalKey(ctx.todayKey, i - 6)).slice(0, 1)), hi: 6 },
      target: zone ? { type: "zone", zoneId: zone.id } : { type: "page", page: "live" } };
  },
  growing(ctx) {
    const c = plantingCounts(ctx.data, ctx.todayKey), rows = plantingRows(ctx.data, ctx.crops, ctx.todayKey), parts = [1, 2, 3, 4, 5].map((s) => ({ n: rows.filter((r) => r.stage === s).length, tone: s }));
    return { available: c.growing > 0, big: String(c.growing), unit: plural(c.growing, "planting", "plantings"), sub: c.ready ? `${c.ready} ready to pick` : c.waiting ? `${c.waiting} still to sow` : "",
      visual: { kind: "split", parts }, target: { type: "tab", tab: "plantings" } };
  },
  money(ctx) {
    const year = String(ctx.todayKey || "").slice(0, 4);
    let earned = 0, spent = 0, entries = 0;
    (((ctx.data.costs || {}).items) || []).forEach((i) => {
      if (!i || String(i.date || "").slice(0, 4) !== year) return;
      const a = Number(i.amount) || 0; entries += 1;
      if (i.type === "income") earned += a; else if (i.type === "expense") spent += a;
    });
    const net = Math.round((earned - spent) * 100) / 100, sign = net > 0 ? "+" : net < 0 ? "−" : "";
    return { available: entries > 0, big: sign + formatMoneyShort(Math.abs(net), ctx.data), unit: "", sub: `${formatMoneyShort(earned, ctx.data)} in · ${formatMoneyShort(spent, ctx.data)} out`,
      visual: { kind: "fill", pct: earned + spent > 0 ? earned / (earned + spent) : 0 }, target: { type: "page", page: "fin" } };
  },
  cold(ctx) {
    const days = forecastDays(ctx).filter((d) => typeof d.tMin === "number");
    if (!days.length) return { ...off, target: { type: "week" } };
    const mins = days.map((d) => d.tMin), low = Math.min(...mins), at = mins.indexOf(low), high = Math.max(...mins);
    return { available: true, big: `${Math.round(low)}°`, unit: "", sub: at === 0 ? "Tonight" : `On ${dayOf(days[at].date)}`,
      visual: { kind: "bars", values: mins.map((v) => v - low + Math.max(1, (high - low) * .15)), labels: days.map((d) => dayOf(d.date).slice(0, 1)), hi: at }, target: { type: "week" } };
  },
  pantry(ctx) {
    const lines = stockLines((ctx.data.pantry || {}).items).filter((l) => l.qty > 0), worth = stockValue(ctx.data);
    return { available: lines.length > 0, big: String(lines.length), unit: plural(lines.length, "product", "products"), sub: worth > 0 ? `Worth ${formatMoneyShort(worth, ctx.data)}` : "In stock",
      visual: null, target: { type: "page", page: "pantry" } };
  },
  time(ctx) {
    const load = loadOf(ctx), total = Math.round(load.total || 0), days = load.days || [];
    return { available: true, big: total < 60 ? String(total) : tidy(total / 60), unit: total < 60 ? "min" : plural(total / 60, "hour", "hours"), sub: "Jobs, next 7 days",
      visual: { kind: "bars", values: days.map((d) => d.minutes || 0), labels: days.map((d) => dayOf(d.date).slice(0, 1)), hi: 0 }, target: { type: "page", page: "tasks" } };
  },
  space(ctx) {
    const beds = (ctx.data.zones || []).filter((z) => z && isPlantZone(z.type));
    if (!beds.length) return { ...off, target: { type: "page", page: "crops" } };
    const map = buildZoneSpaceMap(beds, ((ctx.data.garden || {}).plots) || [], ctx.data.farmW, ctx.data.farmH, ctx.data.region);
    let total = 0, used = 0; beds.forEach((z) => { total += map[z.id].totalM2 || 0; used += Math.min(map[z.id].usedM2 || 0, map[z.id].totalM2 || 0); });
    const pct = total > 0 ? Math.min(1, used / total) : 0;
    return { available: total > 0, big: String(Math.round(pct * 100)), unit: "%", sub: `${tidy(Math.max(0, total - used))} m² free`, visual: { kind: "fill", pct }, target: { type: "page", page: "crops" } };
  },
};

/** What one card shows right now: { id, label, available, big, unit, sub, visual, target }. */
export function cardValue(id, ctx) {
  const make = VALUE[id];
  if (!make) return { id, label: "", ...off, target: null };
  return { id, label: CARD_LABEL[id], ...make({ ...ctx, data: ctx.data || {} }) };
}

export const allCards = (ctx) => CARD_IDS.map((id) => cardValue(id, ctx));

/** The app's pick for this farm: only cards it can fill, four at most. */
export function suggestedIds(ctx) {
  const ok = (id) => cardValue(id, ctx).available;
  const out = ["jobs", "harvest", "rain"].filter(ok), extra = ["eggs", "picked", "growing"].find(ok);
  if (extra) out.push(extra);
  return out.slice(0, MAX_CARDS);
}

/** The cards on screen: the user's own list once they have edited it (cleaned), else the suggestion. */
export function shownCards(data, ctx) {
  const stored = data && data.deskCards;
  if (!Array.isArray(stored)) return suggestedIds(ctx).map((id) => cardValue(id, ctx));
  const out = [];
  stored.forEach((id) => {
    if (out.length >= MAX_CARDS || !CARD_IDS.includes(id) || out.some((c) => c.id === id)) return;
    const c = cardValue(id, ctx);
    if (c.available) out.push(c);
  });
  return out;
}
export const shownIds = (data, ctx) => shownCards(data, ctx).map((c) => c.id);

export const addCard = (ids, id) => (!CARD_IDS.includes(id) || ids.includes(id) || ids.length >= MAX_CARDS ? ids : [...ids, id]);
export const removeCard = (ids, id) => ids.filter((x) => x !== id);
export function moveCard(ids, from, to) {
  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length || from === to) return ids;
  const out = ids.slice(), [it] = out.splice(from, 1);
  out.splice(to, 0, it);
  return out;
}
