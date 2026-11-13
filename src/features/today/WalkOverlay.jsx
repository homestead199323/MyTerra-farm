import { useEffect, useRef, useState } from "react";
import { X, Check, Camera, CloudOff, MapPin, TriangleAlert, NotebookPen, Minus, Plus, List, Map as MapIcon } from "lucide-react";
import { uid, flushFarm } from "../../lib/storage";
import { todayLocalKey, appendLog } from "../../lib/utils";
import { rCM } from "../../lib/regional";
import { planRound } from "../quiet/walk-model";
import { applyTaskCompletion } from "../quiet/complete-task";
import GroveScene from "../grove/GroveScene";
import { taskAction, taskGlyph } from "../grove/zone-tasks";
import "../grove/zone-tasks.css";
import "./walk-popup.css";
import PlantArt from "../quiet/PlantArt";
import AnimalArt from "../quiet/AnimalArt";
import { zoneIcon } from "../quiet/toy-art";
import { growthOf, animalZone } from "../quiet/farm-model";

const PLANT_TYPES = ["veg", "herbs", "orchard", "greenhouse", "raised", "container"];
const ROUTINE = new Set(["feed", "water", "eggs", "milk", "clean", "bedding", "paddock", "health", "hoof", "hive"]);
const VIEW_KEY = "mt_walk_view";
function savedView() {
  try {
    return localStorage.getItem(VIEW_KEY) === "map" ? "map" : "list";
  } catch {
    return "list";
  }
}
function daysAgo(iso) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}
/** The stop you are standing at: its jobs, and a note, photo or problem flag if there is something to record. */
function WalkStop({ stop, session, data, setData, onAdvance, last }) {
  const draft = session.draft || {},
    [error, setError] = useState(""),
    [photoBusy, setPhotoBusy] = useState(false);
  const zone = data.zones.find((z) => z.id === stop.zoneId),
    plant = PLANT_TYPES.includes(stop.type);
  const cropMap = rCM(data.region),
    plots = data.garden.plots.filter((p) => stop.plotIds.includes(p.id));
  const heroPlot =
    (stop.plotId && plots.find((p) => p.id === stop.plotId)) || (plots.length === 1 ? plots[0] : null);
  const crop = heroPlot ? cropMap.get(heroPlot.crop) : null;
  const animal = data.livestock.animals.find((a) => animalZone(a, data.zones)?.id === stop.zoneId);
  const [showNote, setShowNote] = useState(!!draft.note || draft.status === "issue");
  const stage = heroPlot ? growthOf(heroPlot, crop, todayLocalKey()) : null;
  const previous = (data.observations || [])
    .filter((e) => (stop.plotId ? e.plotId === stop.plotId : e.zoneId === stop.zoneId && !e.plotId))
    .at(-1);
  const latest = useRef({ data, session }),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    latest.current = { data, session };
  }, [data, session]);
  const update = (patch) => setData({ ...data, walkSession: { ...session, draft: { ...draft, ...patch } } });
  async function photo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    setPhotoBusy(true);
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas"),
        scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const photo = canvas.toDataURL("image/jpeg", 0.65);
      if (JSON.stringify(latest.current.data).length + photo.length > 1800000) {
        setError("Photo storage is full. Export a backup in Settings, then remove older photos.");
        return;
      }
      const current = latest.current;
      if (mounted.current && current.session.id === session.id && current.session.index === session.index)
        setData({
          ...current.data,
          walkSession: { ...current.session, draft: { ...current.session.draft, photo } },
        });
    } catch {
      setError("This photo could not be read. Try a JPEG or PNG image.");
    } finally {
      setPhotoBusy(false);
    }
  }
  const amountTypes = ["harvest", "eggs", "milk"];
  // Nothing starts ticked: a job is only recorded when you tick it (review 2026-11-12).
  // Routine care (feed, water, collect, clean…) can be ticked in one go with "Mark all done".
  const doneToday = data.completions?.[todayLocalKey()] || [];
  const routineOpen = stop.tasks.filter((t) => ROUTINE.has(t.type) && !doneToday.includes(t.key) && !taskAction(t, data).open);
  const checked = draft.checked ?? [];
  const amountOf = (t) => {
    if (draft.amounts?.[t.key] != null) return draft.amounts[t.key];
    const a = amountTypes.includes(t.type) && taskAction(t, data).amount;
    return a ? String(a.value) : "";
  };
  function toggle(t) {
    const on = !checked.includes(t.key);
    const amount = taskAction(t, data).amount;
    update({
      checked: on ? [...checked, t.key] : checked.filter((k) => k !== t.key),
      amounts:
        on && amount && draft.amounts?.[t.key] == null
          ? { ...draft.amounts, [t.key]: String(amount.value) }
          : draft.amounts,
    });
  }
  function markAll() {
    const amounts = { ...draft.amounts };
    routineOpen.forEach((t) => {
      const amount = taskAction(t, data).amount;
      if (amount && amounts[t.key] == null) amounts[t.key] = String(amount.value);
    });
    update({ checked: [...new Set([...checked, ...routineOpen.map((t) => t.key)])], amounts });
  }
  function nudge(t, dir) {
    const step = taskAction(t, data).amount?.step || 1;
    const n = Math.max(0, Math.round(((Number(amountOf(t)) || 0) + dir * step) * 10) / 10);
    update({ amounts: { ...draft.amounts, [t.key]: String(n) } });
  }
  function finish() {
    const invalid = stop.tasks.find(
      (t) =>
        checked.includes(t.key) &&
        amountTypes.includes(t.type) &&
        (!Number.isFinite(+amountOf(t)) || +amountOf(t) <= 0 || (t.type === "eggs" && !Number.isInteger(+amountOf(t)))),
    );
    if (invalid) {
      setError("Enter the amount for each ticked job, or untick it.");
      return;
    }
    const amounts = {};
    stop.tasks.forEach((t) => {
      if (checked.includes(t.key) && amountTypes.includes(t.type)) amounts[t.key] = amountOf(t);
    });
    onAdvance(true, draft.status || "healthy", { checked, amounts });
  }
  const title = heroPlot ? heroPlot.name || heroPlot.crop : stop.label;
  const where = stop.sub ? stop.sub.split(" · ")[0] : zone && zone.name !== title ? zone.name : "";
  const issue = draft.status === "issue";
  return (
    <>
      <div className="q-walk-card">
        <div className="q-walk-stop-head">
          {/* Only show art for what is really there: the crop, the animals, or the building. An empty bed gets none. */}
          {(heroPlot || animal || (!plant && zoneIcon(stop.type))) && (
            <div className="q-walk-stop-art">
              {heroPlot ? (
                <PlantArt crop={heroPlot.crop} stage={stage.index} size={48} />
              ) : animal ? (
                <AnimalArt species={animal.type} size={48} />
              ) : (
                <img src={zoneIcon(stop.type)} alt="" />
              )}
            </div>
          )}
          <div className="q-grow">
            <h2>{title}</h2>
            {(where || stage) && (
              <p className="q-walk-where">
                {where && (
                  <>
                    <MapPin size={13} /> {where}
                  </>
                )}
                {where && stage ? " · " : ""}
                {stage ? stage.label : ""}
              </p>
            )}
          </div>
        </div>
        {previous && (previous.status === "issue" || previous.note) && (
          <p className="q-walk-last">
            {daysAgo(previous.at)}: {previous.status === "issue" ? "needed attention" : "note"}
            {previous.note ? ` — “${previous.note.slice(0, 120)}”` : ""}
          </p>
        )}
        {stop.tasks.length > 0 && (
          <ul className="q-tp-list q-walk-jobs">
            {stop.tasks.map((t, i) => {
              const done = doneToday.includes(t.key),
                on = checked.includes(t.key) || done,
                action = taskAction(t, data),
                amount = amountTypes.includes(t.type) && action.amount;
              return (
                <li key={t.key} className={`q-tp-task${on ? " is-done" : ""}`} style={{ "--i": i }}>
                  <span className="q-tp-icon">
                    {t.speciesType ? (
                      <AnimalArt species={t.speciesType} size={44} />
                    ) : t.cropName || t.plotId ? (
                      <PlantArt
                        crop={t.cropName || data.garden.plots.find((p) => p.id === t.plotId)?.crop}
                        stage={t.type === "harvest" ? 5 : 3}
                        size={44}
                      />
                    ) : (
                      <span className="q-tp-emoji">{taskGlyph(t)}</span>
                    )}
                    <span className="q-tp-sticker" aria-hidden="true">
                      {on ? "✓" : taskGlyph(t)}
                    </span>
                  </span>
                  <div className="q-tp-body">
                    <strong>{t.title}</strong>
                    {!on && t.desc && <small>{t.desc}</small>}
                    {amount && checked.includes(t.key) && !done && (
                      <div className="q-tp-amount">
                        <button type="button" aria-label={`Less ${amount.unit}`} onClick={() => nudge(t, -1)}>
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step={amount.step}
                          value={amountOf(t)}
                          aria-label={`Amount in ${amount.unit}`}
                          onChange={(e) => update({ amounts: { ...draft.amounts, [t.key]: e.target.value } })}
                        />
                        <span>{amount.unit}</span>
                        <button type="button" aria-label={`More ${amount.unit}`} onClick={() => nudge(t, 1)}>
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {done ? (
                    <span className="q-tp-reward">
                      <Check size={15} />
                      Done
                    </span>
                  ) : on ? (
                    <button
                      type="button"
                      className="q-tp-undo"
                      aria-label={`Untick ${t.title}`}
                      onClick={() => toggle(t)}
                    >
                      <Check size={20} />
                    </button>
                  ) : (
                    <button type="button" className="q-tp-go" onClick={() => toggle(t)}>
                      {action.open ? "Done" : action.verb}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {routineOpen.length > 1 && routineOpen.some((t) => !checked.includes(t.key)) && (
          <button type="button" className="q-text-button q-walk-markall" onClick={markAll}>
            <Check size={15} /> Mark {routineOpen.every((t) => !checked.includes(t.key)) ? (routineOpen.length === 2 ? "both" : `all ${routineOpen.length}`) : "the rest"} done
          </button>
        )}
        <div className="q-walk-quick">
          <button type="button" className="q-secondary" onClick={() => setShowNote(!showNote)} aria-expanded={showNote}>
            <NotebookPen size={16} /> Note
          </button>
          <label className="q-secondary q-photo-button">
            <Camera size={16} />
            {photoBusy ? "…" : "Photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={photo}
              disabled={photoBusy}
              aria-label="Add a photo"
            />
          </label>
          <button
            type="button"
            className="q-secondary q-walk-issue"
            aria-pressed={issue}
            onClick={() => {
              update({ status: issue ? "healthy" : "issue" });
              if (!issue) setShowNote(true);
            }}
          >
            <TriangleAlert size={16} /> Problem
          </button>
        </div>
        {showNote && (
          <label className="q-note-field">
            <span className="q-visually-hidden">Note</span>
            <textarea
              value={draft.note || ""}
              maxLength={2000}
              placeholder={issue ? "What is wrong?" : "Note"}
              onChange={(e) => update({ note: e.target.value })}
            />
          </label>
        )}
        {draft.photo && (
          <div className="q-walk-photo">
            <img className="q-photo-preview" src={draft.photo} alt="Photo to save" />
            <button type="button" className="q-text-button" onClick={() => update({ photo: null })}>
              Remove
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="q-warning">
            {error}
          </p>
        )}
      </div>
      <div className="q-walk-footer">
        <button className="q-secondary" disabled={photoBusy} onClick={() => onAdvance(false)}>
          Skip
        </button>
        <button className="q-button" disabled={photoBusy} onClick={finish}>
          <Check size={17} /> {last ? "Done · finish" : "Done · next"}
        </button>
      </div>
    </>
  );
}
export default function WalkOverlay({ tasks, data, setData, onClose }) {
  const [view, setView] = useState(savedView),
    [online, setOnline] = useState(navigator.onLine);
  const [saveStatus, setSaveStatus] = useState("saved");
  const dialog = useRef(null),
    shell = useRef(null),
    close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  const lock = useRef(false),
    session = data.walkSession,
    active = session?.status === "active",
    finished = session?.status === "complete";
  const stop = active ? session.stops[session.index] : null;
  const quickStops = planRound(tasks, data, "quick", ""),
    fullStops = planRound(tasks, data, "full", "");
  function begin(mode) {
    const stops = mode === "quick" ? quickStops : fullStops;
    if (!stops.length) return;
    setData({
      ...data,
      walkSession: {
        id: uid(),
        status: "active",
        date: todayLocalKey(),
        startedAt: new Date().toISOString(),
        mode,
        place: "outside",
        stops,
        index: 0,
        draft: {},
        visited: [],
        deferred: [],
      },
    });
  }
  // No start screen: opening the walk is starting it. Today's jobs when there are some, otherwise every area.
  const began = useRef(false);
  useEffect(() => {
    if (began.current) return;
    began.current = true;
    if (!session || (finished && session.date !== todayLocalKey())) begin(quickStops.length ? "quick" : "full");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const update = () => setOnline(navigator.onLine);
    const saved = (e) => setSaveStatus(e.detail);
    window.addEventListener("farm-save-status", saved);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      flushFarm();
      window.removeEventListener("farm-save-status", saved);
      document.body.style.overflow = prev;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    const previous = document.activeElement,
      root = dialog.current;
    root.querySelector("button")?.focus({ preventScroll: true });
    function keydown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [
        ...root.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length);
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        e.preventDefault();
        first?.focus();
      }
    }
    root.addEventListener("keydown", keydown);
    return () => {
      root.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  // keep the stop you are on in view: the list scrolls to it, the map view starts at the top
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const current = view === "list" ? el.querySelector(".q-walk-row.is-current") : null;
    if (current && session?.index > 0) el.scrollTo({ top: Math.max(0, current.offsetTop - 96), behavior: "smooth" });
    else el.scrollTo({ top: 0 });
  }, [session?.index, session?.status, view]);
  function chooseView(next) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* private mode: the choice lasts for this walk only */
    }
  }
  /** Go to another stop now: it swaps into the current place in the round, so the order you walk is the order you tap. */
  function jump(i) {
    if (!active || i === session.index) return;
    const stops = [...session.stops],
      [picked] = stops.splice(i, 1),
      index = i < session.index ? session.index - 1 : session.index;
    stops.splice(index, 0, picked);
    setData({
      ...data,
      walkSession: { ...session, stops, index, draft: {}, deferred: session.deferred.filter((id) => id !== picked.id) },
    });
  }
  function advance(save, status, override) {
    if (lock.current || !stop) return;
    lock.current = true;
    let next = data;
    let recorded = 0;
    const draft = { ...(session.draft || {}), ...(override || {}), status: status || session.draft?.status };
    if (save) {
      const selected = stop.tasks.filter((t) => (draft.checked || []).includes(t.key));
      recorded = selected.length;
      selected.forEach((t) => {
        next = applyTaskCompletion(next, t, draft.amounts?.[t.key]);
      });
      const entry = {
        id: uid(),
        walkId: session.id,
        at: new Date().toISOString(),
        zoneId: stop.zoneId,
        plotId: stop.plotId || null,
        plotIds: stop.plotIds,
        status: draft.status,
        note: draft.note || "",
        photo: draft.photo || null,
        tasks: selected.map((t) => t.key),
      };
      next = {
        ...next,
        observations: [...(next.observations || []), entry],
        log: appendLog(next.log, {
          text: `Walk: ${stop.label}${stop.plotId && stop.sub ? ` (${stop.sub.split(" · ")[0]})` : ""} — ${draft.status === "issue" ? "needs attention" : draft.status === "healthy" ? "looking good" : "checked"}${draft.note ? ": " + draft.note : ""}`,
          zoneId: stop.zoneId,
          plotId: stop.plotId || undefined,
          plotIds: stop.plotIds,
        }),
      };
    }
    const end = session.index + 1 >= session.stops.length;
    // Never write into the live state object (next === data on Skip): copy first.
    next = { ...next };
    next.walkSession = {
      ...session,
      index: session.index + 1,
      status: end ? "complete" : "active",
      draft: {},
      visited: save ? [...session.visited, stop.id] : session.visited,
      jobs: (session.jobs || 0) + recorded,
      deferred: save ? session.deferred : [...session.deferred, stop.id],
      finishedAt: end ? new Date().toISOString() : null,
    };
    setData(next);
    setTimeout(() => {
      lock.current = false;
    }, 300);
  }
  const total = session?.stops?.length || 0,
    nextStop = active ? session.stops[session.index + 1] : null;
  const other = active && session.mode === "quick" ? "full" : "quick",
    otherCount = other === "full" ? fullStops.length : quickStops.length;
  return (
    <div
      ref={dialog}
      className="q-walk q-walk-pop"
      onClick={(e) => { if (e.target === e.currentTarget) close.current(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Morning walk"
    >
      <div className={`q-walk-shell q-walk-${view}`} ref={shell}>
        <div className="q-walk-top">
          <header className="q-walk-header">
            <div className="q-grow">
              <h1>Morning walk</h1>
              <div className="q-walk-sub">
                {active && stop && (
                  <strong>
                    {session.index + 1} of {total}
                  </strong>
                )}
                {!online && (
                  <span>
                    <CloudOff size={13} /> Offline
                  </span>
                )}
              </div>
            </div>
            {active && stop && (
              <div className="q-walk-view" role="group" aria-label="View">
                <button type="button" aria-pressed={view === "list"} onClick={() => chooseView("list")}>
                  <List size={16} /> List
                </button>
                <button type="button" aria-pressed={view === "map"} onClick={() => chooseView("map")}>
                  <MapIcon size={16} /> Map
                </button>
              </div>
            )}
            <button className="q-icon" aria-label="Close walk" onClick={onClose}>
              <X size={20} />
            </button>
          </header>
          {active && stop && (
            <div className="q-walk-progress">
              <span style={{ width: `${(session.index / total) * 100}%` }} />
            </div>
          )}
        </div>
        {saveStatus === "error" && (
          <p role="alert" className="q-warning">
            Storage is full. Export a backup from Settings before closing the app.
          </p>
        )}
        {active && stop ? (
          view === "map" ? (
            <>
              <div className="q-walk-map-live">
                <GroveScene
                  data={data}
                  interactive={false}
                  showEditButton={false}
                  showHelperText={false}
                  noBorder
                  activeZoneId={stop.zoneId}
                  guideZoneId={stop.zoneId}
                />
                {nextStop && <span className="q-walk-next">Next: {nextStop.label}</span>}
              </div>
              <WalkStop
                key={`${session.id}-${stop.id}`}
                stop={stop}
                session={session}
                data={data}
                setData={setData}
                onAdvance={advance}
                last={!nextStop}
              />
            </>
          ) : (
            <>
              <ol className="q-walk-list">
                {session.stops.map(function (s, i) {
                  if (i === session.index)
                    return (
                      <li key={s.id} className="q-walk-row is-current">
                        <WalkStop
                          key={`${session.id}-${s.id}`}
                          stop={s}
                          session={session}
                          data={data}
                          setData={setData}
                          onAdvance={advance}
                          last={!nextStop}
                        />
                      </li>
                    );
                  const past = i < session.index,
                    done = past && session.visited.includes(s.id),
                    zoneName = s.sub ? s.sub.split(" · ")[0] : "",
                    jobs = s.tasks.length;
                  return (
                    <li key={s.id} className={`q-walk-row${done ? " is-done" : past ? " is-skipped" : ""}`}>
                      <button type="button" disabled={done} onClick={function () { jump(i); }}>
                        <span className="q-walk-dot">{done ? <Check size={14} /> : i + 1}</span>
                        <span className="q-walk-row-name">
                          <strong>{s.label}</strong>
                          {zoneName && zoneName !== s.label && <small>{zoneName}</small>}
                        </span>
                        <span className="q-walk-row-meta">
                          {done ? "Done" : past ? "Skipped" : jobs ? `${jobs} job${jobs === 1 ? "" : "s"}` : "Check"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {otherCount > 0 && otherCount !== total && (
                <button type="button" className="q-text-button q-walk-other" onClick={() => begin(other)}>
                  {other === "full" ? `Check every area (${otherCount})` : `Only today’s jobs (${otherCount})`}
                </button>
              )}
            </>
          )
        ) : finished ? (
          <div className="q-walk-card q-walk-end">
            <span className="q-walk-end-tick">
              <Check size={26} />
            </span>
            <h2>Walk done</h2>
            <p>
              {(session.jobs || 0) === 1 ? "1 job" : `${session.jobs || 0} jobs`} recorded in {session.visited.length === 1 ? "1 area" : `${session.visited.length} areas`}
              {session.deferred.length ? ` · ${session.deferred.length} skipped` : ""}
            </p>
            <button
              className="q-button"
              onClick={() => {
                setData({ ...data, walkSession: null });
                onClose();
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <div className="q-walk-card q-walk-end">
            <p>{fullStops.length ? "Starting…" : "Add an area to your map first."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
