/* ═══════════════════════════════════════════
   STORAGE — single persistence layer for the whole app

   All localStorage access funnels through this file. UI code never imports
   `localStorage` directly. To swap the backend (Capacitor Preferences on
   mobile, Supabase for cloud sync, etc.), replace the `kv*` adapter
   functions below.

   Phase A.1 (2026-05-07): extracted DB + uid out of App.jsx.
   Phase 4   (2026-05-09): adapter + clean API + UI pref helpers.
                            App.jsx no longer touches localStorage directly.
   ═══════════════════════════════════════════ */

// ─── Adapter ────────────────────────────────────────────────
// To swap for Capacitor on mobile: replace these three with the
// @capacitor/preferences equivalents. Capacitor's API is async, so the
// callers below would also become async — that is the natural boundary
// where mobile work happens.
const kvGet = (key) => {
  try { return localStorage.getItem(key); }
  catch (e) { console.warn("kvGet failed:", key, e); return null; }
};
const kvSet = (key, val) => {
  try { localStorage.setItem(key, val); return true; }
  catch (e) { console.warn("kvSet failed:", key, e); return false; }
};
// kvRemove is exported for future use (logout, reset farm, clear cache).
export const kvRemove = (key) => {
  try { localStorage.removeItem(key); return true; }
  catch (e) { console.warn("kvRemove failed:", key, e); return false; }
};

// ─── Keys ───────────────────────────────────────────────────
// One source of truth for every key we read/write.
const KEYS = {
  FARM: "hfm_data_v7",
  FARM_OWNER: "hfm_farm_owner", // user id the local FARM cache belongs to (Phase 5 multi-account guard)
  UNSYNCED: "hfm_unsynced_at", // time (ms) of the newest edit the cloud has not confirmed yet (lib/unsynced.js)
  PAGE: "hfm_page",
  THEME: "hfm_theme",
  FEEDBACK_DONE: "hfm_feedback_done",
  FEEDBACK_DISMISSED: "hfm_feedback_dismissed",
  FIRST_USE: "hfm_first_use",
  WEATHER_CACHE: "hfm_weather_cache_v1",
  GEO_CACHE: "hfm_geo_cache_v1",
  FORECAST_CACHE: "hfm_forecast_cache_v1",
  PUSH_PREFS: "hfm_push_v1", // this device: { on, hour, dismissed }
};

// ─── Farm data — debounced ──────────────────────────────────
let _saveTimer = null;
let _latestData = null;

export const loadFarm = () => {
  const raw = kvGet(KEYS.FARM);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch (e) { console.warn("loadFarm parse failed:", e); return null; }
};

function reportSave(status) {if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent('farm-save-status',{detail:status}));}
function persistFarm(data) {const saved=kvSet(KEYS.FARM,JSON.stringify(data));reportSave(saved?'saved':'error');return saved;}
export const saveFarm = (data) => {
  reportSave('saving');
  _latestData = data;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => persistFarm(data), 500);
};

export const saveFarmImmediate = (data) => {
  if (_saveTimer) clearTimeout(_saveTimer);
  _latestData=data;
  return persistFarm(data);
};

export const flushFarm = () => {
  if (_latestData) saveFarmImmediate(_latestData);
};

// ─── Multi-account guard (Phase 5) ──────────────────────────
// The local FARM cache is a single localStorage key shared by everyone who
// uses this browser. To stop one signed-in user from seeing another's
// cached farm, we stamp the cache with the owning user id and clear it on
// sign-out / account switch. AuthGate is the only caller.
export const loadFarmOwner = () => kvGet(KEYS.FARM_OWNER);
export const saveFarmOwner = (userId) => kvSet(KEYS.FARM_OWNER, String(userId || ""));

// Wipe the local farm cache + owner stamp. Cancels any pending debounced
// save so it can't resurrect the cleared data a moment later.
export const clearFarm = () => {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  _latestData = null;
  kvRemove(KEYS.FARM);
  kvRemove(KEYS.FARM_OWNER);
  kvRemove(KEYS.UNSYNCED);
};

// Time stamp of the newest edit the cloud has not confirmed (0 = everything is backed up).
export const markUnsynced = (ms) => kvSet(KEYS.UNSYNCED, String(ms));
export const clearUnsynced = () => kvRemove(KEYS.UNSYNCED);
export const loadUnsynced = () => Number(kvGet(KEYS.UNSYNCED)) || 0;

// Returns the raw JSON string (or null). Used by the ErrorBoundary
// "Export Backup" button — we deliberately skip parse-then-stringify so a
// partially corrupt save can still be exported for recovery.
export const exportFarm = () => kvGet(KEYS.FARM);

// Accepts a JSON string. Validates by parsing, then writes raw.
// Returns true on success, false on parse/write error.
// Note: this does NOT run migrations or merge with DEF — that is the
// responsibility of the caller (see App.jsx `readBackup` / src/lib/backup.js).
export const importFarm = (jsonString) => {
  try {
    JSON.parse(jsonString); // validate only
    return kvSet(KEYS.FARM, jsonString);
  } catch (e) {
    console.warn("importFarm parse failed:", e);
    return false;
  }
};

// ─── UI prefs ───────────────────────────────────────────────
// `load*` / `save*` naming to avoid collision with React `setX` setters.
export const loadPage = () => kvGet(KEYS.PAGE);
export const savePage = (p) => kvSet(KEYS.PAGE, p);

export const loadTheme = () => kvGet(KEYS.THEME);
export const saveTheme = (t) => kvSet(KEYS.THEME, t);

export const loadFeedbackDone = () => kvGet(KEYS.FEEDBACK_DONE) === "true";
export const markFeedbackDone = () => kvSet(KEYS.FEEDBACK_DONE, "true");

export const loadFeedbackDismissed = () => kvGet(KEYS.FEEDBACK_DISMISSED) === "true";
export const markFeedbackDismissed = () => kvSet(KEYS.FEEDBACK_DISMISSED, "true");

export const loadFirstUse = () => kvGet(KEYS.FIRST_USE);
export const saveFirstUse = (ts) => kvSet(KEYS.FIRST_USE, String(ts));

// ─── Weather + geocode caches ───────────────────────────────
// Both store JSON objects keyed by lowercase city name. Weather entries
// carry their own `fetchedAt` timestamp; the TTL check lives in
// src/lib/weather.js (storage stays dumb).
const loadJsonCache = (key) => {
  const raw = kvGet(key);
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch (e) { return {}; }
};
const saveJsonCache = (key, obj) => kvSet(key, JSON.stringify(obj));

export const loadWeatherCache = () => loadJsonCache(KEYS.WEATHER_CACHE);
export const saveWeatherCache = (obj) => saveJsonCache(KEYS.WEATHER_CACHE, obj);

export const loadForecastCache = () => loadJsonCache(KEYS.FORECAST_CACHE);
export const saveForecastCache = (obj) => saveJsonCache(KEYS.FORECAST_CACHE, obj);
export const loadGeoCache = () => loadJsonCache(KEYS.GEO_CACHE);
export const loadPushPrefs = () => loadJsonCache(KEYS.PUSH_PREFS);
export const savePushPrefs = (obj) => saveJsonCache(KEYS.PUSH_PREFS, obj);
export const saveGeoCache = (obj) => saveJsonCache(KEYS.GEO_CACHE, obj);

// ─── Utility ────────────────────────────────────────────────
export const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

