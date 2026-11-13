/* Daily farm check: pure helpers (no React, no DOM).
   The check walks the farm stop by stop on the home map. A stop is one crop planting or one area
   (planRound), the camera glides to it, the jobs there are ticked on the spot, then on to the next. */
import { planRound } from "../quiet/walk-model.js";
import { isPlantZone } from "../farm/living/visuals.js";

export const JOB_POINTS = 10;
export const CLEAR_BONUS = 25;

/** A fresh check for today: only the stops with jobs. null when nothing is due. */
export function startCheck(tasks, data, today, id, nowIso) {
  const stops = planRound(tasks, data, "quick", "");
  if (!stops.length) return null;
  return { id, status: "active", kind: "check", date: today, startedAt: nowIso, mode: "quick", place: "outside", stops, index: 0, draft: {}, visited: [], deferred: [], ticked: {}, points: 0, jobs: 0 };
}

/** The saved check can be picked up again: started today and not finished. */
export function canResume(session, today) {
  return !!session && session.status === "active" && session.date === today && Array.isArray(session.stops) && session.index < session.stops.length;
}

/** Jobs at this stop still to tick (ones done elsewhere today count as done). */
export function openJobs(stop, session, doneToday) {
  const ticked = session.ticked || {}, done = new Set(doneToday || []);
  return (stop?.tasks || []).filter((t) => !ticked[t.key] && !done.has(t.key));
}

/** Record one ticked job: reward text, points, job count. */
export function tickJob(session, task, reward) {
  if ((session.ticked || {})[task.key]) return session;
  return { ...session, ticked: { ...session.ticked, [task.key]: reward || "Done" }, points: (session.points || 0) + JOB_POINTS, jobs: (session.jobs || 0) + 1 };
}

/**
 * Move on from the current stop. `cleared`: every job there was ticked (earns the bonus).
 * A stop left with nothing ticked counts as skipped.
 */
export function nextStop(session, { cleared = false, nowIso = null } = {}) {
  const stop = session.stops[session.index];
  if (!stop) return session;
  const anyTicked = stop.tasks.some((t) => (session.ticked || {})[t.key]);
  const end = session.index + 1 >= session.stops.length;
  return {
    ...session,
    index: session.index + 1,
    status: end ? "complete" : "active",
    draft: {},
    visited: anyTicked || cleared ? [...session.visited, stop.id] : session.visited,
    deferred: anyTicked || cleared ? session.deferred : [...session.deferred, stop.id],
    points: (session.points || 0) + (cleared && stop.tasks.length ? CLEAR_BONUS : 0),
    finishedAt: end ? nowIso : null,
  };
}

/** Go to another stop now: it moves into the current place, so the order walked is the order tapped. */
export function jumpTo(session, i) {
  if (i === session.index || i < 0 || i >= session.stops.length) return session;
  const stops = [...session.stops], [picked] = stops.splice(i, 1), index = i < session.index ? session.index - 1 : session.index;
  stops.splice(index, 0, picked);
  return { ...session, stops, index, draft: {}, deferred: session.deferred.filter((id) => id !== picked.id) };
}

/** Minutes between two ISO times, at least 1. */
export function minutesTaken(startIso, endIso) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 60000)) : null;
}

/** The areas a crop can grow in, for "where is this planted?" (deleted beds leave plantings with no area). */
export function plantAreas(data) {
  return (data.zones || []).filter((z) => isPlantZone(z.type) || ["nursery", "container"].includes(z.type));
}

/** Put a planting in an area. Every other planting is left alone. */
export function placePlot(data, plotId, zoneId) {
  const plots = data.garden?.plots || [];
  if (!plots.some((p) => p.id === plotId) || !(data.zones || []).some((z) => z.id === zoneId)) return data;
  return { ...data, garden: { ...data.garden, plots: plots.map((p) => (p.id === plotId ? { ...p, zone: zoneId } : p)) } };
}

/** The planting a job belongs to when that planting has no area on the map (null otherwise). */
export function unplacedPlot(task, data) {
  if (!task?.plotId) return null;
  const plot = (data.garden?.plots || []).find((p) => p.id === task.plotId);
  if (!plot) return null;
  return (data.zones || []).some((z) => z.id === plot.zone) ? null : plot;
}
