import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, MapPin, Clock, Timer } from "lucide-react";
import { C, F, SX } from "../../lib/theme";
import { Card, SwipeableRow, TaskCheckbox } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";
import PlotOverlay from "../farm/PlotOverlay";
import AnimalOverlay from "../animals/AnimalOverlay";
import { LDB, POULTRY_SPECIES, HOOFED_SPECIES, GRAZER_SPECIES, animalPlural } from "../../data/livestock";
import { ZT_MAP } from "../../data/zones";
import { rCM } from "../../lib/regional";
import { toLocalDateKey, localDateFromKey, addDaysToLocalKey, todayLocalKey, localDayNumber } from "../../lib/utils";
import { applyTaskCompletion, undoTaskCompletion } from "../quiet/complete-task";
import { taskAction } from "../grove/zone-tasks";
import { toggleStep, isAwaitingSowing, firstStepIdx, nextStepAfter } from "../../lib/sowing";
import { minutesLabel } from "../../lib/task-time";
import { toast } from "../../lib/toast";
import { milkingHead, parseTaskKey } from "../../lib/task-queue";
import { animalZone as zoneOfAnimal } from "../quiet/farm-model";
import { useFlip } from "../../lib/use-flip";
import { isDueOn, unmarkOwnDone } from "../../lib/own-tasks";
import { OwnTaskForm, OwnTaskList } from "./OwnTasks";
import TimeBudgetCard from "./TimeBudget";

/* ═══════════════════════════════════════════
   TASK ROW — extracted outside TaskQueue to prevent remount on every render

   Things-3-style pattern (Phase 6.1.1 + 6.1.2):
     - Left-side circular checkbox replaces the right-side "Done" pill
     - Tap fills the checkbox green, the row fades + slides 8px down + 3% shrink
       (~280ms), then the parent removes it from its section
     - prefers-reduced-motion: instant complete, no animation
     - Harvest tasks keep the right-side "Harvest" CTA — it's a goto action,
       not a completion (harvest happens in PlotOverlay)
   ═══════════════════════════════════════════ */
const TaskRow = React.memo(function TaskRow({t, onOpen, onToggleStep, onMarkDone, onGoToFarm, onRef}) {
  const [completing, setCompleting] = useState(false);
  const borderC = t.pri === 0 ? C.red : t.pri === 1 ? "#ff6b35" : t.pri === 2 ? C.orange : C.blue;
  const bg = t.pri === 0 ? C.dangerBg : t.pri === 1 ? C.warm : t.pri === 2 ? C.harvestBg : C.waterBg;
  const clickable = !!(t.plotId || t.animalId);
  const dateLabel = t.dueDate
    ? (t.daysOut === 0 ? "Today" : t.dueDate.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}))
    : (t.daysOut === 0 ? "Today" : t.daysOut > 0 ? `In ${t.daysOut}d` : null);
  // Only a job due today can be ticked: the week lists reuse the same key for
  // a future occurrence, and ticking that wrote TODAY's completion.
  const canMarkDone = t.type !== "step" && t.type !== "upcoming" && t.type !== "forecast" && t.type !== "harvest" && !(t.daysOut > 0);
  const isStep = t.stepIdx != null;
  // Pick the single completion action: step → toggle step, otherwise → mark done.
  // Harvest/upcoming/forecast get no checkbox (no completable action from here).
  const completeAction = (isStep && onToggleStep)
    ? function() { onToggleStep(t.plotId, t.stepIdx); }
    : (canMarkDone && onMarkDone)
    ? function() { onMarkDone(t.key); }
    : null;
  // Animated-then-commit completion. Reduce-motion skips the delay.
  const handleComplete = () => {
    if (!completeAction || completing) return;
    const reduce = typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      completeAction();
      return;
    }
    setCompleting(true);
    setTimeout(completeAction, 280);
  };
  const swipeRightAction = completeAction ? handleComplete : undefined;
  const strikethrough = completing ? "line-through" : "none";
  return (
    <SwipeableRow onSwipeRight={swipeRightAction} style={{marginBottom:6,borderRadius:C.rs}}>
      <div
        ref={onRef || undefined}
        onClick={clickable && onOpen && !completing ? onOpen : undefined}
        style={{
          display:"flex",alignItems:"center",gap:12,
          padding:"12px 14px",
          background:bg,borderRadius:C.rs,
          borderLeft:`4px solid ${borderC}`,
          cursor:clickable && onOpen && !completing ? "pointer" : "default",
          opacity: completing ? 0 : 1,
          transform: completing ? "translateY(8px) scale(0.97)" : "translateY(0) scale(1)",
          transition: "opacity 280ms ease-out, transform 280ms ease-out",
        }}
      >
        {completeAction && (
          <TaskCheckbox checked={completing} onToggle={handleComplete} />
        )}
        <span style={{flexShrink:0,lineHeight:1,textDecoration:strikethrough,display:"flex"}}><FarmIcon name={t.cropName || t.speciesType} emoji={t.emoji} size={22}/></span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:4,textDecoration:strikethrough}}>{t.title}</div>
          {(t.type === "weather" || t.held || t.frostPick) && t.desc && (
            <div style={{fontSize:12.5,color:C.text,lineHeight:1.5,margin:"0 0 6px",textDecoration:strikethrough}}>{t.desc}</div>
          )}
          <div className="tq-meta" style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:11.5,color:C.t2,fontWeight:500}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:3}}><MapPin size={12} aria-hidden="true"/>{t.loc}</span>
            {dateLabel && <span style={{color:t.daysOut === 0 ? C.text : C.t2,fontWeight:t.daysOut === 0 ? 700 : 500,display:"inline-flex",alignItems:"center",gap:3}}><Clock size={12} aria-hidden="true"/>{dateLabel}</span>}
            {t.type !== "forecast" && <span style={{display:"inline-flex",alignItems:"center",gap:3}}><Timer size={12} aria-hidden="true"/>{minutesLabel(t)}</span>}
          </div>
        </div>
        {t.type === "harvest" && onGoToFarm && (
          <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
            <button onClick={onGoToFarm} style={{background:C.orange,color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Harvest</button>
          </div>
        )}
      </div>
    </SwipeableRow>
  );
});

/* ═══════════════════════════════════════════
   TASK QUEUE — Calendar + Urgency + Timeline
   ═══════════════════════════════════════════ */
function TaskQueue({data, setData, setPage, tasks, forecast, pageData, clearPageData}) {
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD" or null
  const [openPlotId, setOpenPlotId] = useState(null);
  const [openAnimalId, setOpenAnimalId] = useState(null);
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [farmWeekCollapsed, setFarmWeekCollapsed] = useState(true);
  const [animalsWeekCollapsed, setAnimalsWeekCollapsed] = useState(true);
  // Phase 6.1.3 — all group sections collapsible. Attention + Daily Routine
  // default to expanded since they're the high-signal "today" sections.
  const [attentionCollapsed, setAttentionCollapsed] = useState(false);
  const [routineCollapsed, setRoutineCollapsed] = useState(false);
  const [ownForm, setOwnForm] = useState(null); // null | {} (new) | task (edit)
  useEffect(() => { if (pageData?.addJob) { setOwnForm({}); clearPageData?.(); } }, [pageData, clearPageData]); // the + menu on the home map

  // Phase 8.1 — FLIP animation for task completion
  // rowRefs: live DOM nodes for completable rows (keyed by task key) — used for snapshot (First)
  // pendingFlips: keys waiting for their Done row to mount and trigger the Play phase
  const { snapshot, flip } = useFlip();
  const rowRefs = useRef({});
  const pendingFlips = useRef(new Set());

  // Tick a care step. Ticking the sow step of a plot that was waiting starts
  // its growing clock today (lib/sowing.js). Every tick says what comes next
  // and can be undone for a few seconds.
  const togStep = (pid, si) => {
    const plot = data.garden.plots.find(p => p.id === pid);
    if (!plot || !plot.steps || !plot.steps[si]) return;
    const turningOn = !plot.steps[si].done;
    const wasWaiting = isAwaitingSowing(plot) && si === firstStepIdx(plot.steps);
    const crop = rCM(data.region).get(plot.crop);
    const updated = toggleStep(plot, si, todayLocalKey(), crop && crop.days);
    setData({...data, garden: {...data.garden, plots: data.garden.plots.map(p => p.id === pid ? updated : p)}});
    if (!turningOn) return;
    const next = nextStepAfter(updated, todayLocalKey());
    toast(wasWaiting ? `${plot.name || plot.crop} is in the ground 🌱` : `${plot.name || plot.crop}: ${plot.steps[si].l} ✓`, {
      detail: next ? `Next: ${next.label.toLowerCase()} ${next.inDays === 0 ? "today" : next.inDays === 1 ? "tomorrow" : `in ${next.inDays} days`}` : undefined,
      actionLabel: "Undo",
      // Put the plot back as it was — on the farm as it is NOW, so edits made since the tick survive.
      onAction: () => setData(d => ({...d, garden: {...d.garden, plots: (d.garden.plots || []).map(p => p.id === pid ? plot : p)}})),
    });
  };

  // markDone with FLIP: snapshot the source row → open Done section → commit state change
  const markDone = useCallback((key) => {
    const sourceEl = rowRefs.current[key];
    if (sourceEl) {
      snapshot(key, sourceEl);
      pendingFlips.current.add(key);
    }
    setDoneCollapsed(false);
    // Same path as the map popup: eggs and milk land in the pantry with the
    // expected amount (editable there), watering is logged.
    const task = tasks.find(t => t.key === key) || { key };
    const amount = taskAction(task, data).amount;
    setData(applyTaskCompletion(data, task, amount ? amount.value : undefined));
    toast(`${task.title || "Job"} ✓`, {
      detail: amount ? `+${amount.value} ${amount.unit} added to your pantry` : undefined,
      actionLabel: "Undo",
      // Reverse exactly this tick (pantry lot, memory record, plot) on the current farm.
      onAction: () => setData(d => undoTaskCompletion(d, key)),
    });
  }, [data, setData, snapshot, tasks]);

  const openTask = (t) => {
    if (t.plotId) setOpenPlotId(t.plotId);
    else if (t.animalId) setOpenAnimalId(t.animalId);
  };

  const openPlot = openPlotId ? data.garden.plots.find(p => p.id === openPlotId) : null;
  const openAnimal = openAnimalId ? (data.livestock?.animals || []).find(a => a.id === openAnimalId) : null;

  // O(1) zone lookups — used inside memoized calendarEvents/byTime + render path
  const zoneById = useMemo(() => new Map((data.zones || []).map(z => [z.id, z])), [data.zones]);
  const zoneByName = useMemo(() => new Map((data.zones || []).map(z => [z.name, z])), [data.zones]);
  const animalZone = useMemo(() => (data.zones || []).find(z => ["barn","coop","pasture"].includes(z.type)) || null, [data.zones]);
  const animalLocName = animalZone ? animalZone.name : "Farm";
  const speciesLocName = useCallback((type) => {
    const a = (data.livestock?.animals || []).find((x) => x.type === type);
    return (a && zoneOfAnimal(a, data.zones || [])?.name) || animalLocName;
  }, [data.livestock, data.zones, animalLocName]);
  const animalLocOf = useCallback((a) => zoneOfAnimal(a, data.zones || [])?.name || animalLocName, [data.zones, animalLocName]);

  // ── CONSOLIDATED: compute calendar events AND by-time list in ONE pass over plots ──
  // Today's key is read outside the memo so the projection re-runs after
  // midnight (App re-renders on its day tick) instead of staying on yesterday.
  const todayStr = todayLocalKey();
  const { calendarEvents, byTime } = useMemo(() => {
    const evts = {};
    const timeline = [];
    const now = localDateFromKey(todayStr) || new Date(); now.setHours(0,0,0,0);
    const todayKey = toLocalDateKey(now);
    const today0 = localDayNumber(now);
    // d calendar days from today, as a local Date — DST-safe (now + d*864e5 is not).
    const dayAfter = (d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const doneToday = new Set((data.completions && data.completions[todayKey]) || []);

    data.garden.plots.forEach(p => {
      if (!p.plantDate || p.status === "harvested") return;
      const crop = rCM(data.region).get(p.crop);
      if (!crop) return;
      // Not in the ground yet: no harvest or step dates to project.
      if (isAwaitingSowing(p)) return;
      const plantDate = localDateFromKey(p.plantDate);
      if (!plantDate) return;
      const loc = zoneById.get(p.zone)?.name || "Farm";

      // Harvest date — the plot's own date (variety days, perennial seasons) wins over crop defaults,
      // so the calendar agrees with Today and the map.
      const hDate = localDateFromKey(p.harvestDate || addDaysToLocalKey(p.plantDate, crop.days));
      const hKey = toLocalDateKey(hDate);
      if (!evts[hKey]) evts[hKey] = [];
      evts[hKey].push({type:"harvest", emoji:crop.emoji, cropName:p.crop, label:`Harvest ${p.name||p.crop}`, plotId:p.id, key:`plot-${p.id}-harvest`});
      const dLeft = localDayNumber(hDate) - today0;
      if (dLeft >= 0 && dLeft <= 60) {
        timeline.push({daysOut: dLeft, dueDate: hDate, type:"harvest", emoji:crop.emoji, cropName:p.crop, title:`Harvest ${p.name||p.crop}`, loc, plotId:p.id, key:`plot-${p.id}-harvest`});
      }

      // Step dates
      if (p.steps) p.steps.forEach((s, i) => {
        if (s.done) return;
        const sDate = localDateFromKey(addDaysToLocalKey(p.plantDate, s.d));
        const sKey = toLocalDateKey(sDate);
        if (!evts[sKey]) evts[sKey] = [];
        evts[sKey].push({type:"step", emoji:crop.emoji, cropName:p.crop, label:`${p.name||p.crop}: ${s.l}`, plotId:p.id, stepIdx:i, key:`plot-${p.id}-step-${i}`});
        const sLeft = localDayNumber(sDate) - today0;
        if (sLeft >= -1 && sLeft <= 30) {
          timeline.push({daysOut: Math.max(0,sLeft), dueDate: sDate, type:"step", emoji:crop.emoji, cropName:p.crop, title:`${p.name||p.crop}: ${s.l}`, loc, plotId:p.id, stepIdx:i, key:`plot-${p.id}-step-${i}`});
        }
      });
    });

    // ─── Animal tasks projected forward (species-grouped + per-animal) ───

    // Hash helper (local — matches buildTaskQueue)
    const hashStr2 = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      return h;
    };

    // Build species summary for grouped projections
    const speciesMap2 = new Map();
    (data.livestock?.animals || []).forEach(a => {
      const db = LDB[a.type];
      if (!db) return;
      if (!speciesMap2.has(a.type)) speciesMap2.set(a.type, { type: a.type, db, headCount: 0 });
      speciesMap2.get(a.type).headCount += (a.count || 1);
    });

    // Species-grouped tasks (feed/water/eggs/clean/bedding/paddock)
    speciesMap2.forEach(s => {
      const { type, db, headCount } = s;
      const e = db.e;
      const speciesLabel = animalPlural(type, headCount);
      const sHash = hashStr2(type);

      // Daily tasks
      const dailies = [];
      if (type !== "Bee") {
        dailies.push({type: "feed",  emoji: e,    title: `Feed ${speciesLabel}`,  keySuffix: "feed"});
        dailies.push({type: "water", emoji: "💧", title: `Water ${speciesLabel}`, keySuffix: "water"});
      }
      if (POULTRY_SPECIES.has(type)) {
        dailies.push({type: "eggs", emoji: "🥚", title: `Collect eggs — ${speciesLabel}`, keySuffix: "eggs"});
      }
      if (db.out?.Milk && milkingHead(data, type) > 0) {
        dailies.push({type: "milk", emoji: "🥛", title: `Milk ${animalPlural(type, milkingHead(data, type))}`, keySuffix: "milk"});
      }
      dailies.forEach(dt => {
        for (let d = 0; d <= 60; d++) {
          const dueDate = dayAfter(d);
          const key = toLocalDateKey(dueDate);
          const taskKey = `species-${type}-${dt.keySuffix}`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: dt.type, emoji: dt.emoji, label: dt.title, speciesType: type, key: taskKey, routine: true});
          if (d <= 30) timeline.push({daysOut: d, dueDate, type: dt.type, emoji: dt.emoji, title: dt.title, loc: speciesLocName(type), speciesType: type, key: taskKey, routine: true});
        }
      });

      // Periodic species-grouped tasks
      const periodics = [];
      if (type !== "Bee") {
        periodics.push({period: 7,  offset: 0, type: "clean",   emoji: "🧹", title: `Clean housing — ${speciesLabel}`,      keySuffix: "clean"});
        periodics.push({period: 30, offset: 0, type: "bedding", emoji: "🛏️", title: `Full bedding change — ${speciesLabel}`, keySuffix: "bedding"});
      }
      if (GRAZER_SPECIES.has(type)) {
        periodics.push({period: 21, offset: 0, type: "paddock", emoji: "🔄", title: `Rotate paddock — ${speciesLabel}`, keySuffix: "paddock"});
      }
      periodics.forEach(pt => {
        for (let d = 0; d <= 60; d++) {
          if ((today0 + d + sHash + pt.offset) % pt.period !== 0) continue;
          const dueDate = dayAfter(d);
          const key = toLocalDateKey(dueDate);
          const taskKey = `species-${type}-${pt.keySuffix}`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: pt.type, emoji: pt.emoji, label: pt.title, speciesType: type, key: taskKey});
          if (d <= 30) timeline.push({daysOut: d, dueDate, type: pt.type, emoji: pt.emoji, title: pt.title, loc: speciesLocName(type), speciesType: type, key: taskKey});
        }
      });
    });

    // Per-animal tasks (health, hoof, hive) — genuinely per-individual
    (data.livestock?.animals || []).forEach(a => {
      const db = LDB[a.type];
      if (!db) return;
      const label = a.name ? `${a.name} (${a.type})` : a.type;
      const aHash = hashStr2(a.id);

      // Weekly health check (per animal)
      if (a.type !== "Bee") {
        for (let d = 0; d <= 60; d++) {
          if ((today0 + d + aHash + 3) % 7 !== 0) continue;
          const dueDate = dayAfter(d);
          const key = toLocalDateKey(dueDate);
          const taskKey = `animal-${a.id}-health`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: "health", emoji: "🩺", label: `Health check — ${label}`, animalId: a.id, key: taskKey});
          if (d <= 30) timeline.push({daysOut: d, dueDate, type: "health", emoji: "🩺", title: `Health check — ${label}`, loc: animalLocOf(a), animalId: a.id, key: taskKey});
        }
      }

      // Bi-weekly hoof check (per hoofed animal)
      if (HOOFED_SPECIES.has(a.type)) {
        for (let d = 0; d <= 60; d++) {
          if ((today0 + d + aHash) % 14 !== 0) continue;
          const dueDate = dayAfter(d);
          const key = toLocalDateKey(dueDate);
          const taskKey = `animal-${a.id}-hoof`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: "hoof", emoji: "🦶", label: `Hoof check — ${label}`, animalId: a.id, key: taskKey});
          if (d <= 30) timeline.push({daysOut: d, dueDate, type: "hoof", emoji: "🦶", title: `Hoof check — ${label}`, loc: animalLocOf(a), animalId: a.id, key: taskKey});
        }
      }

      // Bee hive inspections — 10d cycle, Mar–Sep only, per hive
      if (a.type === "Bee") {
        for (let d = 0; d <= 60; d++) {
          const due = dayAfter(d);
          const m = due.getMonth() + 1;
          if (m < 3 || m > 9) continue;
          if ((today0 + d + aHash) % 10 !== 0) continue;
          const key = toLocalDateKey(due);
          const taskKey = `animal-${a.id}-hive`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: "hive", emoji: "🐝", label: `Hive inspection — ${label}`, animalId: a.id, key: taskKey});
          if (d <= 30) timeline.push({daysOut: d, dueDate: due, type: "hive", emoji: "🐝", title: `Hive inspection — ${label}`, loc: animalLocOf(a), animalId: a.id, key: taskKey});
        }
      }
    });

    // Your own jobs (lib/own-tasks.js): calendar for 60 days, timeline for 30.
    (Array.isArray(data.customTasks) ? data.customTasks : []).forEach(t => {
      if (!t || !t.id || t.paused || (t.repeat === "once" && t.doneOn)) return;
      const zoneName = (t.zoneId && zoneById.get(t.zoneId)?.name) || "Around your space";
      for (let d = 0; d <= 60; d++) {
        const dueDate = dayAfter(d);
        const key = toLocalDateKey(dueDate);
        if (!isDueOn(t, key)) continue;
        const taskKey = `own-${t.id}`;
        if (!evts[key]) evts[key] = [];
        evts[key].push({type: "own", emoji: t.emoji || "📝", label: t.title, key: taskKey, ownId: t.id, minutes: t.minutes});
        if (d >= 1 && d <= 30) timeline.push({daysOut: d, dueDate, type: "upcoming", emoji: t.emoji || "📝", title: t.title, loc: zoneName, ownId: t.id, minutes: t.minutes, key: taskKey, routine: t.repeat === "daily"});
      }
    });

    // Hide today's completed tasks from both calendar (today only) and timeline (today only)
    Object.keys(evts).forEach(k => {
      if (k !== todayKey) return;
      evts[k] = evts[k].filter(ev => !ev.key || !doneToday.has(ev.key));
    });
    const filteredTimeline = timeline.filter(t => !(t.daysOut === 0 && t.key && doneToday.has(t.key)));

    filteredTimeline.sort((a,b) => a.daysOut - b.daysOut);
    return { calendarEvents: evts, byTime: filteredTimeline };
  }, [data, zoneById, speciesLocName, animalLocOf, todayStr]);

  // ─── Group today's tasks by location (Option D: location-batched with attention banner) ───
  const doneTodayKeys = new Set((data.completions && data.completions[todayStr]) || []);

  // ─── Two-bucket model ───
  // ROUTINE: plot water, animal feed/water/eggs. Daily ritual. Grouped by location.
  //          Never appears in attention banner, coming-up, or calendar.
  // IMPORTANT: everything else. Harvests, growing steps (pinch, transplant, fertilize, prune),
  //            weekly+ animal care (clean, health, hoof, paddock, bedding, hive inspection).
  //            Drives the attention banner, "Coming Up This Week", and calendar.
  const routineTasks = tasks.filter(t => t.routine === true);
  const importantTasks = tasks.filter(t => t.routine !== true);

  // Attention = important tasks due today or overdue (step with negative due, harvest ready)
  // For steps, an "upcoming" row has daysOut > 0 (was computed from due-days-in-future, not overdue).
  // buildTaskQueue uses pri: 1 for "step" (due 0..3 days back, i.e. overdue or today)
  //                  pri: 3 for "upcoming" (will-be-due in 1..3 days)
  //                  pri: 0 for "harvest" (ready)
  //                  pri: 2 for periodic animal (due today — hash-based, already pruned to today)
  const attentionTasks = importantTasks.filter(t =>
    t.type === "harvest" ||            // harvest ready
    t.type === "step" ||               // growing step due today or overdue
    (t.daysOut === 0 && !["upcoming","forecast"].includes(t.type))  // periodic animal care due today
  );

  // Calm by default: red only when food is ready and can go past its best.
  const hasHarvestNow = attentionTasks.some(t => t.type === "harvest");
  const allSowing = attentionTasks.length > 0 && attentionTasks.every(t => t.sowing);
  const attentionTone = hasHarvestNow ? C.orange : C.green;
  const attentionBg = hasHarvestNow ? C.harvestBg : C.gp;
  const attentionNote = hasHarvestNow
    ? "Harvests are ready — pick them before they go past their best."
    : allSowing
    ? "Your first jobs. They wait for you until the seeds or plants are in."
    : "Due now. A day late is fine for most garden jobs.";

  // Group routine by location (for the daily walking lists)
  const routineByLoc = {};
  routineTasks.forEach(t => {
    const key = t.loc || "Farm";
    if (!routineByLoc[key]) routineByLoc[key] = [];
    routineByLoc[key].push(t);
  });
  const routineLocations = Object.keys(routineByLoc).sort();

  // Pick a location icon based on zone type; falls back to 📍
  const locIcon = (locName) => {
    const z = zoneByName.get(locName);
    if (!z) return "📍";
    const zt = ZT_MAP.get(z.type);
    return zt?.icon || "📍";
  };

  // Coming up this week = important tasks, tomorrow..+7, excluding routine
  const thisWeek = byTime.filter(t => t.daysOut >= 1 && t.daysOut <= 7 && t.routine !== true);
  // Split coming-up into Farm (plots — harvests, growing steps) vs Animals (periodic care)
  const thisWeekFarm    = thisWeek.filter(t => !!t.plotId || !!t.ownId);
  const thisWeekAnimals = thisWeek.filter(t => !!t.animalId);

  // Done today: reconstruct from completion keys by parsing each key and finding the referenced
  // plot or animal in data. We don't read today's calendar events because they're already
  // filtered (completed items are hidden from evts).
  const doneTodayList = [];
  const seenKeys = new Set();
  doneTodayKeys.forEach(k => {
    if (seenKeys.has(k)) return;
    seenKeys.add(k);
    // Your own jobs: "own-<id>" (ids contain dashes, so match before splitting).
    if (k.startsWith("own-")) {
      const ot = (data.customTasks || []).find(x => x.id === k.slice(4));
      if (ot) doneTodayList.push({ key: k, emoji: ot.emoji || "📝", title: ot.title, loc: (ot.zoneId && zoneById.get(ot.zoneId)?.name) || "Around your space" });
      return;
    }
    // Try to find a matching task-shape from any source (tasks array won't have it since filtered)
    // Parse the key to reconstruct a minimal display shape
    // keys look like: plot-{id}-{type}, animal-{id}-{type}, or species-{Type}-{type}
    // Plot/animal ids are UUIDs (they contain dashes): parseTaskKey splits on the
    // first and the LAST dash only (plot-<uuid>-water, plot-<uuid>-step-2).
    const km = parseTaskKey(k);
    if (!km) return;
    const kind = km.kind, id = km.id, typeSuffix = km.suffix;
    if (kind === "plot") {
      const p = data.garden.plots.find(x => x.id === id);
      if (!p) return;
      const crop = rCM(data.region).get(p.crop);
      const zone = data.zones.find(z => z.id === p.zone);
      const loc = zone ? zone.name : "Farm";
      let title = `${p.name || p.crop}`;
      let emoji = crop?.emoji || "🌱";
      if (typeSuffix === "harvest") title = `Harvest ${p.name || p.crop}`;
      else if (typeSuffix === "water") { title = `Water ${p.name || p.crop}`; emoji = "💧"; }
      doneTodayList.push({ key: k, emoji, title, loc, cropName: p.crop });
    } else if (kind === "species") {
      // Grouped species task — id is the species type name (e.g. "Chicken")
      const speciesType = id;
      const animals = (data.livestock?.animals || []).filter(x => x.type === speciesType);
      if (animals.length === 0) return;
      const headCount = animals.reduce((sum, x) => sum + (x.count || 1), 0);
      const db = LDB[speciesType];
      const speciesLabel = animalPlural(speciesType, headCount);
      const loc = speciesLocName(speciesType);
      let emoji = db?.e || "🐾";
      let title = speciesLabel;
      if (typeSuffix === "feed")       title = `Feed ${speciesLabel}`;
      else if (typeSuffix === "water"){ title = `Water ${speciesLabel}`; emoji = "💧"; }
      else if (typeSuffix === "eggs") { title = `Collect eggs — ${speciesLabel}`; emoji = "🥚"; }
      else if (typeSuffix === "milk") { title = `Milk ${speciesLabel}`; emoji = "🥛"; }
      else if (typeSuffix === "clean"){ title = `Clean housing — ${speciesLabel}`; emoji = "🧹"; }
      else if (typeSuffix === "bedding"){title = `Full bedding change — ${speciesLabel}`; emoji = "🛏️"; }
      else if (typeSuffix === "paddock"){title = `Rotate paddock — ${speciesLabel}`; emoji = "🔄"; }
      doneTodayList.push({ key: k, emoji, title, loc, speciesType });
    } else if (kind === "animal") {
      const a = (data.livestock?.animals || []).find(x => x.id === id);
      if (!a) return;
      const db = LDB[a.type];
      // Per-animal keys are now only health/hoof/hive — use animal's individual label
      const label = a.name ? `${a.name} (${a.type})` : a.type;
      const loc = animalLocOf(a);
      let emoji = db?.e || "🐾";
      let title = label;
      if (typeSuffix === "health"){title = `Health check — ${label}`; emoji = "🩺"; }
      else if (typeSuffix === "hoof") { title = `Hoof check — ${label}`; emoji = "🦶"; }
      else if (typeSuffix === "hive") { title = `Hive inspection — ${label}`; emoji = "🐝"; }
      doneTodayList.push({ key: k, emoji, title, loc, speciesType: a.type });
    } else if (kind === "weather") {
      // Weather prep jobs: "weather-<kind>-<YYYYMMDD>" (lib/weather-alerts.js)
      const W = { frost: ["❄️", "Frost protection"], heat: ["🌡️", "Heat prep"], wind: ["💨", "Gale prep"], downpour: ["🌧️", "Heavy-rain prep"], blight: ["🍂", "Blight check"], rain: ["🌦️", "Rain day — no watering"] };
      const [emoji, title] = W[id] || ["🌦️", "Weather job"];
      doneTodayList.push({ key: k, emoji, title, loc: "Around your space" });
    }
  });

  // Un-mark helper: remove a key from today's completions (lets user undo a done tick)
  const undoDone = (key) => {
    const existing = (data.completions && data.completions[todayStr]) || [];
    if (!existing.includes(key)) return;
    // Takes back what the tick added (pantry, garden memory, harvested planting) — see complete-task.js.
    const base = key.startsWith("own-") ? unmarkOwnDone(data, key.slice(4), todayStr) : data;
    setData(undoTaskCompletion(base, key));
  };

  const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const today = new Date(); today.setHours(0,0,0,0);

  // Calendar grid — Monday-first week (Western Europe convention).
  // getDay() returns 0=Sun..6=Sat; we map to 0=Mon..6=Sun via (d + 6) % 7.
  const calStart = new Date(viewYear, viewMonth, 1);
  const calEnd = new Date(viewYear, viewMonth+1, 0);
  const firstDow = (calStart.getDay() + 6) % 7;
  const daysInMonth = calEnd.getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Is today's date inside the viewed month?
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const viewingCurrentMonth = (viewMonth === currentMonth && viewYear === currentYear);
  const jumpToToday = () => {
    setViewMonth(currentMonth);
    setViewYear(currentYear);
    setSelectedDate(toLocalDateKey(new Date()));
  };

  // todayStr already computed at top of function (for completions); reused for calendar grid below

  const goToFarm = useCallback(() => setPage("crops"), [setPage]);

  return (
    <div className="page-enter" style={{maxWidth:1100}}>
      <h2 className="pg-h2" style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>All tasks</h2>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",margin:"0 0 16px"}}>
        <p className="pg-sub" style={{color:C.t2,fontSize:13,margin:0,fontWeight:500}}>Today's work first, then the week, then the month</p>
        <button type="button" onClick={()=>setOwnForm({})} style={{border:`1px solid ${C.bdr}`,background:C.card,color:C.green,borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:700,cursor:"pointer",minHeight:40}}>+ Add your own job</button>
      </div>

      <TimeBudgetCard data={data} setData={setData} forecast={forecast}/>

      {/* ── Section 1: TODAY — attention banner + location-grouped routine + done-today ── */}
      {/* ── Section 1: NEEDS ATTENTION — harvests, steps, periodic animal care ── */}
      {attentionTasks.length > 0 && (
        <Card p={false} style={{overflow:"hidden",marginBottom:16,border:`1px solid ${attentionTone}`}}>
          <button
            onClick={()=>setAttentionCollapsed(v=>!v)}
            style={{width:"100%",display:"block",textAlign:"left",padding:"14px 18px 10px",borderBottom: attentionCollapsed ? "none" : `1px solid ${C.bdr}`,background:attentionBg,border:"none",cursor:"pointer"}}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{hasHarvestNow ? "🧺" : "🌱"}</span>
                <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:attentionTone,letterSpacing:"-0.01em"}}>Do today</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{background:attentionTone,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:12}}>{attentionTasks.length}</span>
                <ChevronDown size={20} aria-hidden="true" style={{color:C.t2,flexShrink:0,transition:"transform .2s",transform:attentionCollapsed?"none":"rotate(180deg)"}}/>
              </div>
            </div>
            <div style={{fontSize:12,color:C.t2,marginTop:3}}>{attentionNote}</div>
          </button>
          {!attentionCollapsed && (
            <div style={{padding:"12px 14px"}}>
              {attentionTasks.map((t,i) => (
                <TaskRow
                  key={t.key || `att-${i}`}
                  t={t}
                  onOpen={()=>openTask(t)}
                  onToggleStep={togStep}
                  onMarkDone={markDone}
                  onGoToFarm={goToFarm}
                  onRef={t.key ? (el => { if (el) rowRefs.current[t.key] = el; else delete rowRefs.current[t.key]; }) : undefined}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Section 3: DAILY ROUTINE — grouped by location, same every day ── */}
      <Card p={false} style={{overflow:"hidden",marginBottom:16}}>
        <button
          onClick={()=>setRoutineCollapsed(v=>!v)}
          style={{width:"100%",display:"block",textAlign:"left",padding:"14px 18px 10px",borderBottom: routineCollapsed ? "none" : `1px solid ${C.bdr}`,background:C.soft,border:"none",cursor:"pointer"}}
        >
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              
              <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:C.text,letterSpacing:"-0.01em"}}>Daily Routine</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:12,color:C.t2,fontFamily:F.mono,fontWeight:600}}>
                {new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}
              </div>
              <ChevronDown size={20} aria-hidden="true" style={{color:C.t2,flexShrink:0,transition:"transform .2s",transform:routineCollapsed?"none":"rotate(180deg)"}}/>
            </div>
          </div>
          <div style={{fontSize:12,color:C.t2,marginTop:3}}>
            {routineTasks.length === 0
              ? "Watering and animal care show up here"
              : `${routineTasks.length} task${routineTasks.length === 1 ? "" : "s"} · your daily walk`}
          </div>
        </button>

        {!routineCollapsed && (routineLocations.length > 0 ? (
          <div style={{padding:"14px"}}>
            {routineLocations.map(loc => (
              <div key={loc} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,paddingLeft:2}}>
                  <span style={{fontSize:16}}>{locIcon(loc)}</span>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:"0.04em"}}>At the {loc}</div>
                  <div style={{marginLeft:"auto",fontSize:11,color:C.t2,fontWeight:600,fontFamily:F.mono}}>
                    {routineByLoc[loc].length}
                  </div>
                </div>
                {routineByLoc[loc].map((t,i) => (
                  <TaskRow
                    key={t.key || `${loc}-${i}`}
                    t={t}
                    onOpen={()=>openTask(t)}
                    onToggleStep={togStep}
                    onMarkDone={markDone}
                    onGoToFarm={goToFarm}
                    onRef={t.key ? (el => { if (el) rowRefs.current[t.key] = el; else delete rowRefs.current[t.key]; }) : undefined}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"28px 20px",color:C.t2,fontSize:13}}>
            {doneTodayList.length > 0 ? "All routine done for today" : "Nothing to water or feed today."}
          </div>
        ))}
      </Card>

      {/* ── Section 2a: COMING UP — FARM (plot harvests + growing steps, next 7 days) ── */}
      <Card p={false} style={{overflow:"hidden",marginBottom:12}}>
        <button
          onClick={()=>setFarmWeekCollapsed(v=>!v)}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:C.soft,border:"none",cursor:"pointer",borderBottom: farmWeekCollapsed ? "none" : `1px solid ${C.bdr}`}}
        >
          <div style={{textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              
              <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:C.text,letterSpacing:"-0.01em"}}>Farm — This Week</div>
            </div>
            <div style={{fontSize:12,color:C.t2,marginTop:3}}>
              {thisWeekFarm.length === 0 ? "Nothing this week" : `${thisWeekFarm.length} task${thisWeekFarm.length === 1 ? "" : "s"} · harvests, transplants, pinching, pruning`}
            </div>
          </div>
          <ChevronDown size={20} aria-hidden="true" style={{color:C.t2,flexShrink:0,transition:"transform .2s",transform:farmWeekCollapsed?"none":"rotate(180deg)"}}/>
        </button>
        {!farmWeekCollapsed && (
          thisWeekFarm.length > 0 ? (
            <div style={{padding:"12px 14px"}}>
              {thisWeekFarm.map((t,i) => (
                <TaskRow
                  key={t.key || `farm-${i}`}
                  t={t}
                  onOpen={()=>openTask(t)}
                  onToggleStep={togStep}
                  onMarkDone={markDone}
                  onGoToFarm={goToFarm}
                />
              ))}
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"20px 16px",color:C.t2,fontSize:12}}>No growing jobs or harvests in the next 7 days</div>
          )
        )}
      </Card>

      {/* ── Section 2b: COMING UP — ANIMALS (weekly+ periodic care, next 7 days) ── */}
      {(data.livestock?.animals || []).length > 0 && (
      <Card p={false} style={{overflow:"hidden",marginBottom:16}}>
        <button
          onClick={()=>setAnimalsWeekCollapsed(v=>!v)}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:C.warm,border:"none",cursor:"pointer",borderBottom: animalsWeekCollapsed ? "none" : `1px solid ${C.bdr}`}}
        >
          <div style={{textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              
              <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:C.text,letterSpacing:"-0.01em"}}>Animals — This Week</div>
            </div>
            <div style={{fontSize:12,color:C.t2,marginTop:3}}>
              {thisWeekAnimals.length === 0 ? "Nothing this week" : `${thisWeekAnimals.length} task${thisWeekAnimals.length === 1 ? "" : "s"} · cleaning, health, bedding, paddock rotation`}
            </div>
          </div>
          <ChevronDown size={20} aria-hidden="true" style={{color:C.t2,flexShrink:0,transition:"transform .2s",transform:animalsWeekCollapsed?"none":"rotate(180deg)"}}/>
        </button>
        {!animalsWeekCollapsed && (
          thisWeekAnimals.length > 0 ? (
            <div style={{padding:"12px 14px"}}>
              {thisWeekAnimals.map((t,i) => (
                <TaskRow
                  key={t.key || `animals-${i}`}
                  t={t}
                  onOpen={()=>openTask(t)}
                  onToggleStep={togStep}
                  onMarkDone={markDone}
                  onGoToFarm={goToFarm}
                />
              ))}
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"20px 16px",color:C.t2,fontSize:12}}>No scheduled animal care this week</div>
          )
        )}
      </Card>
      )}


      {/* ── Done today — collapsible, stands on its own ── */}
      {doneTodayList.length > 0 && (
        <Card p={false} style={{overflow:"hidden",marginBottom:16,background:C.soft}}>
          <button
            onClick={()=>setDoneCollapsed(v=>!v)}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:C.green,letterSpacing:"0.02em"}}
          >
            <span>✓ Done today · {doneTodayList.length}</span>
            <ChevronDown size={20} aria-hidden="true" style={{color:C.t2,flexShrink:0,transition:"transform .2s",transform:doneCollapsed?"none":"rotate(180deg)"}}/>
          </button>
          {!doneCollapsed && (
            <div style={{padding:"0 14px 14px"}}>
              {doneTodayList.map((d,i) => (
                <div
                  key={d.key || i}
                  ref={el => {
                    if (el && d.key && pendingFlips.current.has(d.key)) {
                      pendingFlips.current.delete(d.key);
                      flip(d.key, el);
                    }
                  }}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",marginBottom:4,background:C.card,borderRadius:C.rs,border:`1px solid ${C.bdr}`,opacity:0.65}}>
                  <span style={{flexShrink:0,display:"flex"}}><FarmIcon name={d.cropName || d.speciesType} emoji={d.emoji} size={20}/></span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.t2,textDecoration:"line-through"}}>{d.title}</div>
                    <div style={{fontSize:11,color:C.t2,marginTop:2,display:"flex",alignItems:"center",gap:3}}><MapPin size={12} aria-hidden="true"/>{d.loc}</div>
                  </div>
                  <button onClick={()=>undoDone(d.key)} style={{background:"none",border:`1px solid ${C.bdr}`,color:C.t2,borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Undo</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Your own jobs (lib/own-tasks.js) ── */}
      <Card style={{marginBottom:16,padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:C.text}}>Your own jobs</div>
          <button type="button" onClick={()=>setOwnForm({})} style={{background:"none",border:"none",color:C.green,fontSize:13,fontWeight:700,cursor:"pointer",minHeight:40}}>+ Add</button>
        </div>
        <OwnTaskList data={data} setData={setData} onEdit={t=>setOwnForm(t)}/>
      </Card>
      {ownForm && <OwnTaskForm data={data} setData={setData} initial={ownForm} onClose={()=>setOwnForm(null)}/>}

      {/* ── Section 4: Calendar — full width ── */}
      <Card p={false} style={SX.overflowHidden}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`,gap:8}}>
          <button onClick={()=>{let m=viewMonth-1,y=viewYear;if(m<0){m=11;y--;}setViewMonth(m);setViewYear(y);}} aria-label="Previous month" style={{background:"none",border:"none",cursor:"pointer",color:C.t2,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChevronLeft size={20} strokeWidth={2}/></button>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,justifyContent:"center"}}>
            <div style={{fontFamily:F.head,fontSize:17,fontWeight:700}}>{MN[viewMonth]} {viewYear}</div>
            {!viewingCurrentMonth && (
              <button
                onClick={jumpToToday}
                aria-label="Jump to today"
                style={{
                  background:C.gp,color:C.green,border:"none",borderRadius:14,
                  padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",
                  fontFamily:F.body,letterSpacing:"0.02em",minHeight:36,
                }}
              >
                Today
              </button>
            )}
          </div>
          <button onClick={()=>{let m=viewMonth+1,y=viewYear;if(m>11){m=0;y++;}setViewMonth(m);setViewYear(y);}} aria-label="Next month" style={{background:"none",border:"none",cursor:"pointer",color:C.t2,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ChevronRight size={20} strokeWidth={2}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"10px 16px 4px",gap:2}}>
          {DAYS.map((d,di)=>{
            const isWeekend = di >= 5; // Sat/Sun under Monday-first layout
            return <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:isWeekend?C.t2:C.text,fontFamily:F.mono,opacity:isWeekend?0.6:1}}>{d}</div>;
          })}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"4px 16px 16px",gap:4}}>
          {cells.map((d,i) => {
            if (!d) return <div key={i}/>;
            const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const evts = (calendarEvents[dateStr] || []).filter(ev => ev.routine !== true);
            const isToday = dateStr === todayStr;
            const isSel = dateStr === selectedDate;
            const hasHarvest = evts.some(e=>e.type==="harvest");
            const hasStep = evts.some(e=>e.type==="step");
            // Friendlier styling (Phase 6.1.3):
            //   selected → full green fill + white text
            //   today    → soft ring + bold green number (no heavy fill)
            //   events   → soft cream background, no border
            //   empty    → transparent
            let bgColor = "transparent";
            if (isSel) bgColor = C.green;
            else if (evts.length > 0 && !isToday) bgColor = C.soft;
            const borderStyle = isSel
              ? `2px solid ${C.green}`
              : isToday
              ? `2px solid ${C.green}`
              : "2px solid transparent";
            const numberColor = isSel ? "#fff" : isToday ? C.green : C.text;
            const numberWeight = (isSel || isToday) ? 700 : 400;
            return (
              <button type="button" key={i} onClick={()=>setSelectedDate(isSel?null:dateStr)} aria-pressed={isSel} aria-label={`${d} ${MN[viewMonth]}${isToday ? ", today" : ""}${evts.length ? `, ${evts.length} task${evts.length === 1 ? "" : "s"}` : ""}`} style={{textAlign:"center",padding:"6px 2px",borderRadius:10,background:bgColor,minHeight:52,cursor:"pointer",border:borderStyle,transition:"all 0.15s ease",font:"inherit",color:"inherit",width:"100%",display:"block"}}>
                <div style={{fontSize:13,fontWeight:numberWeight,color:numberColor}}>{d}</div>
                {evts.length > 0 && (
                  <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3,flexWrap:"wrap"}}>
                    {hasHarvest && <div style={{width:7,height:7,borderRadius:4,background:isSel?"#ffb347":C.orange}} title="Harvest"/>}
                    {hasStep && <div style={{width:7,height:7,borderRadius:4,background:isSel?"#87ceeb":C.blue}} title="Step due"/>}
                  </div>
                )}
                {evts.length > 0 && (
                  <div style={{fontSize:10,color:isSel?"rgba(255,255,255,.8)":C.t2,marginTop:2,lineHeight:1.1}}>
                    <FarmIcon name={evts[0].cropName || evts[0].speciesType} emoji={evts[0].emoji} size={11}/>{evts.length>1?`+${evts.length-1}`:""}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div style={{display:"flex",gap:14,padding:"8px 18px 14px",borderTop:`1px solid ${C.bdr}`,flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t2}}><div style={{width:8,height:8,borderRadius:4,background:C.orange}}/> Harvest</span>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t2}}><div style={{width:8,height:8,borderRadius:4,background:C.blue}}/> Growing step</span>
          <span style={{fontSize:10,color:C.t2,marginLeft:"auto"}}>Tap a day to see tasks</span>
        </div>

        {/* ── Selected Day Task List ── */}
        {selectedDate && (() => {
          const selEvts = (calendarEvents[selectedDate] || []).filter(ev => ev.routine !== true);
          const selDateObj = new Date(selectedDate + "T00:00:00");
          const dayLabel = selDateObj.toLocaleDateString("en-GB", {weekday:"long", day:"numeric", month:"long", year:"numeric"});
          const isSelToday = selectedDate === todayStr;
          return (
            <div style={{borderTop:`2px solid ${C.green}`,padding:"14px 18px 16px",background:C.soft}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,color:C.text}}>
                    {isSelToday ? "Today" : "📅"} {dayLabel}
                  </div>
                  <div style={SX.t2_11mt2}>
                    {selEvts.length === 0 ? "No tasks scheduled" : `${selEvts.length} task${selEvts.length>1?"s":""} scheduled`}
                  </div>
                </div>
                <button onClick={()=>setSelectedDate(null)} style={{background:"none",border:`1px solid ${C.bdr}`,borderRadius:8,padding:"4px 10px",fontSize:11,color:C.t2,cursor:"pointer",fontWeight:600}}>✕ Close</button>
              </div>
              {selEvts.length === 0
                ? <div style={{textAlign:"center",padding:"20px 0",color:C.t2,fontSize:12}}>Nothing to do — enjoy the day!</div>
                : <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {selEvts.map((evt,idx) => {
                      // Synthesize a task-shape object so we can reuse TaskRow
                      const ownT = evt.ownId ? (data.customTasks || []).find(x => x.id === evt.ownId) : null;
                      const loc = ownT
                        ? ((ownT.zoneId && zoneById.get(ownT.zoneId)?.name) || "Around your space")
                        : evt.plotId
                        ? (data.zones.find(z => z.id === (data.garden.plots.find(p => p.id === evt.plotId)?.zone))?.name || "Farm")
                        : (data.zones.find(z => ["barn","coop","pasture"].includes(z.type))?.name || "Farm");
                      const pri = evt.type === "harvest" ? 0 : evt.type === "step" ? 1 : evt.type === "feed" || evt.type === "water" || evt.type === "eggs" ? 1 : 2;
                      const daysOut = Math.max(0, localDayNumber(selDateObj) - localDayNumber(today));
                      const tAsTask = {
                        key: evt.key,
                        pri,
                        type: evt.type,
                        emoji: evt.emoji, cropName: evt.cropName, speciesType: evt.speciesType,
                        title: evt.label,
                        loc,
                        plotId: evt.plotId,
                        animalId: evt.animalId,
                        stepIdx: evt.stepIdx,
                        ownId: evt.ownId,
                        minutes: evt.minutes,
                        once: ownT ? (ownT.repeat === "once" || !ownT.repeat) : undefined,
                        daysOut,
                        dueDate: selDateObj,
                      };
                      return (
                        <TaskRow
                          key={evt.key || idx}
                          t={tAsTask}
                          onOpen={()=>openTask(tAsTask)}
                          onToggleStep={togStep}
                          onMarkDone={isSelToday ? markDone : undefined}
                          onGoToFarm={goToFarm}
                        />
                      );
                    })}
                  </div>
              }
            </div>
          );
        })()}
      </Card>

      {openPlot && <PlotOverlay plot={openPlot} data={data} setData={setData} onClose={()=>setOpenPlotId(null)} setPage={setPage}/>}
      {openAnimal && <AnimalOverlay animal={openAnimal} data={data} setData={setData} onClose={()=>setOpenAnimalId(null)}/>}
    </div>
  );
}

export default TaskQueue;
