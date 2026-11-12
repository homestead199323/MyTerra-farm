import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sun, Flame, ListChecks, ChevronRight, ArrowRight, Check, Sprout } from "lucide-react";
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
import "./home-v2.css";

/* The map-first home (spec: docs/superpowers/specs/2026-11-12-map-first-home-design.md).
   The 3D map is the screen; three controls float on it: weather + streak, the jobs chip, and the
   dock (GameDock, rendered by App). Area markers and their job popup come from GroveScene. */

const DAY_KEY = "mt_day", DONE_KEY = "mt_day_done";
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

function Bar({ done, total }) {
  return <span className="hv2-bar" aria-hidden="true"><i style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} /></span>;
}

export default function HomeV2({ data, setData, setPage, tasks, forecast, forecastState, alerts, demo, onDemoSignup }) {
  const [walk, setWalk] = useState(false), [weather, setWeather] = useState(null), [taskZone, setTaskZone] = useState(null);
  const [panel, setPanel] = useState(false), [week, setWeek] = useState(false);
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

  const [shown, setShown] = useState(() => stored(DONE_KEY));
  const celebrate = showDayDone(progress, shown, today) && !taskZone && !walk && !panel;
  const dismissDone = () => { setShown(today); store(DONE_KEY, today); };

  const firstBed = (data.zones || []).find((z) => isPlantZone(z.type));
  const fresh = !!firstBed && !(data.garden?.plots || []).length && !(data.livestock?.animals || []).length && !(data.nursery?.batches || []).length;
  const streak = data.gamify?.streak || 0;

  useEffect(() => {
    if (!panel) return undefined;
    const key = (e) => { if (e.key === "Escape") setPanel(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [panel]);

  function openJob(task) {
    const zone = Object.keys(markers).find((id) => markers[id].some((x) => x.key === task.key));
    setPanel(false);
    if (zone) setTaskZone(zone);
    else setPage("tasks");
  }

  return (
    <div className="hv2">
      <GroveScene home data={data} setData={setData} weather={weather} tasksByZone={markers} onOpenTasks={() => setPage("tasks")} taskZoneId={taskZone} onTaskZone={setTaskZone}
        showEditButton={false} showHelperText={false} noBorder onPlantInZone={(zone) => setPage("crops", { zone })} onShowCrops={() => setPage("crops")}
        onEditLayout={() => setPage("map", { edit: true })} onStartGuide={() => setData({ ...data, setupDone: false })} />

      <div className="hv2-hud">
        <button type="button" className="hv2-cap" aria-label={`${weather?.ok ? `${weather.temp} degrees. ` : ""}${streak} day streak. Open this week's weather`} onClick={() => setWeek(true)}>
          <span className="hv2-sun"><Sun size={17} strokeWidth={2.2} /></span>
          <b>{weather?.ok ? `${weather.temp}°` : new Date().toLocaleDateString(undefined, { weekday: "short" })}</b>
          <i aria-hidden="true" />
          <Flame size={18} strokeWidth={2.2} className="hv2-flame" />
          <b>{streak}</b>
        </button>
        <button type="button" className="hv2-chip" aria-haspopup="dialog" aria-expanded={panel} aria-label={`Today's jobs: ${progress.done} of ${progress.total} done`} onClick={() => setPanel(true)}>
          <span className="hv2-ico"><ListChecks size={17} strokeWidth={2.2} /></span>
          <span className="hv2-chip-text"><b>{progress.done}/{progress.total}</b><Bar done={progress.done} total={progress.total} /></span>
        </button>
      </div>

      {demo && onDemoSignup && <button type="button" className="hv2-demo" onClick={onDemoSignup}>Demo farm · Keep it free <ArrowRight size={14} /></button>}

      {fresh && due.length === 0 && (
        <button type="button" className="hv2-first" onClick={() => setPage("crops", { zone: firstBed.id })}><Sprout size={18} />Plant your first crop<ArrowRight size={16} /></button>
      )}

      {panel && createPortal(
        <div className="hv2-scrim" onClick={function (e) { if (e.target === e.currentTarget) setPanel(false); }}>
          <section className="hv2-panel" role="dialog" aria-modal="true" aria-label="Today's jobs">
            <header className="hv2-panel-head">
              <span className="hv2-ico"><ListChecks size={17} strokeWidth={2.2} /></span>
              <h2>Today’s jobs</h2>
              <b>{progress.done}/{progress.total}</b>
              {due.length > 0 && <button type="button" className="hv2-walk" onClick={() => { setPanel(false); setWalk(true); }}>{data.walkSession?.status === "active" ? "Resume walk" : "Start walk"}</button>}
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
              <button type="button" onClick={() => { setPanel(false); setPage("tasks"); }}>All tasks <ArrowRight size={15} /></button>
            </footer>
          </section>
        </div>,
        document.body,
      )}

      {week && (
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
