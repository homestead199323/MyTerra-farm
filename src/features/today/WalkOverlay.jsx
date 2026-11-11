import { useEffect, useRef, useState } from "react";
import {
  X,
  Footprints,
  Check,
  Camera,
  CloudOff,
  Sun,
  MapPin,
  Leaf,
  TriangleAlert,
  NotebookPen,
  Minus,
  Plus,
} from "lucide-react";
import { uid, flushFarm } from "../../lib/storage";
import { todayLocalKey, appendLog } from "../../lib/utils";
import { rCM } from "../../lib/regional";
import { planRound, roundMinutes } from "../quiet/walk-model";
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
function daysAgo(iso) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}
function WalkStop({ stop, session, data, setData, onAdvance }) {
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
        setError(
          "This device’s photo journal is nearly full. Export a backup in Settings, then remove older photos from a crop’s field journal to make space. Your text notes can still be saved.",
        );
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
  // Routine care you do on every walk (feed, water, collect, clean…) starts ticked: finishing the
  // stop completes it. Harvests, care steps and seedling moves change your records, so they stay a tap.
  const doneToday = data.completions?.[todayLocalKey()] || [];
  const defaultChecked = stop.tasks
    .filter((t) => ROUTINE.has(t.type) && !doneToday.includes(t.key) && !taskAction(t, data).open)
    .map((t) => t.key);
  const checked = draft.checked ?? defaultChecked;
  const amountOf = (t) => {
    if (draft.amounts?.[t.key] != null) return draft.amounts[t.key];
    const a = amountTypes.includes(t.type) && taskAction(t, data).amount;
    return a ? String(a.value) : "";
  };
  const pending = checked.filter((k) => !doneToday.includes(k) && stop.tasks.some((t) => t.key === k)).length;
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
      setError("Enter how much you collected for each ticked job, or untick it if you got nothing.");
      return;
    }
    const amounts = {};
    stop.tasks.forEach((t) => {
      if (checked.includes(t.key) && amountTypes.includes(t.type)) amounts[t.key] = amountOf(t);
    });
    onAdvance(true, draft.status || "healthy", { checked, amounts });
  }
  const title = heroPlot ? heroPlot.name || heroPlot.crop : stop.label;
  const today = data.completions?.[todayLocalKey()] || [];
  return (
    <>
      <div className="q-walk-card">
        <div className="q-walk-stop-head">
          {/* Only show art for what is really there: the crop, the animals, or the building. An empty bed gets none. */}
          {(heroPlot || animal || (!plant && zoneIcon(stop.type))) && (
            <div className="q-walk-stop-art">
              {heroPlot ? (
                <PlantArt crop={heroPlot.crop} stage={stage.index} size={60} />
              ) : animal ? (
                <AnimalArt species={animal.type} size={60} />
              ) : (
                <img src={zoneIcon(stop.type)} alt="" />
              )}
            </div>
          )}
          <div className="q-grow">
            <h2>{title}</h2>
            {(stop.sub || (zone && zone.name !== title)) && (
              <p className="q-walk-where">
                <MapPin size={13} /> {stop.sub || zone.name}
              </p>
            )}
            {stage && (
              <span className="q-walk-stage">
                {stage.label}
                {stage.estimated ? " · estimate" : ""}
              </span>
            )}
          </div>
        </div>
        {previous && (
          <p className="q-walk-last">
            Last check {daysAgo(previous.at)}:{" "}
            {previous.status === "issue"
              ? "needed attention"
              : previous.status === "healthy"
                ? "looked good"
                : "checked"}
            {previous.note ? ` — “${previous.note.slice(0, 120)}”` : ""}
          </p>
        )}
        {stop.tasks.length > 0 && (
          <ul className="q-tp-list q-walk-jobs">
            {stop.tasks.map((t, i) => {
              const done = today.includes(t.key),
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
                    {t.otherZones?.length > 0 && !on && (
                      <small className="q-tp-final">Also covers {t.otherZones.join(", ")}.</small>
                    )}
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
        <p className="q-walk-question">How does it look?</p>
        <div className="q-walk-status" role="group" aria-label="How does it look">
          <button
            type="button"
            className="q-secondary"
            aria-pressed={draft.status !== "issue"}
            onClick={() => update({ status: "healthy" })}
          >
            <Leaf size={18} />
            <span>Looks good</span>
          </button>
          <button
            type="button"
            className="q-secondary q-walk-issue"
            aria-pressed={draft.status === "issue"}
            onClick={() => {
              update({ status: "issue" });
              setShowNote(true);
            }}
          >
            <TriangleAlert size={18} />
            <span>Needs attention</span>
          </button>
        </div>
        <div className="q-walk-capture">
          <button
            type="button"
            className="q-secondary"
            onClick={() => setShowNote(!showNote)}
            aria-expanded={showNote}
          >
            <NotebookPen size={16} /> {draft.note ? "Edit note" : "Add note"}
          </button>
          <label className="q-secondary q-photo-button">
            <Camera size={16} />
            {photoBusy ? "Preparing…" : draft.photo ? "Retake photo" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={photo}
              disabled={photoBusy}
              aria-label="Add a photo"
            />
          </label>
        </div>
        {showNote && (
          <label className="q-note-field">
            <span className="q-visually-hidden">{heroPlot ? "Note for this planting" : "Note"}</span>
            <textarea
              value={draft.note || ""}
              maxLength={2000}
              placeholder={draft.status === "issue" ? "What needs attention?" : "What did you notice?"}
              onChange={(e) => update({ note: e.target.value })}
            />
          </label>
        )}
        {draft.photo && (
          <div className="q-walk-photo">
            <img className="q-photo-preview" src={draft.photo} alt="Observation to save" />
            <button type="button" className="q-text-button" onClick={() => update({ photo: null })}>
              Remove photo
            </button>
          </div>
        )}
        <details className="q-walk-tips">
          <summary>What to look for</summary>
          <p>
            {plant
              ? "Look under the leaves, feel the soil a finger deep, and compare with your last note. Wilting, holes, spots or pests are a reason to look closer, not a diagnosis."
              : "Compare with what is normal here: access, shelter, water and behaviour. Note anything unusual."}
          </p>
          {crop && (
            <p>
              <strong>{crop.name}:</strong> {crop.waterNote || crop.waterFreq} · {crop.sun} sun
            </p>
          )}
        </details>
        {heroPlot && (
          <small className="q-walk-saves-to">
            Notes and photos are saved to this {heroPlot.crop.toLowerCase()} planting.
          </small>
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
          <Check size={17} />{" "}
          {draft.status === "issue"
            ? "Save & next"
            : pending > 0
              ? `Done ${pending} job${pending === 1 ? "" : "s"} · next`
              : "Looks good · next"}
        </button>
      </div>
    </>
  );
}
export default function WalkOverlay({ tasks, data, setData, onClose }) {
  // A quick round when something is due; otherwise the full round, so Begin is never a dead end.
  const [mode, setMode] = useState(() => (planRound(tasks, data, "quick", "").length ? "quick" : "full")),
    [place, setPlace] = useState("outside"),
    [startId, setStartId] = useState(""),
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
  const stops = planRound(tasks, data, mode, startId),
    stop = active ? session.stops[session.index] : null;
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
    root.querySelector("button")?.focus();
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
  useEffect(() => {
    shell.current?.scrollTo({ top: 0 });
  }, [session?.index, session?.status]);
  function begin() {
    setData({
      ...data,
      walkSession: {
        id: uid(),
        status: "active",
        date: todayLocalKey(),
        startedAt: new Date().toISOString(),
        mode,
        place,
        stops,
        index: 0,
        draft: {},
        visited: [],
        deferred: [],
      },
    });
  }
  function advance(save, status, override) {
    if (lock.current || !stop) return;
    lock.current = true;
    let next = data;
    const draft = { ...(session.draft || {}), ...(override || {}), status: status || session.draft?.status };
    if (save) {
      const selected = stop.tasks.filter((t) => (draft.checked || []).includes(t.key));
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
      deferred: save ? session.deferred : [...session.deferred, stop.id],
      finishedAt: end ? new Date().toISOString() : null,
    };
    setData(next);
    setTimeout(() => {
      lock.current = false;
    }, 300);
  }
  const saveLabel =
    saveStatus === "error"
      ? "Could not save on this device"
      : saveStatus === "saving"
        ? "Saving…"
        : online
          ? "Saved on this device"
          : "Offline · saved on this device";
  return (
    <div
      ref={dialog}
      className="q-walk q-walk-pop"
      onClick={(e) => { if (e.target === e.currentTarget) close.current(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Morning farm walk"
    >
      <div className="q-walk-shell" ref={shell}>
        <div className="q-walk-top">
          <header className="q-walk-header">
            <div className="q-grow">
              <h1>Morning walk</h1>
              <div className="q-walk-sub">
                {active && stop ? (
                  <>
                    <strong>
                      Stop {session.index + 1} of {session.stops.length}
                    </strong>
                    {session.stops[session.index + 1] && (
                      <span>· Next: {session.stops[session.index + 1].label}</span>
                    )}
                  </>
                ) : (
                  <span>{active ? (session.mode === "quick" ? "Quick round" : "Full round") : "Your daily round"}</span>
                )}
                <span className={`q-walk-saved${saveStatus === "error" ? " is-error" : ""}`}>{saveLabel}</span>
                {!online && <CloudOff size={14} />}
              </div>
            </div>
            <button
              className="q-icon"
              aria-label={active ? "Pause and close walk" : "Close walk"}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </header>
          {active && stop && (
            <div className="q-walk-progress">
              <span style={{ width: `${((session.index + 1) / session.stops.length) * 100}%` }} />
            </div>
          )}
        </div>
        {saveStatus === "error" && (
          <p role="alert" className="q-warning">
            Device storage is full or unavailable. Keep this page open and export a backup from Settings
            before closing the app.
          </p>
        )}
        {active && session.date !== todayLocalKey() && (
          <p className="q-walk-resumed">
            Continuing your {session.date} round. New checks are logged for today.
          </p>
        )}
        {active && stop ? (
          <>
            <div className="q-walk-map-live">
              <GroveScene
                data={data}
                interactive={false}
                showEditButton={false}
                showHelperText={false}
                noBorder
                route={session.stops}
                focus={{
                  zoneId: stop.zoneId,
                  plotId: stop.plotId,
                  stopId: stop.id,
                  from: session.index > 0 ? session.stops[session.index - 1] : null,
                  visited: session.visited,
                }}
              />
            </div>
            <WalkStop
              key={`${session.id}-${session.index}`}
              stop={stop}
              session={session}
              data={data}
              setData={setData}
              onAdvance={advance}
            />
          </>
        ) : finished ? (
          <div className="q-walk-card q-walk-start">
            <Sun size={36} />
            <h2>A little more in tune with your farm.</h2>
            <p>
              {session.visited.length} areas checked. {session.deferred.length} left for later. Notes and
              photos are saved in each crop’s field journal.
            </p>
            <p>
              Unchecked tasks remain on your list. Growth and harvest dates are estimates; your observations
              tell the real story.
            </p>
            <button
              className="q-button"
              onClick={() => {
                setData({ ...data, walkSession: null });
                onClose();
              }}
            >
              Back to my farm
            </button>
          </div>
        ) : (
          <div className="q-walk-start">
            <h2>Start with a look around.</h2>
            <p>A guided round of your own space, with practical checks and a journal that grows with you.</p>
            <div className="q-walk-choices">
              {[
                ["quick", "Quick round", "Today’s tasks and a check at each stop."],
                ["full", "Full round", "Every area, including those with no tasks."],
              ].map(([key, title, desc]) => (
                <button
                  className="q-walk-choice"
                  key={key}
                  aria-pressed={mode === key}
                  onClick={() => setMode(key)}
                >
                  <Footprints size={25} />
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </button>
              ))}
            </div>
            <div className="q-inset">
              <p style={{ marginTop: 0 }}>
                <MapPin size={14} /> {stops.length} {stops.length === 1 ? "stop" : "stops"} · about {roundMinutes(stops, data)} min, starting at
                the {startId ? (data.zones.find((z) => z.id === startId) || {}).name || "entrance" : "entrance"}. Go at your own pace.
              </p>
              {/* Defaults are fine for a first walk (UX audit 2026-09-28); the choices wait here. */}
              <details className="q-walk-more">
                <summary>Options</summary>
                <div className="q-grid2">
                  <label>
                    Start from
                    <select value={startId} onChange={(e) => setStartId(e.target.value)}>
                      <option value="">Entrance</option>
                      {data.zones.map((z) => (
                        <option value={z.id} key={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Where are you?
                    <select value={place} onChange={(e) => setPlace(e.target.value)}>
                      <option value="outside">Walking outside</option>
                      <option value="desk">Checking from indoors</option>
                    </select>
                  </label>
                </div>
              </details>
            </div>
            {!stops.length && (
              <p className="q-warning">
                {mode === "quick"
                  ? "No tasks due. Choose a full round for a general check."
                  : "Add your first farm area to start a walk."}
              </p>
            )}
            <button className="q-button" style={{ width: "100%" }} disabled={!stops.length} onClick={begin}>
              {place === "outside" ? "Begin my walk" : "Begin my check-in"}
            </button>
            <p>
              Open the app once online before heading out. Your saved farm, checks and photos remain available
              offline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
