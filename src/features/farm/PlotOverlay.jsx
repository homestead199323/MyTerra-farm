import React, { useEffect, useMemo, useRef, useState } from "react";
import { C, F, SX } from "../../lib/theme";
import { Btn, Card, Overlay, Pill, StepChecklist, StorageCard, WaterCard, Actions } from "../../components/ui";
import { COMP } from "../../data/companions";
import { todayLocalKey, localDateFromKey, fmtWeight } from "../../lib/utils";
import { applyTaskCompletion } from "../quiet/complete-task";
import { rCM } from "../../lib/regional";
import { plotAreaM2, buildZoneSpaceMap } from "../../lib/farm-calc";
import FarmIcon from "../../components/FarmIcon";
import Journal from "../quiet/Journal";
import PlantDiary from "./PlantDiary";
import {relation, growthOf, STAGES} from "../quiet/farm-model";
import PlantArt from "../quiet/PlantArt";
import PlantingLayoutEditor from "../quiet/PlantingLayoutEditor";
import { editablePlanting, isTreeCrop } from "../quiet/planting-plan";
import "./crops.css";
import { toggleStep, isAwaitingSowing, startGrowing, sowVerb, nextStepAfter } from "../../lib/sowing";
import { toast } from "../../lib/toast";
import { recordRemoval } from "../../lib/memory";

// "27 Sep" (or "27 Sep 2027" when it is not this year) instead of 2026-09-27.
function niceDate(key) {
  const d = localDateFromKey(key);
  if (!d) return "—";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

/* ═══════════════════════════════════════════
   PLOT OVERLAY — shared popup used from Farming, TaskQueue, Dashboard
   ═══════════════════════════════════════════ */
function PlotOverlay({plot, data, setData, onClose, setPage=null, dock=false}) {
  const layoutId = plot ? `crop-card-${plot.id}` : undefined;
  const crop = rCM(data.region).get(plot.crop);
  const zone = plot.zone ? data.zones.find(z => z.id === plot.zone) : null;
  const zoneSpace = useMemo(
    () => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60, data.region),
    [data.zones, data.garden.plots, data.farmW, data.farmH, data.region]
  );
  const zoneStats = plot.zone ? zoneSpace[plot.zone] : null;
  const zoneMyArea = plotAreaM2(plot, data.region);
  const zoneFill = zoneStats ? (zoneStats.pct >= 0.95 ? C.red : zoneStats.pct >= 0.7 ? C.orange : C.green) : C.green;

  const compZonePlots = plot.zone
    ? data.garden.plots.filter(p => p.zone === plot.zone && p.status !== "harvested" && p.id !== plot.id).map(p => p.crop)
    : [];
  const compObj = COMP[plot.crop];
  const compGood = compObj ? compZonePlots.filter(n => relation(plot.crop,n)==='good') : [];
  const compBad  = compObj ? compZonePlots.filter(n => relation(plot.crop,n)==='avoid') : [];
  const showComp = plot.zone && compObj && compZonePlots.length > 0 && (compGood.length > 0 || compBad.length > 0);

  const [confirmDel, setConfirmDel] = useState(false);
  const [editLayout, setEditLayout] = useState(false);
  const editable = setData ? editablePlanting(data, plot) : null;
  const setObserved = (v) => setData({...data, garden: {...data.garden, plots: data.garden.plots.map(a => a.id === plot.id ? {...a, observedStage: v === "" ? null : +v, observedStageDate: v ? todayLocalKey() : null} : a)}});
  const [harvKg, setHarvKg] = useState(null); // null = not asked yet
  const [harvEdited, setHarvEdited] = useState(false);
  // "How much did you pick?" opens near the top of the card: bring it into view when it is asked from further down (the Harvest step)
  const harvRef = useRef(null), asking = harvKg != null;
  useEffect(() => { if (asking && harvRef.current?.scrollIntoView) harvRef.current.scrollIntoView({ block: "center", behavior: "smooth" }); }, [asking]);
  const growth = growthOf(plot, crop, todayLocalKey());
  const waiting = isAwaitingSowing(plot);
  const notStarted = waiting || plot.status === "planned" || !plot.plantDate;
  const verb = sowVerb(plot.steps);
  const isTree = isTreeCrop(crop);
  // Sowing the first step of a waiting planting starts its clock today (lib/sowing.js).
  const togStep = (pid, si) => {
    // The final Harvest step is a harvest, not a checkbox: ask how much was picked so Pantry and Progress both count it.
    const st = plot.steps && plot.steps[si];
    const lastHarvestIdx = (plot.steps || []).reduce((acc, s, k) => (/^harvest/i.test(s.l || "") ? k : acc), -1);
    if (st && !st.done && si === lastHarvestIdx && !notStarted && plot.status !== "harvested") { setHarvKg(String(harvDefault(plot))); return; }
    const plots = data.garden.plots.map(p => p.id === pid ? toggleStep(p, si, todayLocalKey(), crop && crop.days) : p);
    setData({...data, garden: {...data.garden, plots}});
  };
  const startNow = () => {
    const started = startGrowing(plot, todayLocalKey(), crop && crop.days);
    setData({...data, garden: {...data.garden, plots: data.garden.plots.map(p => p.id === plot.id ? started : p)}});
    const next = nextStepAfter(started, todayLocalKey());
    toast(`${plot.name || plot.crop} is in the ground 🌱`, {
      detail: next ? `Next: ${next.label.toLowerCase()} in ${next.inDays} days` : `Harvest from about ${niceDate(started.harvestDate)}`,
      actionLabel: "Undo",
      onAction: () => setData(d => ({...d, garden: {...d.garden, plots: (d.garden.plots || []).map(p => p.id === plot.id ? plot : p)}})),
    });
  };
  const del = id => {
    if (!confirmDel) { setConfirmDel(true); return; }
    const removed = data.garden.plots.find(p => p.id === id);
    const remembered = recordRemoval(data, removed, todayLocalKey());
    const next = {...remembered, garden: {...data.garden, plots: data.garden.plots.filter(p => p.id !== id)}};
    // A seedling batch waiting to go into this planting loses its link (it can be planted out elsewhere).
    const batches = data.nursery?.batches;
    if (Array.isArray(batches) && batches.some(b => b.plotId === id)) {
      next.nursery = {...data.nursery, batches: batches.map(b => b.plotId === id ? {...b, plotId: null, targetZoneId: null} : b)};
    }
    setData(next);
    // Undo puts the planting back on the farm as it is now (its removal note in the garden memory is harmless).
    toast(`${plot.name || plot.crop} removed`, { actionLabel: "Undo", onAction: () => setData(d => (d.garden.plots || []).some(p => p.id === id) ? d : {...d, garden: {...d.garden, plots: [...(d.garden.plots || []), removed]}}) });
    onClose();
  };
  // Same path as harvesting from tasks: stock in the pantry, and trees/perennials stay planted.
  // Ask what was actually picked (prefilled with the estimate); an untouched amount is saved as an estimate.
  const harvDefault = (p) => {
    const c = rCM(data.region).get(p.crop);
    return Math.round((p.expectedYieldKg || (p.plantCount && c ? p.plantCount * (c.yld || 3) : c?.cat === "Herb" ? 0.5 : c?.cat === "Grain" ? 5 : c?.yld || 3)) * 10) / 10;
  };
  const harv = (p) => {
    const def = harvDefault(p);
    const typed = Number(harvKg);
    // A typed 0 means the crop failed: record 0 kg rather than the estimate.
    const zero = harvEdited && String(harvKg).trim() !== "" && Number.isFinite(typed) && typed <= 0;
    const qty = typed > 0 ? typed : zero ? 0 : def;
    setData(applyTaskCompletion(data, { key: `plot-${p.id}-harvest`, type: "harvest", plotId: p.id }, qty, { estimated: !zero && (!(typed > 0) || !harvEdited), allowZero: zero }));
    onClose();
  };

  if (!crop) {
    return (
      <Overlay title={`${plot.name || plot.crop}`} onClose={onClose} dock={dock} sheet layoutId={layoutId}>
        <div style={{padding:"24px 12px",color:C.t2,fontSize:13}}>Crop data not found for this plot.</div>
      <Journal data={data} setData={setData} plotId={plot.id}/></Overlay>
    );
  }

  const canHarvestNow = plot.status !== "harvested" && !notStarted && !!plot.harvestDate && localDateFromKey(plot.harvestDate) <= localDateFromKey(todayLocalKey()) && harvKg == null;
  const harvested = plot.status === "harvested";
  // one line that says where this planting is on its way to the plate
  const daysLeft = plot.harvestDate && !notStarted ? Math.round((localDateFromKey(plot.harvestDate) - localDateFromKey(todayLocalKey())) / 864e5) : null;
  const growWeeks = (plot.growDays || crop.days || 60) < 14 ? `about ${plot.growDays || crop.days} days` : `about ${Math.round((plot.growDays || crop.days || 60) / 7)} weeks`;
  const when = harvested ? "Harvested"
    : notStarted ? `Harvest ${growWeeks} after ${verb === "Plant" ? "planting" : "sowing"}`
    : daysLeft == null ? ""
    : daysLeft <= 0 ? "Ready to pick"
    : daysLeft <= 14 ? `Harvest in ${daysLeft} ${daysLeft === 1 ? "day" : "days"} · ${niceDate(plot.harvestDate)}`
    : `Harvest in about ${Math.round(daysLeft / 7)} weeks · ${niceDate(plot.harvestDate)}`;
  const observed = Number.isInteger(plot.observedStage);
  const ready = !harvested && !notStarted && daysLeft != null && daysLeft <= 0;
  const harvestForm = harvKg != null && (
    <div ref={harvRef} style={{margin:"0 0 14px",padding:"12px 14px",border:`1.5px solid ${C.green}`,borderRadius:12,background:C.gp}}>
      <label htmlFor="harv-kg" style={{display:"block",fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>How much did you pick? (kg)</label>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <input id="harv-kg" type="number" inputMode="decimal" min="0" step="0.1" autoFocus value={harvKg} onChange={e=>{setHarvKg(e.target.value);setHarvEdited(true);}}
          style={{width:110,padding:"9px 12px",border:`1.5px solid ${C.bdr}`,borderRadius:10,fontSize:16,background:C.card,color:C.text}}/>
        <Btn v="success" onClick={()=>harv(plot)}>Save harvest</Btn>
        <Btn v="ghost" sm onClick={()=>{setHarvKg(null);setHarvEdited(false);}}>Cancel</Btn>
      </div>
      <div style={{fontSize:11.5,color:C.t2,marginTop:6}}>Prefilled with the estimate. Weigh it if you can.</div>
    </div>
  );
  return (
    <Overlay ariaLabel={plot.name || plot.crop} title={<span style={{display:"inline-flex",alignItems:"center",gap:8}}><FarmIcon name={plot.crop} emoji={crop.emoji} size={28} harvest/>{plot.name || plot.crop}</span>} onClose={onClose} dock={dock} sheet layoutId={layoutId}>
      <div className="cd-hero">
        <span className="cd-hero-art"><PlantArt crop={plot.crop} stage={harvested ? 5 : growth.index} size={84}/></span>
        <div className="cd-hero-text">
          <b>{harvested ? "Harvested" : ready ? "Ready to pick" : growth.label}</b>
          <span>{[zone && zone.name, !ready && !harvested && when !== growth.label ? when : ""].filter(Boolean).join(" · ")}</span>
          {canHarvestNow && <Btn onClick={()=>setHarvKg(String(harvDefault(plot)))}>Harvest</Btn>}
        </div>
      </div>
      {harvestForm}

      {notStarted && !harvested && (
        <Card style={{marginBottom:14,background:C.gp,border:`1px solid ${C.gm}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.green}}>Not in the ground yet</div>
          <div style={{fontSize:12.5,color:C.t2,margin:"4px 0 10px",lineHeight:1.5}}>
            Tap on the day you {verb === "Plant" ? "plant" : "sow"} it: the steps and the harvest date start from then.
          </div>
          <Btn sm onClick={startNow}>{verb === "Plant" ? "I planted it today" : "I sowed it today"}</Btn>
        </Card>
      )}

      {!harvested && !notStarted && (
        <>
          {/* its five stages, the current one marked; tap the one you see to correct the estimate */}
          <ol className="cd-stages" aria-label={`Growth stages: now ${growth.label}`}>
            {STAGES.slice(1).map((label, i) => (
              <li key={label} className={i + 1 === growth.index ? "on" : i + 1 < growth.index ? "done" : ""}>
                <button type="button" disabled={!setData} aria-pressed={i + 1 === growth.index} aria-label={`${label}${i + 1 === growth.index ? " (now)" : ""}`} onClick={() => setObserved(plot.observedStage === i + 1 ? "" : String(i + 1))}>
                  <PlantArt crop={plot.crop} stage={i + 1} size={46} />
                  <small>{label === "Harvest window" ? "Harvest" : label}</small>
                </button>
              </li>
            ))}
          </ol>
          <div className="cd-stage-note">
            {setData && (observed
              ? <button type="button" className="q-text-button" onClick={() => setObserved("")}>Stage set by you · use the estimate</button>
              : <span>Looks different? Tap the stage you see.</span>)}
            {editable && !editLayout && <button type="button" className="q-text-button" onClick={() => setEditLayout(true)}>Edit spacing and layout</button>}
          </div>
        </>
      )}
      {editLayout && editable && <PlantingLayoutEditor data={data} setData={setData} zone={editable.zone} plot={editable.plot} onDone={() => setEditLayout(false)}/>}

      <div className="cd-facts">
        {plot.plantCount > 0 && <div><small>{isTree ? "Trees" : "Plants"}</small><b>{plot.plantCount}</b></div>}
        {plot.qty > 0 && plot.measureType === "area" && <div><small>Area</small><b>{plot.qty} m²</b></div>}
        {plot.expectedYieldKg > 0 && <div><small>Est. yield</small><b>~{fmtWeight(plot.expectedYieldKg)}</b></div>}
        <div><small>{verb === "Plant" ? "Planted" : "Sown"}</small><b>{notStarted ? "Not yet" : niceDate(plot.plantDate)}</b></div>
        {!notStarted && plot.harvestDate && <div><small>Harvest</small><b>{niceDate(plot.harvestDate)}</b></div>}
      </div>

      <PlantDiary data={data} setData={setData} plot={plot}/>

      <StepChecklist compact steps={plot.steps} plantDate={notStarted ? null : plot.plantDate} onToggle={togStep} plotId={plot.id}/>

      <details className="cd-more">
        <summary>Care guide</summary>
        <div className="cd-more-body">
          <div style={{display:"flex",gap:6,margin:"4px 0 12px",flexWrap:"wrap"}}>
            <Pill>☀ {crop.sun} sun</Pill>
            <Pill>💧 {crop.waterFreq}</Pill>
            {plot.plantCount && crop.spacing ? <Pill>{plot.layout?.spacingCM || crop.spacing} cm apart</Pill> : null}
            {crop.pH && <Pill>pH {crop.pH}</Pill>}
          </div>
          <WaterCard waterNote={crop.waterNote} waterFreq={crop.waterFreq}/>
          {crop.fert && <Card style={{marginBottom:12,background:C.soft}}><div style={SX.lblGreen}>Feeding</div><div style={{fontSize:13,marginTop:4,lineHeight:1.5}}>{crop.fert}</div></Card>}
          {crop.pests && crop.pests.length > 0 && <Card style={{marginBottom:12,background:C.harvestBg}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>Pests and fixes</div>{crop.pests.slice(0,3).map(function(pst,i){return <div key={i} style={{marginTop:4}}><strong style={{fontSize:12.5}}>{pst.n}</strong>{pst.t && <div style={SX.t2_12mt2}>→ {pst.t}</div>}</div>;})}</Card>}
          {showComp && (
            <Card style={{marginBottom:12,background:compBad.length > 0 ? C.dangerBg : C.soft}}>
              <div style={SX.lblGreen}>Neighbours in this bed</div>
              {compGood.length > 0 && <div style={{fontSize:12.5,color:C.green,marginTop:4}}>✓ Good: {compGood.join(", ")}</div>}
              {compBad.length  > 0 && <div style={{fontSize:12.5,color:C.red,marginTop:4}}>✕ Keep apart: {compBad.join(", ")}</div>}
            </Card>
          )}
          {plot.zone && zone && zoneStats && zoneStats.totalM2 > 0 && (
            <Card style={{marginBottom:12, background: zoneStats.pct >= 0.95 ? C.dangerBg : zoneStats.pct >= 0.7 ? C.harvestBg : C.soft}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:700,color:zoneFill}}>
                  {zoneStats.pct >= 0.95 ? "Bed is full" : zoneStats.pct >= 0.7 ? "Bed is getting full" : "Space in this bed"}
                </div>
                <div style={{fontSize:12,color:C.t2}}>{zone.name}</div>
              </div>
              <div style={{height:8,borderRadius:4,background:C.bdr,overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:`${Math.min(100,zoneStats.pct*100).toFixed(0)}%`,background:zoneFill,borderRadius:4,transition:"width .4s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",fontSize:12,color:C.t2}}>
                {zoneMyArea > 0 && <span>This crop: <strong style={{color:C.text}}>{Math.round(zoneMyArea*10)/10} m²</strong></span>}
                <span>Free: <strong style={{color:zoneFill}}>{zoneStats.freeM2} m²</strong> of {Math.round(zoneStats.totalM2*10)/10} m²</span>
              </div>
            </Card>
          )}
          <StorageCard storage={crop.storage}/>
          {setPage && (
            <button onClick={function(){onClose();setPage("manuals");}} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:C.green,fontWeight:600,padding:"10px 14px",background:C.gp,borderRadius:C.rs,border:`1px solid ${C.bdr}`,marginBottom:8,cursor:"pointer",width:"100%",textAlign:"left"}}>
              Full {crop.name.toLowerCase()} guide in Learn →
            </button>
          )}
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(crop.name + " growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:C.t2,textDecoration:"underline",fontWeight:600,padding:"8px 2px",marginBottom:4}}>Videos on growing {crop.name.toLowerCase()}</a>
        </div>
      </details>

      {confirmDel ? (
        <div role="alert" style={{padding:"12px 14px",borderRadius:12,background:C.dangerBg,marginBottom:4}}>
          <div style={{fontSize:13.5,fontWeight:600,marginBottom:10}}>Remove this planting and its notes?</div>
          <Actions><Btn v="secondary" onClick={()=>setConfirmDel(false)}>Keep it</Btn><Btn v="danger" onClick={()=>del(plot.id)}>Yes, remove</Btn></Actions>
        </div>
      ) : (
        <Actions className="is-inline">
          <button type="button" className="mt-danger-link" onClick={()=>del(plot.id)}>Remove planting</button>
        </Actions>
      )}
    </Overlay>
  );
}

export default PlotOverlay;
