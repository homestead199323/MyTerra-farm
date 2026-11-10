import {markTaskDone,todayLocalKey,appendLog} from "../../lib/utils";
import {addStock} from "../../lib/inventory";
import {rCM} from "../../lib/regional";
import {isRecurringCrop, afterRecurringHarvest} from "../../lib/perennial";
import {toggleStep, isAwaitingSowing, firstStepIdx, sowVerb} from "../../lib/sowing";
import {recordHarvest, recordProduce, rememberTick, takeTick, removeHarvest, subtractProduce} from "../../lib/memory";
import {markOwnDone} from "../../lib/own-tasks";
import {taskAction} from "../grove/zone-tasks";

/* An amount counts as an estimate (not weighed/counted) when nothing was typed
   or it is exactly MyTerra's suggested default. Callers that know better pass
   meta.estimated. Insights keep estimates out of "vs estimate" and lay rates. */
function isEstimate(data, task, logValue, meta) {
  if (meta && typeof meta.estimated === "boolean") return meta.estimated;
  if (!(Number(logValue) > 0)) return true;
  const def = taskAction(task, data).amount;
  return !!def && Math.abs(Number(logValue) - Number(def.value)) < 1e-6;
}

// Ids of what addStock just appended, so an Undo today can take exactly that out again.
function lastIds(d) {
  const items = (d.pantry && d.pantry.items) || [], moves = (d.pantry && d.pantry.moves) || [];
  return { item: items.length ? items[items.length - 1].id : null, move: moves.length ? moves[moves.length - 1].id : null };
}

export function applyTaskCompletion(data, task, logValue, meta) {
  if (!task) return data;
  const today = todayLocalKey();
  if ((data.completions?.[today] || []).includes(task.key)) return data;
  if(task.type === "harvest" && data.garden?.plots.find(p=>p.id===task.plotId)?.status === "harvested") return data;

  // Harvest — move plot to harvested, push yield to pantry, log.
  if (task.type === "harvest" && task.plotId) {
    const plots = (data.garden && data.garden.plots) || [];
    const plot = plots.find(function(p) { return p.id === task.plotId; });
    if (plot) {
      const crop = rCM(data.region).get(plot.crop);
      // crop.yld is kg PER PLANT — the planting's estimate scales it by the plant count.
      // meta.allowZero: the user deliberately recorded a failed crop (0 kg) — keep it, don't substitute the estimate.
      const typed = Number(logValue);
      const zero = !!(meta && meta.allowZero) && Number.isFinite(typed) && typed <= 0;
      const kg = typed > 0 ? typed : zero ? 0 : (plot.expectedYieldKg || Math.round((crop && crop.yld ? Math.max(0.1, crop.yld * (Number(plot.plantCount) || 1)) : 3) * 10) / 10 || 3);
      const est = zero ? false : isEstimate(data, task, logValue, meta);
      // Trees, soft fruit and perennial herbs stay planted and are due again next season.
      const recurring = isRecurringCrop(crop);
      const expected = plot.expectedYieldKg || null; // only a real per-planting estimate is compared
      const remembered = recordHarvest(data, plot, kg, today, expected, !recurring, est);
      // Nothing picked → nothing goes into the pantry (no empty 0 kg lot).
      const stocked = kg > 0 ? addStock(remembered, { name: plot.crop, category: "Fresh Produce", qty: kg, unit: "kg", source: "farm", storageNote: (crop && crop.storage) || "" }, today) : remembered;
      const next = {
        ...stocked,
        garden: { ...stocked.garden, plots: plots.map(function(x) { return x.id === plot.id ? (recurring ? afterRecurringHarvest(x, crop, today) : { ...x, status: "harvested" }) : x; }) },
        log: appendLog(data.log, { text: "🧺 Harvested " + kg + "kg " + plot.crop }),
      };
      return markTaskDone(rememberTick(next, task.key, { d: today, kind: "harvest", q: kg, est, prevPlot: plot, ...(kg > 0 ? lastIds(stocked) : {}) }), task.key);
    }
  }

  // Eggs — add to pantry, log.
  if (task.type === "eggs") {
    // meta.allowZero: the user checked and there were none today — tick the job, add nothing.
    if (meta && meta.allowZero && !(Number(logValue) > 0)) {
      return markTaskDone({ ...data, log: appendLog(data.log, { text: "🥚 No eggs today" }) }, task.key);
    }
    const count = Number(logValue) > 0 ? Math.round(Number(logValue)) : 1;
    const est = isEstimate(data, task, logValue, meta);
    const stocked = addStock(recordProduce(data, task.speciesType, "eggs", count, today, est), { name: (task.speciesType ? task.speciesType + " " : "") + "Eggs", category: "Eggs", qty: count, unit: "pcs", source: "livestock", storageNote: "Refrigerate within 2 hours of collection." }, today);
    const next = { ...stocked, log: appendLog(data.log, { text: "🥚 Collected " + count + (count === 1 ? " egg" : " eggs") }) };
    return markTaskDone(rememberTick(next, task.key, { d: today, kind: "eggs", sp: task.speciesType, q: count, est, ...lastIds(stocked) }), task.key);
  }

  // Milk — add litres to the pantry, log.
  if (task.type === "milk") {
    if (meta && meta.allowZero && !(Number(logValue) > 0)) {
      return markTaskDone({ ...data, log: appendLog(data.log, { text: "🥛 No milk today" }) }, task.key);
    }
    const litres = Number(logValue) > 0 ? Math.round(Number(logValue) * 10) / 10 : (task.expected || 1);
    const est = isEstimate(data, task, logValue, meta);
    const stocked = addStock(recordProduce(data, task.speciesType, "milkL", litres, today, est), { name: (task.speciesType ? task.speciesType + " " : "") + "Milk", category: "Dairy", qty: litres, unit: "L", source: "livestock", storageNote: "Strain and chill below 4°C within 2 hours. Use within 3–5 days, or make cheese." }, today);
    const next = { ...stocked, log: appendLog(data.log, { text: "🥛 Milked " + litres + "L" + (task.speciesType ? " from the " + task.speciesType.toLowerCase() + "s" : "") }) };
    return markTaskDone(rememberTick(next, task.key, { d: today, kind: "milkL", sp: task.speciesType, q: litres, est, ...lastIds(stocked) }), task.key);
  }

  // Water — log the amount only.
  if (task.type === "water") {
    const litres = Number(logValue) > 0 ? Number(logValue) : null;
    const text = litres ? ("💧 " + task.title + " (~" + litres + "L)") : ("💧 " + task.title);
    const next = { ...data, log: appendLog(data.log, { text: text }) };
    return markTaskDone(next, task.key);
  }

  // Step task — set the plot's persistent steps[i].done flag, so the step
  // doesn't reappear on next reload. (task-queue tracks step completion via
  // this flag, NOT via the daily completions map; we must update both.)
  if (task.type === "step" && task.plotId && task.stepIdx != null) {
    const plots = (data.garden && data.garden.plots) || [];
    const plot = plots.find(function(p) { return p.id === task.plotId; });
    if (plot && plot.steps && plot.steps[task.stepIdx]) {
      // Ticking the first step of a plot that is still waiting to be sown starts
      // its growing clock today (see lib/sowing.js).
      const sowing = isAwaitingSowing(plot) && task.stepIdx === firstStepIdx(plot.steps);
      const crop = rCM(data.region).get(plot.crop);
      const updated = plot.steps[task.stepIdx].done ? plot : toggleStep(plot, task.stepIdx, todayLocalKey(), crop && crop.days);
      const next = {
        ...data,
        garden: {
          ...(data.garden || {}),
          plots: plots.map(function(x) { return x.id === plot.id ? updated : x; }),
        },
      };
      if (sowing) next.log = appendLog(data.log, { text: "🌱 " + (sowVerb(plot.steps) === "Plant" ? "Planted " : "Sowed ") + (plot.name || plot.crop) });
      // Remember the plot as it was so "Done today → Undo" can un-tick the step
      // (and un-start the growing clock when this was the sowing step).
      return markTaskDone(rememberTick(next, task.key, { d: today, kind: "step", prevPlot: plot }), task.key);
    }
  }

  // Your own one-off job: done for good (repeating ones are ticked per day below).
  if (task.type === "own" && task.once && task.ownId) {
    return markTaskDone(markOwnDone(data, task.ownId, todayLocalKey()), task.key);
  }

  // Everything else — pure check-off.
  return markTaskDone(data, task.key);
}

/**
 * "Done today → Undo": un-tick a job and take back exactly what that tick
 * added — the pantry lot and move, the garden-memory record, and for a harvest
 * the planting as it was. Stock already used or sold stays used (only what is
 * left of that lot is removed).
 */
export function undoTaskCompletion(data, key) {
  const today = todayLocalKey();
  const existing = (data.completions && data.completions[today]) || [];
  if (!existing.includes(key)) return data;
  const taken = takeTick(data, key, today);
  let next = taken.data;
  const t = taken.tick;
  if (t && (t.item || t.move)) {
    const pantry = next.pantry || { items: [] };
    const items = (pantry.items || []).map(function(it) {
      if (it.id !== t.item) return it;
      const left = Math.round(((Number(it.qty) || 0) - (Number(t.q) || 0)) * 1000) / 1000;
      return left > 0 ? { ...it, qty: left } : null;
    }).filter(Boolean);
    const moves = (pantry.moves || []).filter(function(m) { return m.id !== t.move; });
    next = { ...next, pantry: { ...pantry, items: items, moves: moves } };
  }
  if (t) {
    if (t.kind === "harvest" && t.prevPlot) {
      next = removeHarvest(next, t.prevPlot.id, today);
      next = { ...next, garden: { ...next.garden, plots: (next.garden.plots || []).map(function(p) { return p.id === t.prevPlot.id ? t.prevPlot : p; }) } };
    } else if (t.kind === "step" && t.prevPlot) {
      next = { ...next, garden: { ...next.garden, plots: (next.garden.plots || []).map(function(p) { return p.id === t.prevPlot.id ? t.prevPlot : p; }) } };
    } else if (t.sp) {
      next = subtractProduce(next, t.sp, t.kind, t.q, today, t.est);
    }
  }
  return { ...next, completions: { ...(next.completions || {}), [today]: existing.filter(function(k) { return k !== key; }) } };
}

