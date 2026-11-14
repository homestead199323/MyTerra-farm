/* ═══════════════════════════════════════════
   REGIONAL HELPERS — region-aware crop, variety, and calendar lookups
   Extracted from App.jsx (Phase A.7, 2026-05-09)

   Crops only. getRegionalVarieties and getRegionalCalendar live TOGETHER in
   lib/regional-detail.js (moved as a pair, code unchanged, 2026-11-14): they
   pull in the variety lists and the livestock calendars, which only the
   planting form, the guides and the assistant read — none of them part of the
   startup script. Do not import regional-detail from here or from anything the
   map needs at start, or those tables ride along again.
   ═══════════════════════════════════════════ */

import { CROPS, CROP_MAP } from "../data/crops";
import { RO } from "../data/regional-overrides";

export function getRegionalCrop(baseCrop, region) {
  if (!region || region === "western_europe") return baseCrop;
  const regionOverrides = RO[region];
  if (!regionOverrides) return baseCrop;
  const ov = regionOverrides[baseCrop.name];
  if (!ov) return baseCrop;
  if (ov._na) return null;
  const merged = {};
  const keys = Object.keys(baseCrop);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    merged[k] = ov[k] !== undefined ? ov[k] : baseCrop[k];
  }
  if (ov.regionNote) merged.regionNote = ov.regionNote;
  if (ov.pests) merged.pests = ov.pests;
  return merged;
}

export function getRegionalCrops(region) {
  if (!region || region === "western_europe") return CROPS;
  const result = [];
  for (let i = 0; i < CROPS.length; i++) {
    const rc = getRegionalCrop(CROPS[i], region);
    if (rc) result.push(rc);
  }
  return result;
}

export function getRegionalCropMap(region) {
  if (!region || region === "western_europe") return CROP_MAP;
  return new Map(getRegionalCrops(region).map(function(c) { return [c.name, c]; }));
}

// Cached region helpers — cheap way to avoid recomputing on every render
let _rCacheId = null, _rCacheMap = null, _rCacheCrops = null;
export function rCM(region) {
  const r = region || "western_europe";
  if (r !== _rCacheId) { _rCacheId = r; _rCacheMap = getRegionalCropMap(r); _rCacheCrops = getRegionalCrops(r); }
  return _rCacheMap;
}
export function rCR(region) {
  const r = region || "western_europe";
  if (r !== _rCacheId) { _rCacheId = r; _rCacheMap = getRegionalCropMap(r); _rCacheCrops = getRegionalCrops(r); }
  return _rCacheCrops;
}
