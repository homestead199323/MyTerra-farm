/* ═══════════════════════════════════════════
   SKY — pure state for the 3D map's light: where the sun is for the local clock
   and latitude, which light preset that gives, and what today's weather does to
   it. No three.js here; Grove3D applies the result (see docs/MAP_STYLE.md §4
   and docs/superpowers/specs/2026-10-13-living-farm-map-design.md §1–2).
   ═══════════════════════════════════════════ */
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
const toHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0")).join("");
const mixHex = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const mix = (a, b, t) => a + (b - a) * t;

/** Solar elevation/azimuth for a clock time and latitude. With a longitude the hour is true solar time (UTC + lng/15,
    so summer time and the town's place in its zone are right); without one the local clock stands in for solar time. */
export function sunPosition(date, latDeg, lngDeg = null) {
  const solar = Number.isFinite(lngDeg);
  const start = solar ? Date.UTC(date.getUTCFullYear(), 0, 0) : new Date(date.getFullYear(), 0, 0), doy = Math.floor((date - start) / 864e5);
  const decl = 23.44 * DEG * Math.sin(2 * Math.PI * (284 + doy) / 365);
  const hours = solar ? ((date.getUTCHours() + date.getUTCMinutes() / 60 + lngDeg / 15) % 24 + 24) % 24 : date.getHours() + date.getMinutes() / 60, ha = (hours - 12) * 15 * DEG, lat = latDeg * DEG;
  const sinEl = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const el = Math.asin(clamp(sinEl, -1, 1));
  const cosAz = (Math.sin(decl) - Math.sin(el) * Math.sin(lat)) / Math.max(1e-6, Math.cos(el) * Math.cos(lat));
  let az = Math.acos(clamp(cosAz, -1, 1)); if (ha > 0) az = 2 * Math.PI - az; // afternoon: west of south
  return { elevation: el / DEG, azimuth: az / DEG };
}

/* scene mapping: the reference afternoon (15:00, 21 Jun, 50° N) must land on the map's historic sun
   vector (.55, 1.25, -.35) so "Live sky: off" is pixel-identical to the old fixed light */
const REF_VEC = (() => { const L = Math.hypot(.55, .66, -.35); return [.55 / L, .66 / L, -.35 / L]; })(); // ~45° up (look A, 2026-11-07): longer, clearer shadows
const REF = sunPosition(new Date(2026, 5, 21, 15, 0), 50);
const AZ_OFFSET = Math.atan2(REF_VEC[0], -REF_VEC[2]) / DEG - REF.azimuth; // scene azimuth = solar azimuth + offset
function dirFrom(elevationDeg, azimuthDeg) {
  const el = elevationDeg * DEG, az = (azimuthDeg + AZ_OFFSET) * DEG;
  return [Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)];
}

/* light presets by solar elevation (spec §1) */
const PRESETS = [
  { el: 35, sunColor: "#fff0d6", sunIntensity: 2.45, hemiSky: "#ffffff", hemiGround: "#b3ac78", hemiIntensity: .66, fog: "#c3bd78", exposure: 1.15, shadowIntensity: .97, envIntensity: .22 },
  { el: 12, sunColor: "#ffe2bd", sunIntensity: 1.8, hemiSky: "#fff6ea", hemiGround: "#b3ac78", hemiIntensity: .72, fog: "#c7bf82", exposure: 1.15, shadowIntensity: .93, envIntensity: .22 },
  { el: 0, sunColor: "#ffb876", sunIntensity: 1.1, hemiSky: "#d9c2b2", hemiGround: "#8f9c7e", hemiIntensity: .7, fog: "#b9b2a6", exposure: 1.12, shadowIntensity: .45, envIntensity: .2 },
  { el: -6, sunColor: "#a9bde0", sunIntensity: .55, hemiSky: "#5a72a6", hemiGround: "#2d3a52", hemiIntensity: .75, fog: "#22355a", exposure: 1.0, shadowIntensity: .45, envIntensity: .14 },
];
function presetAt(el) {
  if (el >= PRESETS[0].el) return { ...PRESETS[0] };
  if (el <= PRESETS[PRESETS.length - 1].el) return { ...PRESETS[PRESETS.length - 1] };
  for (let i = 0; i < PRESETS.length - 1; i++) {
    const a = PRESETS[i], b = PRESETS[i + 1];
    if (el <= a.el && el >= b.el) {
      const t = (a.el - el) / (a.el - b.el), out = {};
      Object.keys(a).forEach((k) => { out[k] = typeof a[k] === "number" ? mix(a[k], b[k], t) : mixHex(a[k], b[k], t); });
      return out;
    }
  }
  return { ...PRESETS[0] };
}

/* weather (Open-Meteo WMO codes, spec §2) */
export function windToScene(deg) { // meteorological "from" direction → unit vector the air moves toward, in scene x/z
  const a = (deg + 180 + AZ_OFFSET) * DEG; return [Math.sin(a), -Math.cos(a)];
}
const CALM = { cloud: 0, precip: "none", windDir: [.72, -.69], windStrength: .15, tempC: 15 };
export function weatherOf(w) {
  if (!w || typeof w.code !== "number") return { ...CALM };
  const c = w.code; let cloud = 0, precip = "none";
  if (c === 2) cloud = .4; else if (c === 3) cloud = .85; else if (c === 45 || c === 48) cloud = 1;
  else if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || (c >= 95 && c <= 99)) { cloud = .9; precip = "rain"; }
  else if ((c >= 71 && c <= 77) || c === 85 || c === 86) { cloud = .9; precip = "snow"; }
  const kmh = typeof w.windKmh === "number" ? w.windKmh : 0;
  return { cloud, precip, windDir: typeof w.windDeg === "number" ? windToScene(w.windDeg) : CALM.windDir, windStrength: clamp(kmh / 45, .15, 1), tempC: typeof w.temp === "number" ? w.temp : CALM.tempC };
}

/** The whole light/weather state Grove3D applies. */
export function skyState({ date = new Date(), lat = 50, lng = null, weather = null, liveSky = true, reduced = false, elevationOverride = null } = {}) {
  if (!liveSky) return { ...FIXED_SKY, reduced }; // off = the fixed afternoon, clear and calm, whatever the forecast (spec §1)
  const wx = weatherOf(weather);
  const pos = sunPosition(date, Number.isFinite(lat) ? lat : 50, lng);
  const el = elevationOverride == null ? pos.elevation : elevationOverride;
  const night = clamp(-el / 6, 0, 1), p = presetAt(el);
  // below the horizon the "moon" lights the scene: the sun's azimuth mirrored through north, 40° up
  // by day the shadow-casting sun keeps the real azimuth but stays 34–58° up (look A): a winter sun at 10° would smear
  // every shadow into a faint streak across the field; a diorama reads best with short, clear shadows all year
  const dir = night >= 1 ? dirFrom(40, 360 - pos.azimuth) : dirFrom(clamp(el, 34, 58), pos.azimuth);
  // cloud flattens the light: less sun, more sky, fainter shadows
  const flat = wx.cloud > .3 ? (wx.cloud - .3) / .7 : 0;
  return {
    sunDir: dir, sunColor: p.sunColor, sunIntensity: p.sunIntensity * (1 - .55 * flat),
    hemiSky: p.hemiSky, hemiGround: p.hemiGround, hemiIntensity: p.hemiIntensity + .25 * flat,
    fog: p.fog, fogNear: 1 - .35 * flat, exposure: p.exposure, shadowIntensity: p.shadowIntensity * (1 - .3 * flat), envIntensity: p.envIntensity,
    night, elevation: el, cloud: wx.cloud, precip: wx.precip, windDir: wx.windDir, windStrength: wx.windStrength, tempC: wx.tempC, reduced,
  };
}

export const FIXED_SKY = Object.freeze({
  sunDir: REF_VEC, sunColor: PRESETS[0].sunColor, sunIntensity: 2.45, hemiSky: "#ffffff", hemiGround: "#b3ac78", hemiIntensity: .66,
  fog: "#c3bd78", fogNear: 1, exposure: 1.15, shadowIntensity: .97, envIntensity: .22, night: 0, elevation: 55, cloud: 0, precip: "none",
  windDir: CALM.windDir, windStrength: .15, tempC: 15, reduced: false,
});

/* weather effects — pure counts and angles (weather-fx.js builds the meshes) */
export function precipCount(kind, { mobile = false, reduced = false } = {}) {
  if (reduced) return 0;
  const base = kind === "rain" ? 400 : kind === "snow" ? 260 : 0;
  return mobile ? base / 2 : base;
}
export function cloudCount(cloud, { mobile = false } = {}) {
  if (!(cloud > .3)) return 0;
  const n = Math.round(3 + 3 * (cloud - .3) / .7);
  return mobile ? Math.max(2, Math.round(n / 2)) : n;
}
/** rotation.y for the cupola vane: the arrow (tip toward local −x) points into the wind; windDir is where the air moves toward. */
export function vaneAngle(windDir) { return Math.atan2(-windDir[1], windDir[0]); }
