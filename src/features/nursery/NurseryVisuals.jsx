import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { todayLocalKey, localDateFromKey } from "../../lib/utils";
import { propagationOf } from "../../data/propagation";
import { TRAYS, trayOf } from "../../data/trays";
import { STAGE_LABELS, stagesOf, scheduleOf, fmt, currentTray } from "./nursery-model";
import FarmIcon from "../../components/FarmIcon";

/** One module tray from above; `used` cells drawn at a growth level (0 empty … 4 hardened). */
function TrayArt({ tray, used, level, className = "q-tray" }) {
  const W = tray.cols * 10 + 4,
    H = tray.rows * 10 + 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true">
      <rect width={W} height={H} rx="3" fill="#2b2f2a" />
      {Array.from({ length: tray.cells }, (_, i) => {
        const x = 2 + (i % tray.cols) * 10,
          y = 2 + Math.floor(i / tray.cols) * 10,
          on = i < used;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect
              x=".6"
              y=".6"
              width="8.8"
              height="8.8"
              rx="1.4"
              fill={on && level ? "#5b3f2a" : "#3b403a"}
            />
            {on && level === 1 && <circle cx="5" cy="5" r="1" fill="#c9a36a" />}
            {on && level >= 2 && (
              <g fill={level >= 4 ? "#3f7d3a" : "#72b35a"}>
                <ellipse
                  cx={5 - level * 0.6}
                  cy="5"
                  rx={0.9 + level * 0.45}
                  ry={0.6 + level * 0.25}
                  transform="rotate(-25 5 5)"
                />
                <ellipse
                  cx={5 + level * 0.6}
                  cy="5"
                  rx={0.9 + level * 0.45}
                  ry={0.6 + level * 0.25}
                  transform="rotate(25 5 5)"
                />
              </g>
            )}
            {on && !level && <rect x="3.5" y="3.5" width="3" height="3" rx=".8" fill="#6d7a62" />}
          </g>
        );
      })}
    </svg>
  );
}

/** Top view of the batch's trays: one cell per seed, drawn at its current stage. */
export function SeedlingTray({ batch, max = 3 }) {
  const tray = currentTray(batch),
    trays = Math.max(1, Math.ceil(batch.cells / tray.cells)),
    shown = Math.min(trays, max);
  const level = { sown: 1, sprouted: 2, potted: 3, hardening: 4, planted: 4 }[batch.stage] || 0;
  return (
    <div
      className="q-trays"
      aria-label={`${batch.cells} cells in ${trays} tray${trays === 1 ? "" : "s"} of ${tray.cells}, ${STAGE_LABELS[batch.stage] || "not sown yet"}`}
    >
      {Array.from({ length: shown }, (_, t) => (
        <TrayArt
          key={t}
          tray={tray}
          used={Math.min(tray.cells, batch.cells - t * tray.cells)}
          level={level}
        />
      ))}
      {trays > shown && (
        <small>
          +{trays - shown} more tray{trays - shown === 1 ? "" : "s"}
        </small>
      )}
    </div>
  );
}

/** Choose a module tray by number of cells; shows how many trays the sowing needs. */
export function TrayPicker({ value, onChange, cells, label = "Tray size", suggested, reason, minCell = 0 }) {
  const chosen = trayOf(value),
    row = useRef(null);
  useEffect(() => {
    const el = row.current?.querySelector(".is-selected");
    if (el && row.current) row.current.scrollLeft = el.offsetLeft - row.current.offsetLeft - 8;
  }, [chosen.cells]);
  return (
    <fieldset className="q-tray-picker">
      <legend>{label}</legend>
      <div className="q-tray-options" role="radiogroup" ref={row}>
        {TRAYS.filter((t) => t.cellCM > minCell).map((t) => {
          const need = cells ? Math.ceil(cells / t.cells) : 0;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={t.cells === chosen.cells}
              key={t.cells}
              className={t.cells === chosen.cells ? "is-selected" : ""}
              onClick={() => onChange(t.cells)}
            >
              <TrayArt
                tray={t}
                used={cells ? Math.min(t.cells, cells) : 0}
                level={0}
                className="q-tray-mini"
              />
              <strong>{t.cells}</strong>
              <small>≈{t.cellCM} cm</small>
              {need > 1 && <small>{need} trays</small>}
              {t.cells === suggested && <em>Suggested</em>}
            </button>
          );
        })}
      </div>
      {reason && (
        <small className="q-tray-reason">
          <strong>Suggested {suggested}:</strong> {reason}
        </small>
      )}
      <small className="q-tray-use">
        {chosen.cells} cells · ≈{chosen.cellCM} cm each · good for {chosen.use.toLowerCase()}
        {cells
          ? ` · ${Math.ceil(cells / chosen.cells)} tray${cells > chosen.cells ? "s" : ""}, ${Math.ceil(cells / chosen.cells) * chosen.cells - cells} cells left free`
          : ""}
      </small>
    </fieldset>
  );
}

/** Thin progress bar from sowing to planting out, for list cards. */
function SeedProgress({ batch }) {
  const schedule = scheduleOf(batch),
    start = localDateFromKey(schedule.sown),
    total = Math.max(1, Math.round((localDateFromKey(schedule.planted) - start) / 864e5)),
    day = Math.round((localDateFromKey(todayLocalKey()) - start) / 864e5);
  if (day < 0) return null;
  return (
    <div className="q-seed-progress" aria-label={`Day ${day} of ${total} in the nursery`}>
      <span style={{ width: `${Math.min(100, (day / total) * 100)}%` }} />
      <small>{day > total ? "Due to plant out" : `Day ${day} of ${total}`}</small>
    </div>
  );
}

/** Timeline from sowing to planting out, with each step dated and today marked. */
export function SeedTimeline({ batch, compact = false }) {
  if (compact) return <SeedProgress batch={batch} />;
  const schedule = scheduleOf(batch),
    stages = stagesOf(batch),
    at = batch.stage ? stages.indexOf(batch.stage) : -1;
  const start = localDateFromKey(schedule.sown),
    end = localDateFromKey(schedule.planted),
    total = Math.max(1, (end - start) / 864e5);
  const W = 320,
    pad = 14,
    y = 22;
  const xOfDate = (d) => pad + Math.min(1, Math.max(0, (d - start) / 864e5 / total)) * (W - pad * 2);
  const xOf = (key) => xOfDate(localDateFromKey(key));
  const today = todayLocalKey(),
    dayNo = Math.round((localDateFromKey(today) - start) / 864e5),
    tx = xOf(today);
  // Month ticks along the line; thinned so labels never collide.
  const ticks = [];
  for (
    let m = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    m <= end;
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1)
  )
    ticks.push(m);
  const step = Math.max(1, Math.ceil(ticks.length / 6));
  // Dots too close to each other are nudged apart so numbers stay readable.
  const xs = [];
  stages.forEach((s, i) => {
    let x = xOf(schedule[s]);
    if (i && x - xs[i - 1] < 17) x = xs[i - 1] + 17;
    xs.push(Math.min(W - pad, x));
  });
  return (
    <div className="q-seed-timeline">
      <svg
        viewBox={`0 0 ${W} 50`}
        role="img"
        aria-label={`From sowing ${fmt(schedule.sown)} to planting out ${fmt(schedule.planted)}`}
      >
        <line
          x1={pad}
          x2={W - pad}
          y1={y}
          y2={y}
          stroke="var(--color-border)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {dayNo > 0 && (
          <line
            x1={pad}
            x2={tx}
            y1={y}
            y2={y}
            stroke="var(--color-green)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        )}
        {ticks
          .filter((_, i) => i % step === 0)
          .map((m) => (
            <g key={m.toISOString()}>
              <line x1={xOfDate(m)} x2={xOfDate(m)} y1={y + 6} y2={y + 10} stroke="var(--color-text-3)" />
              <text x={xOfDate(m)} y={y + 21} textAnchor="middle" fontSize="9" fill="var(--color-text-3)">
                {m.toLocaleDateString("en-GB", { month: "short" })}
              </text>
            </g>
          ))}
        {stages.map((s, i) => {
          const done = i <= at,
            next = i === at + 1;
          return (
            <g key={s}>
              <circle
                cx={xs[i]}
                cy={y}
                r="8"
                fill={done ? "var(--color-green)" : next ? "var(--color-green-pale)" : "var(--color-card)"}
                stroke={done || next ? "var(--color-green)" : "var(--color-text-3)"}
                strokeWidth="1.5"
              />
              <text
                x={xs[i]}
                y={y + 3.3}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={done ? "#fff" : next ? "var(--color-green-dark)" : "var(--color-text-2)"}
              >
                {done ? "✓" : i + 1}
              </text>
            </g>
          );
        })}
        {dayNo >= 0 && dayNo <= total && (
          <g>
            <path d={`M${tx - 4} ${y - 14}h8l-4 5z`} fill="var(--color-text)" />
            <text
              x={Math.min(W - 20, Math.max(20, tx))}
              y={y - 16}
              textAnchor="middle"
              fontSize="8.5"
              fill="var(--color-text)"
            >
              Today
            </text>
          </g>
        )}
      </svg>
      <small>
        {fmt(schedule.sown)} → {fmt(schedule.planted)} · {Math.round(total / 7)} weeks in the nursery
      </small>
    </div>
  );
}

/** Quick facts for raising a crop from seed. */
export function CropSeedInfo({ crop }) {
  const p = propagationOf(crop);
  return (
    <div className="q-seed-info">
      <FarmIcon name={crop.name} emoji={crop.emoji} size={40} />
      <div className="q-chips">
        <span>Sprouts in ~{p.germDays} days</span>
        <span>⏳ ~{p.weeks} weeks to plant out</span>
        <span>{p.potOn ? "Pot on once" : "No potting on"}</span>
        {crop.sowIn && <span>Sow {crop.sowIn}</span>}
        {p.method === "either" && <span>↔ Can also be sown direct</span>}
      </div>
    </div>
  );
}

/** Horizontal stage track: done ✓, current highlighted, upcoming dimmed. */
export function StageTrack({ batch }) {
  const stages = stagesOf(batch),
    at = batch.stage ? stages.indexOf(batch.stage) : -1;
  return (
    <ol className="q-stage-track">
      {stages.map((s, i) => (
        <li key={s} className={i <= at ? "is-done" : i === at + 1 ? "is-next" : ""}>
          <span>{i <= at ? <Check size={11} /> : i + 1}</span>
          <small>{STAGE_LABELS[s]}</small>
        </li>
      ))}
    </ol>
  );
}
