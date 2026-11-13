import { propagationOf, PERENNIALS, FROST_HARDY_HARVEST } from "../../data/propagation.js";
import { REGION_MAP } from "../../data/regions.js";
import { suggestTrays, trayOf, potTrayFor } from "../../data/trays.js";
import { SEEDLING_STAGES } from "../../lib/seedling-stage.js";
import { addDaysToLocalKey, localDateFromKey } from "../../lib/utils.js";

export const STAGE_LABELS = {
  sown: "Sown",
  sprouted: "Sprouted",
  potted: "Potted on",
  hardening: "Hardening off",
  planted: "Planted out",
};
/** Extra seeds sown to cover germination and seedling losses. */
export const SOW_EXTRA = 0.2;

export const activeBatches = (data) => (data.nursery?.batches || []).filter((b) => b.stage !== "planted");
export const nurseryZones = (data) => (data.zones || []).filter((z) => z.type === "nursery");
/** Seedlings started without a nursery area on the map live here. */
export const WINDOWSILL = "windowsill";
const placeName = (zones, id, fallback) => zones.get(id)?.name || (id === WINDOWSILL ? "Windowsill" : fallback);

/** Stages this batch goes through (potting on only for crops that need it). */
export function stagesOf(batch) {
  return SEEDLING_STAGES.filter((s) => s !== "potted" || batch.potOn);
}

const days = (from, to) => Math.round((localDateFromKey(to) - localDateFromKey(from)) / 864e5);

const later = (a, b) => (a > b ? a : b);
/**
 * Planned or actual date for every stage, always in order and following the plants: sprouting after
 * the crop's germination days, potting on two weeks later (if needed), at least a few days before
 * hardening off starts, and a week of hardening off before planting out. Recorded dates are kept.
 * If the chosen plant-out date is too early for that, planting out moves later (`delayedFrom`).
 */
export function scheduleOf(batch) {
  const d = batch.stageDates || {};
  const sown = d.sown || batch.sowDate;
  // Sown earlier or later than planned: the rest of the plan moves with it.
  const shift = d.sown && batch.sowDate && d.sown !== batch.sowDate ? days(batch.sowDate, d.sown) : 0;
  const plantOut = shift ? addDaysToLocalKey(batch.plantOutDate, shift) : batch.plantOutDate;
  const sprouted = d.sprouted || addDaysToLocalKey(sown, batch.germDays || 7);
  const potted = batch.potOn ? d.potted || addDaysToLocalKey(sprouted, 14) : null;
  const hardening =
    d.hardening || later(addDaysToLocalKey(plantOut, -7), addDaysToLocalKey(potted || sprouted, 3));
  const planted = d.planted || later(plantOut, addDaysToLocalKey(hardening, 7));
  return {
    sown,
    sprouted,
    potted,
    hardening,
    planted,
    delayedFrom: !d.planted && planted > plantOut ? plantOut : null,
  };
}
/** Earliest sensible plant-out date for a batch sown on `sowDate` (from the same rules). */
export function earliestPlantOut(batch, sowDate) {
  return scheduleOf({ ...batch, sowDate, plantOutDate: sowDate, stageDates: {} }).planted;
}

export function nextStage(batch) {
  const stages = stagesOf(batch),
    at = batch.stage ? stages.indexOf(batch.stage) : -1;
  return stages[at + 1] || null;
}

/**
 * Plan a seedling batch. Counts back from the planting-out date using the crop's weeks in the
 * nursery, and sows ~20% extra. Returns { batch, warning } — warning when the sow date is past.
 */
export function planBatch({
  crop,
  variety = "",
  zoneId,
  plants,
  plantOutDate,
  plotId = null,
  targetZoneId = null,
  id,
  today,
  tray,
  potTray,
}) {
  const prop = propagationOf(crop);
  const weeks = prop.weeks || 4;
  const sowDate = addDaysToLocalKey(plantOutDate, -weeks * 7);
  const cells = Math.max(1, Math.ceil(Number(plants) * (1 + SOW_EXTRA)));
  const late = today && sowDate < today ? days(sowDate, today) : 0;
  return {
    batch: {
      id,
      crop: crop.name,
      variety,
      zoneId,
      plotId,
      targetZoneId,
      plants: Number(plants),
      cells,
      sowDate: late ? today : sowDate,
      plantOutDate,
      germDays: prop.germDays || 7,
      potOn: !!prop.potOn,
      tray: Number(tray) || suggestTrays(crop, cells).tray,
      potTray: prop.potOn
        ? potTrayFor(potTray, Number(tray) || suggestTrays(crop, cells).tray, crop, cells)
        : null,
      weeks,
      stage: null,
      stageDates: {},
      createdAt: today,
    },
    warning: late
      ? `The ideal sowing date was ${late} day${late === 1 ? "" : "s"} ago. Sow today — seedlings may be smaller at planting out, or plant out a little later.`
      : "",
  };
}

const TEXT = {
  sown: (b) => [
    `Sow ${b.crop} seeds`,
    `${b.cells} cells. Press seeds in lightly, label the tray, water from below.`,
  ],
  sprouted: (b) => [
    `Check ${b.crop} for sprouts`,
    "Tick when most cells have seedlings. Move them into full light straight away.",
  ],
  potted: (b) => [
    `Pot on ${b.crop} seedlings`,
    "Move the strongest into bigger cells once the first true leaves show. Hold them by a leaf, not the stem.",
  ],
  hardening: (b) => [
    `Start hardening off ${b.crop}`,
    "Put the tray outside a few hours a day, longer each day, for about a week. Bring in if frost is forecast.",
  ],
  planted: (b, bed) => [
    `Plant out ${b.crop}${bed ? ` into ${bed}` : ""}`,
    "Water the tray first. Plant at the grid spacing and water in well.",
  ],
};

/** Today's and upcoming nursery tasks, shaped like the rest of the task queue. */
export function nurseryTasks(data, todayKey) {
  const zones = new Map((data.zones || []).map((z) => [z.id, z]));
  const tasks = [],
    busy = new Set();
  activeBatches(data).forEach((b) => {
    const loc = placeName(zones, b.zoneId, "Nursery");
    const bed = zones.get(b.targetZoneId)?.name;
    if (b.stage) busy.add(b.zoneId);
    const next = nextStage(b);
    if (next) {
      const due = scheduleOf(b)[next],
        out = days(todayKey, due);
      if (out <= 3) {
        const [title, desc] = TEXT[next](b, bed);
        tasks.push({
          key: `seed-${b.id}-${next}`,
          pri: out <= 0 ? 1 : 3,
          type: out <= 0 ? "seedling" : "upcoming",
          emoji: "🌱",
          cropName: b.crop,
          title,
          desc,
          loc,
          zoneId: b.zoneId,
          batchId: b.id,
          daysOut: Math.max(0, out),
        });
      }
    }
    // Against the schedule's actual plant-out day (a late sowing keeps the planned
    // plantOutDate, but the seedlings are ready weeks later).
    const prep = days(todayKey, scheduleOf(b).planted || b.plantOutDate);
    if (b.plotId && !b.bedPrepped && prep <= 7 && prep >= -3)
      tasks.push({
        key: `seed-${b.id}-bedprep`,
        pri: 2,
        type: "seedling",
        emoji: "🪏",
        cropName: b.crop,
        title: `Prepare ${bed || "the bed"} for ${b.crop}`,
        desc: "Loosen the soil, add compost and rake level before planting out.",
        loc: bed || loc,
        zoneId: b.targetZoneId || b.zoneId,
        batchId: b.id,
        daysOut: 0,
      });
  });
  busy.forEach((zoneId) =>
    tasks.push({
      key: `nursery-${zoneId}-check`,
      pri: 2,
      type: "water",
      emoji: "💧",
      title: zoneId === WINDOWSILL && !zones.get(zoneId) ? "Check seedlings on the windowsill" : `Check seedlings in ${zones.get(zoneId)?.name || "the nursery"}`,
      desc: "Water from below when the surface is dry. Look for damping off (seedlings collapsing at soil level).",
      loc: placeName(zones, zoneId, "Nursery"),
      zoneId,
      daysOut: 0,
      routine: true,
    }),
  );
  return tasks;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Month numbers (0–11) in a crop's sowing window, e.g. "Feb-Apr, Sep" or "Nov-Feb". */
export function sowMonths(sowIn = "") {
  const out = new Set();
  String(sowIn)
    .split(",")
    .forEach((part) => {
      const [a, b] = part.split("-").map((s) => MONTHS.indexOf(s.trim().slice(0, 3)));
      if (a < 0) return;
      const end = b >= 0 ? b : a;
      for (let m = a; ; m = (m + 1) % 12) {
        out.add(m);
        if (m === end) break;
      }
    });
  return out;
}
/** Average last spring / first autumn frost (MM-DD) for the farm: its own override, else its region's. */
export function frostDates(data) {
  const region = REGION_MAP.get(data?.region) || REGION_MAP.get("western_europe");
  return {
    last: data?.frost?.last || region.frost.last,
    first: data?.frost?.first || region.frost.first,
    regionName: region.name,
    custom: !!(data?.frost?.last || data?.frost?.first),
  };
}
const onYear = (year, mmdd) => `${year}-${mmdd}`;
/**
 * Plant-out window for a crop in a given year: from its weeks before/after the last frost, to the
 * last date it can still mature before the first autumn frost. Crops harvested through light frost get
 * five extra weeks; perennials only need about six weeks to establish before the first frost.
 * Under glass (unheated) the frost-free season is taken as four weeks longer at each end.
 */
export function plantOutWindow(crop, year, frost, covered = false) {
  const p = propagationOf(crop),
    cover = covered ? 28 : 0;
  const earliest = addDaysToLocalKey(onYear(year, frost.last), p.frostWeeks * 7 - cover);
  const name = crop?.name,
    grow = Number(crop?.days) || 60;
  const latest = PERENNIALS.has(name)
    ? addDaysToLocalKey(onYear(year, frost.first), cover - 42)
    : addDaysToLocalKey(onYear(year, frost.first), cover - grow + (FROST_HARDY_HARVEST.has(name) ? 35 : 0));
  return { earliest, latest, open: earliest <= latest };
}
/**
 * Default dates for raising a crop from seed: the earliest plant-out date in its window that still
 * leaves time to raise seedlings from today, this year or next. Sowing counts back the nursery weeks.
 */
export function suggestDates(crop, today, frost, covered = false) {
  const weeks = propagationOf(crop).weeks || 4,
    year = localDateFromKey(today).getFullYear(),
    ready = addDaysToLocalKey(today, weeks * 7);
  for (const y of [year, year + 1]) {
    const w = plantOutWindow(crop, y, frost, covered);
    if (!w.open) continue;
    const plantOut = ready > w.earliest ? ready : w.earliest;
    if (plantOut <= w.latest)
      return { sowDate: addDaysToLocalKey(plantOut, -weeks * 7), plantOutDate: plantOut, window: w };
  }
  return { sowDate: today, plantOutDate: ready, window: null };
}
/** Warning when a plant-out date falls outside the crop's window for the region, else "". */
export function seasonNote(crop, plantOutDate, frost, covered = false) {
  if (!crop || !plantOutDate || !frost) return "";
  const p = propagationOf(crop),
    w = plantOutWindow(crop, localDateFromKey(plantOutDate).getFullYear(), frost, covered);
  const where = covered ? "under glass" : "outdoors";
  if (!w.open)
    return `${crop.name} doesn't have a long enough frost-free season ${where} in this region to mature. Grow it under cover.`;
  if (plantOutDate < w.earliest)
    return p.hardy
      ? `Early: ${crop.name} can go out from about ${fmt(w.earliest)} ${where} (${-p.frostWeeks} weeks before your last frost, ~${fmt(onYear(2000, frost.last))}).`
      : `Too early: ${crop.name} is frost-tender. Plant out ${where} from about ${fmt(w.earliest)}${p.frostWeeks ? ` (${p.frostWeeks} week${p.frostWeeks === 1 ? "" : "s"} after your last frost, ~${fmt(onYear(2000, frost.last))})` : ""}, or keep it under cover.`;
  if (plantOutDate > w.latest)
    return `Late: planted out after about ${fmt(w.latest)}, ${crop.name} may not mature before the first frost (~${fmt(onYear(2000, frost.first))}) ${where}.`;
  return "";
}
export const fmt = (key) =>
  key ? localDateFromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
export const inDays = (key) => {
  const d = Math.round((localDateFromKey(key) - localDateFromKey(todayKey())) / 864e5);
  return d === 0
    ? "today"
    : d === 1
      ? "tomorrow"
      : d > 1
        ? `in ${d} days`
        : d === -1
          ? "yesterday"
          : `${-d} days ago`;
};

/** Cells the batch uses right now: the sowing tray, or the pot-on tray once moved on. */
export function currentTray(batch) {
  const potted = batch.potTray && ["potted", "hardening", "planted"].includes(batch.stage);
  return trayOf(
    potted
      ? potTrayFor(batch.potTray, batch.tray || 60, { name: batch.crop }, batch.cells)
      : batch.tray || 60,
  );
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
