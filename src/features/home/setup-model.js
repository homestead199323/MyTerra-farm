/* One-screen setup and the first-run cues of the map-first home (pure, unit tested). */
import { buildStarterZone, r1 } from "../../lib/suggest.js";
import { DEF } from "../../app/state.js";

/** Typical length × width (m) for "Small / Medium / Large" in each kind of space. */
export const SIZES = {
  balcony: { small: [2, 1], medium: [3, 1.5], large: [5, 2] },
  backyard: { small: [4, 3], medium: [8, 6], large: [15, 10] },
  farm: { small: [20, 15], medium: [50, 30], large: [100, 60] },
};

const NORTH = ["Berlin", "Stockholm", "Oslo", "Copenhagen", "Helsinki", "Warsaw", "Vilnius", "Riga", "Tallinn", "Prague", "Vienna", "Zurich", "Busingen", "Vaduz", "Bratislava", "Budapest", "Minsk", "Kyiv", "Kiev", "Mariehamn"];
const MED = ["Tirane", "Rome", "Athens", "Madrid", "Lisbon", "Malta", "Podgorica", "Skopje", "Zagreb", "Sarajevo", "Belgrade", "Ljubljana", "San_Marino", "Vatican", "Gibraltar", "Andorra", "Monaco", "Istanbul", "Sofia", "Bucharest", "Chisinau"];
const US_WARM = ["Los_Angeles", "Phoenix", "Tijuana"];

/** A first guess at the growing region from the device's time zone; the setup screen lets the user change it. */
export function guessRegion(timeZone) {
  const tz = String(timeZone || ""), city = tz.split("/").pop();
  if (tz.startsWith("Europe/")) return NORTH.includes(city) ? "northern_europe" : MED.includes(city) ? "mediterranean" : "western_europe";
  if (tz === "Asia/Nicosia" || tz === "Asia/Famagusta" || tz === "Atlantic/Madeira" || tz === "Atlantic/Canary") return "mediterranean";
  if (tz.startsWith("America/") || tz.startsWith("US/") || tz.startsWith("Canada/")) return US_WARM.includes(city) ? "us_warm" : "us_cold";
  if (tz.startsWith("Pacific/Honolulu")) return "us_warm";
  return "western_europe";
}

/** What the setup screen saves: the space, one starter bed to plant in, and the cues switched on. */
export function buildSetup({ environment, size, region, zoneId }) {
  const env = SIZES[environment] ? environment : "backyard";
  const [lengthM, widthM] = SIZES[env][size] || SIZES[env].medium;
  const zp = buildStarterZone(env, lengthM, widthM, null);
  const zone = {
    id: zoneId, name: zp.spec.label, emoji: zp.spec.emoji, type: zp.spec.type, areaM2: zp.areaM2,
    soilType: "loam", notes: "", xM: zp.xM, yM: zp.yM, wM: zp.wM, hM: zp.hM,
  };
  return {
    setupDone: true,
    region: region || "western_europe",
    zones: [zone],
    farmW: zp.farmW,
    farmH: zp.farmH,
    profile: {
      ...DEF.profile,
      environment: env,
      dimensions: { lengthM: r1(lengthM), widthM: r1(widthM), areaM2: r1(lengthM * widthM), unit: "metric", covered: null },
      onboardingVersion: 3, // 3 = one-screen setup; the rest is asked later, in context
      firstRun: { skipped: false },
    },
  };
}

/**
 * The cues that follow setup: plant a crop → (on a farm) add an animal → tick off a job.
 * → null when there is nothing to show; else { steps: [{ id, done }], current, index, total }.
 */
export function cueState(data) {
  const run = data?.profile?.firstRun;
  if (!run || run.skipped) return null;
  const planted = (data.garden?.plots || []).length > 0 || (data.nursery?.batches || []).length > 0;
  const animals = (data.livestock?.animals || []).length > 0;
  const ticked = Object.values(data.completions || {}).some((list) => (list || []).length > 0)
    || (data.garden?.plots || []).some((p) => (p.steps || []).some((s) => s.done) || p.status === "harvested");
  const steps = [{ id: "plant", done: planted }];
  if (data.profile?.environment === "farm") steps.push({ id: "animal", done: animals });
  steps.push({ id: "job", done: ticked });
  const index = steps.findIndex((s) => !s.done);
  if (index < 0) return null;
  return { steps, current: steps[index].id, index: index + 1, total: steps.length };
}

/** Skip (or finish) the cues for good. */
export function endCues(data) {
  return { ...data, profile: { ...data.profile, firstRun: { ...(data.profile?.firstRun || {}), skipped: true } } };
}
