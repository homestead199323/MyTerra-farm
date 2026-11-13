import { LDB } from "../../data/livestock.js";
import { rCM } from "../../lib/regional.js";
import { animalZone } from "../quiet/farm-model.js";
import { isRecurringCrop } from "../../lib/perennial.js";

/** Tasks due today, grouped by the map area where they are done. */
export function tasksByZone(tasks, data) {
  const zones = data.zones || [],
    plots = data.garden?.plots || [],
    animals = data.livestock?.animals || [];
  const out = {};
  tasks
    .filter((t) => t.daysOut === 0 && !["forecast", "upcoming"].includes(t.type))
    .forEach((t) => {
      const plot = t.plotId && plots.find((p) => p.id === t.plotId);
      let id = plot?.zone || (!plot && t.zoneId) || null;
      if (!id) {
        const animal = animals.find((a) => a.id === t.animalId || (t.speciesType && a.type === t.speciesType));
        id = animal ? animalZone(animal, zones)?.id : null;
      }
      if (id && zones.some((z) => z.id === id)) (out[id] = out[id] || []).push(t);
    });
  // Produce to collect comes first, then the rest by priority.
  const rank = (t) => (["harvest", "eggs", "milk"].includes(t.type) ? -1 : (t.pri ?? 9));
  Object.values(out).forEach((list) => list.sort((a, b) => rank(a) - rank(b)));
  return out;
}

// What to do, shown as the task's badge/sticker. Crop emojis are not used here: many crops have
// placeholder dots (🟣, 🤎) instead of a real emoji; the crop itself is drawn with its own art.
const GLYPHS = {
  harvest: "🧺",
  eggs: "🥚",
  milk: "🥛",
  feed: "🌾",
  water: "💧",
  clean: "🧹",
  bedding: "🛏️",
  paddock: "🔄",
  health: "🩺",
  hoof: "🦶",
  hive: "🐝",
  step: "🌱",
  forecast: "📅",
  upcoming: "📅",
};
export function taskGlyph(task) {
  if (task.type === "seedling" || task.type === "weather" || task.type === "own") return task.emoji || "🌱";
  return GLYPHS[task.type] || "✅";
}

const VERBS = {
  eggs: "Collect",
  milk: "Milk",
  harvest: "Harvest",
  feed: "Feed",
  water: "Water",
  clean: "Clean",
  bedding: "Change",
  paddock: "Move",
  health: "Checked",
  hoof: "Trimmed",
  hive: "Inspected",
  step: "Done",
  seedling: "Done",
};
const CHEERS = {
  feed: "Fed!",
  water: "Watered!",
  clean: "Sparkling!",
  bedding: "Fresh bed!",
  paddock: "Fresh grass!",
  health: "Healthy!",
  hoof: "Trimmed!",
  hive: "Buzzing!",
  weather: "Ready for it!",
};

/**
 * How a task is played in the zone popup: the button verb, an optional amount to confirm
 * (eggs, milk, harvest go to the pantry), and the reward shown when it is done.
 */
export function taskAction(task, data) {
  const verb = VERBS[task.type] || "Done";
  if (task.type === "eggs") {
    const rate = LDB[task.speciesType]?.out?.Eggs?.p || 0.6;
    return { verb, amount: { value: Math.max(1, Math.round(rate * (task.headCount || 1))), step: 1, unit: "eggs", icon: "🥚" } };
  }
  if (task.type === "milk") {
    const value = task.expected || Math.round((LDB[task.speciesType]?.out?.Milk?.p || 1) * (task.headCount || 1) * 10) / 10;
    return { verb, amount: { value, step: 0.5, unit: "L", icon: "🥛" } };
  }
  if (task.type === "harvest") {
    const plot = data.garden?.plots.find((p) => p.id === task.plotId),
      crop = plot && rCM(data.region).get(plot.crop);
    return {
      verb,
      // crop.yld is kg per plant: scale by the planting's count for the suggested amount.
      amount: { value: plot?.expectedYieldKg || (crop?.yld ? Math.round(Math.max(0.1, crop.yld * (Number(plot?.plantCount) || 1)) * 10) / 10 : 0) || 3, step: 0.5, unit: "kg", icon: "🧺" },
      final: isRecurringCrop(crop) ? "Stays planted — due again next season." : "Marks the whole planting as harvested.",
    };
  }
  const seed = /^seed-(.+)-planted$/.exec(task.key || "");
  if (seed) {
    const batch = (data.nursery?.batches || []).find((b) => b.id === seed[1]);
    if (batch && !batch.plotId) return { verb: "Choose bed", open: true };
  }
  return { verb, cheer: CHEERS[task.type] || "Done!" };
}

/** A typed amount as a number ("2,5" counts as 2.5); NaN when it isn't one, null when blank. */
export function parseAmount(value) {
  const raw = String(value == null ? "" : value).trim().replace(",", ".");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Checks the amount typed in the popup before a job is ticked.
 * → { ok, zero, error, big }
 *   blank → ok (MyTerra's estimate is used); 0 → ok + zero (nothing picked/collected);
 *   negative or not a number → error; eggs must be whole; far above the estimate → big
 *   (the caller asks for a second tap so a typo like 300 for 3.0 doesn't land in the pantry).
 */
export function checkAmount(task, action, value) {
  const amount = action && action.amount;
  if (!amount) return { ok: true };
  const n = parseAmount(value);
  if (n === null) return { ok: true };
  if (Number.isNaN(n) || n < 0) return { ok: false, error: "Enter a number, 0 or more." };
  if (task.type === "eggs" && !Number.isInteger(n)) return { ok: false, error: "Eggs are counted in whole numbers." };
  if (n === 0) return { ok: true, zero: true };
  const def = Number(amount.value) || 1;
  const limit = Math.max(def * (task.type === "harvest" ? 50 : 20), task.type === "harvest" ? 200 : 100);
  return { ok: true, big: n > limit, value: n };
}

/** Reward line shown when a task is completed from the popup. */
export function rewardText(task, action, value) {
  if (!action.amount) return action.cheer || "Done!";
  if (parseAmount(value) === 0) return task.type === "harvest" ? "Nothing picked" : "None today";
  const n = parseAmount(value) > 0 ? parseAmount(value) : action.amount.value;
  return `+${n} ${action.amount.unit === "eggs" ? "" : action.amount.unit + " "}${action.amount.icon}`.replace("  ", " ");
}

/** A short vibration on phones that allow it. */
export function buzz(ms) {
  try {
    // Chrome refuses (and logs an error) before the first tap on the page.
    if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(ms);
  } catch {
    /* haptics are optional */
  }
}
