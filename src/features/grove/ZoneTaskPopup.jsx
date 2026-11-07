import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, ArrowRight, Check } from "lucide-react";
import { ZT_MAP } from "../../data/zones";
import { applyTaskCompletion } from "../quiet/complete-task";
import { animalZone } from "../quiet/farm-model";
import AnimalArt from "../quiet/AnimalArt";
import PlantArt from "../quiet/PlantArt";
import FarmIcon from "../../components/FarmIcon";
import { taskAction, rewardText, taskGlyph, checkAmount, parseAmount } from "./zone-tasks";
import "./zone-tasks.css";

const BURST = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * 360,
  dist: 60 + (i % 3) * 22,
  hue: ["#f2b33d", "#6aa66f", "#e0714f", "#5b9bd5"][i % 4],
}));

function buzz(ms) {
  try {
    // Chrome refuses (and logs an error) before the first tap on the page.
    if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(ms);
  } catch {
    /* haptics are optional */
  }
}

function TaskArt({ task, data }) {
  if (task.speciesType) return <AnimalArt species={task.speciesType} size={44} />;
  const crop = task.cropName || data.garden?.plots.find((p) => p.id === task.plotId)?.crop;
  // Nothing is growing yet: show what it will become, so radish and strawberry don't look alike.
  if (crop && task.sowing) return <FarmIcon name={crop} emoji={task.emoji} size={38} harvest />;
  if (crop) return <PlantArt crop={crop} stage={task.type === "harvest" ? 5 : 3} size={44} />;
  return <span className="q-tp-emoji">{taskGlyph(task)}</span>;
}

function TaskTile({ task, data, index, done, onDone, onOpen }) {
  const action = taskAction(task, data);
  const [value, setValue] = useState(action.amount ? String(action.amount.value) : "");
  // A second tap confirms an amount far above the estimate; an invalid one shows why.
  const [warn, setWarn] = useState(null);
  const amount = action.amount;
  const step = amount?.step || 1;
  const nudge = (dir) => {
    const n = Math.max(step, Math.round(((parseAmount(value) || 0) + dir * step) * 10) / 10);
    setValue(String(n));
    setWarn(null);
    buzz(5);
  };
  const go = () => {
    if (action.open) { onOpen(); return; }
    const check = checkAmount(task, action, value);
    if (!check.ok) { setWarn({ error: check.error }); return; }
    if (check.big && !(warn && warn.big === value)) {
      setWarn({ big: value, error: `That's far more than the usual ~${amount.value} ${amount.unit}. Check it, or tap ${action.verb} again to save it.` });
      return;
    }
    onDone(task, rewardText(task, action, value), check.zero ? 0 : value, check.zero ? { allowZero: true } : undefined);
  };
  return (
    <li className={`q-tp-task${done ? " is-done" : ""}`} style={{ "--i": index }}>
      <span className="q-tp-icon">
        <TaskArt task={task} data={data} />
        <span className="q-tp-sticker" aria-hidden="true">
          {done ? "✓" : taskGlyph(task)}
        </span>
      </span>
      <div className="q-tp-body">
        <strong>{task.title}</strong>
        {!done && task.desc && <small>{task.desc}</small>}
        {!done && amount && (
          <div className="q-tp-amount">
            <button type="button" aria-label={`Less ${amount.unit}`} onClick={() => nudge(-1)}>
              <Minus size={16} />
            </button>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step={step}
              value={value}
              aria-label={`Amount in ${amount.unit}`}
              aria-invalid={warn ? true : undefined}
              onChange={(e) => { setValue(e.target.value); setWarn(null); }}
            />
            <span>{amount.unit}</span>
            <button type="button" aria-label={`More ${amount.unit}`} onClick={() => nudge(1)}>
              <Plus size={16} />
            </button>
          </div>
        )}
        {!done && warn && <small className="q-tp-final" role="alert">{warn.error}</small>}
        {!done && !warn && action.final && <small className="q-tp-final">{action.final}</small>}
      </div>
      {done ? (
        <span className="q-tp-reward" role="status" aria-live="polite">
          <Check size={15} />
          {done}
        </span>
      ) : (
        <button
          type="button"
          className="q-tp-go"
          onClick={go}
        >
          {action.verb}
        </button>
      )}
      {done && (
        <span className="q-tp-float" aria-hidden="true">
          {done}
        </span>
      )}
    </li>
  );
}

/**
 * Game-style list of what is waiting in one map area. Tasks are ticked off in place
 * (eggs, milk and harvests go to the pantry); the list is a snapshot so finished jobs
 * stay visible with their reward until the popup closes.
 */
export default function ZoneTaskPopup({ zone, tasks, data, setData, onClose, onOpenTasks, onOpenZone, onCompleted }) {
  const [list] = useState(tasks);
  const [done, setDone] = useState({});
  const sheet = useRef(null),
    dataRef = useRef(data),
    closeRef = useRef(onClose);
  useEffect(() => {
    dataRef.current = data;
    closeRef.current = onClose;
  }, [data, onClose]);
  // Focus the sheet once on open. onClose is a fresh function on every parent
  // render; reading it through a ref keeps focus from being yanked off the
  // amount field each time a task completion re-renders the map.
  useEffect(() => {
    sheet.current?.focus();
    const key = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const finished = list.filter((t) => done[t.key]).length,
    total = list.length,
    clear = total > 0 && finished === total;
  function complete(task, reward, value, meta) {
    const next = applyTaskCompletion(dataRef.current, task, value, meta);
    dataRef.current = next;
    setData(next);
    setDone((d) => ({ ...d, [task.key]: reward }));
    onCompleted?.();
    buzz(finished + 1 === total ? [18, 40, 28] : 14);
  }
  const zt = ZT_MAP.get(zone.type);
  const animal = (data.livestock?.animals || []).find((a) => animalZone(a, data.zones || [])?.id === zone.id);
  const crop = (data.garden?.plots || []).find((p) => p.zone === zone.id && p.status !== "harvested")?.crop;
  return createPortal(
    <div className="q-tp-backdrop">
      <section
        ref={sheet}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="q-tp-title"
        className={`q-tp${clear ? " is-clear" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="q-tp-drag">
          <header className="q-tp-head">
            <span className="q-tp-hero" aria-hidden="true">
              {animal ? (
                <AnimalArt species={animal.type} size={58} />
              ) : crop ? (
                <PlantArt crop={crop} stage={4} size={58} />
              ) : (
                <span className="q-tp-emoji">{zt?.icon || "📍"}</span>
              )}
            </span>
            <div className="q-grow">
              <span className="q-eyebrow">
                {clear ? "All clear" : `${total - finished} waiting · ${zt?.label || "Area"}`}
              </span>
              <h2 id="q-tp-title">{zone.name}</h2>
              <div
                className="q-tp-meter"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={finished}
                aria-label="Jobs done"
              >
                <span style={{ width: `${total ? (finished / total) * 100 : 0}%` }} />
              </div>
            </div>
            <button type="button" className="q-tp-close" aria-label="Close" onClick={onClose}>
              <X size={20} />
            </button>
          </header>
        </div>
        {total === 0 ? (
          <p className="q-empty">Nothing waiting here right now.</p>
        ) : (
          <ul className="q-tp-list">
            {list.map((t, i) => (
              <TaskTile
                key={t.key}
                task={t}
                data={data}
                index={i}
                done={done[t.key]}
                onDone={complete}
                onOpen={() => {
                  onClose();
                  onOpenZone?.();
                }}
              />
            ))}
          </ul>
        )}
        {clear && (
          <div className="q-tp-clear" role="status">
            <span className="q-tp-burst" aria-hidden="true">
              {BURST.map((b, i) => (
                <i
                  key={i}
                  style={{ "--a": `${b.angle}deg`, "--d": `${b.dist}px`, background: b.hue }}
                />
              ))}
            </span>
            <strong>🎉 {zone.name} is all done</strong>
            <small>
              {total} job{total === 1 ? "" : "s"} ticked off today
            </small>
          </div>
        )}
        <footer className="q-tp-foot">
          {onOpenZone && (
            <button
              type="button"
              className="q-secondary"
              onClick={() => {
                onClose();
                onOpenZone();
              }}
            >
              Area details
            </button>
          )}
          <button
            type="button"
            className="q-button"
            onClick={() => {
              onClose();
              onOpenTasks?.();
            }}
          >
            All tasks <ArrowRight size={16} />
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
