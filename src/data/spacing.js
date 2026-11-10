// Planting-grid guidance, in centimetres. Every value is a starting point the grower can edit.
//
// ROW_SPACING — distance between straight rows in a bed, paired with the crop's in-row
//   `spacing` from crops.js (typical UK/RHS kitchen-garden row guidance).
// HEX_SPACING — biointensive equidistant (offset / hexagonal) spacing: every plant sits this far
//   from each neighbour. Approximate values from the Jeavons biointensive master charts
//   ("How to Grow More Vegetables"). Crops without a value fall back to the in-row spacing.
export const ROW_SPACING = {
  Tomato: 75, "Pepper (Sweet)": 60, "Pepper (Hot)": 60, Potato: 70, Onion: 25, Garlic: 30,
  Cabbage: 60, "Bean (Dry)": 45, Zucchini: 90, Carrot: 15, Spinach: 30, Cucumber: 90,
  Lettuce: 30, Pumpkin: 180, Beetroot: 30, "Broad Bean": 45, Leek: 30, Grape: 250,
  Basil: 30, Oregano: 45, Rosemary: 90, Sage: 60, Mint: 45, Lavender: 60, Wheat: 15,
  Eggplant: 75, Watermelon: 180, Melon: 150, Corn: 60, Okra: 75, Radish: 15, Turnip: 30,
  Celery: 30, "Swiss Chard": 45, Kale: 60, Asparagus: 45, Pea: 60, Strawberry: 75,
  Raspberry: 180, Chamomile: 30, Thyme: 30, Parsley: 30, Dill: 30, Broccoli: 60,
  Cauliflower: 60, "Brussels Sprouts": 75, "Sweet Potato": 90, Celeriac: 45, Sunflower: 60,
  Artichoke: 120, Rhubarb: 90, Blackberry: 250, Fennel: 45, Lentil: 30, Chickpea: 45,
};
export const HEX_SPACING = {
  Tomato: 45, "Pepper (Sweet)": 30, "Pepper (Hot)": 30, Potato: 23, Onion: 10, Garlic: 10,
  Cabbage: 40, "Bean (Dry)": 15, Zucchini: 53, Carrot: 8, Spinach: 15, Cucumber: 30,
  Lettuce: 25, Pumpkin: 75, Beetroot: 10, "Broad Bean": 20, Leek: 15, Basil: 15,
  Eggplant: 45, Melon: 45, Watermelon: 50, Corn: 38, Radish: 5, Turnip: 10, Celery: 20,
  "Swiss Chard": 20, Kale: 38, Pea: 8, Strawberry: 30, Parsley: 13, Broccoli: 38,
  Cauliflower: 38, "Brussels Sprouts": 45, "Sweet Potato": 23, Wheat: 13,
};
const HEX_ROW = Math.sqrt(3) / 2;

/** Default grid for a crop and pattern: { inRowCM, rowCM, hexCM }. */
export function spacingGuide(crop, pattern = "rows") {
  const inRow = Number(crop?.spacing) || 30;
  const hex = HEX_SPACING[crop?.name] || inRow;
  if (pattern === "offset") return { inRowCM: hex, rowCM: round1(hex * HEX_ROW), hexCM: hex };
  return { inRowCM: inRow, rowCM: ROW_SPACING[crop?.name] || Math.max(inRow, 20), hexCM: hex };
}

/**
 * Per-plant yield multiplier for a grid. The database per-plant yield assumes standard rows
 * (the crop's in-row spacing x its row spacing). Any denser grid, the biointensive offset grid
 * included, gives each plant proportionally less, so a bed never estimates more per square
 * metre than standard rows would (conservative on purpose).
 * Scattered trees pass no row spacing: only the minimum distance between plants is known, so
 * the factor compares that distance with the crop's own spacing.
 */
export function crowdingFactor(crop, inRowCM, rowCM) {
  const inRow = Number(crop?.spacing) || 30;
  if (rowCM === undefined || rowCM === null) {
    const d = Number(inRowCM);
    return d > 0 && d < inRow * 0.985 ? (d * d) / (inRow * inRow) : 1;
  }
  const reference = inRow * (ROW_SPACING[crop?.name] || Math.max(inRow, 20)),
    area = Number(inRowCM) * Number(rowCM);
  if (!(area > 0)) return 1;
  // 3% tolerance so hand-rounded spacings still count as on-guide.
  return area >= reference * 0.97 ? 1 : area / reference;
}

/** Plants per square metre for a grid. */
export function plantDensity(inRowCM, rowCM) {
  const area = (Number(inRowCM) / 100) * (Number(rowCM) / 100);
  return area > 0 ? 1 / area : 0;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
