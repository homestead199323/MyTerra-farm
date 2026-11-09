/* ═══════════════════════════════════════════
   MAP PALETTE — the one set of colours for every map view: the 3D toy diorama (toy.js turns
   these into numbers) and the flat overhead / layout editor (AerialArtwork + GroveScene use the
   strings directly). Change a colour here and both views change. No three.js import, so the
   flat map stays light. Style rules: docs/MAP_STYLE.md.
   MARKER: MAP_PALETTE_V1
   ═══════════════════════════════════════════ */
export const TOY = {
  page: "#c3bd78", // warm sunny olive backdrop (look A, 2026-11-07)
  yard: "#d9d2c3", yardRim: "#c9c2b3", // Yard / parking: a pale gravel slab with white bay lines
  meadow: "#a8a95a", meadowB: "#9b9e51", meadowDry: "#bcb46f", apron: "#a2ae5c",
  lawn: "#9dad58", pasture: "#a1ac5a", orchard: "#96a654",
  path: "#eee3cb", pathEdge: "#dccdae", gravel: "#dfd9ca", stonePath: "#d8d3c8", soilPath: "#cfbca2",
  soil: "#7a5237", soilDark: "#5f3f2a", soilLight: "#957155", mulch: "#6f4f3a", earth: "#b69f82", floor: "#8e7861",
  wood: "#cfae82", woodMid: "#b68e63", woodDark: "#7c5a3d", woodPale: "#e2cfae",
  cream: "#f2ebdd", white: "#fbfaf6", trim: "#ffffff", panel: "#ebe5d8",
  plaster: "#f3dcb8", plasterPeach: "#eec3a0", plasterStone: "#e9dcc0", // apartment blocks round a balcony: warm plaster, never grey in shade
  asphalt: "#b5b0a4", kerb: "#e6e0d2", // the street in front of a balcony's courtyard
  terracotta: "#cf8260", slate: "#87909a", slateDark: "#6d7781", zinc: "#c6cdd0", metal: "#9ea8ae", dark: "#3b3f44", ink: "#2a2d31",
  barn: "#c7624f", barnDark: "#ad5041",
  green: "#128147", greenLight: "#1fa35c", greenPale: "#e7f3ec", greenDeep: "#0c5e33",
  leaf: ["#628f3e", "#548237", "#749b48", "#477732"], leafOlive: "#7d916a", leafCitrus: "#33733d", leafDark: "#3a7742", hedge: "#3f7634",
  water: "#7cc0d6", waterDeep: "#66afc9", ripple: "#dff2f8",
  glass: "#daf2ef", winGlass: "#9fc9dc",
  hay: "#e4c66f", hayDark: "#cfa94f", straw: "#e8d393",
  stone: "#d3cfc5", stoneDark: "#bdb8ac", rock: "#aaa89e", rockDark: "#94928a", concrete: "#dbd7cd",
  compost: ["#8a6b4f", "#70563d", "#5a4532"],
  pot: "#cf8862", potRim: "#c27753",
  hive: ["#f8f3e7", "#e4eef1", "#f7ecca", "#e7f1dd"],
  solar: "#2c3d5a", solarFrame: "#e0e4e7",
  glow: "#ffd166", tagPole: "#947757",
  smoke: "#f2f0ec", bee: "#f2c53d", beeDark: "#3a3127",
  flower: ["#f48fb1", "#f6d46a", "#ffffff", "#e8a0dd", "#ffa36e", "#9fc5ff"],
  gold: "#f7c552", orange: "#c97f17", shadow: "#3d5a3a",
};
/* growth stages: planned, sown, seedling, growing, maturing, harvest window */
export const STAGE_HEX = ["#c3cbc4", "#dcca92", "#a9dd8c", "#5fb24d", "#c1d44f", "#f7c552"];
/* Settings → Ground material / colour: [base, patch, dry] */
export const GROUND_TONES = {
  meadow: { natural: ["#a8a95a", "#9b9e51", "#bcb46f"], dry: ["#aeb27f", "#9fa472", "#bdb98a"], deep: ["#5d8440", "#507536", "#92a26a"] },
  soil: ["#bda583", "#b09876", "#cab596"], gravel: ["#dcd6c8", "#d0c9ba", "#e3ded1"], stone: ["#d6d2c8", "#cac5ba", "#dfdbd2"],
};
/* Settings → Path material / colour: [surface, edge] */
export function pathTones(material, colour) {
  if (colour === "warm") return ["#ddcaa6", "#ccb78f"];
  if (colour === "dark") return ["#b0b6b0", "#9aa19a"];
  if (material === "stone") return [TOY.stonePath, "#d6d2c9"];
  if (material === "soil") return [TOY.soilPath, "#cdbaa0"];
  return [TOY.path, TOY.pathEdge];
}
/* fruit colour when a tree is in its harvest window */
export const FRUIT_HEX = { apple: "#e0453a", pear: "#d1cf5e", peach: "#f09a62", plum: "#6a4690", cherry: "#c8202f", apricot: "#f4a64c", lemon: "#f6d93c", orange: "#f5922e", citrus: "#f5922e", fig: "#6a4468", olive: "#4a6a3e", walnut: "#7f9a55", almond: "#9bb067", hazelnut: "#b08a5a", chestnut: "#8f6b4c", quince: "#e8d25a", persimmon: "#f07a2e", pomegranate: "#c83a3a", avocado: "#3f5f33" };
