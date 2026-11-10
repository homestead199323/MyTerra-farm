/* ═══════════════════════════════════════════
   REGIONAL HELPERS — region-aware crop, variety, and calendar lookups
   Extracted from App.jsx (Phase A.7, 2026-05-09)

   HISTORY: getRegionalVarieties and getRegionalCalendar caused regressions
   when extracted previously (befd4da, b8e887c). Both must stay in this module
   together — never split them out separately.
   ═══════════════════════════════════════════ */

import { CROPS, CROP_MAP } from "../data/crops";
import { RO, LDB_RO } from "../data/regional-overrides";
import { VARIETIES, VAR_RO } from "../data/varieties";
import { LIVESTOCK_CALENDAR } from "../data/livestock-calendar";

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

// Region-specific variety lists (VAR_RO) sit on top of the Western-Europe base
// (VARIETIES). Restored 2026-10-12: the extraction in b8e887c dropped the
// region argument, so every region saw the UK list (and its yields).
// A region without its own list borrows the base list, with each variety's yield scaled by
// that region's crop yield, so picking a variety never swaps a regional yield for a UK one.
const _scaledVarieties = new Map();
export function getRegionalVarieties(cropName, region) {
  if (!cropName) return [];
  const r = region || "western_europe";
  const base = VARIETIES[cropName] || [];
  if (r === "western_europe") return base;
  const rov = VAR_RO[r];
  if (rov && rov[cropName]) return rov[cropName];
  const baseCrop = CROP_MAP.get(cropName);
  const regional = baseCrop ? getRegionalCrop(baseCrop, r) : null;
  if (!base.length || !regional || !baseCrop.yld || !regional.yld || regional.yld === baseCrop.yld) return base;
  const key = r + "|" + cropName;
  if (!_scaledVarieties.has(key)) {
    const k = regional.yld / baseCrop.yld;
    _scaledVarieties.set(key, base.map(function (v) {
      return v.yld ? Object.assign({}, v, { yld: Number((v.yld * k).toPrecision(2)) }) : v;
    }));
  }
  return _scaledVarieties.get(key);
}

export function getRegionalCalendar(animalName, region) {
  const base = LIVESTOCK_CALENDAR[animalName];
  if (!base) return null;
  if (!region || region === "western_europe") return base;
  const overrides = LDB_RO[region] && LDB_RO[region][animalName];
  if (!overrides) return base;
  return Object.assign({}, base, overrides);
}
