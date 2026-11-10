// Calendar helpers — month names, sow/harvest range parsing, crop difficulty

export const MN_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export const MN_ABR = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

/**
 * Parse a sow/harvest string like "Mar-May, Oct" into an array of 0-based month indices.
 * Handles wrap-around ranges (e.g. "Nov-Feb").
 */
export function parseSowMonths(sowIn) {
  if (!sowIn) return [];
  const months = [];
  const ranges = sowIn.split(",").map(s => s.trim());
  ranges.forEach(r => {
    const parts = r.split("-").map(s => s.trim());
    if (parts.length === 2) {
      const si = MN_ABR.indexOf(parts[0]);
      const ei = MN_ABR.indexOf(parts[1]);
      if (si < 0 || ei < 0) return;
      if (ei >= si) {
        for (let i = si; i <= ei; i++) months.push(i);
      } else {
        // Wrap-around (e.g. Nov-Feb)
        for (let i = si; i <= 11; i++) months.push(i);
        for (let i = 0; i <= ei; i++) months.push(i);
      }
    } else if (parts.length === 1) {
      const idx = MN_ABR.indexOf(parts[0]);
      if (idx >= 0) months.push(idx);
    }
  });
  return [...new Set(months)];
}

/** Alias — harvest strings use the same format as sow strings. */
export function parseHarvestMonths(harvest) { return parseSowMonths(harvest); }

// ---------------------------------------------------------------------------
// Crop difficulty — beginner-friendly classification
// ---------------------------------------------------------------------------

export const CROP_DIFFICULTY = {
  easy: [
    "Radish","Lettuce","Spinach","Zucchini","Bean (Dry)","Pea","Broad Bean",
    "Mint","Basil","Kale","Swiss Chard","Strawberry","Turnip","Sunflower",
    "Blackberry","Rhubarb",
  ],
  medium: [
    "Tomato","Pepper (Sweet)","Cucumber","Carrot","Onion","Beetroot","Cabbage",
    "Potato","Garlic","Leek","Pumpkin","Corn","Oregano","Rosemary","Sage",
    "Thyme","Parsley","Dill","Chamomile","Lavender","Broccoli","Brussels Sprouts",
    "Fennel","Sweet Potato","Lentil","Chickpea",
  ],
  hard: [
    "Eggplant","Pepper (Hot)","Watermelon","Melon","Celery","Asparagus","Okra",
    "Wheat","Olive","Grape","Fig","Pomegranate","Peach","Plum","Cherry","Apricot",
    "Walnut","Almond","Chestnut","Quince","Persimmon","Lemon","Orange","Hazelnut",
    "Raspberry","Cauliflower","Artichoke","Celeriac",
  ],
};

export function getCropDifficulty(name) {
  /* bg = accent + 13% opacity so the tint renders correctly on both light cards (white) and dark cards (#192419) */
  if (CROP_DIFFICULTY.easy.includes(name))   return { l:"Easy",     c:"#27ae60", bg:"#27ae6022", e:"🟢" };
  if (CROP_DIFFICULTY.hard.includes(name))   return { l:"Advanced", c:"#e74c3c", bg:"#e74c3c22", e:"🔴" };
  return                                            { l:"Medium",   c:"#f39c12", bg:"#f39c1222", e:"🟡" };
}
