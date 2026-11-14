/* ═══════════════════════════════════════════
   REGIONAL DETAIL — variety lists and livestock calendars by region

   HISTORY: getRegionalVarieties and getRegionalCalendar caused regressions
   when extracted previously (befd4da, b8e887c: the region argument was
   dropped). They moved here from lib/regional.js on 2026-11-14 as a pair, code
   unchanged, and must stay together — never split them out separately.
   tests/launch-fixes.test.js covers the region argument.

   Kept apart from lib/regional.js so the variety lists (data/varieties.js) and
   the livestock calendars are fetched with the screens that show them, not
   with the startup script.
   ═══════════════════════════════════════════ */

import { CROP_MAP } from "../data/crops";
import { VARIETIES, VAR_RO } from "../data/varieties";
import { LIVESTOCK_CALENDAR } from "../data/livestock-calendar";
import { LDB_RO } from "../data/regional-livestock";
import { getRegionalCrop } from "./regional";

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
