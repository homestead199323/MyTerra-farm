import { toLocalDateKey, daysBetweenLocalKeys, localDateFromKey, addDaysToLocalKey, localDayNumber } from "./utils";
import { rCM } from "./regional";
import { isAwaitingSowing, sowWindowOpen, firstStepIdx, prepStepIdxs } from "./sowing.js";
import { nurseryTasks } from "../features/nursery/nursery-model.js";
import { animalZone as zoneOfAnimal } from "../features/quiet/farm-model.js";
import { applyWeather, isWeatherDone } from "./weather-alerts.js";
import { ownTasks } from "./own-tasks.js";
import { stepText, waterJobText } from "./plain-words.js";
import { LDB, POULTRY_SPECIES, HOOFED_SPECIES, GRAZER_SPECIES, animalPlural } from "../data/livestock";

/**
 * Split a completion key into its parts: "plot-<uuid>-water" → { kind: "plot", id: "<uuid>", suffix: "water" },
 * "plot-<uuid>-step-2" → suffix "step-2", "species-Goat-feed" → { kind: "species", id: "Goat", suffix: "feed" }.
 * Ids are UUIDs (they contain dashes), so only the first and the LAST dash split — never key.split("-").
 */
export function parseTaskKey(key) {
  const m = /^([a-z]+)-(.+?)-(step-\d+|[A-Za-z0-9]+)$/.exec(String(key || ""));
  return m ? { kind: m[1], id: m[2], suffix: m[3] } : null;
}

/** Dairy species milked by default; sheep only when the keeper says so. A group can be switched off (dry, bucks, meat herd). */
const MILKED_BY_DEFAULT = new Set(["Goat", "Cow"]);
export function isMilking(animal) {
  return animal.milking ?? MILKED_BY_DEFAULT.has(animal.type);
}
export function milkingHead(data, type) {
  return (data.livestock?.animals || [])
    .filter((a) => a.type === type && isMilking(a))
    .reduce((n, a) => n + (a.count || 1), 0);
}

/**
 * opts.now — plan for another day (Date or date string); default today.
 * opts.forecast — the 7-day forecast from lib/weather.js fetchForecast. With it,
 * weather jobs are added and jobs move (lib/weather-alerts.js). Without it
 * (offline, no city) the queue is exactly what it was before.
 */
export function buildTaskQueue(data, opts = {}) {
  return buildTaskPlan(data, opts).tasks;
}

/** Tasks plus the weather alerts that shaped them: { tasks, alerts }. */
export function buildTaskPlan(data, opts = {}) {
  // opts.now: plan another day (the push digest precomputes the next 7 mornings).
  const now = opts.now ? new Date(opts.now) : new Date(); now.setHours(0,0,0,0);
  const todayKey = toLocalDateKey(now);
  const doneToday = new Set((data.completions && data.completions[todayKey]) || []);
  const tasks = [];

  // O(1) zone lookup — built once per call instead of linear .find per plot
  const zoneById = new Map((data.zones || []).map(z => [z.id, z]));

  data.garden.plots.forEach(p => {
    if (p.status === "harvested") return;
    const waiting = isAwaitingSowing(p);
    if (waiting && !sowWindowOpen(p, todayKey)) return; // planned for a later month
    if (!p.plantDate && !waiting) return;
    const crop = rCM(data.region).get(p.crop);
    if (!crop || !crop.days) return;
    const dSince = daysBetweenLocalKeys(p.plantDate, now);
    const zone = zoneById.get(p.zone);
    const loc = zone ? zone.name : "Farm";

    // Planned but not in the ground yet (onboarding picks): one job — the first
    // step — due every day until it is done. No watering or harvest countdown
    // for seeds that have not been sown.
    if (waiting) {
      [...prepStepIdxs(p.steps), firstStepIdx(p.steps)].forEach((i) => {
        const s = p.steps[i];
        tasks.push({ key: `plot-${p.id}-step-${i}`, pri: 1, type: "step", emoji: crop.emoji, cropName: p.crop, title: `${p.name || p.crop}: ${s.l}`, desc: stepText(s), loc, plotId: p.id, stepIdx: i, daysOut: 0, sowing: true });
      });
      return;
    }

    const days = p.harvestDate ? daysBetweenLocalKeys(p.plantDate, localDateFromKey(p.harvestDate)) : crop.days;
    const dLeft = days - dSince;

    // Harvest ready
    if (dSince >= days) {
      tasks.push({ key: `plot-${p.id}-harvest`, pri: 0, type: "harvest", emoji: crop.emoji, cropName: p.crop, title: `Harvest ${p.name || p.crop}`, desc: `Ready! Est. yield available.`, loc, plotId: p.id, daysOut: 0 });
    }

    // Steps due — tracked via p.steps[i].done (persistent), NOT completions map
    if (p.steps) p.steps.forEach((s, i) => {
      if (s.done) return;
      const due = dSince - s.d;
      if (due >= 0 && due <= 3) {
        tasks.push({ key: `plot-${p.id}-step-${i}`, pri: 1, type: "step", emoji: crop.emoji, cropName: p.crop, title: `${p.name || p.crop}: ${s.l}`, desc: stepText(s), loc, plotId: p.id, stepIdx: i, daysOut: 0 });
      } else if (due >= -3 && due < 0) {
        tasks.push({ key: `plot-${p.id}-step-${i}`, pri: 3, type: "upcoming", emoji: crop.emoji, cropName: p.crop, title: `${p.name || p.crop}: ${s.l}`, desc: stepText(s), loc, plotId: p.id, stepIdx: i, daysOut: Math.abs(due) });
      }
    });

    // Watering
    if (crop.waterFreq) {
      const m = crop.waterFreq.match(/(\d+)/);
      if (m && dSince > 0 && dSince % parseInt(m[1]) === 0) {
        tasks.push({ key: `plot-${p.id}-water`, pri: 2, type: "water", emoji: "💧", title: `Water ${p.name || p.crop}`, desc: waterJobText(crop), loc, plotId: p.id, daysOut: 0, routine: true });
      }
    }

    // Harvest forecast (upcoming) — info-only, no Done button
    if (dLeft > 0 && dLeft <= 14) {
      // Date from today's key, not the plot's: a malformed plantDate (old
      // import) must not take the whole task plan down with a null date.
      const hDate = localDateFromKey(addDaysToLocalKey(todayKey, dLeft));
      const when = hDate ? hDate.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : `${dLeft} days`;
      const estYld = p.expectedYieldKg || (crop.yld ? Math.round(Math.max(0.1, crop.yld * (Number(p.plantCount) || 1)) * 10) / 10 : 3);
      tasks.push({ key: `plot-${p.id}-forecast`, pri: 4, type: "forecast", emoji: "📅", title: `${p.name || p.crop} harvest in ${dLeft}d`, desc: `Expected: ${when}. ~${estYld}kg yield.`, loc, plotId: p.id, daysOut: dLeft });
    }
  });

  // ─── Animal tasks ───
  // Species-grouped: feed, water, eggs, clean, bedding, paddock (one task per species)
  // Per-animal:      health, hoof, hive inspection (one task per individual)
  // Calendar-day ordinal (DST-safe). floor(getTime()/864e5) on a local
  // midnight repeats or skips a day around the clock change in UTC+0 zones
  // (UK/IE), which doubled or dropped the staggered animal jobs twice a year.
  const dayNum = localDayNumber(now);
  const curMonth = now.getMonth() + 1; // 1-12
  const animalZone = data.zones.find(z => ["barn","coop","pasture"].includes(z.type));
  const animalLoc = animalZone ? animalZone.name : "Farm";
  // Where each species / animal actually lives (goats in the goat shed, not the first barn found).
  const speciesLoc = (type) => {
    const a = (data.livestock?.animals || []).find((x) => x.type === type);
    return (a && zoneOfAnimal(a, data.zones || [])?.name) || animalLoc;
  };
  const animalLocOf = (a) => zoneOfAnimal(a, data.zones || [])?.name || animalLoc;

  // Build species summary: count, total head, first animal-id (stable hash seed), db ref
  const speciesMap = new Map();
  (data.livestock?.animals || []).forEach(a => {
    const db = LDB[a.type];
    if (!db) return;
    if (!speciesMap.has(a.type)) {
      speciesMap.set(a.type, { type: a.type, db, groupCount: 0, headCount: 0, firstId: a.id });
    }
    const s = speciesMap.get(a.type);
    s.groupCount += 1;
    s.headCount += (a.count || 1);
  });

  // Hash a string deterministically (used for species-level stagger)
  const hashStr = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  };

  // Species-grouped tasks
  speciesMap.forEach(s => {
    const { type, db, headCount } = s;
    const e = db.e;
    const speciesLabel = animalPlural(type, headCount);
    const sHash = hashStr(type);

    if (type !== "Bee") {
      tasks.push({ key: `species-${type}-feed`,  pri: 1, type: "feed",  emoji: e,    title: `Feed ${speciesLabel}`,  desc: db.feed, loc: speciesLoc(type), speciesType: type, headCount, daysOut: 0, routine: true });
      tasks.push({ key: `species-${type}-water`, pri: 1, type: "water", emoji: "💧", title: `Water ${speciesLabel}`, desc: `Fresh water — refill and clean trough.`, loc: speciesLoc(type), speciesType: type, headCount, daysOut: 0, routine: true });
    }
    if (POULTRY_SPECIES.has(type)) {
      const eggNote = db.out?.Eggs?.s || "";
      tasks.push({ key: `species-${type}-eggs`, pri: 1, type: "eggs", emoji: "🥚", title: `Collect eggs — ${speciesLabel}`, desc: `Check nests daily. ${eggNote}`, loc: speciesLoc(type), speciesType: type, headCount, daysOut: 0, routine: true });
    }
    if (db.out?.Milk && milkingHead(data, type) > 0) {
      const milkHead = milkingHead(data, type);
      const litres = Math.round(db.out.Milk.p * milkHead * 10) / 10;
      tasks.push({ key: `species-${type}-milk`, pri: 1, type: "milk", emoji: "🥛", title: `Milk ${animalPlural(type, milkHead)}`, desc: `Milk at the same times each day. About ${litres} L expected. Strain and chill fast.`, loc: speciesLoc(type), speciesType: type, headCount: milkHead, expected: litres, daysOut: 0, routine: true });
    }
    if (type !== "Bee" && (dayNum + sHash) % 7 === 0) {
      tasks.push({ key: `species-${type}-clean`, pri: 2, type: "clean", emoji: "🧹", title: `Clean housing — ${speciesLabel}`, desc: `Remove soiled bedding, refresh straw, check for damp.`, loc: speciesLoc(type), speciesType: type, headCount, daysOut: 0 });
    }
    if (type !== "Bee" && (dayNum + sHash) % 30 === 0) {
      tasks.push({ key: `species-${type}-bedding`, pri: 2, type: "bedding", emoji: "🛏️", title: `Full bedding change — ${speciesLabel}`, desc: `Strip everything, disinfect surfaces, fresh straw or shavings.`, loc: speciesLoc(type), speciesType: type, headCount, daysOut: 0 });
    }
    if (GRAZER_SPECIES.has(type) && (dayNum + sHash) % 21 === 0) {
      tasks.push({ key: `species-${type}-paddock`, pri: 2, type: "paddock", emoji: "🔄", title: `Rotate paddock — ${speciesLabel}`, desc: `Move to fresh pasture. Rest the grazed section as long as you can (6+ weeks) to cut worm numbers.`, loc: speciesLoc(type), speciesType: type, headCount, daysOut: 0 });
    }
  });

  // Per-animal tasks (health, hoof, hive)
  (data.livestock?.animals || []).forEach(a => {
    const db = LDB[a.type];
    if (!db) return;
    // For per-animal tasks: use the animal's own name if given, else "Chicken #3"
    const label = a.name ? `${a.name} (${a.type})` : a.type;
    const aHash = hashStr(a.id);

    // Weekly: health check (per animal, offset 3d from cleaning cycle)
    if (a.type !== "Bee" && (dayNum + aHash + 3) % 7 === 0) {
      const commonIssue = db.inj?.[0]?.n || "injury or parasites";
      tasks.push({ key: `animal-${a.id}-health`, pri: 2, type: "health", emoji: "🩺", title: `Health check — ${label}`, desc: `Inspect body condition, eyes, coat. Watch for: ${commonIssue}.`, loc: animalLocOf(a), animalId: a.id, daysOut: 0 });
    }
    // Bi-weekly: hoof check (per animal, hoofed species only)
    if (HOOFED_SPECIES.has(a.type) && (dayNum + aHash) % 14 === 0) {
      tasks.push({ key: `animal-${a.id}-hoof`, pri: 2, type: "hoof", emoji: "🦶", title: `Hoof check — ${label}`, desc: `Trim overgrowth, check for rot, stones, cracks.`, loc: animalLocOf(a), animalId: a.id, daysOut: 0 });
    }
    // 10d: hive inspection (per hive, March–September only)
    if (a.type === "Bee" && curMonth >= 3 && curMonth <= 9 && (dayNum + aHash) % 10 === 0) {
      tasks.push({ key: `animal-${a.id}-hive`, pri: 2, type: "hive", emoji: "🐝", title: `Hive inspection — ${label}`, desc: `Check brood pattern, honey stores, queen presence. Look for varroa mites.`, loc: animalLocOf(a), animalId: a.id, daysOut: 0 });
    }
  });

  // Seedling nursery: sowing, pricking out, hardening off, planting out, daily checks.
  tasks.push(...nurseryTasks(data, todayKey));

  // The user's own one-off and repeating jobs (lib/own-tasks.js).
  tasks.push(...ownTasks(data, todayKey));

  // Filter out tasks that have been marked done today via the completions map.
  // Step tasks are filtered by p.steps[i].done above (persistent), not here.
  // Forecast tasks are info-only, no Done button exposed.
  const weather = opts.forecast ? applyWeather(data, opts.forecast, todayKey, tasks) : { alerts: [], tasks };
  const filtered = weather.tasks.filter(t => {
    if (t.type === "step" || t.type === "upcoming" || t.type === "forecast") return true;
    if (t.type === "weather") return !isWeatherDone(data, t.key);
    return !doneToday.has(t.key);
  });

  filtered.sort((a, b) => a.pri - b.pri || a.daysOut - b.daysOut);
  return { tasks: filtered, alerts: weather.alerts };
}

