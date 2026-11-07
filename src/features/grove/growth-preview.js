import { growthOf } from "../quiet/farm-model";

const dayNum = (key) => {
  const [y, m, d] = String(key || "").split("-").map(Number);
  return Date.UTC(y || 1970, (m || 1) - 1, d || 1) / 864e5;
};

// The scene only changes at a stage boundary; the date and text can update
// every day without rebuilding all of the farm's 3D geometry.
export function previewGrowthOf(plot, crop, day, today = day) {
  const current = growthOf(plot, crop, day);
  const daysAhead = dayNum(day) - dayNum(today);
  if (!(daysAhead > 0) || !Number.isInteger(plot.observedStage) || plot.observedStage < 1 || plot.observedStage > 5) return current;
  // An observation describes today, not every future day. Project from the
  // beginning of that stage rather than treating the projection as observed.
  const baseline = [0, 0, .08, .3, .72, 1][plot.observedStage];
  const duration = dayNum(plot.harvestDate) - dayNum(plot.lastHarvest || plot.plantDate);
  const progress = Math.min(1, baseline + daysAhead / (duration > 0 ? duration : crop?.days || 90));
  const index = Math.max(plot.observedStage, progress >= 1 ? 5 : progress >= .72 ? 4 : progress >= .3 ? 3 : progress >= .08 ? 2 : 1);
  return { ...current, index, progress, label: ["Planned", "Sown", "Seedling", "Growing", "Maturing", "Harvest window"][index], estimated: true };
}

export function growthSceneStages(plots, crops, day, today = day) {
  return (plots || []).filter((p) => p.status !== "harvested" && p.zone)
    .map((p) => [p.id, previewGrowthOf(p, crops?.get?.(p.crop), day, today).index]);
}

// Moving backwards through time should settle into a younger shape, rather
// than replaying the same forward-growing motion in the wrong direction.
export function growthTransitionStart(previous, next) {
  return previous != null && previous > next ? 1.18 : .55;
}

// Give each plant a stable, short offset so a bed does not grow in lockstep.
// The same identity gets the same delay when moving forward or backward.
export const GROWTH_DURATION_MS = 450;
export const GROWTH_STAGGER_MS = 180;
export function growthTransitionDelay(key) {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return ((hash >>> 0) / 0xffffffff) * GROWTH_STAGGER_MS;
}

export function growthTransitionProgress(elapsed, delay) {
  return Math.max(0, Math.min(1, (elapsed - delay) / GROWTH_DURATION_MS));
}

export function rowAtDate(row, plots, crops, day, today = day) {
  const plot = (plots || []).find((p) => p.id === row?.id);
  if (!plot) return row;
  const growth = previewGrowthOf(plot, crops?.get?.(plot.crop), day, today);
  return { ...row, stage: growth.index, estimated: growth.estimated,
    left: plot.harvestDate && !growth.waiting ? Math.round(dayNum(plot.harvestDate) - dayNum(day)) : null };
}
