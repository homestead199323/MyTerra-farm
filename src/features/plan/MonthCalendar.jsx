import React, { useMemo, useState } from "react";
import { Sprout, Shovel, TreeDeciduous, ShoppingBasket, Fence, Lightbulb, ChevronRight, ArrowRight } from "lucide-react";
import { Btn, Overlay } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";
import { MN_ABR, MN_FULL } from "../../lib/calendar";
import { todayLocalKey, localDateFromKey } from "../../lib/utils";
import { monthPlan, monthTip, nextMonthPreview, cropYear, cropTips, JOBS, JOB_TITLES, JOB_TIPS, seasonText } from "../../lib/month-plan";

/* ═══════════════════════════════════════════
   CALENDAR (2026-11-11) — one month at a time, split by the job:
   start indoors · sow outside · plant out · plant · harvest.
   All twelve months are on screen, months that have passed mean next year,
   and a tap on a crop shows its whole year. Model: src/lib/month-plan.js.
   ═══════════════════════════════════════════ */

const JOB_ICONS = { indoors: Sprout, outside: Shovel, plantOut: Fence, plant: TreeDeciduous, harvest: ShoppingBasket };
const KINDS = [
  ["all", "All"],
  ["easy", "Easy"],
  ["veg", "Vegetables"],
  ["herb", "Herbs"],
  ["fruit", "Fruit"],
];
const PREVIEW = 4;
const LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function inKind(item, kind) {
  if (kind === "easy") return item.diff.l === "Easy";
  if (kind === "veg") return item.crop.cat === "Vegetable" || item.crop.cat === "Grain";
  if (kind === "herb") return item.crop.cat === "Herb";
  if (kind === "fruit") return item.crop.cat === "Fruit" || item.crop.cat === "Fruit Tree" || item.crop.cat === "Nut Tree";
  return true;
}

/** A crop's year on twelve cells: when to sow or plant, when it goes outside, when to pick. */
function YearBar({ year, month }) {
  const rows = [
    [year.start === "indoors" ? "Sow indoors" : year.start === "plant" ? "Plant" : "Sow", year.sow, "sow"],
    ["Plant out", year.out, "out"],
    ["Harvest", year.harvest, "har"],
  ].filter(function (r) { return r[1].length > 0; });
  return (
    <div className="cal-year" role="img" aria-label={rows.map(function (r) { return `${r[0]}: ${r[1].map(function (m) { return MN_ABR[m]; }).join(", ")}`; }).join(". ")}>
      <div className="cal-year-row cal-year-head">
        <span />
        {LETTERS.map(function (l, i) { return <b key={i} className={i === month ? "on" : ""}>{l}</b>; })}
      </div>
      {rows.map(function (r) {
        return (
          <div key={r[0]} className="cal-year-row">
            <span>{r[0]}</span>
            {LETTERS.map(function (l, i) { return <i key={i} className={r[1].includes(i) ? `cal-${r[2]}` : ""} />; })}
          </div>
        );
      })}
    </div>
  );
}

export default function MonthCalendar({ data, onAdd }) {
  const today = todayLocalKey(),
    nowMonth = localDateFromKey(today).getMonth();
  const [month, setMonth] = useState(nowMonth);
  const [kind, setKind] = useState("all");
  const [showAll, setShowAll] = useState({});
  const [open, setOpen] = useState(null); // { item, job }

  const plan = useMemo(function () { return monthPlan(data, month, today); }, [data, month, today]);
  const next = useMemo(function () { return nextMonthPreview(data, month, today); }, [data, month, today]);
  const tip = monthTip(data, month);
  const isNow = month === nowMonth;
  const sections = JOBS.map(function (job) { return { job, items: plan[job].filter(function (it) { return inKind(it, kind); }) }; }).filter(function (s) { return s.items.length > 0; });
  const nextBits = [
    next.indoors ? `${next.indoors} indoors` : "",
    next.outside ? `${next.outside} outside` : "",
    next.plantOut ? `${next.plantOut} plant out` : "",
    next.plant ? `${next.plant} to plant` : "",
  ].filter(Boolean);
  const openYear = open ? cropYear(open.item.crop, data, plan.year) : null;
  const openTips = open ? cropTips(open.item.crop, data, plan.year) : [];
  const canAddOpen = open && !open.item.mine && open.job !== "harvest";

  function go(m) {
    setMonth(m);
    setShowAll({});
  }

  return (
    <div className="cal">
      <div className="cal-head">
        <h3>{MN_FULL[month]} {plan.year}</h3>
        {isNow ? <span className="cal-now">This month</span> : <button type="button" className="q-text-button" onClick={function () { go(nowMonth); }}>Back to {MN_ABR[nowMonth]}</button>}
      </div>
      <div className="cal-months" role="group" aria-label="Month">
        {MN_ABR.map(function (m, i) {
          return (
            <button key={m} type="button" aria-pressed={i === month} aria-label={MN_FULL[i]} className={i === nowMonth ? "is-now" : ""} onClick={function () { go(i); }}>
              {m}
            </button>
          );
        })}
      </div>

      <p className="cal-tip"><Lightbulb size={16} aria-hidden="true" /><span>{tip}</span></p>

      <div className="cal-kinds" role="group" aria-label="Show">
        {KINDS.map(function (k) {
          return <button key={k[0]} type="button" aria-pressed={kind === k[0]} onClick={function () { setKind(k[0]); }}>{k[1]}</button>;
        })}
      </div>

      {sections.length === 0 && (
        <div className="cal-empty">
          <strong>Nothing to do in {MN_FULL[month]}</strong>
          <span>{kind === "all" ? "A quiet month. Look ahead to the next one." : "Nothing in this group. Try All."}</span>
        </div>
      )}

      {sections.map(function (s) {
        const Icon = JOB_ICONS[s.job];
        const all = showAll[s.job] || s.items.length <= PREVIEW + 1;
        const shown = all ? s.items : s.items.slice(0, PREVIEW);
        return (
          <section key={s.job} className={`cal-sec cal-sec-${s.job}`} aria-label={JOB_TITLES[s.job]}>
            <header>
              <span className="cal-sec-ico"><Icon size={18} aria-hidden="true" /></span>
              <h4>{JOB_TITLES[s.job]}</h4>
              <span className="cal-count">{s.items.length}</span>
            </header>
            <p className="cal-sec-tip">{JOB_TIPS[s.job]}</p>
            <ul>
              {shown.map(function (it) {
                return (
                  <li key={it.name}>
                    <button type="button" className={it.mine ? "is-mine" : ""} onClick={function () { setOpen({ item: it, job: s.job }); }}>
                      <FarmIcon name={it.name} emoji={it.crop.emoji} size={32} harvest />
                      <span className="cal-row-text">
                        <strong>
                          {it.name}
                          {it.mine && s.job !== "harvest" ? <em className="cal-tag mine">{it.waiting ? "Planned" : "Growing"}</em> : it.diff.l === "Easy" && s.job !== "harvest" ? <em className="cal-tag">Easy</em> : null}
                        </strong>
                        <small>{it.note}</small>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {!all && (
              <button type="button" className="q-text-button cal-more" onClick={function () { setShowAll({ ...showAll, [s.job]: true }); }}>
                Show all {s.items.length}
              </button>
            )}
          </section>
        );
      })}

      {nextBits.length > 0 && (
        <button type="button" className="cal-next" onClick={function () { go(next.month); }}>
          <span>
            <strong>Get ready for {next.name}</strong>
            <small>{nextBits.join(" · ")}</small>
            {next.tip && <small className="cal-next-tip"><Lightbulb size={13} aria-hidden="true" /> {next.tip}</small>}
          </span>
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      )}

      {open && (
        <Overlay title={open.item.name} onClose={function () { setOpen(null); }}>
          <div className="cal-sheet">
            <div className="cal-sheet-top">
              <FarmIcon name={open.item.name} emoji={open.item.crop.emoji} size={52} harvest />
              <span>
                <strong>{JOB_TITLES[open.job]} in {MN_FULL[month]}</strong>
                <small>{open.item.diff.l} · {open.item.crop.cat}</small>
              </span>
            </div>
            <YearBar year={openYear} month={month} />
            <dl className="cal-facts">
              <div><dt>Harvest</dt><dd>{seasonText(open.item.crop.harvest)}</dd></div>
              <div><dt>Spacing</dt><dd>{open.item.crop.spacing} cm</dd></div>
              <div><dt>Sun</dt><dd>{open.item.crop.sun}</dd></div>
              <div><dt>Water</dt><dd>{open.item.crop.waterFreq}</dd></div>
            </dl>
            {openTips.length > 0 && (
              <ul className="cal-tips">
                {openTips.map(function (t, i) { return <li key={i}><Lightbulb size={15} aria-hidden="true" /><span>{t}</span></li>; })}
              </ul>
            )}
          </div>
          <div className="ov-actions">
            <Btn v="secondary" onClick={function () { setOpen(null); }}>Close</Btn>
            {canAddOpen && (
              <Btn onClick={function () { const name = open.item.name; setOpen(null); onAdd(name, isNow); }}>
                {isNow ? (open.job === "indoors" || open.job === "outside" ? "Sow it now" : "Plant it now") : `Plan for ${MN_ABR[month]}`}
              </Btn>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}
