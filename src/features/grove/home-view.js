/* The map's home view: where the camera stands when the whole space is shown.
   Pure maths (no three.js), so the framing can be tested without a canvas.
   Convention (same as FarmControls.update and focus-camera.js): the camera sits at
   target + dist · (sin θ cos φ, sin φ, cos θ cos φ) and looks at the target on the ground.
   MARKER: HOME_VIEW_V1 */
const DEG = Math.PI / 180;

/* Screen-space box (NDC, -1..1) of world points [x, y, z] for a view. */
function boxOf(points, target, dist, theta, phi, tanX, tanY) {
  const st = Math.sin(theta), ct = Math.cos(theta), sp = Math.sin(phi), cp = Math.cos(phi);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of points) {
    const dx = p[0] - target.x, dy = p[1], dz = p[2] - target.z;
    const right = ct * dx - st * dz, up = -st * sp * dx + cp * dy - ct * sp * dz, depth = st * cp * dx + sp * dy + ct * cp * dz;
    const w = Math.max(dist - depth, .05), x = right / (w * tanX), y = up / (w * tanY);
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, x1, y0, y1 };
}

/* Stand the camera so `points` sit centred in the part of the screen that is free of bars
   (`inset`: share of the width/height covered at each edge) and touch its edge on one axis. */
export function fitView(points, { theta, phi, fov, aspect, fill = .985, inset }) {
  const tanY = Math.tan(fov * DEG / 2), tanX = tanY * aspect, st = Math.sin(theta), ct = Math.cos(theta), sp = Math.sin(phi);
  const i = inset || {}, sx0 = -1 + 2 * (i.left || 0), sx1 = 1 - 2 * (i.right || 0), sy0 = -1 + 2 * (i.bottom || 0), sy1 = 1 - 2 * (i.top || 0);
  const mx = (sx0 + sx1) / 2, my = (sy0 + sy1) / 2, hx = (sx1 - sx0) / 2 * fill, hy = (sy1 - sy0) / 2 * fill;
  const target = { x: 0, z: 0 }; points.forEach((p) => { target.x += p[0] / points.length; target.z += p[2] / points.length; });
  let span = 1; points.forEach((p) => { span = Math.max(span, Math.abs(p[0] - target.x), Math.abs(p[2] - target.z), p[1]); });
  let dist = span * 12, b; // start well outside the points, then close in
  for (let k = 0; k < 24; k++) {
    b = boxOf(points, target, dist, theta, phi, tanX, tanY);
    // slide the target over the ground until the box's middle sits on the safe area's middle
    const ex = (b.x0 + b.x1) / 2 - mx, ey = (b.y0 + b.y1) / 2 - my, r = ex * dist * tanX, a = ey * dist * tanY / sp;
    target.x += ct * r - st * a; target.z += -st * r - ct * a;
    b = boxOf(points, target, dist, theta, phi, tanX, tanY);
    const m = Math.max((b.x1 - b.x0) / 2 / hx, (b.y1 - b.y0) / 2 / hy);
    dist *= m;
  }
  b = boxOf(points, target, dist, theta, phi, tanX, tanY);
  return { target, dist, theta, phi, box: b };
}

const boxPoints = (x0, x1, z0, z1, h) => { const out = []; for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [0, h]) out.push([x, y, z]); return out; };

/* Home view for a space. Farms turn to run their long axis up a portrait screen (as before).
   A balcony on a portrait screen is seen along its length from outside (up to 58° round), because
   head-on a wide slab fills only a band of a tall screen. A back garden is framed on the garden and
   its patio; the house behind is cropped by the top of the frame instead of pushing the garden down. */
export function homeView({ env, fW, fH, margin = 1, aspect, fov, az, el, patio = 1.8, inset, diagonal = true }) {
  const portrait = aspect < 1, phi = el * DEG, opt = { phi, fov, aspect, inset };
  const footprint = boxPoints(0, fW, 0, fH, 0);
  const frac = (v) => { const tanY = Math.tan(fov * DEG / 2), b = boxOf(footprint, v.target, v.dist, v.theta, v.phi, tanY * aspect, tanY); return (b.y1 - b.y0) / 2; };
  const done = (v, turn = false) => ({ ...v, turn, frac: frac(v) });
  if (env === "balcony") {
    const pts = boxPoints(-.3, fW + .3, -.3, fH + .3, 1.7); // the slab, its railing and a staked tomato
    const head = fitView(pts, { ...opt, theta: az * DEG });
    if (!portrait || !diagonal || fW <= fH) return done(head);
    let best = head, bestFrac = frac(head);
    for (let a = az - 4; a >= -58; a -= 4) { const v = fitView(pts, { ...opt, theta: a * DEG }), f = frac(v); if (f > bestFrac * 1.02) { best = v; bestFrac = f; } }
    return done(best);
  }
  if (env === "backyard") {
    const side = Math.max(.8, Math.min(1.7, margin * .6)); // the side fences and a strip of what lies beyond
    return done(fitView(boxPoints(-side, fW + side, -(patio + .5), fH + side, 2.2), { ...opt, theta: az * DEG }));
  }
  const turn = portrait !== (fH > fW), mx = Math.max(margin * .6, 1.7);
  return done(fitView(boxPoints(-mx, fW + mx, -mx, fH + mx, 2.5), { ...opt, theta: (turn ? -90 : az) * DEG }), turn);
}

/* How far the camera may be turned from straight-on, in radians (null = all the way round).
   A balcony is only ever seen from outside its building: from behind, the block hides it and the view
   is a roof, so the turn stops 80 degrees either side. Gardens and farms turn freely. */
export const turnLimit = (env) => (env === "balcony" ? 80 * DEG : null);
