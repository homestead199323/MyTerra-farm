import React, {useState} from "react";
import { C, SX } from "../../lib/theme";
import { LDB } from "../../data/livestock";
import { BREEDS } from "../../data/breeds";
import { Btn, Card, Overlay, Pill, Inp, Sel } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";
import { isMilking } from "../../lib/task-queue";

/* ═══════════════════════════════════════════
   ANIMAL OVERLAY — shared popup used from Livestock, TaskQueue, Dashboard
   ═══════════════════════════════════════════ */
function AnimalOverlay({animal, data, setData, onClose}) {
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState({name:animal.name||'',count:animal.count,zone:animal.zone||'',breed:animal.breed||''});
  const validCount=Number.isInteger(+draft.count)&&+draft.count>0;
  function save(){if(!validCount)return;setData({...data,livestock:{...data.livestock,animals:data.livestock.animals.map(a=>a.id===animal.id?{...a,...draft,name:draft.name.trim(),count:+draft.count}:a)}});setEditing(false);}
  const db = LDB[animal.type];
  if (!db) {
    return (
      <Overlay title={`${animal.name || animal.type}`} onClose={onClose} wide>
        <div style={{padding:"24px 12px",color:C.t2,fontSize:13}}>No livestock data for this species.</div>
      </Overlay>
    );
  }
  const del = id => {
    setData({...data, livestock: {...data.livestock,animals: data.livestock.animals.filter(a => a.id !== id)}});
    onClose();
  };
  const milk = db.out?.Milk ? isMilking(animal) : null;
  const setMilking = on => setData({...data, livestock: {...data.livestock, animals: data.livestock.animals.map(a => a.id === animal.id ? {...a, milking: on} : a)}});
  const breedInfo = animal.breed ? (BREEDS[animal.type] || []).find(b => b.name === animal.breed) : null;

  return (
    <Overlay title={<span style={{display:"inline-flex",alignItems:"center",gap:8}}><FarmIcon name={animal.type} emoji={db.e} size={24}/>{(animal.name || animal.type) + " Care Guide"}</span>} onClose={onClose} wide>
      <button className="q-text-button" onClick={()=>setEditing(!editing)} aria-expanded={editing}>Edit animal details</button>
      {editing&&<section className="q-inset"><Inp label="Name or group name" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/><Inp label="Number of animals" type="number" min="1" step="1" value={draft.count} onChange={e=>setDraft({...draft,count:e.target.value})}/><Sel label="Area" value={draft.zone} onChange={e=>setDraft({...draft,zone:e.target.value})} options={[{value:'',label:'Automatic area'},...data.zones.filter(z=>['barn','coop','pasture','beehive'].includes(z.type)).map(z=>({value:z.id,label:z.name}))]}/><Sel label="Breed" value={draft.breed} onChange={e=>setDraft({...draft,breed:e.target.value})} options={[{value:'',label:'Not specified'},...(BREEDS[animal.type]||[]).map(b=>({value:b.name,label:b.name}))]}/>{!validCount&&<p role="alert">Enter a whole number greater than zero.</p>}<div className="q-row"><Btn onClick={save} disabled={!validCount}>Save details</Btn><Btn v="secondary" onClick={()=>setEditing(false)}>Cancel</Btn></div></section>}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        <Pill>×{animal.count} head</Pill>
        {animal.breed && <Pill c={C.blue} bg={C.tBlue}>{animal.breed}</Pill>}
        {db.prod.map(p => <Pill key={p} c={C.green} bg={C.gp}>{p}</Pill>)}
      </div>
      {milk !== null && (
        <label className="q-check-row">
          <input type="checkbox" checked={milk} onChange={e => setMilking(e.target.checked)}/>
          <span><strong>Milking this group</strong><small>Adds a daily milking task. Turn off for dry, pregnant-late, male or meat animals.</small></span>
        </label>
      )}
      {breedInfo && (
        <Card style={{marginBottom:8,background:C.tBlue}}>
          <div style={{fontSize:12,fontWeight:700,color:C.blue}}>Breed: {breedInfo.name}</div>
          <div style={SX.s13mt4}>{breedInfo.note}</div>
          {breedInfo.eggs && <div style={{fontSize:12,color:C.green,marginTop:2}}>Egg production: ~{breedInfo.eggs} eggs/day per hen</div>}
        </Card>
      )}
      {[
        {i:"🍽",t:"Feeding",v:db.feed},
        {i:"🏠",t:"Housing",v:db.house},
        {i:"😴",t:"Sleeping",v:db.sleep},
        {i:"💕",t:"Breeding",v:db.breed},
      ].map(s => (
        <Card key={s.t} style={{marginBottom:8}}>
          <div style={SX.lblGreen}>{s.i} {s.t}</div>
          <div style={{fontSize:13,lineHeight:1.7,marginTop:4}}>{s.v}</div>
        </Card>
      ))}
      <Card style={{background:C.tPink,marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.red}}>Injuries & Treatment</div>
        {db.inj.map((j,i) => (
          <div key={i} style={{marginTop:8}}>
            <strong style={SX.s13}>{j.n}</strong>
            <div style={SX.t2_12mt2}>{j.t}</div>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:8,background:C.tGreen}}>
        <div style={SX.lblGreen}>Produce & Storage</div>
        {Object.entries(db.out).map(([k,v]) => (
          <div key={k} style={{marginTop:6}}>
            <strong style={{fontSize:12}}>{k}</strong>: ~{v.p} {v.u}
            <div style={SX.t2_11}>{v.s}</div>
          </div>
        ))}
      </Card>
      <Btn v="danger" sm onClick={()=>del(animal.id)}>Remove</Btn>
    </Overlay>
  );
}

export default AnimalOverlay;

