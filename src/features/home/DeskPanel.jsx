import { useMemo } from "react";
import { ChevronUp, ArrowRight, LocateFixed } from "lucide-react";
import PlantArt from "../quiet/PlantArt";
import AnimalArt from "../quiet/AnimalArt";
import { plantingRows, animalRows } from "./desk-model";

/* The desktop home's right-hand panel: today's jobs, every planting, every animal — one list at a time.
   A row click sends the map's camera to it (HomeV2.goTarget). Jobs is the same list phones get. */

const harvestText = (r) => (r.ready ? "Ready" : r.left == null ? "–" : `${r.left} d`);

export default function DeskPanel({ data, crops, todayKey, tab, setTab, jobsLeft, jobsHead, jobsBody, sel, onCollapse, onTarget, setPage }) {
  const plantings = useMemo(() => plantingRows(data, crops, todayKey), [data, crops, todayKey]);
  const animals = useMemo(() => animalRows(data), [data]);
  const tabs = [{ id: "jobs", l: "Jobs", n: jobsLeft }, { id: "plantings", l: "Plantings", n: plantings.length }];
  if (animals.length) tabs.push({ id: "animals", l: "Animals", n: animals.length });
  const on = tabs.some((t) => t.id === tab) ? tab : "jobs";

  return (
    <section className="hv2-panel is-docked dk-panel" role="region" aria-label="Your farm">
      <header className="dk-tabs">
        <div role="tablist" aria-label="What to list">
          {tabs.map(function (t) {
            return <button type="button" key={t.id} role="tab" aria-selected={on === t.id} onClick={function () { setTab(t.id); }}>{t.l}<b>{t.n}</b></button>;
          })}
        </div>
        <button type="button" className="hv2-collapse" aria-label="Hide this panel" onClick={onCollapse}><ChevronUp size={20} /></button>
      </header>

      {on === "jobs" && <>{jobsHead}{jobsBody}</>}

      {on === "plantings" && (
        <>
          {plantings.length > 0 && <div className="dk-cols" aria-hidden="true"><span>Crop</span><span>Stage</span><span>Harvest</span></div>}
          <div className="hv2-panel-list dk-list">
            {plantings.length === 0 && <p className="hv2-none">Nothing planted yet</p>}
            {plantings.map(function (r) {
              const picked = sel && sel.type === "plot" && sel.id === r.id;
              return (
                <button type="button" key={r.id} className={`dk-row${picked ? " is-on" : ""}`} aria-pressed={picked} onClick={function () { onTarget({ type: "plot", plotId: r.id, zoneId: r.zoneId }); }}>
                  <span className="dk-row-main">
                    <span className="dk-art"><PlantArt crop={r.crop} stage={r.stage} size={38} /></span>
                    <span className="hv2-row-text"><strong>{r.name}</strong><small>{picked && <LocateFixed size={12} strokeWidth={2.6} aria-hidden="true" />}{r.where}</small></span>
                  </span>
                  <span className={`dk-stage is-s${r.stage}`}><i aria-hidden="true" />{r.stageLabel}</span>
                  <b className={r.ready ? "is-ready" : ""}>{harvestText(r)}</b>
                </button>
              );
            })}
          </div>
          <footer className="hv2-panel-foot"><button type="button" onClick={() => setPage("crops")}>All crops <ArrowRight size={15} /></button></footer>
        </>
      )}

      {on === "animals" && (
        <>
          <div className="hv2-panel-list dk-list">
            {animals.map(function (a) {
              const picked = sel && sel.type === "animal" && sel.id === a.id;
              return (
                <button type="button" key={a.id} className={`dk-row is-animal${picked ? " is-on" : ""}`} aria-pressed={picked} onClick={function () { onTarget(a.zoneId ? { type: "zone", zoneId: a.zoneId, animalId: a.id } : { type: "page", page: "live" }); }}>
                  <span className="dk-row-main">
                    <span className="dk-art"><AnimalArt species={a.type} size={38} /></span>
                    <span className="hv2-row-text"><strong>{a.name}</strong><small>{picked && <LocateFixed size={12} strokeWidth={2.6} aria-hidden="true" />}{a.where}</small></span>
                  </span>
                  <b>{a.count}</b>
                </button>
              );
            })}
          </div>
          <footer className="hv2-panel-foot"><button type="button" onClick={() => setPage("live")}>All animals <ArrowRight size={15} /></button></footer>
        </>
      )}
    </section>
  );
}
