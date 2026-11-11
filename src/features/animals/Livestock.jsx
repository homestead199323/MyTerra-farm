import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { C, SX } from "../../lib/theme";
import { uid } from "../../lib/storage";
import { appendLog, todayLocalKey, markTaskDone } from "../../lib/utils";
import { addStock } from "../../lib/inventory";
import { recordProduce, subtractProduce } from "../../lib/memory";
import { toast } from "../../lib/toast";
import { LDB } from "../../data/livestock";
import { BREEDS } from "../../data/breeds";
import { Btn, Card, Inp, Sel, Overlay } from "../../components/ui";
import AnimalOverlay from "./AnimalOverlay";
import { currencySymbol } from "../../lib/money";
import AnimalArt from "../quiet/AnimalArt";
import { animalGroups } from "../quiet/farm-model";

/* ═══════════════════════════════════════════
   LIVESTOCK
   ═══════════════════════════════════════════ */
function Livestock({data, setData}) {
  const [showAdd,setShowAdd]=useState(false);const [sel,setSel]=useState(null);const [showK,setShowK]=useState(null);const [kQ,setKQ]=useState("1");
  const [showCollect,setShowCollect]=useState(null); // {animal, produce}
  const [collectQty,setCollectQty]=useState("");
  const [form,setForm]=useState({name:"",type:"Chicken",breed:"",count:"1",cost:"",zone:""});

  const breedOptions = BREEDS[form.type] || [];
  const selectedBreed = breedOptions.find(b => b.name === form.breed);

  // Count: whole number 1–10,000. Cost: optional, 0–1,000,000 (typos like 1e12 would wreck Money and Insights).
  const MAX_HEAD=10000, MAX_COST=1000000;
  const countN=+form.count, costN=form.cost===""?0:+form.cost;
  const addErr=!Number.isInteger(countN)||countN<1?"Enter a whole number of animals, 1 or more.":countN>MAX_HEAD?`That's more than ${MAX_HEAD.toLocaleString()} animals — check the count.`:!Number.isFinite(costN)||costN<0?"Cost can't be negative.":costN>MAX_COST?"That cost looks too high — check the number.":"";
  const add=()=>{
    if(addErr)return;
    const nd={...data,livestock:{...data.livestock,animals:[...data.livestock.animals,{...form,id:uid(),count:countN,cost:costN>0?String(Math.round(costN*100)/100):""}]},log:appendLog(data.log,{text:`Added ${form.count} ${form.type}${form.breed?` (${form.breed})`:""}`})};
    if(costN>0)nd.costs={...(data.costs||{}),items:[...(data.costs?.items||[]),{id:uid(),type:"expense",amount:Math.round(costN*100)/100,label:`${form.type}${form.breed?` ${form.breed}`:""}`,date:todayLocalKey(),cat:"Animals",for:`species:${form.type}`,capital:true}]};
    setData(nd);setForm({name:"",type:"Chicken",breed:"",count:"1",cost:"",zone:""});setShowAdd(false);
  };
  // del moved into AnimalOverlay component — no longer needed here

  const doCollect=(animal, produce, qty)=>{
    const db=LDB[animal.type];if(!db)return;
    const p=db.out[produce];if(!p)return;
    const daily = produce === "Eggs" || produce === "Milk";
    if (!(qty > 0) && !daily) return; // LDB figures for honey/wool/meat are per year or per animal, never a day's default
    const finalQty = qty > 0 ? qty : Math.round(p.p*animal.count*10)/10;
    const kind=produce==="Eggs"?"eggs":produce==="Milk"?"milkL":produce==="Meat"?"meatKg":null;
    // Blank amount = MyTerra's default → flagged as an estimate in the garden memory.
    const remembered=kind?recordProduce(data,animal.type,kind,finalQty,todayLocalKey(),!(qty>0)):data;
    // Collected here → today's eggs/milk job is done too, so it can't be logged twice.
    const taskKey=produce==="Eggs"?`species-${animal.type}-eggs`:produce==="Milk"?`species-${animal.type}-milk`:null;
    const ticked=taskKey?markTaskDone(remembered,taskKey):remembered;
    setData({...ticked,
      pantry:addStock(data,{name:`${animal.type} ${produce}`,category:produce==="Eggs"?"Eggs":produce==="Meat"?"Meat":produce==="Milk"?"Dairy":"Other",qty:finalQty,unit:produce==="Eggs"?"pcs":produce==="Milk"?"L":"kg",source:"livestock",storageNote:p.s},todayLocalKey()).pantry,
      log:appendLog(data.log,{text:`Collected ${finalQty} ${produce==="Eggs"?"eggs":produce.toLowerCase()} from ${animal.name||animal.type}`})
    });
    setShowCollect(null);setCollectQty("");
  };

  // How many to process: a whole number from 1 to the group size (a typed 0 or blank no longer means 1).
  const killQ=k=>{const q=+String(kQ).trim();return String(kQ).trim()!==""&&Number.isInteger(q)&&q>=1&&k&&q<=k.count?q:0;};
  const kill=a=>{const db=LDB[a.type];if(!db)return;const q=killQ(a);if(!q)return;const mp=db.out.Meat;if(!mp)return;const mq=Math.round(mp.p*q*10)/10;const today=todayLocalKey();
    const stocked=addStock(data,{name:`${a.type} Meat`,category:"Meat",qty:mq,unit:"kg",source:"livestock",storageNote:mp.s},today);const items=stocked.pantry?.items||[];const lotId=items.length?items[items.length-1].id:null;
    setData({...recordProduce(data,a.type,"meatKg",mq,today,true),livestock:{...data.livestock,animals:data.livestock.animals.map(x=>x.id===a.id?(x.count-q<=0?null:{...x,count:x.count-q}):x).filter(Boolean)},pantry:stocked.pantry,log:appendLog(data.log,{text:`🔪 ${q} ${a.type} → ${mq}kg`})});setShowK(null);
    // Undo puts the animals back and takes out what is left of that meat lot, on the farm as it is now.
    toast(`${q} ${a.type} processed`,{detail:`+${mq} kg added to your pantry`,actionLabel:"Undo",onAction:()=>setData(d=>{const animals=d.livestock?.animals||[];const has=animals.some(x=>x.id===a.id);const back=has?animals.map(x=>x.id===a.id?{...x,count:x.count+q}:x):[...animals,{...a,count:q}];const pantry=d.pantry||{items:[]};const left=(pantry.items||[]).map(it=>{if(it.id!==lotId)return it;const r=Math.round(((Number(it.qty)||0)-mq)*1000)/1000;return r>0?{...it,qty:r}:null;}).filter(Boolean);return{...subtractProduce(d,a.type,"meatKg",mq,today,true),livestock:{...d.livestock,animals:back},pantry:{...pantry,items:left}};})});
  };
  const sa=sel?data.livestock.animals.find(a=>a.id===sel):null;
  // Split by where the animals live on the farm, as crops are split into beds, herbs and orchard.
  const [openSec,setOpenSec]=useState({});
  const groups=animalGroups(data.livestock.animals,data.zones);

  return (
    <div className="page-enter" style={SX.mw800}>
      <div className="pg-head" style={SX.pageHead}><div><h2 className="pg-h2" style={SX.headerH2}>Your animals</h2><p className="pg-sub" style={SX.pageSubHead}>Manage your animals, collect produce, track care</p></div><Btn onClick={()=>setShowAdd(true)}>+ Add</Btn></div>
      <div style={{marginTop:16,display:"grid",gap:8}}>{data.livestock.animals.length===0?<Card style={{textAlign:"center",padding:"56px 24px",background:C.grdLight}}><div style={SX.s15Bold}>No animals yet</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Add chickens, goats, or any livestock to track them</div></Card>:groups.map(function(g){const open=openSec[g.key]??true;return (
        <section key={g.key} style={{marginBottom:10}}>
          <button type="button" aria-expanded={open} onClick={function(){setOpenSec({...openSec,[g.key]:!open});}}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,width:"100%",minHeight:44,padding:"8px 2px",margin:"0 0 8px",background:"none",border:0,borderBottom:`1px solid ${C.bdr}`,cursor:"pointer",color:C.text,textAlign:"left"}}>
            <span style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
              {open?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
              <span style={{fontSize:17,fontWeight:650,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{g.title}</span>
            </span>
            <span style={{fontSize:12,color:C.t2,whiteSpace:"nowrap"}}>{g.head} {g.animals.every(function(x){return x.type==="Bee";})?(g.head===1?"hive":"hives"):(g.head===1?"animal":"animals")}</span>
          </button>
          {open&&<div style={{display:"grid",gap:8}}>{g.animals.map(function(a){const db=LDB[a.type];return (
        <Card key={a.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <button className="q-animal-open" onClick={()=>setSel(a.id)}>
            <AnimalArt species={a.type} size={72}/><div><strong style={{fontSize:15}}>{a.name||a.type}</strong>{a.breed?<span style={SX.t2_12}> ({a.breed})</span>:null}<div style={SX.t2_12}>×{a.count} · Guide & details</div></div>
          </button>
          <div className="q-animal-actions">
            <select aria-label={`Area for ${a.name||a.type}`} value={a.zone||""} onChange={e=>setData({...data,livestock:{...data.livestock,animals:data.livestock.animals.map(x=>x.id===a.id?{...x,zone:e.target.value}:x)}})}><option value="">Automatic area</option>{data.zones.filter(z=>['pasture','barn','coop','beehive'].includes(z.type)).map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select>
            {db?.prod.includes("Eggs")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Eggs"});setCollectQty(String(Math.round(a.count*(db.out?.Eggs?.p||0.7))))}}>Collect Eggs</Btn>}
            {db?.prod.includes("Milk")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Milk"});setCollectQty(String(Math.round(a.count*(db.out?.Milk?.p||2.5)*10)/10))}}>Milk</Btn>}
            {db?.prod.includes("Honey")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Honey"});setCollectQty(String(Math.round(a.count*0.5*10)/10))}}>Honey</Btn>}
            {db?.prod.includes("Wool")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Wool"});setCollectQty(String(a.count*3))}}>Wool</Btn>}
            {db?.prod.includes("Meat")&&<button type="button" className="q-animal-meat" aria-label={`Process ${a.name||a.type} for meat`} title="Process for meat" onClick={()=>{setShowK(a);setKQ("1")}}>Meat</button>}
          </div>
        </div></Card>
      );})}</div>}
        </section>
      );})}</div>

      {/* Manual Collection Modal */}
      {showCollect&&<Overlay title={`Collect ${showCollect.produce}`} onClose={()=>setShowCollect(null)}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <span style={{fontSize:48}}>{showCollect.produce==="Eggs"?"🥚":showCollect.produce==="Milk"?"🥛":showCollect.produce==="Honey"?"🍯":"🧶"}</span>
          <div style={{fontSize:15,fontWeight:600,marginTop:8}}>From {showCollect.animal.name||showCollect.animal.type} (×{showCollect.animal.count})</div>
        </div>
        <Inp label={`Quantity (${showCollect.produce==="Eggs"?"eggs":showCollect.produce==="Milk"?"litres":"kg"})`} type="number" min="0" step={showCollect.produce==="Eggs"?"1":"0.1"} value={collectQty} onChange={e=>setCollectQty(e.target.value)} />
        <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Suggested daily: ~{LDB[showCollect.animal.type]?.out[showCollect.produce]?.p||0} {LDB[showCollect.animal.type]?.out[showCollect.produce]?.u||""} per animal</div>
        <div style={SX.btnRowEnd}>
          <Btn v="secondary" onClick={()=>setShowCollect(null)}>Cancel</Btn>
          <Btn v="success" dis={!(+collectQty>0)&&showCollect.produce!=="Eggs"&&showCollect.produce!=="Milk"} onClick={()=>doCollect(showCollect.animal,showCollect.produce,+collectQty||0)}>Collect → Pantry</Btn>
        </div>
      </Overlay>}

      {/* Care Guide */}
      {sa && <AnimalOverlay animal={sa} data={data} setData={setData} onClose={()=>setSel(null)}/>}

      {/* Process/Kill Modal */}
      {showK&&<Overlay title={`Process ${showK.name||showK.type} for meat`} onClose={()=>setShowK(null)}>
        <Inp label={`Qty (max ${showK.count})`} type="number" min="1" max={showK.count} value={kQ} onChange={e=>setKQ(e.target.value)}/>
        {!killQ(showK)&&<p role="alert" style={{fontSize:12,color:C.red,margin:"-6px 0 10px"}}>Enter a whole number from 1 to {showK.count}.</p>}
        {LDB[showK.type]?.out.Meat&&killQ(showK)>0&&<div style={{fontSize:13,marginBottom:12}}>Estimated: <strong>{Math.round(LDB[showK.type].out.Meat.p*killQ(showK)*10)/10}kg</strong> meat</div>}
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowK(null)}>Cancel</Btn><Btn v="danger" disabled={!killQ(showK)} onClick={()=>kill(showK)}>Process</Btn></div>
      </Overlay>}

      {/* Add Animal Modal — with breed dropdown */}
      {showAdd&&<Overlay title="Add animal" onClose={()=>setShowAdd(false)}>
        <Sel label="Animal Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value,breed:""})} options={Object.entries(LDB).map(([k,v])=>({value:k,label:`${v.e} ${k} — ${v.prod.join(", ")}`}))}/>
        {breedOptions.length > 0 && (
          <Sel label="Breed" value={form.breed} onChange={e=>setForm({...form,breed:e.target.value})} options={[{value:"",label:"— Select breed —"},...breedOptions.map(b=>({value:b.name,label:b.name}))]}/>
        )}
        {selectedBreed && <Card style={{marginBottom:12,background:C.tGreen,padding:12}}><div style={SX.lblGreen}>🧬 {selectedBreed.name}</div><div style={{fontSize:12,marginTop:4}}>{selectedBreed.note}</div></Card>}
        <Sel label="Area" value={form.zone||""} onChange={e=>setForm({...form,zone:e.target.value})} options={[{value:"",label:"Automatic area"},...data.zones.filter(z=>["barn","coop","pasture","beehive"].includes(z.type)).map(z=>({value:z.id,label:z.name}))]}/>
        <Inp label="Name / Label" placeholder="e.g. Layer Flock A" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <div style={SX.grid2}>
          <Inp label="Count" type="number" min="1" value={form.count} onChange={e=>setForm({...form,count:e.target.value})}/>
          <Inp label={`Cost (${currencySymbol(data).trim()})`} type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/>
        </div>
        {addErr&&form.count!==""&&<p role="alert" style={{fontSize:12,color:C.red,margin:"-4px 0 10px"}}>{addErr}</p>}
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add} disabled={!!addErr}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}

export default Livestock;

