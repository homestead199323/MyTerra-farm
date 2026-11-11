/* ═══════════════════════════════════════════
   SUGGEST — profile-aware crop suggestions (Launch Stage 3, 2026-07-14;
   UX pass 2026-09-28)
   Single source for "what should this person plant right now".
   Consumed by onboarding (plant picker) and reusable by the future
   Plan screen (Stage 5/6). Pure function of (profile, region, date).

   2026-09-28: suggestions only count as "now" when the sowing window is
   open (or opens within ~2 weeks). The old ±2-month tolerance suggested
   kale in late September although its window closes in July. Off-season,
   upcoming crops are offered as "from <month>" plans instead.
   The starter bed is sized by the time the person has, not only by the
   size of their space, and the first week starts with a shopping list
   when they said they own nothing yet.
   ═══════════════════════════════════════════ */
import { CROPS } from "../data/crops";
import { CROP_DIFFICULTY, parseSowMonths, MN_ABR } from "./calendar";
import { getRegionalCrop } from "./regional";
import { isRecurringCrop } from "./perennial";
import { sowVerb } from "./sowing";

// Crops that thrive in pots/planters — used when environment is "balcony"
// or the grower's only asset is containers.
export const CONTAINER_FRIENDLY = [
  "Basil","Mint","Radish","Lettuce","Spinach","Strawberry","Tomato",
  "Pepper (Sweet)","Swiss Chard","Parsley","Thyme","Oregano","Rosemary","Kale",
];

// Crops that also crop well in a pot, trough or grow bag of the right size (RHS container-growing advice:
// short carrots, beetroot, potatoes in bags, peas, courgettes, cucumbers, aubergines, chillies, garlic,
// onions, herbs; figs, citrus and olives as patio trees). The onboarding matcher keeps the shorter
// CONTAINER_FRIENDLY list; this wider one sorts the crop picker and the calendar's Pots filter.
const POT_ALSO = [
  "Pepper (Hot)","Eggplant","Cucumber","Zucchini","Potato","Carrot","Beetroot","Turnip","Garlic","Onion","Pea",
  "Sage","Lavender","Chamomile","Dill","Fig","Lemon","Orange","Olive",
  "Cress","Pea Shoots","Microgreens", // windowsill trays (crops.js `tray`)
];
const POT_SET = new Set(CONTAINER_FRIENDLY.concat(POT_ALSO));
export function growsInPots(name) { return POT_SET.has(name); }
/** Someone whose growing space is pots only: a balcony, or a map whose only growing areas are containers. */
export function potGrower(data) {
  if (data && data.profile && data.profile.environment === "balcony") return true;
  var beds = ((data && data.zones) || []).filter(function (z) { return ["veg","raised","greenhouse","container","herbs","orchard"].includes(z.type); });
  return beds.length > 0 && beds.every(function (z) { return z.type === "container"; });
}

// Beginner-friendly ranking — earlier = suggested first.
export const BEGINNER_PRIORITY = [
  "Radish","Lettuce","Spinach","Basil","Mint","Kale","Pea","Zucchini",
  "Strawberry","Swiss Chard","Bean (Dry)","Broad Bean","Turnip","Tomato",
];

function difficultyRank(name) {
  if (CROP_DIFFICULTY.easy.includes(name)) return 0;
  if (CROP_DIFFICULTY.medium.includes(name)) return 1;
  return 2;
}

function sunOk(crop, sunlight) {
  // sunlight: "lt3" | "3to5" | "5to7" | "gt7" | "unsure" | null
  if (!sunlight || sunlight === "unsure" || sunlight === "gt7" || sunlight === "5to7") return true;
  var sun = crop.sun || "Full";
  if (sunlight === "lt3") return sun === "Partial";          // deep shade: partial-sun crops only
  return sun !== "Full";                                     // 3to5: partial or full-partial
}

function asDate(date, month) {
  if (date instanceof Date && !isNaN(date)) return date;
  if (typeof month === "number") return new Date(new Date().getFullYear(), month, 10);
  return new Date();
}

/**
 * sowTiming(crop, region, date) → { status, verb, month, inMonths }
 * status: "now"   — the sowing/planting window is open this month
 *         "soon"  — it opens next month and we are in the second half of this one
 *         "later" — it opens in `inMonths` months (month = first month)
 *         "na"    — the crop is not grown in this region
 */
export function sowTiming(crop, region, date) {
  var d = asDate(date);
  var regional = getRegionalCrop(crop, region);
  if (!regional) return { status: "na", verb: "Sow", month: null, inMonths: null };
  var verb = sowVerb(regional.steps || crop.steps);
  var months = parseSowMonths(regional.sowIn || crop.sowIn);
  var m = d.getMonth();
  if (!months.length || months.includes(m)) return { status: "now", verb: verb, month: m, inMonths: 0 };
  var next = (m + 1) % 12;
  if (months.includes(next) && d.getDate() >= 15) return { status: "soon", verb: verb, month: next, inMonths: 1 };
  for (var k = 1; k <= 12; k++) {
    var mm = (m + k) % 12;
    if (months.includes(mm)) return { status: "later", verb: verb, month: mm, inMonths: k };
  }
  return { status: "now", verb: verb, month: m, inMonths: 0 };
}

/**
 * suggestCrops(profile, region, opts) → ranked CROPS subset.
 * Consumes: environment, sunlight, experience, household.dislikes, assets.
 * opts: { limit (default 9), date (default now) | month (0-11), relaxIfEmpty (default true),
 *         maxSpacingCm — leave out crops whose plant spacing is wider than the bed
 *         (onboarding: a 1.2 m starter bed can't hold a blackberry that needs 2 m+) }
 * Order: sowable now/soon first; then (off-season) crops whose window opens
 * within 4 months; then, if still thin, sun is relaxed (shade-tolerant first).
 */
export function suggestCrops(profile, region, opts) {
  var o = opts || {};
  var limit = o.limit || 9;
  var date = asDate(o.date, o.month);
  var p = profile || {};
  var dislikes = (p.household && p.household.dislikes) || [];
  var exp = p.experience || "beginner";
  var containersOnly = p.environment === "balcony";

  var allowedDifficulty;
  if (exp === "beginner") allowedDifficulty = ["easy"];
  else if (exp === "some") allowedDifficulty = ["easy", "medium"];
  else allowedDifficulty = ["easy", "medium", "hard"];

  var maxSpacing = Number(o.maxSpacingCm) > 0 ? Number(o.maxSpacingCm) : 0;
  function passes(c) {
    if (dislikes.includes(c.name)) return false;
    if (maxSpacing) {
      var rcs = getRegionalCrop(c, region) || c;
      if ((Number(rcs.spacing) || Number(c.spacing) || 0) > maxSpacing) return false;
    }
    if (containersOnly && !CONTAINER_FRIENDLY.includes(c.name) && !c.tray) return false; // a windowsill tray suits any home
    var dr = difficultyRank(c.name);
    if (dr === 0 && !allowedDifficulty.includes("easy")) return false;
    if (dr === 1 && !allowedDifficulty.includes("medium")) return false;
    if (dr === 2 && !allowedDifficulty.includes("hard")) return false;
    return true;
  }

  function rank(a, b) {
    var da = difficultyRank(a.name), db = difficultyRank(b.name);
    if (da !== db) return da - db;
    var ai = BEGINNER_PRIORITY.indexOf(a.name), bi = BEGINNER_PRIORITY.indexOf(b.name);
    ai = ai === -1 ? 99 : ai; bi = bi === -1 ? 99 : bi;
    if (ai !== bi) return ai - bi;
    return (a.days || 999) - (b.days || 999);
  }

  var timing = new Map(CROPS.map(function(c){ return [c.name, sowTiming(c, region, date)]; }));
  var soonish = function(c){ var t = timing.get(c.name); return t.status === "now" || t.status === "soon"; };

  var strictList = CROPS.filter(function(c){ return passes(c) && sunOk(c, p.sunlight) && soonish(c); }).sort(rank);
  // Windowsill tray crops are in season every month. They are offered, but they do not count as "enough to
  // plant now": out of season the grower still gets the outdoor crops whose window opens in the coming months.
  var outdoorNow = strictList.filter(function(c){ return !c.tray; });
  if (outdoorNow.length >= 3 || o.relaxIfEmpty === false) return strictList.slice(0, limit);

  // Off-season: plan ahead with crops whose window opens in the next few months.
  var later = CROPS.filter(function(c) {
    var t = timing.get(c.name);
    return passes(c) && sunOk(c, p.sunlight) && t.status === "later" && t.inMonths <= 4;
  }).sort(function(a, b) {
    var d = timing.get(a.name).inMonths - timing.get(b.name).inMonths;
    return d || rank(a, b);
  });
  var list = strictList.concat(later);
  if (list.length >= 3) return list.slice(0, limit);

  // Still thin (deep shade, many dislikes): relax the sun rule. In low light,
  // shade-tolerant crops outrank full-sun ones. Graded: Partial < Full-Partial < Full.
  var shadeScore = function(c){ return c.sun === "Partial" ? 0 : c.sun === "Full-Partial" ? 1 : 2; };
  var relaxed = CROPS.filter(function(c){
    return passes(c) && timing.get(c.name).status !== "na" && !list.includes(c);
  }).sort(function(a, b) {
    var sa = shadeScore(a), sb = shadeScore(b);
    if (sa !== sb) return sa - sb;
    var ta = timing.get(a.name).inMonths, tb = timing.get(b.name).inMonths;
    if (ta !== tb) return ta - tb;
    return rank(a, b);
  });
  return list.concat(relaxed).slice(0, limit);
}

/**
 * describeSuggestion(crop, profile, region, date) → what a beginner needs to
 * decide: when ("Sow now" / "Plant from Oct"), how long until food, effort,
 * and one reason it was picked for them.
 */
export function describeSuggestion(crop, profile, region, date) {
  var p = profile || {};
  var rc = getRegionalCrop(crop, region) || crop;
  var t = sowTiming(crop, region, date);
  var now = t.status === "now" || t.status === "soon";
  var when = now ? t.verb + " now" : t.month != null ? t.verb + " from " + MN_ABR[t.month] : t.verb;
  var days = rc.days || crop.days || 60;
  var recurring = isRecurringCrop(rc);
  var ready = days >= 300 ? "first crop next year" : days > 70 ? "food in ~" + Math.round(days / 30) + " months" : "food in ~" + Math.max(1, Math.round(days / 7)) + " weeks";
  var dr = difficultyRank(crop.name);
  var effort = dr === 0 ? "Easy" : dr === 1 ? "Some care" : "Advanced";
  var shady = p.sunlight === "lt3" || p.sunlight === "3to5";
  var reason;
  if (!sunOk(rc, p.sunlight)) reason = "Wants more sun than you have — expect a smaller crop";
  else if (p.environment === "balcony" && CONTAINER_FRIENDLY.includes(crop.name)) reason = "Happy in a pot";
  else if (shady && rc.sun !== "Full") reason = "Copes with part shade";
  else if (days <= 45) reason = "Quick win";
  else if (recurring) reason = "Comes back every year";
  else if (dr === 0 && (p.experience || "beginner") === "beginner") reason = "Very forgiving";
  else reason = now ? "In season now" : "Plan ahead";
  return { timing: t.status, now: now, when: when, month: t.month, ready: ready, effort: effort, reason: reason, verb: t.verb };
}

/* ─── Onboarding starter-map + first-week plan (Stage 3) ── */
// Starter zone spec per environment. Owned assets (greenhouse, coop, fruit
// trees, compost, raised bed) also become zones on the starter map — see
// starterAssetZones. No Basic zone cap exists yet (new users are on the Pro
// trial); if one is added, decide how these starter zones count against it.
const FARM_CAP_W = 100, FARM_CAP_H = 60;

const ENV_ZONE = {
  balcony:  { type:"container", label:"Balcony Containers", emoji:"🪣", share:0.5,  minA:0.3, maxA:6,  inset:0.25, minW:1,  minH:0.8, depth:0.45 },
  backyard: { type:"raised",  label:"Raised Bed",         emoji:"🪴", share:0.25, minA:1,   maxA:12, inset:1,    minW:6,  minH:4, depth:1.2 },
  farm:     { type:"veg",     label:"Vegetable Bed",      emoji:"🌿", share:0.1,  minA:2,   maxA:24, inset:4,    minW:16, minH:10, depth:1.2 },
};

// First growing area by the time someone has (m²). A 1.2 × 2 m raised bed is
// plenty for 15 minutes a day; a beginner with a 10 m² bed mostly weeds it.
export const TIME_AREA = {
  balcony:  { min5: 1,   min15: 1.5, weekly: 2,   daily: 3,   unlimited: 4 },
  backyard: { min5: 1.2, min15: 2.4, weekly: 3.6, daily: 6,   unlimited: 10 },
  farm:     { min5: 3,   min15: 6,   weekly: 10,  daily: 18,  unlimited: 24 },
};

export function toNum(v) {
  var n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) && n > 0 ? n : 0;
}
export function ftToM(ft) { return Math.round(ft * 0.3048 * 10) / 10; }
export function r1(n) { return Math.round(n * 10) / 10; }

/**
 * Starter zone + canvas from environment, space dimensions and time budget.
 * Beds are 1.2 m wide so the middle can be reached from both sides;
 * balcony planters are a 45 cm deep strip (troughs along the railing).
 */
export function buildStarterZone(environment, lengthM, widthM, timeBudget) {
  var env = ENV_ZONE[environment] ? environment : "farm";
  var spec = ENV_ZONE[env];
  var areaM2 = r1(lengthM * widthM);
  var target = (TIME_AREA[env] || {})[timeBudget] || TIME_AREA[env].min15;
  var usable = Math.min(Math.max(Math.min(target, areaM2 * 0.8), spec.minA), spec.maxA);
  usable = r1(Math.max(usable, 0.3));

  var farmW, farmH, xM, yM, maxW, maxH;
  var partial = false;
  if (env === "farm") {
    xM = spec.inset; yM = spec.inset;
    var fw = Math.max(1.2, r1(usable / spec.depth));
    // The canvas is the real land (long side across), capped at the app's
    // default 100 × 60 m farm so the first bed and buildings stay readable.
    var realW = Math.ceil(Math.max(lengthM, widthM)), realH = Math.ceil(Math.min(lengthM, widthM));
    partial = realW > FARM_CAP_W || realH > FARM_CAP_H;
    farmW = Math.max(spec.minW, Math.ceil(xM + fw + 2), Math.min(realW, FARM_CAP_W));
    farmH = Math.max(spec.minH, Math.ceil(yM + spec.depth + 2), Math.min(realH, FARM_CAP_H));
    maxW = farmW - xM - 2; maxH = farmH - yM - 2;
  } else {
    // Balcony/backyard: the canvas is the real space itself, to the nearest 10 cm
    // (a 4 × 1.5 m balcony stays 4 × 1.5 m — no rounding up to whole metres)
    farmW = Math.max(spec.minW, r1(Math.max(lengthM, widthM)));
    farmH = Math.max(spec.minH, r1(Math.min(lengthM, widthM)));
    xM = spec.inset; yM = spec.inset;
    maxW = Math.max(0.5, farmW - spec.inset * 2);
    maxH = Math.max(0.3, farmH - spec.inset * 2);
  }
  var hM = Math.min(spec.depth, maxH);
  var wM = r1(Math.min(maxW, Math.max(0.5, usable / hM)));
  // Space too narrow for the whole area in one strip: use more of the depth.
  if (wM * hM < usable - 0.05) hM = Math.min(maxH, usable / wM);
  hM = Math.max(0.3, Math.round(hM * 100) / 100);
  usable = r1(wM * hM);
  // Balcony troughs go along the railing (the sunny, open side), not against the wall in front of the door.
  if (env === "balcony") yM = Math.max(0, Math.round((farmH - spec.inset - hM) * 100) / 100);
  return { spec:spec, areaM2:usable, wM:wM, hM:hM, xM:xM, yM:yM, farmW:farmW, farmH:farmH, partial:partial };
}

// Things the person said they already have (onboarding "assets" step) become
// real areas on the starter map, packed in rows beside the first bed.
// Sizes are typical for the space; anything that does not fit is left off
// (they can add it later with the map pencil). Balconies get none.
const ASSET_ZONES = {
  farm: [
    { asset:"greenhouse",  type:"greenhouse", name:"Greenhouse",   emoji:"🏡", wM:8,  hM:4 },
    { asset:"coop",        type:"coop",       name:"Chicken Coop", emoji:"🐔", wM:3,  hM:2.5 },
    { asset:"fruit_trees", type:"orchard",    name:"Fruit Trees",  emoji:"🍎", wM:10, hM:8 },
    { asset:"raised_bed",  type:"raised",     name:"Raised Bed",   emoji:"🪴", wM:3,  hM:1.2 },
    { asset:"compost",     type:"compost",    name:"Compost",      emoji:"♻",  wM:2,  hM:1.5 },
  ],
  backyard: [
    { asset:"greenhouse",  type:"greenhouse", name:"Greenhouse",   emoji:"🏡", wM:3,  hM:2 },
    { asset:"coop",        type:"coop",       name:"Chicken Coop", emoji:"🐔", wM:2,  hM:1.5 },
    { asset:"fruit_trees", type:"orchard",    name:"Fruit Trees",  emoji:"🍎", wM:4,  hM:3 },
    { asset:"compost",     type:"compost",    name:"Compost",      emoji:"♻",  wM:1,  hM:1 },
  ],
};

export function starterAssetZones(environment, assets, zp) {
  var list = ASSET_ZONES[environment] || [];
  var owned = assets || [];
  var gap = environment === "farm" ? 2 : 0.6;
  var edge = environment === "farm" ? 2 : 0.5;
  var out = [];
  var x = zp.xM + zp.wM + gap, y = zp.yM, rowH = zp.hM;
  list.forEach(function(a) {
    if (!owned.includes(a.asset)) return;
    if (x + a.wM > zp.farmW - edge) { x = zp.xM; y = y + rowH + gap; rowH = 0; }
    if (x + a.wM > zp.farmW - edge || y + a.hM > zp.farmH - edge) return;
    out.push({ asset:a.asset, type:a.type, name:a.name, emoji:a.emoji, xM:r1(x), yM:r1(y), wM:a.wM, hM:a.hM, areaM2:r1(a.wM * a.hM) });
    x = x + a.wM + gap; rowH = Math.max(rowH, a.hM);
  });
  return out;
}

/**
 * How many plants of a crop to start with for a household: small-spaced crops
 * (radish, carrots) come in bigger numbers than lettuces or strawberries.
 * The bed planner (planPlanting) trims this further if it does not fit.
 */
export function starterCount(crop, people) {
  var n = Math.max(1, Math.min(6, Number(people) || 2));
  var spacing = Number(crop && crop.spacing) || 30;
  var perPerson = spacing < 10 ? 12 : spacing < 20 ? 8 : spacing < 40 ? 4 : spacing < 80 ? 1 : 0.5;
  return Math.max(1, Math.round(n * perPerson));
}

/**
 * The shopping list a beginner needs before day one, from what they told us
 * they already own. items: [{ id, label, detail }]
 */
export function starterKit(opts) {
  var o = opts || {};
  var env = o.environment === "balcony" || o.environment === "backyard" ? o.environment : "farm";
  var assets = o.assets || [];
  var owns = function(id){ return assets.includes(id); };
  var zone = o.zone || { wM: 2, hM: 1.2, areaM2: 2.4 };
  var area = zone.areaM2 || r1(zone.wM * zone.hM);
  var items = [];
  (o.picks || []).forEach(function(pk) {
    if (!pk || pk.later) return;
    var plant = pk.verb === "Plant";
    var label = pk.name + (plant ? " plants" : " seeds");
    if (/^Garlic$/.test(pk.name)) label = "Garlic bulbs (for planting)";
    else if (/^Onion$/.test(pk.name)) label = "Onion sets";
    else if (/^Potato$/.test(pk.name)) label = "Seed potatoes";
    items.push({ id: "crop-" + pk.name, label: label, detail: plant ? (pk.count || 1) + " to plant" : "1 packet · you'll sow about " + (pk.count || 10) });
  });
  if (env === "balcony") {
    // A 60 cm balcony trough holds about 20 L of compost.
    var troughs = Math.max(1, Math.ceil((zone.wM || 1.5) / 0.6) * Math.max(1, Math.round((zone.hM || 0.45) / 0.45)));
    if (!owns("containers") && !owns("raised_bed")) {
      items.push({ id: "containers", label: "Planters with drainage holes", detail: troughs + " × 60 cm troughs, or pots of at least 5 L each" });
    }
    var litres = troughs * 20;
    items.push({ id: "compost", label: "Peat-free potting compost", detail: "About " + litres + " L (" + Math.max(1, Math.ceil(litres / 40)) + " × 40 L bag" + (Math.ceil(litres / 40) > 1 ? "s" : "") + ")" });
  } else if (env === "backyard") {
    if (!owns("raised_bed")) {
      items.push({ id: "bed", label: "A raised bed " + zone.wM + " × " + zone.hM + " m", detail: "A kit or four planks — or simply dig a patch this size" });
      var fill = Math.round(area * 0.25 * 1000 / 10) * 10;
      items.push({ id: "compost", label: "Compost and topsoil to fill it", detail: "About " + fill + " L for a 25 cm deep bed; garden soil at the bottom keeps it cheap" });
    } else {
      items.push({ id: "compost", label: "Compost to top up your bed", detail: Math.max(1, Math.ceil(area / 1.2)) + " × 40 L bags, mixed into the top layer" });
    }
  } else {
    items.push({ id: "compost", label: "Compost or well-rotted manure", detail: "About " + Math.max(2, Math.ceil(area)) + " × 40 L bags for " + area + " m², forked into the top layer" });
  }
  if (!owns("tools")) items.push({ id: "tools", label: "Trowel and watering can", detail: "A can with a rose (sprinkler head) so seeds don't wash away" });
  return items;
}

function waterIntervalDays(freq) {
  if (!freq) return 3;
  if (/daily/i.test(freq)) return 1;
  var m = String(freq).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 3;
}

/**
 * 7-day preview. picks: crop names to sow/plant now. opts.kit: starterKit()
 * items still to buy — day 1 becomes "get your kit" and sowing moves to day 2.
 * Display-only — real tasks come from buildTaskQueue once plots exist.
 */
export function buildSevenDayPlan(pickNames, region, opts) {
  var o = opts || {};
  var names = pickNames || [];
  var kit = o.kit || [];
  var needKit = kit.length > 0 && names.length > 0;
  var sowDay = needKit ? 2 : 1;
  var picks = names.map(function(name) {
    var crop = CROPS.find(function(c){ return c.name === name; });
    var rc = crop ? (getRegionalCrop(crop, region) || crop) : null;
    return { name:name, interval: waterIntervalDays(rc && rc.waterFreq ? rc.waterFreq : (crop && crop.waterFreq)) };
  });
  var hasPicks = names.length > 0;
  var days = [];
  for (var d = 1; d <= 7; d++) {
    var items = [];
    if (needKit && d === 1) items.push("Get your starter kit: " + kit.map(function(k){ return k.label.replace(/ \(.*\)$/, "").toLowerCase(); }).join(", "));
    if (d === sowDay) {
      if (hasPicks) items.push((needKit ? (o.environment === "balcony" ? "Fill your planters, then sow / plant: " : "Set up your bed, then sow / plant: ") : "Sow / plant: ") + names.join(", "));
      else items.push("Explore your map and get to know the app");
    }
    var waterNames = picks.filter(function(pk) {
      if (d <= sowDay) return false;
      return (d - sowDay) % pk.interval === 0;
    }).map(function(pk){ return pk.name; });
    if (waterNames.length) items.push("Water if the soil feels dry: " + waterNames.join(", "));
    if (d === sowDay + 3) {
      if (hasPicks) items.push("Check the soil is still moist — first sprouts show within 1–2 weeks");
      else items.push("Browse the crop library — pick your first plant when you're ready");
    }
    if (d === 7) items.push("Weekly check-in — look over your plants and log what you see");
    days.push({ day:d, items:items });
  }
  return days;
}
