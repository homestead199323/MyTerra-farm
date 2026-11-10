/* ═══════════════════════════════════════════
   FROST HARDINESS — how much cold each crop takes (used by weather alerts)

   tender:     damaged or killed at 0°C (air frost). Summer crops from warm
               climates. RHS: "plant out only after the last frost".
   halfHardy:  shrug off a light frost (to about −2°C) but a hard frost
               (−4°C and below) damages leaves / roots in the open.
   everything else: hardy — no action below −4°C for annual veg in WE.
   blossom:    hardy trees whose spring blossom is killed by frost
               (Mar–May), so a frost then costs the year's fruit.
   citrus:     needs 5–7°C minimum (crops.js waterNote) — any cold night matters.

   Sources: RHS grow-your-own guides (tomato, courgette, French bean,
   sweetcorn, basil, potato "protect shoots from frost", lettuce, chard),
   RHS "Frost protection" advice; crops.js notes for citrus.
   ═══════════════════════════════════════════ */

export const TENDER = new Set([
  "Tomato", "Pepper (Sweet)", "Pepper (Hot)", "Eggplant", "Zucchini", "Cucumber",
  "Pumpkin", "Watermelon", "Melon", "Corn", "Okra", "Basil", "Bean (Dry)",
  "Sweet Potato", "Sunflower", "Potato",
]);

export const HALF_HARDY = new Set([
  "Lettuce", "Celery", "Celeriac", "Swiss Chard", "Beetroot", "Fennel", "Dill",
  "Chickpea", "Lentil", "Artichoke", "Pomegranate", "Fig", "Olive",
]);

export const BLOSSOM = new Set(["Peach", "Apricot", "Plum", "Cherry", "Almond", "Strawberry", "Apple", "Pear"]);
export const CITRUS = new Set(["Lemon", "Orange"]);

/** Crops that should be picked before a frost (fruit or tubers ruined by it). Potato excluded: tubers sit safe underground. */
export const PICK_BEFORE_FROST = new Set([
  "Tomato", "Pepper (Sweet)", "Pepper (Hot)", "Eggplant", "Zucchini", "Cucumber",
  "Pumpkin", "Watermelon", "Melon", "Corn", "Okra", "Basil", "Bean (Dry)", "Sweet Potato",
]);

/** Tall crops worth staking/checking before a gale. */
export const TALL = new Set([
  "Tomato", "Corn", "Sunflower", "Bean (Dry)", "Pea", "Broad Bean", "Brussels Sprouts",
  "Pepper (Sweet)", "Eggplant", "Artichoke",
]);

/** Late-blight hosts (Phytophthora infestans). */
export const BLIGHT_HOSTS = new Set(["Tomato", "Potato"]);

/** "tender" | "halfHardy" | "hardy" */
export function hardiness(cropName) {
  if (TENDER.has(cropName) || CITRUS.has(cropName)) return "tender";
  if (HALF_HARDY.has(cropName)) return "halfHardy";
  return "hardy";
}
