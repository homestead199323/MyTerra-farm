/* ═══════════════════════════════════════════
   HERD BRAIN — pure behaviour for the 3D map's animals (spec §3). Each animal lives on
   "legs": from → to over t0..t1 in a mode. The brain only decides when a leg ends; the
   vertex shader (animals3d.js) interpolates in between, so the CPU writes a few floats
   every few seconds per animal and nothing per frame.
   Modes: stand, graze/peck, walk, lie (cows, sheep, pigs, goats), swim (ducks, geese on a
   pond), scatter (hens run from a tap on the coop), inside (poultry roosting after dark).
   MARKER: herd-brain
   ═══════════════════════════════════════════ */
export const MODE = { stand: 0, graze: 1, walk: 2, lie: 3, swim: 4, scatter: 5, inside: 6 };
const LIERS = /^(cow|sheep|pig|goat)$/i, SWIMMERS = /^(duck|goose)$/i;

/** mulberry32 — the same generator animals3d.js uses, so a herd is deterministic per farm */
export function rng(seed) { let t = (Math.floor(seed * 1000003) ^ 0x5bd1e995) >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

const between = (r, a, b) => a + r() * (b - a);
const inRect = (x, z, A, pad = 0) => x >= A.x0 + pad && x <= A.x1 - pad && z >= A.z0 + pad && z <= A.z1 - pad;
const clampRect = (x, z, A, pad = 0) => [Math.min(A.x1 - pad, Math.max(A.x0 + pad, x)), Math.min(A.z1 - pad, Math.max(A.z0 + pad, z))];
const smooth = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); }; // GLSL smoothstep, as the shader interpolates
const roomy = (A, pad) => !!A && A.x1 - A.x0 > 2 * pad + .05 && A.z1 - A.z0 > 2 * pad + .05;

/**
 * animals: [{ idx, species, kind: 'grazer'|'bird'|'hopper', L, walk (m/s), x, z, arena|null, home {x,z}|null, water {x0,x1,z0,z1,y}|null, seed }]
 * returns { tick(now, env) → Leg[], look(idxs, x, z, now) → Leg[], scatter(idxs, x, z, now) → Leg[] }; Leg = { idx, from, to, t0, t1, mode, param, heading }
 */
export function createBrain(animals) {
  const S = animals.map((a) => ({
    ...a, r: rng(a.seed * 7 + 3), mode: MODE.stand, until: -Infinity, heading: a.heading ?? 0,
    pad: a.L * .55, canLie: LIERS.test(a.species), swimmer: SWIMMERS.test(a.species) && !!a.water,
  }));
  const leg = (s, to, mode, dur, now, param = 0) => {
    const from = [s.x, s.z], dx = to[0] - from[0], dz = to[1] - from[1];
    if (mode === MODE.walk || mode === MODE.scatter) { if (Math.hypot(dx, dz) > 1e-4) s.heading = Math.atan2(dx, dz); }
    s.x = to[0]; s.z = to[1]; s.mode = mode; s.until = now + dur;
    s.leg = { idx: s.idx, from, to: [to[0], to[1]], t0: now, t1: now + dur, mode, param, heading: s.heading };
    return s.leg;
  };
  const still = (s, mode, dur, now, param = 0) => leg(s, [s.x, s.z], mode, dur, now, param);
  const walkTo = (s, to, now, mode = MODE.walk, speedMul = 1) => leg(s, to, mode, Math.max(.4, Math.hypot(to[0] - s.x, to[1] - s.z) / (s.walk * speedMul)), now);
  const settleAtCurrentPosition = (s, now) => {
    if (!s.leg || now >= s.leg.t1) return;
    const u = smooth((now - s.leg.t0) / Math.max(1e-6, s.leg.t1 - s.leg.t0));
    s.x = s.leg.from[0] + (s.leg.to[0] - s.leg.from[0]) * u;
    s.z = s.leg.from[1] + (s.leg.to[1] - s.leg.from[1]) * u;
  };
  const randomPoint = (s, A, pad, near = true) => {
    for (let k = 0; k < 8; k++) {
      const d = near ? between(s.r, 1, 4) * s.L : 0, a = s.r() * 6.2832;
      const x = near ? s.x + Math.sin(a) * d : between(s.r, A.x0 + pad, A.x1 - pad), z = near ? s.z + Math.cos(a) * d : between(s.r, A.z0 + pad, A.z1 - pad);
      if (inRect(x, z, A, pad)) return [x, z];
    }
    return clampRect(between(s.r, A.x0 + pad, A.x1 - pad), between(s.r, A.z0 + pad, A.z1 - pad), A, pad);
  };
  const decide = (s, now, env) => {
    if (env.reduced) return still(s, MODE.stand, 1e9, now);
    const night = env.night >= .5, bird = s.kind === "bird", r = s.r();
    // poultry roosts after dark: walk to the pop door, then disappear inside until dawn
    if (bird && s.home) {
      if (night) {
        if (s.mode === MODE.inside) return still(s, MODE.inside, 30, now);
        const atHome = Math.hypot(s.x - s.home.x, s.z - s.home.z) < .25;
        return atHome ? still(s, MODE.inside, 30, now) : walkTo(s, [s.home.x, s.home.z], now);
      }
      if (s.mode === MODE.inside) return roomy(s.arena, s.pad) ? walkTo(s, randomPoint(s, s.arena, s.pad, false), now) : still(s, MODE.stand, between(s.r, 2, 5), now);
    }
    // on the pond: swim a while, then walk off
    if (s.swimmer && s.mode !== MODE.swim && inRect(s.x, s.z, s.water, 0)) return still(s, MODE.swim, between(s.r, 10, 30), now, s.water.y);
    if (s.mode === MODE.swim) return walkTo(s, roomy(s.arena, s.pad) ? randomPoint(s, s.arena, s.pad, false) : [s.x, s.z], now);
    const canWalk = roomy(s.arena, s.pad);
    if (bird || s.kind === "hopper") {
      if (canWalk && r < .45) {
        if (s.swimmer && s.r() < .5) return walkTo(s, [between(s.r, s.water.x0 + .3, s.water.x1 - .3), between(s.r, s.water.z0 + .3, s.water.z1 - .3)], now);
        return walkTo(s, randomPoint(s, s.arena, s.pad), now);
      }
      return r < .9 ? still(s, MODE.graze, between(s.r, 3, 8), now) : still(s, MODE.stand, between(s.r, 2, 5), now);
    }
    const lieW = s.canLie && canWalk ? (night ? .4 : .08) : 0; // lying down needs room to stretch out
    if (r < lieW) return still(s, MODE.lie, between(s.r, 20, 60), now);
    if (canWalk && r < lieW + .4) return walkTo(s, randomPoint(s, s.arena, s.pad), now);
    return r < lieW + .88 ? still(s, MODE.graze, between(s.r, 4, 12), now) : still(s, MODE.stand, between(s.r, 2, 5), now);
  };
  return {
    animals: S,
    snapshot() {
      return S.filter((s) => s.leg).map((s) => ({ ...s.leg, from: [...s.leg.from], to: [...s.leg.to] }));
    },
    tick(now, env = { night: 0, reduced: false }) {
      const out = [];
      S.forEach((s) => { if (now >= s.until) out.push(decide(s, now, env)); });
      return out;
    },
    look(idxs, x, z, now) {
      const out = [];
      idxs.forEach((idx) => {
        const s = S.find((q) => q.idx === idx);
        if (!s || s.mode === MODE.inside || s.mode === MODE.swim) return;
        settleAtCurrentPosition(s, now);
        const dx = x - s.x, dz = z - s.z;
        if (Math.hypot(dx, dz) > 1e-3) s.heading = Math.atan2(dx, dz);
        out.push(still(s, MODE.stand, between(s.r, 1.8, 2.8), now));
      });
      return out;
    },
    scatter(idxs, x, z, now) {
      const out = [];
      idxs.forEach((idx) => {
        const s = S.find((q) => q.idx === idx); if (!s || s.mode === MODE.inside || !roomy(s.arena, s.pad)) return;
        settleAtCurrentPosition(s, now);
        let dx = s.x - x, dz = s.z - z, d = Math.hypot(dx, dz);
        if (d < 1e-3) { const a = s.r() * 6.2832; dx = Math.sin(a); dz = Math.cos(a); d = 1; }
        const run = s.L * between(s.r, 1.5, 2.5), to = clampRect(s.x + dx / d * run, s.z + dz / d * run, s.arena, s.pad);
        out.push(leg(s, to, MODE.scatter, between(s.r, 1.3, 1.7), now));
      });
      return out;
    },
  };
}
