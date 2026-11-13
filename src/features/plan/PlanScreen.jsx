import React, { useMemo, useState } from "react";
import { C, F, SX } from "../../lib/theme";
import { Btn, Card, Pill, PageHead } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";
import MonthCalendar from "./MonthCalendar";
import { waitingPlantings, sowNowSuggestions, comingUp, seasonTimeline, cropByName } from "../../lib/plan";
import { startGrowing, nextStepAfter } from "../../lib/sowing";
import { rCM } from "../../lib/regional";
import { todayLocalKey, localDateFromKey } from "../../lib/utils";
import { MN_FULL } from "../../lib/calendar";
import { toast } from "../../lib/toast";
import { isPlantZone } from "../farm/living/visuals";
import { resolveEnvironment } from "../../lib/environment";
import { REGION_MAP } from "../../data/regions";
import "./plan.css";

/* ═══════════════════════════════════════════
   PLAN — Launch Stage 5 (2026-09-28)
   "What should I grow next, and when?" in one place:
   - waiting plantings (planned, not sown yet) with "I sowed it today",
   - what can go in now for THIS person (same engine as onboarding, with
     the reason it was picked),
   - what's coming up in the next months,
   - their season on a six-month strip,
   - the full seasonal calendar (moved here from Manuals).
   Read-only except "I sowed it today"; adding goes through the normal
   planting form on Crops.
   ═══════════════════════════════════════════ */

function niceDate(key) {
  const d = localDateFromKey(key);
  return d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
}

export default function PlanScreen({ data, setData, setPage }) {
  const [view, setView] = useState(() => (typeof window !== "undefined" && window.innerWidth <= 560 ? "calendar" : "foryou")); // the phone tab is called Calendar
  const today = todayLocalKey();
  const now = useMemo(function () { return localDateFromKey(today) || new Date(); }, [today]);
  const waiting = useMemo(function () { return waitingPlantings(data, today); }, [data, today]);
  const sowNow = useMemo(function () { return sowNowSuggestions(data, now, 6); }, [data, now]);
  const later = useMemo(function () { return comingUp(data, now, 3, 6); }, [data, now]);
  const season = useMemo(function () { return seasonTimeline(data, today, 6); }, [data, today]);
  const canPlant = (data.zones || []).some(function (z) { return isPlantZone(z.type); });
  const bedWord = resolveEnvironment(data) === "balcony" ? "planter" : "bed";
  const cropMap = rCM(data.region);

  function sowToday(plot) {
    const crop = cropMap.get(plot.crop);
    const started = startGrowing(plot, today, crop && crop.days);
    setData({ ...data, garden: { ...data.garden, plots: data.garden.plots.map(function (p) { return p.id === plot.id ? started : p; }) } });
    const next = nextStepAfter(started, today);
    toast(`${plot.name || plot.crop} is in the ground 🌱`, {
      detail: next ? `Next: ${String(next.label).toLowerCase()} in ${next.inDays} days` : `Harvest from about ${niceDate(started.harvestDate)}`,
      actionLabel: "Undo",
      onAction: function () { setData(function (d) { return { ...d, garden: { ...d.garden, plots: (d.garden.plots || []).map(function (p) { return p.id === plot.id ? plot : p; }) } }; }); },
    });
  }

  // now = it goes in today (the form opens dated today); otherwise it is planned, with the date left open
  // Say which facts the picks used — only the ones the grower actually gave.
  const pf = data.profile || {};
  const SUN = { lt3: "under 3 h of sun", "3to5": "3–5 h of sun", "5to7": "5–7 h of sun", gt7: "full sun" };
  const basis = [
    `${MN_FULL[localDateFromKey(today).getMonth()]} picks for a ${resolveEnvironment(data)} in ${(REGION_MAP.get(data.region) || {}).name || "your region"}`,
    SUN[pf.sunlight] || "",
    ({ some: "some experience", confident: "confident grower", expert: "expert grower" })[pf.experience] || "easy crops first",
  ].filter(Boolean).join(" · ");
  function addCrop(name, now, job) {
    const indoors = job === "indoors" ? { startIndoors: true } : {};
    if (!canPlant) setPage("map", { edit: true });
    else if (now === true && !indoors.startIndoors) setPage("crops", { crop: name, plantDate: today });
    else setPage("crops", { crop: name, ...indoors });
  }

  return (
    <div className="page-enter mt-plan" style={SX.mw800}>
      <PageHead title="Plan" sub="What to grow next, and when"/>
      <div className="mt-seg" role="tablist" aria-label="Plan views">
        <button type="button" role="tab" aria-selected={view === "foryou"} onClick={function () { setView("foryou"); }}>For you</button>
        <button type="button" role="tab" aria-selected={view === "calendar"} onClick={function () { setView("calendar"); }}>Calendar</button>
      </div>

      {view === "calendar" && <MonthCalendar data={data} onAdd={addCrop} />}

      {view === "foryou" && (
        <>
          {waiting.length > 0 && (
            <section className="mt-plan-sec" aria-labelledby="plan-waiting">
              <h3 id="plan-waiting">Waiting to go in</h3>
              <Card p={false} style={{ overflow: "hidden" }}>
                {waiting.map(function (w) {
                  return (
                    <div key={w.plot.id} className="mt-plan-row">
                      <FarmIcon name={w.plot.crop} emoji={(cropByName(w.plot.crop) || {}).emoji} size={34} harvest />
                      <span className="mt-plan-grow">
                        <strong>{w.plot.name || w.plot.crop}</strong>
                        <small>{w.zone ? w.zone.name : ""}{w.open ? (w.zone ? " · " : "") + w.label : ""}</small>
                      </span>
                      {w.open
                        ? <Btn sm onClick={function () { sowToday(w.plot); }}>{w.verb === "Plant" ? "I planted it" : "I sowed it"}</Btn>
                        : <Pill c={C.t2} bg={C.soft}>{w.label}</Pill>}
                    </div>
                  );
                })}
              </Card>
            </section>
          )}

          <section className="mt-plan-sec" aria-labelledby="plan-now">
            <h3 id="plan-now">Good to {sowNow.length && sowNow.every(function (s) { return s.info.verb === "Plant"; }) ? "plant" : "sow"} in {MN_FULL[now.getMonth()]}</h3>
            <p className="mt-plan-note">{basis}.{canPlant ? "" : ` Add a ${bedWord} to your map first, then plant into it.`}</p>
            {sowNow.length === 0
              ? <Card style={{ textAlign: "center", padding: "28px 20px", background: C.grdLight }}>
                  <div style={SX.s15Bold}>Nothing new to sow right now</div>
                  <div style={{ color: C.t2, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Your space is set for this month. See what's coming up below, or browse the calendar.</div>
                </Card>
              : <div className="mt-plan-grid">
                  {sowNow.map(function (s) {
                    return (
                      <Card key={s.crop.name} style={{ padding: 14 }}>
                        <div className="mt-plan-card-head">
                          <FarmIcon name={s.crop.name} emoji={s.crop.emoji} size={40} harvest />
                          <span className="mt-plan-grow">
                            <strong>{s.crop.name}</strong>
                            <small>{s.info.when} · {s.info.ready} · {s.info.effort}</small>
                          </span>
                        </div>
                        <p className="mt-plan-why">{s.info.reason}</p>
                        <Btn sm v="secondary" onClick={function () { addCrop(s.crop.name); }} style={{ width: "100%" }}>
                          {canPlant ? `+ Add to my ${bedWord}` : `Add a ${bedWord} first`}
                        </Btn>
                      </Card>
                    );
                  })}
                </div>}
          </section>

          {later.length > 0 && (
            <section className="mt-plan-sec" aria-labelledby="plan-later">
              <h3 id="plan-later">Coming up</h3>
              <Card p={false} style={{ overflow: "hidden" }}>
                {later.map(function (m) {
                  return (
                    <div key={m.month} className="mt-plan-row mt-plan-month">
                      <span className="mt-plan-mlabel">From {m.label}</span>
                      <span className="mt-plan-chips">
                        {m.crops.map(function (c) {
                          return <span key={c.name} className="mt-plan-chip"><FarmIcon name={c.name} emoji={c.emoji} size={18} harvest />{c.name}</span>;
                        })}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}

          <section className="mt-plan-sec" aria-labelledby="plan-season">
            <h3 id="plan-season">Your season</h3>
            {season.rows.length === 0
              ? <Card style={{ textAlign: "center", padding: "28px 20px" }}>
                  <div style={SX.s15Bold}>Nothing growing yet</div>
                  <div style={{ color: C.t2, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Add something from “Good to sow” and it shows up here with its harvest date.</div>
                </Card>
              : <Card style={{ padding: "12px 14px" }}>
                  <div className="mt-tl" role="table" aria-label="Your plantings over the next six months">
                    <div className="mt-tl-row mt-tl-head" role="row">
                      <span role="columnheader" className="mt-tl-name">Planting</span>
                      <span role="columnheader" className="mt-tl-track">
                        {season.months.map(function (m, i) { return <span key={i} style={{ left: (i / season.months.length * 100) + "%" }}>{m.label}</span>; })}
                      </span>
                    </div>
                    {season.rows.map(function (r) {
                      const outside = (r.to - r.from) < 0.3 && r.to < 0.75;
                      return (
                        <div key={r.id} className="mt-tl-row" role="row">
                          <span role="cell" className="mt-tl-name"><strong>{r.name}</strong>{r.zone && <small>{r.zone}</small>}</span>
                          <span role="cell" className="mt-tl-track" aria-label={r.waiting ? r.label : `Harvest ${niceDate(r.harvestKey)}`}>
                            <i className="mt-tl-today" style={{ left: (season.today * 100) + "%" }} aria-hidden="true" />
                            {r.waiting
                              ? <em className="mt-tl-wait">{r.label}</em>
                              : <b className={outside ? "mt-tl-bar out" : "mt-tl-bar"} style={{ left: (r.from * 100) + "%", width: ((r.to - r.from) * 100) + "%" }}><span>{r.label || niceDate(r.harvestKey)}</span></b>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-plan-note" style={{ margin: "8px 0 0" }}>Bars run from sowing to the estimated harvest. Real plants don't read calendars: check them as the date gets close.</p>
                </Card>}
          </section>

          <p style={{ fontSize: 12, color: C.t3, textAlign: "center", margin: "18px 0 6px", fontFamily: F.body }}>
            Want every crop for every month? Open the <button type="button" className="q-text-button" style={{ minHeight: 0, padding: 0, fontSize: 12 }} onClick={function () { setView("calendar"); }}>calendar</button>.
          </p>
        </>
      )}
    </div>
  );
}
