import React, { useMemo, useState } from "react";
import { Download, Lock } from "lucide-react";
import { C, SX } from "../../lib/theme";
import { Btn, Card } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";
import AnimalArt from "../quiet/AnimalArt";
import { cropByName } from "../../lib/plan";
import { produceEmoji } from "../../lib/progress";
import { formatMoney, formatMoneyShort } from "../../lib/money";
import { todayLocalKey } from "../../lib/utils";
import { MN_ABR } from "../../lib/calendar";
import { familyInfo, ROTATE } from "../../data/families";
import {
  insightYears, cropYields, bedYields, animalYields, unitCosts, bedHistory,
  harvestsCsv, animalCsv, bedsCsv, moneyCsv,
} from "../../lib/insights";
import "../plan/plan.css";

/* ═══════════════════════════════════════════
   INSIGHTS — Pro analytics (top-10 #4, 2026-09-30)
   Garden memory made visible: what each crop and bed gave against the
   estimate, lay/milk rates, what an egg or a kilo really costs, what grew
   where each year (for rotation), and spreadsheet exports.
   Numbers come only from what was logged (lib/insights.js).
   ═══════════════════════════════════════════ */

function fmt(n) { return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10); }

function download(name, text) {
  try {
    const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }); // BOM: Excel reads UTF-8 names right
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  } catch (e) { console.warn("CSV export failed:", e); }
}

const FAMILY_TINT = {
  solanaceae: "#f3d7d2", brassicaceae: "#d9ecd9", alliaceae: "#efe3f6", fabaceae: "#f6ecc9",
  apiaceae: "#fbe0c6", amaranthaceae: "#f5d3e0", cucurbitaceae: "#e2f0c9", asteraceae: "#d8ebf3", poaceae: "#efe9d6",
};

function Locked({ onUpgrade }) {
  return (
    <Card style={{ textAlign: "center", padding: "28px 20px" }}>
      <Lock size={26} strokeWidth={1.8} color={C.t2} />
      <h3 style={{ margin: "10px 0 6px", fontSize: 18, color: C.text }}>Insights are part of Pro</h3>
      <p style={{ fontSize: 13.5, color: C.t2, lineHeight: 1.55, maxWidth: 420, margin: "0 auto 16px" }}>
        See what each crop and bed really gave against the estimate, your hens' lay rate, what an egg or a kilo of veg costs you,
        what grew where each year (with rotation warnings), and download it all as spreadsheets.
        Your harvests keep being recorded either way — nothing is lost.
      </p>
      {onUpgrade && <Btn onClick={onUpgrade}>See plans</Btn>}
    </Card>
  );
}

export default function InsightsScreen({ data, setPage, locked, onUpgrade }) {
  const today = todayLocalKey();
  const years = useMemo(function () { return insightYears(data, today); }, [data, today]);
  const [year, setYear] = useState(years[0]);
  const y = years.includes(year) ? year : years[0];
  const crops = useMemo(function () { return cropYields(data, y); }, [data, y]);
  const beds = useMemo(function () { return bedYields(data, y); }, [data, y]);
  const animals = useMemo(function () { return animalYields(data, y, today); }, [data, y, today]);
  const costs = useMemo(function () { return unitCosts(data, y, today); }, [data, y, today]);
  const estHarvests = crops.reduce(function (n, c) { return n + c.estimated; }, 0);
  const allHarvests = crops.reduce(function (n, c) { return n + c.harvests; }, 0);
  const history = useMemo(function () { return bedHistory(data); }, [data]);
  const maxKg = Math.max(0.001, ...crops.map(function (c) { return c.kg; }));

  return (
    <div className="page-enter mt-progress" style={SX.mw800}>
      <div className="pg-head" style={SX.pageHead}>
        <div>
          <h2 className="pg-h2" style={SX.headerH2}>Insights</h2>
          <p className="pg-sub" style={SX.pageSubHead}>What your space really gives, and what it costs</p>
        </div>
      </div>

      {locked ? <Locked onUpgrade={onUpgrade} /> : (
        <>
          {years.length > 1 && (
            <div className="mt-seg" role="tablist" aria-label="Year">
              {years.map(function (yy) {
                return <button key={yy} type="button" role="tab" aria-selected={yy === y} onClick={function () { setYear(yy); }}>{yy}</button>;
              })}
            </div>
          )}

          <section className="mt-plan-sec" aria-labelledby="ins-crops">
            <h3 id="ins-crops">Harvest by crop</h3>
            {crops.length === 0
              ? <p className="mt-plan-note">No harvests logged in {y}. Tick “Harvest” on a ready crop and type what you picked — it's recorded against its bed.</p>
              : <Card p={false} style={{ overflow: "hidden" }}>
                  {crops.map(function (c) {
                    const pct = c.pct;
                    return (
                      <div key={c.crop} className="mt-plan-row">
                        <FarmIcon name={c.crop} emoji={produceEmoji(c.crop, cropByName(c.crop))} size={30} harvest />
                        <span className="mt-plan-grow">
                          <strong>{c.crop} <span style={{ fontWeight: 500, color: C.t2 }}>· {fmt(c.kg)} kg</span></strong>
                          <span className="mt-ins-bar" aria-hidden="true"><b style={{ width: `${Math.round((c.kg / maxKg) * 100)}%` }} /></span>
                          <small>
                            {c.harvests} harvest{c.harvests === 1 ? "" : "s"}
                            {c.estimated > 0 ? ` (${c.estimated === c.harvests ? "all" : c.estimated} at the estimate)` : ""}
                            {pct != null ? ` · weighed: ${pct}% of the estimate (${fmt(c.actualWithExp)} of ${fmt(c.expKg)} kg)` : ""}
                          </small>
                        </span>
                        {pct != null && <span className={`mt-ins-pct ${pct >= 90 ? "good" : pct >= 60 ? "mid" : "low"}`}>{pct}%</span>}
                      </div>
                    );
                  })}
                </Card>}
            {estHarvests > 0 && (
              <p className="mt-plan-note" style={{ marginTop: 8 }}>{estHarvests} of {allHarvests} harvests were saved at MyTerra's estimate, not weighed. They count in the kilos but not in the “% of the estimate” comparison — type what you picked next time to see how you really did.</p>
            )}
            {crops.some(function (c) { return c.pct != null && c.pct < 60; }) && (
              <p className="mt-plan-note" style={{ marginTop: 8 }}>Well under the estimate? Estimates are deliberately cautious, so a big gap usually means watering, feeding, spacing or a pest — the crop's guide in Learn lists what to check.</p>
            )}
          </section>

          <section className="mt-plan-sec" aria-labelledby="ins-beds">
            <h3 id="ins-beds">Harvest by bed</h3>
            {beds.length === 0
              ? <p className="mt-plan-note">Beds show up here once a harvest from them is logged.</p>
              : <Card p={false} style={{ overflow: "hidden" }}>
                  {beds.map(function (b) {
                    return (
                      <div key={b.zoneId} className="mt-plan-row">
                        <span className="mt-plan-grow">
                          <strong>{b.name}</strong>
                          <small>{b.crops.join(", ")}</small>
                        </span>
                        <span style={{ textAlign: "right" }}>
                          <strong style={{ display: "block", fontSize: 15, color: C.text }}>{fmt(b.kg)} kg</strong>
                          {b.kgPerM2 != null && <small style={{ fontSize: 11.5, color: C.t2 }}>{fmt(b.kgPerM2)} kg/m²</small>}
                        </span>
                      </div>
                    );
                  })}
                </Card>}
          </section>

          <section className="mt-plan-sec" aria-labelledby="ins-animals">
            <h3 id="ins-animals">Eggs and milk</h3>
            {animals.length === 0
              ? <p className="mt-plan-note">Collected eggs and milk are counted here per animal group, month by month.</p>
              : animals.map(function (a) {
                  const monthMax = Math.max(0.001, ...a.byMonth.map(function (m) { return m.eggs || m.milkL; }));
                  return (
                    <Card key={a.species} style={{ marginBottom: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <AnimalArt species={a.species} size={40} />
                        <span className="mt-plan-grow">
                          <strong>{a.species}{a.head ? ` · ${a.head} now` : ""}</strong>
                          <small>
                            {[a.eggs ? `${a.eggs} eggs` : "", a.milkL ? `${fmt(a.milkL)} L milk` : "", a.meatKg ? `${fmt(a.meatKg)} kg meat` : ""].filter(Boolean).join(" · ")}
                            {a.eggsPerHeadDay != null ? ` · about ${fmt(a.eggsPerHeadDay)} egg${a.eggsPerHeadDay === 1 ? "" : "s"} a day per bird you keep now` : ""}
                          </small>
                        </span>
                      </div>
                      {a.estShare > 0.5 && <p className="mt-plan-note" style={{ margin: "0 0 8px" }}>Most of these were logged at MyTerra's default amount, not counted, so no lay rate is shown. Type the real count when you collect.</p>}
                      {(a.eggs > 0 || a.milkL > 0) && (
                        <div className="mt-bars" style={{ height: 70 }} role="img" aria-label={a.byMonth.map(function (m) { return `${MN_ABR[m.m]} ${fmt(m.eggs || m.milkL)}`; }).join(", ")}>
                          {a.byMonth.map(function (m) {
                            return <span key={m.m} className="mt-bar-col"><b style={{ height: `${Math.round(((m.eggs || m.milkL) / monthMax) * 100)}%` }} /><small>{MN_ABR[m.m].slice(0, 1)}</small></span>;
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })}
          </section>

          <section className="mt-plan-sec" aria-labelledby="ins-costs">
            <h3 id="ins-costs">What it costs you</h3>
            {costs.species.length === 0 && costs.garden.perKg == null
              ? <p className="mt-plan-note">Add feed and seed costs in Money (set “For” to the animal or bed) to see the real cost of an egg, a litre of milk or a kilo of veg.</p>
              : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
                  {costs.species.map(function (s) {
                    const v = s.perDozen != null ? `${formatMoney(s.perDozen, data, 2)} / dozen` : s.perLitre != null ? `${formatMoney(s.perLitre, data, 2)} / L` : null;
                    return (
                      <Card key={s.species} style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.t2, textTransform: "uppercase", letterSpacing: ".03em" }}>{s.species}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: C.text }}>{v || formatMoneyShort(s.spent, data)}</div>
                        <div style={{ fontSize: 12, color: C.t2, marginTop: 3 }}>{v ? `${formatMoneyShort(s.spent, data)} spent${s.estimated ? " · mostly default counts" : ""}` : "spent — nothing collected yet"}</div>
                      </Card>
                    );
                  })}
                  {costs.garden.spent > 0 && (
                    <Card style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.t2, textTransform: "uppercase", letterSpacing: ".03em" }}>Garden</div>
                      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: C.text }}>{costs.garden.perKg != null ? `${formatMoney(costs.garden.perKg, data, 2)} / kg` : formatMoneyShort(costs.garden.spent, data)}</div>
                      <div style={{ fontSize: 12, color: C.t2, marginTop: 3 }}>{formatMoneyShort(costs.garden.spent, data)} on seeds and beds{costs.garden.kg ? ` · ${fmt(costs.garden.kg)} kg picked` : ""}</div>
                    </Card>
                  )}
                </div>}
            {costs.notes.map(function (n) { return <p key={n} className="mt-plan-note" style={{ marginTop: 8 }}>{n}</p>; })}
            {(costs.species.length > 0 || costs.garden.spent > 0) && <p className="mt-plan-note" style={{ marginTop: 8 }}>Running costs only: tools, buildings and buying the animals themselves are left out — they last for years.</p>}
          </section>

          <section className="mt-plan-sec" aria-labelledby="ins-history">
            <h3 id="ins-history">What grew where</h3>
            {history.length === 0
              ? <p className="mt-plan-note">Each bed's plantings are kept here year by year, so next spring you'll know what to rotate.</p>
              : <>
                  <p className="mt-plan-note">Moving the potato, cabbage, onion, bean, carrot and beet families to a new bed each year keeps soil pests and diseases down. MyTerra warns you when you plant one back too soon.</p>
                  <Card p={false} style={{ overflow: "hidden" }}>
                    {history.map(function (b) {
                      return (
                        <div key={b.zoneId} className="mt-plan-row mt-plan-month">
                          <span className="mt-plan-mlabel" style={{ flexBasis: 96 }}>{b.name}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            {b.years.map(function (yy) {
                              return (
                                <span key={yy.year} className="mt-ins-year">
                                  <small>{yy.year}</small>
                                  <span className="mt-plan-chips">
                                    {yy.crops.map(function (c, i) {
                                      const fam = c.family && familyInfo(c.family);
                                      return <span key={c.crop + i} className="mt-plan-chip" title={fam ? fam.label : ""} style={c.family && ROTATE.has(c.family) ? { background: FAMILY_TINT[c.family], color: "#2b2b2b" } : undefined}>
                                        <FarmIcon name={c.crop} emoji={produceEmoji(c.crop, cropByName(c.crop))} size={18} harvest />{c.crop}{c.current ? " · now" : ""}
                                      </span>;
                                    })}
                                  </span>
                                </span>
                              );
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </Card>
                </>}
          </section>

          <section className="mt-plan-sec" aria-labelledby="ins-export">
            <h3 id="ins-export">Download as a spreadsheet</h3>
            <p className="mt-plan-note">CSV files — they open in Excel, Numbers and Google Sheets. All years are included.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn sm v="secondary" onClick={function () { download(`myterra-harvests-${today}.csv`, harvestsCsv(data)); }}><Download size={15} strokeWidth={1.8} /> Harvests</Btn>
              <Btn sm v="secondary" onClick={function () { download(`myterra-eggs-milk-${today}.csv`, animalCsv(data)); }}><Download size={15} strokeWidth={1.8} /> Eggs and milk</Btn>
              <Btn sm v="secondary" onClick={function () { download(`myterra-beds-${today}.csv`, bedsCsv(data)); }}><Download size={15} strokeWidth={1.8} /> What grew where</Btn>
              <Btn sm v="secondary" onClick={function () { download(`myterra-money-${today}.csv`, moneyCsv(data)); }}><Download size={15} strokeWidth={1.8} /> Money</Btn>
            </div>
          </section>
          {setPage && <p className="mt-plan-note">Harvest amounts come from what you type when you tick “Harvest”. <button type="button" className="q-text-button" onClick={function () { setPage("progress"); }}>Back to Progress</button></p>}
        </>
      )}
    </div>
  );
}
