import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, Check, ArrowRight, MapPin, Star, Flame, Footprints } from "lucide-react";
import { applyTaskCompletion } from "../quiet/complete-task";
import { animalZone, growthOf } from "../quiet/farm-model";
import { zoneIcon } from "../quiet/toy-art";
import PlantArt from "../quiet/PlantArt";
import AnimalArt from "../quiet/AnimalArt";
import { TaskTile } from "../grove/ZoneTaskPopup";
import { buzz } from "../grove/zone-tasks";
import { setCover } from "../grove/cover";
import { rCM } from "../../lib/regional";
import { todayLocalKey } from "../../lib/utils";
import { openJobs, tickJob, nextStop, jumpTo, minutesTaken, plantAreas, placePlot, JOB_POINTS, CLEAR_BONUS } from "./check-model";
import "../grove/zone-tasks.css";
import "./farm-check.css";

/* The daily farm check, played on the home map (spec: user ask 2026-11-13).
   round: every area with jobs today, in walking order — the camera glides to each stop, the jobs are
   ticked there, a cleared stop earns a bonus and the check moves on by itself.
   visit: one stop, opened from a job in the list — the camera goes to that job's area. */

const BURST = Array.from({ length: 18 }, (_, i) => ({
  angle: (i / 18) * 360 + (i % 2 ? 7 : -5),
  dist: 90 + (i % 3) * 30,
  hue: ["#f2c230", "#128147", "#2563c9", "#e0714f"][i % 4],
}));

function StopArt({ stop, data }) {
  const plot = stop.plotId && (data.garden?.plots || []).find((p) => p.id === stop.plotId);
  if (plot) {
    const stage = growthOf(plot, rCM(data.region).get(plot.crop), todayLocalKey());
    return <PlantArt crop={plot.crop} stage={stage ? stage.index : 3} size={52} />;
  }
  const animal = stop.zoneId && (data.livestock?.animals || []).find((a) => animalZone(a, data.zones || [])?.id === stop.zoneId);
  if (animal) return <AnimalArt species={animal.type} size={52} />;
  const icon = zoneIcon(stop.type);
  return icon ? <img src={icon} alt="" /> : <MapPin size={26} />;
}

/** "Tomato isn't on your map": pick the bed it grows in, and the camera goes there. */
function PlaceIt({ stop, data, onPlace }) {
  const plots = (data.garden?.plots || []).filter((p) => (stop.plotIds || []).includes(p.id) && !(data.zones || []).some((z) => z.id === p.zone));
  const areas = plantAreas(data);
  if (!plots.length || !areas.length) return null;
  return (
    <div className="fc-place">
      {plots.map(function (p) {
        return (
          <div key={p.id} className="fc-place-row">
            <p><strong>{p.name || p.crop}</strong> isn’t on your map. Where is it growing?</p>
            <div className="fc-chips">
              {areas.map(function (z) {
                return <button type="button" key={z.id} className="fc-chip" onClick={function () { onPlace(p.id, z.id); }}>{z.name}</button>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FarmCheck({ mode = "round", session, data, engine, wide, streak = 0, commit, onExit, onAllTasks, onOpenStop }) {
  const card = useRef(null), dataRef = useRef(data), sessionRef = useRef(session), timer = useRef(null);
  const [moving, setMoving] = useState(false), [bump, setBump] = useState(0);
  useEffect(() => { dataRef.current = data; sessionRef.current = session; }, [data, session]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const round = mode === "round", finished = session.status === "complete";
  const stop = finished ? null : session.stops[session.index];
  const today = todayLocalKey(), doneToday = (data.completions && data.completions[today]) || [];
  const ticked = session.ticked || {};
  const left = stop ? openJobs(stop, session, doneToday) : [];
  const cleared = !!stop && stop.tasks.length > 0 && left.length === 0;

  // The map frames the stop in the part of the screen the card leaves free.
  useLayoutEffect(() => {
    const el = card.current; if (!el) return undefined;
    let last = "";
    const report = () => {
      const r = el.getBoundingClientRect(), w = window.innerWidth, h = window.innerHeight;
      const next = wide ? { left: Math.max(0, r.left - 12), right: w, top: 0, bottom: h } : { left: 0, right: w, top: Math.max(0, r.top - 8), bottom: h };
      const key = Math.round(next.left / 24) + ":" + Math.round(next.top / 24);
      if (key !== last) { last = key; setCover(next); }
    };
    report();
    const ro = new ResizeObserver(report); ro.observe(el);
    window.addEventListener("resize", report);
    return () => { ro.disconnect(); window.removeEventListener("resize", report); setCover(null); };
  }, [wide]);

  // Walk there: the camera glides to the stop (slower between stops in a round, so you follow where it goes).
  const where = stop ? stop.zoneId : null;
  useEffect(() => {
    if (!engine) return undefined;
    if (finished) { engine.showAll?.(); return undefined; }
    if (!where) { engine.showAll?.(); return undefined; }
    const ms = round && session.index > 0 ? 1700 : 1000;
    engine.focusZone?.(where, ms);
    setMoving(true);
    const t = setTimeout(() => setMoving(false), ms);
    return () => clearTimeout(t);
  }, [engine, where, stop && stop.id, finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back to the whole farm when the check closes.
  useEffect(() => () => { engine?.showAll?.(); }, [engine]);

  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onExit(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onExit]);

  function save(nextData, nextSession) {
    sessionRef.current = nextSession;
    dataRef.current = commit(nextData, nextSession);
  }
  function complete(task, reward, value, meta) {
    const nextData = applyTaskCompletion(dataRef.current, task, value, meta);
    save(nextData, tickJob(sessionRef.current, task, reward));
    setBump((b) => b + 1);
    buzz(left.length === 1 ? [18, 40, 28] : 14);
  }
  function advance(skip) {
    clearTimeout(timer.current);
    const s = sessionRef.current, here = s.stops[s.index]; if (!here) return;
    const all = here.tasks.length > 0 && here.tasks.every((t) => (s.ticked || {})[t.key]);
    save(dataRef.current, nextStop(s, { cleared: !skip && all, nowIso: new Date().toISOString() }));
  }
  function place(plotId, zoneId) {
    const zone = (dataRef.current.zones || []).find((z) => z.id === zoneId);
    const s = sessionRef.current, stops = [...s.stops], here = stops[s.index];
    stops[s.index] = { ...here, zoneId: here.zoneId || zoneId, type: here.zoneId ? here.type : zone?.type || here.type, sub: here.zoneId ? here.sub : zone?.name || "" };
    save(placePlot(dataRef.current, plotId, zoneId), { ...s, stops });
  }

  // A cleared stop: a moment to enjoy it, then on to the next one (a visit closes).
  useEffect(() => {
    if (!cleared) return undefined;
    timer.current = setTimeout(() => { if (round) advance(false); else onExit(); }, round ? 1300 : 1500);
    return () => clearTimeout(timer.current);
  }, [cleared, stop && stop.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = session.stops.length;
  const upcoming = round && !finished ? session.stops[session.index + 1] : null;
  const allBonus = cleared && stop.tasks.every((t) => ticked[t.key]);

  if (finished) {
    const mins = minutesTaken(session.startedAt, session.finishedAt);
    return (
      <section ref={card} className={`fc fc-end${wide ? " is-wide" : ""}`} role="dialog" aria-label="Farm check done">
        <span className="fc-burst" aria-hidden="true">{BURST.map((b, i) => <i key={i} style={{ "--a": `${b.angle}deg`, "--d": `${b.dist}px`, background: b.hue }} />)}</span>
        <span className="fc-end-tick"><Check size={38} strokeWidth={3} /></span>
        <h2>Farm check done!</h2>
        <div className="fc-stats">
          <div><b>{session.jobs || 0}</b><small>jobs</small></div>
          <div><b>{session.visited.length}</b><small>{session.visited.length === 1 ? "stop" : "stops"}</small></div>
          <div><b>{session.points || 0}</b><small>points</small></div>
          {mins && <div><b>{mins}</b><small>min</small></div>}
        </div>
        {session.deferred.length > 0 && <p className="fc-skipped">{session.deferred.length} skipped</p>}
        {streak > 0 && <span className="fc-streak"><Flame size={17} strokeWidth={2.2} />{streak} day streak</span>}
        <button type="button" className="fc-go" onClick={onExit}>Nice</button>
      </section>
    );
  }
  if (!stop) return null;

  return (
    <section ref={card} className={`fc${wide ? " is-wide" : ""}${cleared ? " is-clear" : ""}`} role="dialog" aria-label={round ? "Farm check" : stop.label}>
      <header className="fc-top">
        {round ? (
          <>
            <span className="fc-ico" aria-hidden="true"><Footprints size={17} strokeWidth={2.2} /></span>
            <h2>Farm check</h2>
            <span className="fc-count">{session.index + 1}/{total}</span>
            <span key={bump} className={`fc-points${bump ? " is-bump" : ""}`} aria-label={`${session.points || 0} points`}><Star size={14} strokeWidth={2.4} />{session.points || 0}</span>
          </>
        ) : <h2 className="fc-visit-title">Jobs here</h2>}
        <button type="button" className="fc-x" aria-label={round ? "Pause farm check" : "Close"} onClick={onExit}><X size={19} /></button>
      </header>

      {round && (
        <ol className="fc-trail" aria-label="Stops">
          {session.stops.map(function (s, i) {
            const done = session.visited.includes(s.id), skipped = session.deferred.includes(s.id), here = i === session.index;
            return (
              <li key={s.id}>
                <button type="button" className={`fc-dot${here ? " is-here" : done ? " is-done" : skipped ? " is-skipped" : ""}`} disabled={done || here}
                  aria-label={`${s.label}${done ? ", done" : skipped ? ", skipped" : here ? ", you are here" : ""}`} aria-current={here ? "step" : undefined}
                  onClick={function () { save(dataRef.current, jumpTo(sessionRef.current, i)); }}>
                  {done ? <Check size={11} strokeWidth={3.2} /> : i + 1}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="fc-stop">
        <span className="fc-art" aria-hidden="true"><StopArt stop={stop} data={data} /></span>
        <div className="fc-stop-text">
          <strong>{stop.label}</strong>
          <small>
            {moving ? <span className="fc-walking"><Footprints size={12} /> Walking there…</span> : stop.zoneId ? <><MapPin size={12} />{stop.sub ? stop.sub.split(" · ")[0] : stop.label}</> : (stop.plotIds || []).length ? "Not on your map" : stop.sub}
          </small>
        </div>
      </div>

      {!stop.zoneId && <PlaceIt stop={stop} data={data} onPlace={place} />}

      <ul className="q-tp-list fc-jobs">
        {stop.tasks.map(function (t, i) {
          const done = ticked[t.key] || (doneToday.includes(t.key) ? "Done" : null);
          return <TaskTile key={t.key} task={t} data={data} index={i} done={done} onDone={complete} onOpen={function () { onOpenStop(stop); }} />;
        })}
      </ul>

      {cleared && (
        <div className="fc-clear" role="status">
          <span className="fc-burst" aria-hidden="true">{BURST.slice(0, 12).map((b, i) => <i key={i} style={{ "--a": `${b.angle}deg`, "--d": `${b.dist * 0.7}px`, background: b.hue }} />)}</span>
          <strong>{allBonus ? `🎉 ${stop.label} cleared` : `${stop.label}: all done`}</strong>
          {round && allBonus && <small>+{CLEAR_BONUS} bonus · {upcoming ? `next: ${upcoming.label}` : "last stop"}</small>}
        </div>
      )}

      <footer className="fc-foot">
        {round ? (
          <>
            <button type="button" className="fc-skip" onClick={() => advance(true)}>Skip</button>
            <button type="button" className="fc-go" onClick={() => advance(false)}>
              {upcoming ? <>Next: {upcoming.label}<ArrowRight size={16} /></> : <>Finish<Check size={16} /></>}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="fc-skip" onClick={onAllTasks}>All tasks</button>
            <button type="button" className="fc-go" onClick={onExit}>Close</button>
          </>
        )}
      </footer>
      {round && !cleared && left.length > 0 && <p className="fc-hint">+{JOB_POINTS} a job · +{CLEAR_BONUS} to clear it</p>}
    </section>
  );
}
