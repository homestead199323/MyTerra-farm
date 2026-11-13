import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sun, Flame, ListChecks, ChevronRight, ChevronUp, ArrowRight, Check, Sprout } from "lucide-react";
import { fetchWeather } from "../../lib/weather";
import { todayLocalKey } from "../../lib/utils";
import { Overlay } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";
import GroveScene from "../grove/GroveScene";
import WeatherWeek from "../grove/WeatherWeek";
import { StarterKit } from "../grove/GroveHome";
import { tasksByZone, taskGlyph } from "../grove/zone-tasks";
import WalkOverlay from "../today/WalkOverlay";
import PlantArt from "../quiet/PlantArt";
import AnimalArt from "../quiet/AnimalArt";
import { RemindersPrompt } from "../settings/Reminders";
import { isPlantZone } from "../farm/living/visuals";
import { dueToday, trackDay, jobsProgress, showDayDone, rowNote } from "./home-model";
import { cueState, endCues } from "./setup-model";
import BuildMode from "./BuildMode";
import "./home-v2.css";

/* The map-first home (spec: docs/superpowers/specs/2026-11-12-map-first-home-design.md).
   The 3D map is the screen; three controls float on it: weather + streak, the jobs chip, and the
   dock (GameDock, rendered by App). Area markers and their job popup come from GroveScene. */

const DAY_KEY = "mt_day", DONE_KEY = "mt_day_done", OPEN_KEY = "mt_jobs_open";
const PANEL_W = 384; // the docked jobs list on a wide screen: the map keeps its farm clear of it
function stored(key, json) {
  try {
    const raw = localStorage.getItem(key);
    return json ? JSON.parse(raw || "null") : raw;
  } catch {
    return null;
  }
}
function store(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode: remembered for this visit only */ }
}

const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
  angle: (i / 16) * 360 + (i % 2 ? 9 : -6),
  dist: 176 + (i % 4) * 24,
  hue: ["#f2c230", "#128147", "#2563c9", "#b86a12"][i % 4],
}));

function JobArt({ task, data }) {
  if (task.type === "weather" || task.type === "own" || task.type === "seedling") return <span className="hv2-emoji" aria-hidden="true">{taskGlyph(task)}</span>;
  if (task.speciesType) return <AnimalArt species={task.speciesType} size={40} />;
  if (task.sowing) return <FarmIcon name={task.cropName} emoji={task.emoji} size={34} harvest />;
  const crop = task.cropName || (data.garden?.plots || []).find((p) => p.id === task.plotId)?.crop;
  if (crop) return <PlantArt crop={crop} stage={task.type === "harvest" ? 5 : 3} size={40} />;
  return <span className="hv2-emoji" aria-hidden="true">{taskGlyph(task)}</span>;
}

const CUE_TEXT = {
  plant: "Tap here to plant your first crop",
  animal: "Tap + to add your first animal",
  job: "Jobs pop up on the map. Tap one to tick it off",
};
/** Where a cue's target is on screen right now (the map's labels move with the camera). */
function useTargetRect(selector) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    let last = "";
    const read = () => {
      const el = Array.from(document.querySelectorAll(selector)).find((n) => n.getClientRects().length > 0);
      const r = el ? el.getBoundingClientRect() : null;
      const key = r ? [r.left, r.top, r.width, r.height].map(Math.round).join(",") : "";
      if (key !== last) { last = key; setRect(r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null); }
    };
    read();
    const timer = setInterval(read, 250);
    return () => clearInterval(timer);
  }, [selector]);
  return rect;
}

/** First-run cue: a bubble and a pulsing ring on the thing to tap next (plant → animal → job). */
function Cue({ cue, bedId, onPlant, onSkip }) {
  const selector = cue.current === "plant" ? `.g3-label[data-zone="${bedId}"] .g3-pill` : cue.current === "animal" ? ".hv2-plus" : ".g3-home .g3-badge";
  const rect = useTargetRect(selector);
  if (cue.current === "job" && !rect) return null; // nothing due yet: this cue waits for the first marker
  const vw = window.innerWidth, vh = window.innerHeight, width = Math.min(280, vw - 24);
  const cx = rect ? rect.x + rect.w / 2 : vw / 2;
  const left = Math.max(12, Math.min(vw - width - 12, cx - width / 2));
  // The bubble sits above its target, except the bed cue: there it goes below so the bed itself stays in view.
  const roomBelow = !!rect && rect.y + rect.h + 190 < vh - 110;
  const above = !rect || (cue.current === "plant" ? !roomBelow : rect.y > 190);
  const pad = 9;
  let box = { left, width, bottom: 124 }, tail = null, ring = null;
  if (rect) {
    ring = { left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 };
    if (above) { box = { left, width, bottom: vh - ring.top + 16 }; tail = { left: cx - 8, bottom: vh - ring.top + 7 }; }
    else { box = { left, width, top: ring.top + ring.height + 16 }; tail = { left: cx - 8, top: ring.top + ring.height + 7 }; }
  }
  return (
    <div className="hv2-cues">
      {ring && cue.current === "plant" && <button type="button" className="hv2-cue-ring" aria-label="Plant your first crop" style={ring} onClick={onPlant} />}
      {ring && cue.current !== "plant" && <span className="hv2-cue-ring is-round" aria-hidden="true" style={ring} />}
      {tail && <i className="hv2-cue-tail" aria-hidden="true" style={tail} />}
      <div className="hv2-cue" role="status" style={box}>
        <div className="hv2-cue-top"><span>{cue.index} of {cue.total}</span><button type="button" onClick={onSkip}>Skip</button></div>
        <p>{!rect && cue.current === "plant" ? "Plant your first crop" : CUE_TEXT[cue.current]}</p>
        {!rect && cue.current === "plant" && <button type="button" className="hv2-cue-go" onClick={onPlant}>Plant</button>}
      </div>
    </div>
  );
}

function Bar({ done, total }) {
  return <span className="hv2-bar" aria-hidden="true"><i style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} /></span>;
}

export default function HomeV2({ data, setData, setPage, tasks, forecast, forecastState, alerts, demo, onDemoSignup, wide = false, covered = false }) {
  const [walk, setWalk] = useState(false), [weather, setWeather] = useState(null), [taskZone, setTaskZone] = useState(null);
  // Phone: the jobs list is a card over the map, closed until the chip is tapped. Wide screen: it floats
  // beside the map, open unless it was collapsed on this device.
  const [open, setOpen] = useState(() => stored(OPEN_KEY) !== "0"), [modal, setModal] = useState(false), [week, setWeek] = useState(false);
  const [build, setBuild] = useState(false), [engine, setEngine] = useState(null);
  const panel = wide ? open : modal;
  // A page opened over the farm: the map waits underneath with nothing floating on it.
  useEffect(() => { if (covered) { setModal(false); setWeek(false); setTaskZone(null); setBuild(false); } }, [covered]);
  // The dock's Build button starts build mode here, on the map.
  useEffect(() => {
    const start = () => { setModal(false); setWeek(false); setTaskZone(null); setBuild(true); };
    window.addEventListener("mt-build", start);
    return () => window.removeEventListener("mt-build", start);
  }, []);
  useEffect(() => { document.body.classList.toggle("mt-building", build); return () => document.body.classList.remove("mt-building"); }, [build]);
  const quiet = covered || build; // nothing but the map (and build mode's own controls)
  const setPanel = (on) => { if (wide) { setOpen(on); store(OPEN_KEY, on ? "1" : "0"); } else setModal(on); };
  useEffect(() => {
    let active = true;
    setWeather(null);
    if (data.city) fetchWeather(data.city).then((w) => { if (active && w && w.ok) setWeather(w); });
    return () => { active = false; };
  }, [data.city]);

  const today = todayLocalKey();
  const due = useMemo(() => dueToday(tasks), [tasks]);
  const markers = useMemo(() => tasksByZone(tasks, data), [tasks, data]);
  const ticked = ((data.completions && data.completions[today]) || []).length;
  const [day, setDay] = useState(() => stored(DAY_KEY, true));
  useEffect(() => {
    const next = trackDay(day, today, due.length, ticked);
    if (next !== day) { setDay(next); store(DAY_KEY, JSON.stringify(next)); }
  }, [day, today, due.length, ticked]);
  const progress = jobsProgress(day && day.day === today ? day : null, due.length);
  // Phones: the next job sits under the map, not only behind the count (review 2026-11-12).
  const upNext = useMemo(() => {
    if (due.length) return { t: due[0], when: "" };
    const later = (tasks || []).filter((t) => t.daysOut > 0 && t.type !== "upcoming-info").sort((a, b) => a.daysOut - b.daysOut)[0];
    return later ? { t: later, when: later.daysOut === 1 ? "tomorrow" : `in ${later.daysOut} days` } : null;
  }, [due, tasks]);

  const [shown, setShown] = useState(() => stored(DONE_KEY));
  const celebrate = showDayDone(progress, shown, today) && !taskZone && !walk && !modal && !quiet;
  const dismissDone = () => { setShown(today); store(DONE_KEY, today); };

  const firstBed = (data.zones || []).find((z) => isPlantZone(z.type));
  const fresh = !!firstBed && !(data.garden?.plots || []).length && !(data.livestock?.animals || []).length && !(data.nursery?.batches || []).length;
  const streak = data.gamify?.streak || 0;
  const cue = cueState(data);

  useEffect(() => {
    if (!modal) return undefined;
    const key = (e) => { if (e.key === "Escape") setModal(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [modal]);

  function openJob(task) {
    const zone = Object.keys(markers).find((id) => markers[id].some((x) => x.key === task.key));
    setModal(false);
    if (zone) setTaskZone(zone);
    else setPage("tasks");
  }

  // Jobs due today for the crop picked on the map: shown in the crop panel beside it.
  const cropJobs = (cropName) => {
    const plots = data.garden?.plots || [];
    const list = due.filter((t) => (t.cropName || plots.find((p) => p.id === t.plotId)?.crop) === cropName);
    if (!list.length) return null;
    return (
      <section className="g3-crop-sec">
        <h4>Due today</h4>
        {list.map(function (t) {
          return <button type="button" key={t.key} className="g3-crop-job" onClick={function () { openJob(t); }}><span aria-hidden="true">{taskGlyph(t)}</span><span>{t.title}</span><ChevronRight size={15} aria-hidden="true" /></button>;
        })}
      </section>
    );
  };

  const jobsList = (
    <section className={`hv2-panel${wide ? " is-docked" : ""}`} role={wide ? "region" : "dialog"} aria-modal={wide ? undefined : "true"} aria-label="Today's jobs">
      <header className="hv2-panel-head">
        <span className="hv2-ico"><ListChecks size={17} strokeWidth={2.2} /></span>
        <h2>Today’s jobs</h2>
        <b>{progress.done}/{progress.total}</b>
        {!wide && due.length > 0 && <button type="button" className="hv2-walk" onClick={() => { setModal(false); setWalk(true); }}>{data.walkSession?.status === "active" ? "Resume walk" : "Start walk"}</button>}
        {wide && <button type="button" className="hv2-collapse" aria-label="Hide today's jobs" onClick={() => setPanel(false)}><ChevronUp size={20} /></button>}
      </header>
      <div className="hv2-panel-list">
        {due.length === 0
          ? <p className="hv2-none">{fresh ? "Nothing planted yet" : "Nothing due"}</p>
          : due.map(function (t) {
              return (
                <button type="button" key={t.key} className="hv2-row" onClick={function () { openJob(t); }}>
                  <span className="hv2-art"><JobArt task={t} data={data} /></span>
                  <span className="hv2-row-text"><strong>{t.title}</strong><small>{rowNote(t)}</small></span>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              );
            })}
        <StarterKit data={data} setData={setData} />
        <RemindersPrompt />
      </div>
      <footer className="hv2-panel-foot">
        <button type="button" onClick={() => { setModal(false); setPage("tasks"); }}>All tasks <ArrowRight size={15} /></button>
      </footer>
    </section>
  );

  return (
    <div className={`hv2${wide ? " is-wide" : ""}${covered ? " is-covered" : ""}${build ? " is-build" : ""}`}>
      <GroveScene home homeRight={wide && open && !build ? PANEL_W : 0} paused={covered} rich={wide} building={build} onEngine={setEngine} cropExtra={cropJobs}
        guideZoneId={!quiet && cue && cue.current === "plant" && firstBed ? firstBed.id : null} data={data} setData={setData} weather={weather} tasksByZone={markers} onOpenTasks={() => setPage("tasks")} taskZoneId={taskZone} onTaskZone={setTaskZone}
        showEditButton={false} showHelperText={false} noBorder onPlantInZone={(zone) => setPage("crops", { zone })} onShowCrops={() => setPage("crops")}
        onEditLayout={() => setPage("map", { edit: true })} onStartGuide={() => setData({ ...data, setupDone: false })} />

      {!quiet && <div className="hv2-hud">
        <button type="button" className="hv2-cap" aria-label={`${weather?.ok ? `${weather.temp} degrees. ` : data.city ? "" : "No town set. "}${streak} day streak. Open this week's weather`} onClick={() => setWeek(true)}>
          <span className="hv2-sun"><Sun size={17} strokeWidth={2.2} /></span>
          <b>{weather?.ok ? `${weather.temp}°` : data.city ? "Weather" : "Add your town"}</b>
          {wide && weather?.ok && <span className="hv2-word">{weather.desc}{weather.location ? ` in ${weather.location}` : ""}</span>}
          <i aria-hidden="true" />
          <Flame size={18} strokeWidth={2.2} className="hv2-flame" />
          <b>{streak}</b>
          {wide && <span className="hv2-word">day streak</span>}
        </button>
        {!(wide && open) && <button type="button" className="hv2-chip" aria-haspopup="dialog" aria-expanded={panel} aria-label={`Today's jobs: ${progress.done} of ${progress.total} done`} onClick={() => setPanel(true)}>
          <span className="hv2-ico"><ListChecks size={17} strokeWidth={2.2} /></span>
          {wide && <span className="hv2-word">Today’s jobs</span>}
          <span className="hv2-chip-text"><b>{progress.done}/{progress.total}</b><Bar done={progress.done} total={progress.total} /></span>
        </button>}
      </div>}

      {!wide && !quiet && upNext && !modal && !walk && !celebrate && <button type="button" className="hv2-next" onClick={() => setPanel(true)}>
        <small>{upNext.when ? `Next ${upNext.when}` : "Next job"}</small>
        <strong>{upNext.t.title}</strong>
        {upNext.t.loc && <span>{upNext.t.loc}</span>}
      </button>}
      {demo && onDemoSignup && !quiet && <button type="button" className="hv2-demo" onClick={onDemoSignup}>Demo farm · Save my demo <ArrowRight size={14} /></button>}

      {cue && firstBed && !taskZone && !walk && !modal && !celebrate && !quiet && (
        <Cue cue={cue} bedId={firstBed.id} onPlant={() => setPage("crops", { zone: firstBed.id, returnHome: true })} onSkip={() => setData(endCues(data))} />
      )}

      {fresh && due.length === 0 && !cue && !quiet && (
        <button type="button" className="hv2-first" onClick={() => setPage("crops", { zone: firstBed.id, returnHome: true })}><Sprout size={18} />Plant your first crop<ArrowRight size={16} /></button>
      )}

      {panel && !wide && !quiet && createPortal(
        <div className="hv2-scrim" onClick={function (e) { if (e.target === e.currentTarget) setModal(false); }}>{jobsList}</div>,
        document.body,
      )}
      {panel && wide && !quiet && jobsList}

      {build && !covered && <BuildMode data={data} setData={setData} engine={engine} wide={wide} onDone={() => setBuild(false)} onDesigner={() => { setBuild(false); setPage("map", { edit: true }); }} />}

      {week && !quiet && (
        <Overlay title="This week" onClose={() => setWeek(false)}>
          <div className="hv2-week"><WeatherWeek data={data} setData={setData} forecast={forecast} forecastState={forecastState} alerts={alerts} onOpenTasks={() => { setWeek(false); setPage("tasks"); }} /></div>
        </Overlay>
      )}

      {celebrate && createPortal(
        <div className="hv2-done-scrim" onClick={dismissDone}>
          <span className="hv2-confetti" aria-hidden="true">
            {CONFETTI.map((c, i) => <i key={i} style={{ "--a": `${c.angle}deg`, "--d": `${c.dist}px`, background: c.hue }} />)}
          </span>
          <section className="hv2-done" role="dialog" aria-modal="true" aria-labelledby="hv2-done-title" onClick={(e) => e.stopPropagation()}>
            <span className="hv2-done-tick"><Check size={44} strokeWidth={3} /></span>
            <h2 id="hv2-done-title">Day done!</h2>
            <p>{progress.total} of {progress.total} jobs</p>
            {streak > 0 && <span className="hv2-done-streak"><Flame size={18} strokeWidth={2.2} className="hv2-flame" />{streak} day streak</span>}
            <button type="button" className="hv2-done-ok" onClick={dismissDone}>Nice</button>
          </section>
        </div>,
        document.body,
      )}

      {walk && createPortal(<WalkOverlay tasks={tasks} data={data} setData={setData} onClose={() => setWalk(false)} />, document.body)}
    </div>
  );
}
