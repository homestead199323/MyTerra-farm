// Perspective fit for an upright world-space box. Unlike a footprint multiplier,
// this includes roof/plant height and the current orbit angle on narrow screens.
export function focusDistance(bounds, { target, theta, phi, fov, aspect, near = 1, horizontal = .78, vertical = .68 }) {
  const tanY = Math.tan(fov * Math.PI / 360), tanX = tanY * aspect;
  const st = Math.sin(theta), ct = Math.cos(theta), sp = Math.sin(phi), cp = Math.cos(phi);
  let distance = near;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const dx = x - target.x, dy = y - target.y, dz = z - target.z;
        const right = ct * dx - st * dz;
        const up = -st * sp * dx + cp * dy - ct * sp * dz;
        const depth = st * cp * dx + sp * dy + ct * cp * dz;
        distance = Math.max(distance, depth + near + .1,
          depth + Math.abs(right) / (tanX * horizontal),
          depth + Math.abs(up) / (tanY * vertical));
      }
    }
  }
  return distance;
}
