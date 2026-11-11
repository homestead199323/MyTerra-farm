/* ═══════════════════════════════════════════
   SOWING — "planned, waiting to go in the ground" (UX pass 2026-09-28)

   Plots made during onboarding are real plans, but the seeds are usually
   not in the ground yet (a beginner often has to buy them first). Those
   plots carry `sowPending: true`:
   - their growth reads "Ready to sow" instead of "Sown",
   - the only job they create is their first step (Sow / Plant …), and it
     stays on Today until it is done instead of vanishing after 3 days,
   - ticking that first step starts the plot's clock on the real day:
     plantDate = today, harvestDate moves by the same amount.
   Planned plots (status "planned", no plantDate) can be started the same
   way from the crop card ("I sowed it today").
   Old clients ignore the flag and treat the plot as planted — safe.
   ═══════════════════════════════════════════ */
import { addDaysToLocalKey, daysBetweenLocalKeys, localDateFromKey } from "./utils.js";

/**
 * Index of the plot's planting-day step: the earliest step on or after day 0
 * ("Sow", "Plant runners"…). Preparation steps with a negative offset
 * ("Chit" potatoes, "Prepare soil") come before it. -1 when there are none.
 */
export function firstStepIdx(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return -1;
  let best = -1, fallback = 0;
  for (let i = 0; i < steps.length; i++) {
    const d = Number(steps[i].d) || 0;
    if (d < (Number(steps[fallback].d) || 0)) fallback = i;
    if (d >= 0 && (best < 0 || d < (Number(steps[best].d) || 0))) best = i;
  }
  return best >= 0 ? best : fallback;
}

/** Preparation steps (negative day offset) that are still open, e.g. chitting potatoes. */
export function prepStepIdxs(steps) {
  if (!Array.isArray(steps)) return [];
  const out = [];
  steps.forEach(function (s, i) { if ((Number(s.d) || 0) < 0 && !s.done) out.push(i); });
  return out;
}

/**
 * True while a planned planting is waiting for its seeds/plants to go in:
 * onboarding picks for now (`sowPending`) and picks planned for a later month
 * (`status: "planned"` + `sowFrom: "YYYY-MM"`).
 */
export function isAwaitingSowing(plot) {
  if (!plot || plot.status === "harvested") return false;
  if (!plot.sowPending && !(plot.status === "planned" && plot.sowFrom)) return false;
  const i = firstStepIdx(plot.steps);
  return i >= 0 && !plot.steps[i].done;
}

/**
 * A planting saved without a plant date is a plan: say when it can go in.
 * Window open (lib/suggest.js sowTiming "now"/"soon") → `sowPending`: its first job sits on Today
 * until it is ticked. Window later → `sowFrom: "YYYY-MM"`: the job appears when that month comes.
 * Returns the fields to merge into the plot.
 */
export function waitingFields(timing, todayKey) {
  const t = timing || {};
  if (t.status === "later" && t.month != null) {
    const y = Number(String(todayKey).slice(0, 4)), m = Number(String(todayKey).slice(5, 7)) - 1;
    return { sowFrom: (y + (t.month < m ? 1 : 0)) + "-" + String(t.month + 1).padStart(2, "0") };
  }
  return { sowPending: true };
}

/** A planting planned for a later month can be sown once that month has come. */
export function sowWindowOpen(plot, todayKey) {
  return !plot || !plot.sowFrom || String(todayKey || "").slice(0, 7) >= plot.sowFrom;
}

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
/** "Ready to sow", "Ready to plant", or "Sow from Feb" before a later window opens. */
export function waitingLabel(plot, todayKey) {
  const verb = sowVerb(plot && plot.steps);
  if (plot && plot.sowFrom && !sowWindowOpen(plot, todayKey)) {
    const m = Number(String(plot.sowFrom).slice(5, 7)) - 1;
    return verb + " from " + (MONTH_ABBR[m] || plot.sowFrom);
  }
  return "Ready to " + verb.toLowerCase();
}

/** "Sow" or "Plant", from the crop's first step ("Plant runners", "Sow"…). */
export function sowVerb(stepsOrCrop) {
  const steps = Array.isArray(stepsOrCrop) ? stepsOrCrop : stepsOrCrop && stepsOrCrop.steps;
  const i = firstStepIdx(steps);
  const label = i >= 0 ? String(steps[i].l || "") : "";
  return /^plant|^transplant|^set out/i.test(label) ? "Plant" : "Sow";
}

/**
 * Start the plot's growing clock on `todayKey`: status planted, plantDate today,
 * harvest date shifted by the same span (or crop days), first step ticked.
 */
export function startGrowing(plot, todayKey, cropDays) {
  if (!plot) return plot;
  const from = plot.plantDate && localDateFromKey(plot.plantDate);
  const span = from && plot.harvestDate ? daysBetweenLocalKeys(plot.plantDate, localDateFromKey(plot.harvestDate)) : 0;
  const days = span > 0 ? span : Number(plot.growDays) > 0 ? Number(plot.growDays) : Number(cropDays) > 0 ? Number(cropDays) : 60;
  const i = firstStepIdx(plot.steps);
  const steps = Array.isArray(plot.steps)
    ? plot.steps.map(function (s, k) { return k === i ? { ...s, done: true } : s; })
    : plot.steps;
  const next = { ...plot, status: "planted", plantDate: todayKey, harvestDate: addDaysToLocalKey(todayKey, days), steps: steps };
  delete next.sowPending;
  delete next.sowFrom;
  return next;
}

/**
 * Toggle one care step on a plot. Ticking the first step of a plot that is
 * waiting to be sown starts its clock today (see startGrowing).
 */
export function toggleStep(plot, stepIdx, todayKey, cropDays) {
  if (!plot || !Array.isArray(plot.steps) || !plot.steps[stepIdx]) return plot;
  const turningOn = !plot.steps[stepIdx].done;
  if (turningOn && isAwaitingSowing(plot) && stepIdx === firstStepIdx(plot.steps)) {
    return startGrowing(plot, todayKey, cropDays);
  }
  return { ...plot, steps: plot.steps.map(function (s, k) { return k === stepIdx ? { ...s, done: turningOn } : s; }) };
}

/** What happens next on a plot after a step, for the "done" toast: { label, inDays } or null. */
export function nextStepAfter(plot, todayKey) {
  if (!plot || !Array.isArray(plot.steps) || !plot.plantDate) return null;
  const today = localDateFromKey(todayKey);
  let best = null;
  plot.steps.forEach(function (s) {
    if (s.done) return;
    const due = localDateFromKey(addDaysToLocalKey(plot.plantDate, Number(s.d) || 0));
    const inDays = Math.round((due - today) / 864e5);
    if (inDays < 0) return;
    if (!best || inDays < best.inDays) best = { label: s.l, inDays: inDays };
  });
  return best;
}
