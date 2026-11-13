import React, { useMemo, useState } from "react";
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
import { editablePlanting } from "../quiet/planting-plan";
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
  const growth = growthOf(plot, crop, todayLocalKey());
  const waiting = isAwaitingSowing(plot);
  const notStarted = waiting || plot.status === "planned" || !plot.plantDate;
  const verb = sowVerb(plot.steps);
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

  const canHarvestNow = plot.status !== "harvested" && !!plot.harvestDate && localDateFromKey(plot.harvestDate) <= localDateFromKey(todayLocalKey()) && harvKg == null;
  return (
    <Overlay ariaLabel={plot.name || plot.crop} title={<span style={{display:"inline-flex",alignItems:"center",gap:8}}><FarmIcon name={plot.crop} emoji={crop.emoji} size={24}/>{plot.name || plot.crop}</span>} onClose={onClose} dock={dock} sheet layoutId={layoutId}>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        <Pill>{plot.status === "harvested" ? "Harvested" : growth.label}</Pill>
        <Pill>☀ {crop.sun}</Pill>
        <Pill>💧 {crop.waterFreq}</Pill>
        {zone && <Pill c={C.blue} bg={C.waterBg}>📍 {zone.name}</Pill>}
      </div>

      {plot.status !== "harvested" && (
        <Card style={{marginBottom:14,padding:"12px 14px"}}>
          {/* where this planting is on its way to harvest: its five stages, the current one marked */}
          <ol className="q-growth-steps" aria-label={`Growth stages: now ${growth.label}`}>
            {STAGES.slice(1).map((label, i) => (
              <li key={label} className={i + 1 === growth.index ? "on" : i + 1 < growth.index ? "done" : ""} aria-current={i + 1 === growth.index ? "step" : undefined}>
                <PlantArt crop={plot.crop} stage={i + 1} size={30} />
                <small>{label}</small>
              </li>
            ))}
          </ol>
          {setData && (
            <div className="q-row q-wrap q-plant-actions">
              <label className="q-stage-select">
                Growth stage
                <select aria-label={`Observed stage for ${plot.name || plot.crop}`} value={plot.observedStage ?? ""} onChange={e => setObserved(e.target.value)}>
                  <option value="">Use estimate</option>
                  {STAGES.slice(1).map((l, i) => <option value={i + 1} key={l}>{l}</option>)}
                </select>
              </label>
              {editable && !editLayout && <button type="button" className="q-text-button" onClick={() => setEditLayout(true)}>Edit spacing & layout</button>}
            </div>
          )}
        </Card>
      )}
      {editLayout && editable && <PlantingLayoutEditor data={data} setData={setData} zone={editable.zone} plot={editable.plot} onDone={() => setEditLayout(false)}/>}
      <PlantDiary data={data} setData={setData} plot={plot}/>

      {(plot.plantCount > 0 || plot.qty > 0 || plot.expectedYieldKg > 0) && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:14}}>
          {plot.plantCount > 0 && <Card style={{background:C.soft,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Plants</div><div style={{fontSize:20,fontWeight:700,color:C.green}}>{plot.plantCount}</div><div style={SX.t2_10}>{notStarted ? "planned" : "in the ground"}</div></Card>}
          {plot.qty > 0 && plot.measureType === "area" && <Card style={{background:C.waterBg,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Area</div><div style={{fontSize:20,fontWeight:700,color:C.blue}}>{plot.qty}m²</div><div style={SX.t2_10}>bed size</div></Card>}
          {plot.qty > 0 && plot.measureType === "plants" && !plot.plantCount && <Card style={{background:C.waterBg,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Count</div><div style={{fontSize:20,fontWeight:700,color:C.blue}}>{plot.qty}</div><div style={SX.t2_10}>plants</div></Card>}
          {plot.expectedYieldKg > 0 && <Card style={{background:C.harvestBg,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Est. yield</div><div style={{fontSize:20,fontWeight:700,color:C.orange}}>~{fmtWeight(plot.expectedYieldKg)}</div><div style={SX.t2_10}>at harvest</div></Card>}
          {plot.plantCount && crop.spacing ? <Card style={{background:C.surface,padding:"10px 14px"}}><div style={SX.capHeaderT2}>Spacing</div><div style={{fontSize:20,fontWeight:700,color:C.text}}>{plot.layout?.spacingCM||crop.spacing}cm</div><div style={SX.t2_10}>{plot.layout?.pattern==='scatter'?'minimum distance':'between plants'}</div></Card> : null}
        </div>
      )}

      {plot.zone && zone && zoneStats && zoneStats.totalM2 > 0 && (
        <Card style={{marginBottom:12, background: zoneStats.pct >= 0.95 ? C.dangerBg : zoneStats.pct >= 0.7 ? C.harvestBg : C.soft}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:zoneFill}}>
              {zoneStats.pct >= 0.95 ? "Bed is full" : zoneStats.pct >= 0.7 ? "Bed is getting full" : "Space in this bed"}
            </div>
            <div style={{fontSize:11,color:C.t2,fontFamily:F.mono}}>{zone.name}</div>
          </div>
          <div style={{height:8,borderRadius:4,background:C.bdr,overflow:"hidden",marginBottom:6}}>
            <div style={{height:"100%",width:`${Math.min(100,zoneStats.pct*100).toFixed(0)}%`,background:zoneFill,borderRadius:4,transition:"width .4s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t2}}>
            <span>Used: <strong style={{color:C.text}}>{zoneStats.usedM2}m²</strong></span>
            {zoneMyArea > 0 && <span>This crop: <strong style={{color:zoneFill}}>{Math.round(zoneMyArea*10)/10}m²</strong></span>}
            <span>Free: <strong style={{color:zoneFill}}>{zoneStats.freeM2}m²</strong> of {Math.round(zoneStats.totalM2*10)/10}m²</span>
          </div>
        </Card>
      )}

      {showComp && (
        <Card style={{marginBottom:12,background:compBad.length > 0 ? C.dangerBg : C.soft}}>
          <div style={SX.lblGreen}>Companions in zone</div>
          {compGood.length > 0 && <div style={{fontSize:12,color:C.green,marginTop:4}}>✓ Good: {compGood.join(", ")}</div>}
          {compBad.length  > 0 && <div style={{fontSize:12,color:C.red,marginTop:4}}>✕ Bad: {compBad.join(", ")}</div>}
        </Card>
      )}

      {notStarted && plot.status !== "harvested" && (
        <Card style={{marginBottom:12,background:C.gp,border:`1px solid ${C.gm}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.green}}>Not in the ground yet</div>
          <div style={{fontSize:12.5,color:C.t2,margin:"4px 0 10px",lineHeight:1.5}}>
            {verb === "Plant" ? "Plant it" : "Sow it"} when you're ready. Tap below on the day you do: the growing steps and harvest date start from then.
          </div>
          <Btn sm onClick={startNow}>{verb === "Plant" ? "I planted it today" : "I sowed it today"}</Btn>
        </Card>
      )}
      <WaterCard waterNote={crop.waterNote} waterFreq={crop.waterFreq}/>
      <div className="g2" style={{gap:8,marginBottom:16}}>
        <Card><div style={SX.t2_11b}>{verb === "Plant" ? "PLANTED" : "SOWN"}</div><div style={{fontSize:15,fontWeight:700}}>{notStarted ? "Not yet" : niceDate(plot.plantDate)}</div></Card>
        <Card><div style={SX.t2_11b}>HARVEST</div><div style={{fontSize:15,fontWeight:700}}>{notStarted ? `${(plot.growDays || crop.days || 60) < 14 ? `about ${plot.growDays || crop.days} days` : `about ${Math.round((plot.growDays || crop.days || 60) / 7)} weeks`} after ${verb === "Plant" ? "planting" : "sowing"}` : niceDate(plot.harvestDate)}</div></Card>
      </div>

      <Card style={{marginBottom:12,background:C.soft,border:`1px solid ${C.gm}`}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>Crop data</span>{crop.pH && <Pill c={C.text} bg={C.warm}>pH {crop.pH}</Pill>}</div></Card>
      {crop.fert && <Card style={{marginBottom:12,background:C.soft}}><div style={SX.lblGreen}>Feeding</div><div style={{fontSize:12,marginTop:4,lineHeight:1.5}}>{crop.fert}</div></Card>}
      {crop.pests && crop.pests.length > 0 && <Card style={{marginBottom:12,background:C.harvestBg}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>Pests and fixes</div>{crop.pests.slice(0,3).map(function(pst,i){return <div key={i} style={{marginTop:4}}><strong style={{fontSize:11}}>{pst.n}</strong>{pst.t && <div style={SX.t2_11}>→ {pst.t}</div>}</div>;})}</Card>}

      <StepChecklist steps={plot.steps} plantDate={notStarted ? null : plot.plantDate} onToggle={togStep} plotId={plot.id}/>
      <StorageCard storage={crop.storage}/>
      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(crop.name + " growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:C.red,textDecoration:"none",fontWeight:600,padding:"8px 14px",background:C.dangerBg,borderRadius:C.rs,border:`1px solid ${C.bdr}`,marginBottom:8}}>▶ Search YouTube for {crop.name.toLowerCase()} growing guides</a>
      {setPage && (
        <button onClick={function(){onClose();setPage("manuals");}} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.green,fontWeight:600,padding:"8px 14px",background:C.gp,borderRadius:C.rs,border:`1px solid ${C.bdr}`,marginBottom:12,cursor:"pointer",width:"100%",textAlign:"left"}}>
          Need help growing {crop.name}? Read the full guide in Learn →
        </button>
      )}

      {confirmDel ? (
        <div role="alert" style={{padding:"12px 14px",borderRadius:12,background:C.dangerBg,marginBottom:4}}>
          <div style={{fontSize:13.5,fontWeight:600,marginBottom:10}}>Remove this planting and its notes?</div>
          <Actions><Btn v="secondary" onClick={()=>setConfirmDel(false)}>Keep it</Btn><Btn v="danger" onClick={()=>del(plot.id)}>Yes, remove</Btn></Actions>
        </div>
      ) : (
        <Actions className={canHarvestNow ? "" : "is-inline"}>
          <button type="button" className="mt-danger-link" onClick={()=>del(plot.id)}>Remove planting</button>
          {canHarvestNow ? <Btn onClick={()=>setHarvKg(String(harvDefault(plot)))}>Harvest</Btn> : null}
        </Actions>
      )}
      {harvKg != null && (
        <div style={{marginTop:10,padding:"12px 14px",border:`1.5px solid ${C.green}`,borderRadius:12,background:C.gp}}>
          <label htmlFor="harv-kg" style={{display:"block",fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>How much did you pick? (kg)</label>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input id="harv-kg" type="number" inputMode="decimal" min="0" step="0.1" value={harvKg} onChange={e=>{setHarvKg(e.target.value);setHarvEdited(true);}}
              style={{width:110,padding:"9px 12px",border:`1.5px solid ${C.bdr}`,borderRadius:10,fontSize:16,background:C.card,color:C.text}}/>
            <Btn v="success" onClick={()=>harv(plot)}>Save harvest</Btn>
            <Btn v="ghost" sm onClick={()=>{setHarvKg(null);setHarvEdited(false);}}>Cancel</Btn>
          </div>
          <div style={{fontSize:11.5,color:C.t2,marginTop:6}}>Prefilled with MyTerra's estimate. Weigh it if you can — Insights compare real harvests with the estimate.</div>
        </div>
      )}
    </Overlay>
  );
}

export default PlotOverlay;

