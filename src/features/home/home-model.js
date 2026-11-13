/* Pure helpers for the map-first home: what is due, how far the day is, when to celebrate. */
import { minutesLabel } from "../../lib/task-time.js";

const NOT_JOBS = ["forecast", "upcoming"];

/** The jobs to do today (the same set the map markers are built from). */
export function dueToday(tasks) {
  return (tasks || []).filter((t) => t.daysOut === 0 && !NOT_JOBS.includes(t.type));
}

/**
 * The most jobs seen for a day, kept on the device so the chip can say "3/8" after five are done.
 * Ticked jobs drop out of the task queue, and some (crop steps) are not in the completions map,
 * so the day's total is remembered rather than recomputed.
 */
export function trackDay(prev, dayKey, left, ticked) {
  const seen = left + Math.max(0, ticked || 0);
  if (!prev || prev.day !== dayKey) return { day: dayKey, total: seen };
  return seen > prev.total ? { day: dayKey, total: seen } : prev;
}

/** → { left, done, total } for the chip and its bar. */
export function jobsProgress(day, left) {
  const total = Math.max(day?.total || 0, left);
  return { left, done: total - left, total };
}

/** The reward card shows once a day: everything ticked, at least one job done, not shown yet today. */
export function showDayDone(progress, shownKey, dayKey) {
  return progress.total > 0 && progress.left === 0 && shownKey !== dayKey;
}

/** Under a job's name: where, how long, and — only when it matters — why now. */
export function rowNote(t) {
  const parts = [];
  if (t.loc) parts.push(t.loc);
  if (t.type === "harvest") parts.push("Ready to pick");
  const mins = minutesLabel(t);
  if (mins) parts.push(mins);
  return parts.join(" · ");
}

/** A marker turns gold when the area has something ready to collect. */
export function hasProduce(list) {
  return (list || []).some((t) => ["harvest", "eggs", "milk"].includes(t.type));
}

/** Where each button of the + fan goes. `canPlant`: the space has at least one bed to plant in. */
export function fanTarget(id, canPlant) {
  switch (id) {
    case "plant": return canPlant ? ["crops", { add: true }] : ["map", { edit: true }];
    case "animal": return ["live", { add: true }];
    case "build": return ["map", { edit: true }];
    case "job": return ["tasks", { addJob: true }];
    case "harvest": return ["pantry", { harvest: true }];
    default: return ["home", null];
  }
}
