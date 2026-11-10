/* ═══════════════════════════════════════════
   FARM CALC — crop quantity & zone space helpers
   Extracted from App.jsx (Phase A.7, 2026-05-09)

   NOTE: These functions depend on rCM() from ./regional.
   Do not import them into App.jsx without also importing regional.js.
   ═══════════════════════════════════════════ */

import { rCM } from "./regional";

/* ── Crop quantity helpers ─────────────────────────────────────────────────── */

// How this crop is best measured (plants or area)
export function cropMeasureType(cropName, region) {
  const crop = rCM(region).get(cropName);
  if (!crop) return "plants";
  if (["Apple","Pear","Olive","Grape","Fig","Pomegranate","Peach","Plum","Cherry","Apricot",
       "Walnut","Almond","Chestnut","Quince","Persimmon","Lemon","Orange",
       "Hazelnut","Raspberry","Strawberry"].includes(cropName)) return "plants";
  if (["Wheat","Corn"].includes(cropName)) return "area";
  // Default: area for dense crops (spacing ≤ 15cm), plants for sparse
  return crop.spacing <= 15 ? "area" : "plants";
}

// Auto-calculate plant count from area (m²) and crop spacing (cm)
export function plantsFromArea(cropName, areaSqm, region) {
  const crop = rCM(region).get(cropName);
  if (!crop || !areaSqm || !crop.spacing || crop.spacing <= 0) return null;
  const spacingM = crop.spacing / 100;
  return Math.round(areaSqm / (spacingM * spacingM));
}

// Expected yield — yld is ALWAYS kg/plant.
// Area mode: convert m² → plant count via spacing, then multiply.
// Plants mode: direct multiply.
// varietyYld overrides base crop yld when a specific variety is selected.
export function expectedYield(cropName, quantity, measureType, varietyYld, region) {
  const crop = rCM(region).get(cropName);
  if (!crop || !quantity) return null;
  const yldPerPlant = varietyYld || crop.yld || 3;
  let plants;
  if (measureType === "area") {
    const spacingM = crop.spacing / 100;
    plants = quantity / (spacingM * spacingM);
  } else {
    plants = quantity;
  }
  return Math.round(plants * yldPerPlant * 10) / 10;
}

/* ── Zone space helpers ────────────────────────────────────────────────────── */

// Total area of a zone in m²
export function zoneAreaM2(zone, farmW, farmH) {
  if (zone.wM !== undefined && zone.hM !== undefined) return zone.wM * zone.hM;
  // Legacy percent-based zones
  const fw = farmW || 100, fh = farmH || 60;
  return (zone.w / 100) * fw * (zone.h / 100) * fh;
}

// Area consumed by a single plot in m²
export function plotAreaM2(plot, region) {
  if (!plot || plot.status === "harvested") return 0;
  if (plot.layout?.version===2) {const l=plot.layout,s=l.spacingCM/100;return l.pattern==='scatter'?(plot.plantCount||0)*s*s:l.lengthM*(s+(l.rowCount-1)*l.rowSpacingCM/100);}
  if (plot.measureType === "area" && plot.qty) return +plot.qty;
  if (plot.plantCount) {
    const crop = rCM(region).get(plot.crop);
    if (crop) {
      const spacingM = crop.spacing / 100;
      return plot.plantCount * spacingM * spacingM;
    }
  }
  return 0;
}

// Returns {totalM2, usedM2, freeM2, pct} for a zone
export function zoneSpaceStats(zone, plots, farmW, farmH, region) {
  const totalM2 = zoneAreaM2(zone, farmW, farmH);
  const activePlots = plots.filter(function(p) { return p.zone === zone.id && p.status !== "harvested"; });
  const usedM2 = activePlots.reduce(function(s, p) { return s + plotAreaM2(p, region); }, 0);
  const freeM2 = Math.max(0, totalM2 - usedM2);
  const pct = totalM2 > 0 ? Math.min(1, usedM2 / totalM2) : 0;
  return { totalM2, usedM2: Math.round(usedM2 * 10) / 10, freeM2: Math.round(freeM2 * 10) / 10, pct };
}

// Memoizable: builds stats for ALL zones in one pass
export function buildZoneSpaceMap(zones, plots, farmW, farmH, region) {
  const map = {};
  zones.forEach(function(z) { map[z.id] = zoneSpaceStats(z, plots, farmW, farmH, region); });
  return map;
}

