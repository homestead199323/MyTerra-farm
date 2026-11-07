import React, { useState, useMemo, useEffect, useRef } from "react";
import { C, F, SX } from "../../lib/theme";
import { rCR, rCM, getRegionalCalendar } from "../../lib/regional";
import { todayLocalKey, daysBetweenLocalKeys } from "../../lib/utils";
import { parseSowMonths, parseHarvestMonths, getCropDifficulty, MN_ABR, MN_FULL } from "../../lib/calendar";
import { COMP } from "../../data/companions";
import { LDB } from "../../data/livestock";
import { REGION_MAP } from "../../data/regions";
import { PRESERVATION } from "../../data/preservation";
import { RECIPES } from "../../data/recipes";
import { PROJECT_GUIDES, BLUEPRINT_IMAGES } from "../../data/projects";
import { Btn, Card, Inp, Overlay, Pill, Stat } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";

/* ═══════════════════════════════════════════
   ENCYCLOPEDIA
   ═══════════════════════════════════════════ */
function Manuals({data}) {
  const [s,setS]=useState("");const [sel,setSel]=useState(null);const [tab,setTab]=useState("crops");
  const rgCrops = rCR(data && data.region);
  const curRegion = REGION_MAP.get((data && data.region) || "western_europe");
  const q=s.trim().toLowerCase(); // spaces alone are not a search
  const fil=rgCrops.filter(c=>!q||c.name.toLowerCase().includes(q));
  const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  // The seasonal calendar moved to Plan (Launch Stage 5); SeasonalCalendar is still exported from here.
  const TABS=[{id:"crops",l:"🌱 Crops"},{id:"animals",l:"🐄 Animals"},{id:"preserving",l:"🫙 Preserving"},{id:"projects",l:"🔨 Projects"}];
  return (
    <div className="page-enter" style={{maxWidth:960}}>
      <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>📖 Learn</h2>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>Everything you need to know — crops, animals, preservation, and DIY builds</p>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>{TABS.map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSel(null);setS("");}} style={{padding:"8px 20px",borderRadius:20,border:"none",background:tab===t.id?C.green:C.card,color:tab===t.id?"#fff":C.t2,fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:tab===t.id?"none":C.sh}}>{t.l}</button>)}</div>

      {tab==="crops"&&<>
        {/* 6.7.2 — sticky search bar */}
        <div style={{position:"sticky",top:0,background:C.bg,zIndex:5,padding:"4px 0 8px",marginBottom:4}}>
          <Inp placeholder="Search crops..." value={s} onChange={e=>setS(e.target.value)}/>
        </div>
        {/* 6.7.1 — visual card grid (replaces admin-style rows) */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))",gap:10,marginTop:8}}>{fil.map(c=>(
          <div key={c.name} onClick={()=>setSel(c)} style={{background:C.card,borderRadius:C.r,boxShadow:C.sh,cursor:"pointer",padding:"14px 12px 12px",borderTop:`4px solid ${c.color}`,display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",justifyContent:"center"}}><FarmIcon name={c.name} emoji={c.emoji} size={38}/></div>
            <div style={{fontSize:13,fontWeight:700,textAlign:"center",letterSpacing:"-0.01em"}}>{c.name}</div>
            <div style={{display:"flex",justifyContent:"center"}}>
              <Pill sm c={c.color} bg={c.color+"22"}>{c.cat}</Pill>
            </div>
            <div style={{fontSize:11,color:C.t2,textAlign:"center",lineHeight:1.4}}>
              ☀ {c.sun} · {c.days}d
            </div>
          </div>
        ))}</div>
        {fil.length===0 && <Card style={{textAlign:"center",padding:"40px 24px",marginTop:12}}><div style={{fontSize:40,marginBottom:8}}>🔍</div><div style={SX.s15Bold}>No crops match "{s.trim()}"</div><div style={{color:C.t2,marginTop:4,fontSize:12}}>Try a different name or browse the full list</div></Card>}
        {sel&&<Overlay ariaLabel={sel.name} title={<span style={{display:"inline-flex",alignItems:"center",gap:8}}><FarmIcon name={sel.name} emoji={sel.emoji} size={24}/>{sel.name}</span>} onClose={()=>setSel(null)} wide>
          {sel && <div style={{background:C.tGreen2,borderRadius:C.rs,padding:10,marginBottom:12,border:`1px solid ${C.tGreenBandBd}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>🌱 Crop Data</span>{sel.pH&&<Pill>pH {sel.pH}</Pill>}</div></div>}
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}><Pill c="#fff" bg={sel.color}>{sel.cat}</Pill><Pill>☀ {sel.sun}</Pill><Pill>💧 {sel.waterFreq}</Pill>{sel?.pH ? <Pill>pH {sel.pH}</Pill> : null}</div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,fontFamily:F.mono,color:C.t2,marginBottom:4}}>CALENDAR</div><div style={{display:"flex",gap:2}}>{mn.map((m,mi)=>{const iS=parseSowMonths(sel.sowIn).includes(mi);const iH=parseHarvestMonths(sel.harvest).includes(mi);return <div key={m} style={{flex:1,textAlign:"center"}}><div style={{fontSize:8,color:C.t2,fontFamily:F.mono}}>{m}</div><div style={{height:14,borderRadius:3,background:iS&&iH?`linear-gradient(135deg,${C.green} 50%,${C.orange} 50%)`:iS?C.green:iH?C.orange:C.bdr,opacity:(iS||iH)?1:.25}}/></div>})}</div><div style={{display:"flex",gap:12,marginTop:4}}><span style={{fontSize:10,color:C.green}}>■ Sow</span><span style={{fontSize:10,color:C.orange}}>■ Harvest</span></div></div>
          {sel.regionNote && <Card style={{marginBottom:12,background:C.tGreenBand,border:`1.5px solid ${C.tGreenBandBd}`}}><div style={SX.lblGreen}>{curRegion ? curRegion.emoji + " " : "🌍 "}Regional Note — {curRegion ? curRegion.name : "Your Region"}</div><div style={{fontSize:12,marginTop:4,lineHeight:1.5,color:C.text}}>{sel.regionNote}</div></Card>}
          {COMP[sel.name]&&<Card style={{marginBottom:12,background:C.tGreen}}><div style={SX.lblGreen}>🌱 Companions</div><div style={{fontSize:12,marginTop:4}}>✓ {COMP[sel.name].good.join(", ")||"—"}{COMP[sel.name].bad.length>0?<span style={{color:C.red}}> · ✕ {COMP[sel.name].bad.join(", ")}</span>:""}</div></Card>}
          <Card style={{marginBottom:12,background:C.tBlue}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>💧 Water</div><div style={SX.s13mt4}>{sel.waterNote}</div></Card>
          {sel.steps?.length>0&&<div style={SX.mb12}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8}}>Step-by-Step Guide</div>{sel.steps.map((s,i)=><Card key={i} style={{marginBottom:4,padding:10}}><div style={{display:"flex",justifyContent:"space-between"}}><strong style={SX.s13}>{s.l}</strong><span style={{fontSize:10,color:C.t2,fontFamily:F.mono}}>Day {s.d}</span></div><div style={SX.t2_12mt2}>{s.t}</div></Card>)}</div>}
          {sel?.fert && <Card style={{marginBottom:12,background:C.tGreen}}><div style={SX.lblGreen}>🧪 Fertilizer</div><div style={{fontSize:12,marginTop:4,lineHeight:1.6}}>{sel.fert}</div></Card>}
          {sel?.pests&&sel.pests.length>0 && <Card style={{marginBottom:12,background:C.tOrange}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>🐛 Pests & Disease</div>{sel.pests.map(function(p,i){return <div key={i} style={{fontSize:12,marginTop:6}}><strong>{p.n}</strong>{p.t&&<div style={SX.t2_11mt2}>→ {p.t}</div>}</div>;})}</Card>}
          {sel.storage&&<Card style={{marginBottom:12,background:C.tYellow}}><div style={{fontSize:12,fontWeight:700,color:C.yellow}}>📦 Storage</div><div style={SX.s13mt4}>{sel.storage}</div></Card>}
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sel.name+" growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:C.red,textDecoration:"none",fontWeight:600,padding:"8px 14px",background:C.tPink,borderRadius:C.rs,border:`1px solid ${C.bdr}`,marginBottom:12}}>▶ Watch: Complete {sel.name} Growing Guide</a>
        </Overlay>}
      </>}

      {tab==="animals"&&<>
        <div style={{display:"grid",gap:8}}>{Object.entries(LDB).map(([n,db])=><Card key={n} onClick={()=>setSel({...db,name:n})} style={{cursor:"pointer"}}><div style={SX.rowCenterG10}><FarmIcon name={n} emoji={db.e} size={28}/><div style={SX.flex1}><strong style={{fontSize:15}}>{n}</strong><div style={SX.t2_12}>Produces: {db.prod.join(", ")}</div></div><span style={{color:C.t3}}>›</span></div></Card>)}</div>
        {sel?.feed&&<Overlay title={<span style={{display:"inline-flex",alignItems:"center",gap:8}}><FarmIcon name={sel.name} emoji={sel.e} size={24}/>{sel.name}</span>} onClose={()=>setSel(null)} wide>
          {[{i:"🍽",t:"Feeding",v:sel.feed},{i:"🏠",t:"Housing",v:sel.house},{i:"😴",t:"Sleep",v:sel.sleep},{i:"💕",t:"Breeding",v:sel.breed}].map(s=><Card key={s.t} style={{marginBottom:8}}><div style={SX.lblGreen}>{s.i} {s.t}</div><div style={{fontSize:13,lineHeight:1.7,marginTop:4}}>{s.v}</div></Card>)}
          <Card style={{background:C.tPink,marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>🩹 Injuries</div>{sel.inj.map((j,i)=><div key={i} style={{marginTop:6}}><strong>{j.n}</strong><div style={SX.t2_12}>{j.t}</div></div>)}</Card>
          {getRegionalCalendar(sel.name, data.region)&&<Card style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>📅 Monthly Calendar</div>{Object.entries(getRegionalCalendar(sel.name, data.region)).map(([m,t])=><div key={m} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.bdr}`}}><span style={{fontSize:11,fontWeight:700,color:C.green,width:28,flexShrink:0,fontFamily:F.mono}}>{m}</span><span style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{t}</span></div>)}</Card>}
        </Overlay>}
      </>}

      {tab==="preserving"&&<Preserving embedded/>}
      {tab==="projects"&&<Projects embedded/>}
    </div>
  );
}


/* ═══════════════════════════════════════════
   PRESERVATION MANUAL PAGE
   ═══════════════════════════════════════════ */
function Preserving({embedded}) {
  const [sel, setSel] = useState(null);
  const [catFilter, setCatFilter] = useState("All");

  // Each method is followed by the step-by-step recipes that belong to it (RECIPES[k].parent).
  // Recipe categories are listed first in the filter so they're easy to find.
  const recipeEntries = Object.entries(RECIPES);
  const items = [];
  Object.entries(PRESERVATION).forEach(function(entry) {
    items.push(entry);
    recipeEntries.forEach(function(re) { if (re[1].parent === entry[0]) items.push(re); });
  });
  recipeEntries.forEach(function(re) { if (!PRESERVATION[re[1].parent]) items.push(re); });
  const cats = ["All", ...new Set([...recipeEntries.map(([, r]) => r.cat), ...Object.values(PRESERVATION).map(r => r.cat)])];
  const filtered = catFilter === "All" ? items : items.filter(([, r]) => r.cat === catFilter);
  const LIST = { margin: 0, paddingLeft: 18 };
  const STEP_LABEL = /^([A-ZÇÖŞÜĞİ][A-Z0-9ÇÖŞÜĞİ ()&'’\-–+/.,%°#]{2,60}):\s/;

  const CAT_COLOR = {
    "Fermentation":             { bg: "#e8f5e9", c: "#2d6a4f", accent: "#52b788" },
    "Pickling":                 { bg: "#e3f2fd", c: "#1565c0", accent: "#42a5f5" },
    "Canning":                  { bg: "#fff8e1", c: "#e65100", accent: "#ffa726" },
    "Drying":                   { bg: "#fffde7", c: "#f57f17", accent: "#fdd835" },
    "Freezing":                 { bg: "#e8eaf6", c: "#3949ab", accent: "#7986cb" },
    "Cold Storage":             { bg: "#eceff1", c: "#37474f", accent: "#78909c" },
    "Oil Preservation":         { bg: "#f9fbe7", c: "#558b2f", accent: "#9ccc65" },
    "Dairy & Fermentation":     { bg: "#f3e5f5", c: "#6a1b9a", accent: "#ab47bc" },
    "Curing & Smoking":         { bg: "#fbe9e7", c: "#bf360c", accent: "#ff7043" },
    "Fermentation & Distilling":{ bg: "#fce4ec", c: "#880e4f", accent: "#ec407a" },
    "Apiary":                   { bg: "#fff8e1", c: "#f57f17", accent: "#ffca28" },
    "Cheese Recipes":           { bg: "#f3e5f5", c: "#6a1b9a", accent: "#8e24aa" },
    "Cured Meat Recipes":       { bg: "#fbe9e7", c: "#bf360c", accent: "#e64a19" },
    "Cooked Meat Recipes":      { bg: "#efebe9", c: "#4e342e", accent: "#8d6e63" },
  };

  const DIFF_COLOR = { Easy: C.green, Intermediate: C.orange, Advanced: C.red, "Easy (once set up)": C.green, "Easy (with hive access)": C.green, "Intermediate–Advanced": C.orange, "Easy–Intermediate": "#27ae60" };

  const InfoBlock = ({ label, color, bg, children }) => (
    <div style={{ background: bg || C.soft, borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: color || C.green, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={SX.bodyText}>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      {!embedded && <>
        <h2 style={{ fontFamily: F.head, fontSize: 28, margin: "0 0 4px" }}>🫙 Preservation Manual</h2>
        <p style={{ color: C.t2, fontSize: 14, margin: "0 0 16px" }}>
          Complete guide to every preservation method — ratios, science, safety, and troubleshooting
        </p>
      </>}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {cats.map(c => {
          const cc = CAT_COLOR[c] || { bg: C.gp, c: C.green };
          return (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: catFilter === c ? (cc.accent || C.green) : C.card,
              color: catFilter === c ? "#fff" : C.t2,
              fontSize: 12, fontWeight: 600, boxShadow: catFilter === c ? "none" : C.sh,
              transition: "all .15s"
            }}>{c}</button>
          );
        })}
      </div>

      {/* Method cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {filtered.map(([key, r]) => {
          const cc = CAT_COLOR[r.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
          const dc = DIFF_COLOR[r.difficulty] || C.t2;
          return (
            <div key={key} onClick={() => setSel(r)} style={{
              background: C.card, borderRadius: C.r, boxShadow: C.sh, cursor: "pointer",
              borderLeft: `5px solid ${cc.accent}`, overflow: "hidden", transition: "box-shadow .15s",
              padding: "16px 16px 14px"
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                    <Pill sm c={cc.accent} bg={cc.accent + "22"}>{r.cat}</Pill>
                    <Pill sm bg={dc + "22"} c={dc}>{r.difficulty}</Pill>
                    {r.time && <Pill sm bg={C.soft} c={C.t2}>⏱ {r.time}</Pill>}
                  </div>
                </div>
              </div>
              {/* Shelf life + teaser */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: C.t2 }}>📦 {r.shelf}</span>
                <span style={{ fontSize: 11, color: cc.accent, fontWeight: 600 }}>{r.parent ? "Open recipe →" : "Read manual →"}</span>
              </div>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{r.overview.slice(0, 110)}…</div>
            </div>
          );
        })}
      </div>

      {/* Detail overlay — full manual page */}
      {sel && (() => {
        const cc = CAT_COLOR[sel.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
        const dc = DIFF_COLOR[sel.difficulty] || C.t2;
        const parent = sel.parent ? PRESERVATION[sel.parent] : null;
        const kids = recipeEntries.filter(([, r]) => PRESERVATION[r.parent] === sel);
        return (
          <Overlay key={sel.name} title="" onClose={() => setSel(null)} wide>
            {/* Hero header */}
            <div style={{ background: `linear-gradient(135deg, ${cc.accent}26, ${cc.accent}0a)`, borderRadius: C.rs, padding: "20px 20px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 44 }}>{sel.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontFamily: F.head, fontSize: 22, lineHeight: 1.2 }}>{sel.name}</h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <Pill c={cc.accent} bg={cc.accent + "22"}>{sel.cat}</Pill>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: C.card, color: dc, border: `1px solid ${dc}`, fontWeight: 600, fontFamily: F.body, lineHeight: 1.45 }}>{sel.difficulty === "Easy" || sel.difficulty.startsWith("Easy") ? "✓ " : sel.difficulty.startsWith("Advanced") ? "⚠ " : "◎ "}{sel.difficulty}</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: C.card, color: C.t2, fontWeight: 600, fontFamily: F.body, lineHeight: 1.45 }}>📦 {sel.shelf}</span>
                  </div>
                  {(sel.time || sel.yield || sel.origin) && (
                    <div style={{ fontSize: 12, color: C.t2, marginTop: 8, lineHeight: 1.5 }}>
                      {sel.time ? "⏱ " + sel.time : ""}{sel.time && sel.yield ? " · " : ""}{sel.yield ? "🍽 " + sel.yield : ""}{sel.origin ? " · 🌍 " + sel.origin : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recipe → back to its parent method */}
            {parent && (
              <button onClick={function() { setSel(parent); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.soft, border: `1px solid ${C.bdr}`, borderRadius: 20, padding: "6px 12px", marginBottom: 12, fontSize: 12, fontWeight: 600, color: C.t2, cursor: "pointer" }}>
                ← Part of {parent.icon} {parent.name}
              </button>
            )}

            {/* Overview */}
            <InfoBlock label="📖 Overview" color={cc.accent} bg={cc.accent + "1a"}>
              {sel.overview}
            </InfoBlock>

            {/* Method → its step-by-step recipes */}
            {kids.length > 0 && (
              <InfoBlock label={"📚 Step-by-step recipes (" + kids.length + ")"} color={cc.accent} bg={C.soft}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                  {kids.map(function(kv) {
                    return (
                      <button key={kv[0]} onClick={function() { setSel(kv[1]); }} style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: C.text, cursor: "pointer", boxShadow: C.sh }}>
                        {kv[1].icon} {kv[1].name}
                      </button>
                    );
                  })}
                </div>
              </InfoBlock>
            )}

            {/* Safety (recipes) */}
            {sel.safety && sel.safety.length > 0 && (
              <InfoBlock label="⚠️ Safety first" color={C.red} bg={C.tPink}>
                <ul style={LIST}>
                  {sel.safety.map(function(line, i) { return <li key={i} style={{ marginBottom: 4 }}>{line}</li>; })}
                </ul>
              </InfoBlock>
            )}

            {/* Ingredients (recipes) */}
            {sel.ingredients && sel.ingredients.length > 0 && (
              <InfoBlock label="🧾 Ingredients" color={C.blue} bg={C.tBlue}>
                <ul style={LIST}>
                  {sel.ingredients.map(function(line, i) { return <li key={i} style={{ marginBottom: 4 }}>{line}</li>; })}
                </ul>
              </InfoBlock>
            )}

            {/* Ratio */}
            {sel.ratio && (
              <InfoBlock label="📏 Ratios & Quantities" color={C.blue} bg={C.tBlue}>
                {sel.ratio}
              </InfoBlock>
            )}

            {/* What you need */}
            {sel.what_you_need && (
              <InfoBlock label="🛠 What You Need" color={C.t2} bg={C.soft}>
                {sel.what_you_need}
              </InfoBlock>
            )}

            {/* Method — full step-by-step */}
            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: C.rs, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>
                👨‍🍳 Step-by-Step Method
              </div>
              {Array.isArray(sel.method) ? sel.method.map(function(step, i) {
                const m = step.match(STEP_LABEL);
                return (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}>
                    <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 11, background: cc.accent + "22", color: cc.accent, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{i + 1}</div>
                    <div style={{ flex: 1, fontSize: 13, lineHeight: 1.65, color: C.text }}>
                      {m ? <strong>{m[1]}: </strong> : null}{m ? step.slice(m[0].length) : step}
                    </div>
                  </div>
                );
              }) : sel.method.split(/(?=\d+\. |SUN DRYING:|DEHYDRATOR:|OVEN:|BLANCHING:|FRESH WHITE|RICOTTA:|EQUILIBRIUM|COLD SMOKING|REST:|WINE:|VINEGAR:|POTATOES:|CARROTS|ONIONS|CABBAGE:|SQUASH|APPLES:|SAFE ITEMS|UNSAFE)/).map((step, i) => (
                step.trim() ? (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}>
                    <div style={{ flex: 1, fontSize: 13, lineHeight: 1.65, color: C.text }}>{step.trim()}</div>
                  </div>
                ) : null
              ))}
            </div>

            {/* Best for */}
            {sel.best_for && (
              <InfoBlock label="✅ Best For" color={C.green} bg={C.tGreen}>
                {sel.best_for}
              </InfoBlock>
            )}

            {/* Storage */}
            <InfoBlock label="📦 Storage & Shelf Life" color={C.red} bg={C.tPink}>
              {sel.storage}
            </InfoBlock>

            {/* Troubleshooting */}
            {sel.troubleshooting && (
              <InfoBlock label="🔧 Troubleshooting" color={C.orange} bg={C.tOrange}>
                {sel.troubleshooting}
              </InfoBlock>
            )}

            {/* Science */}
            {sel.science && (
              <InfoBlock label="🔬 The Science" color={C.blue} bg={C.tBlue}>
                {sel.science}
              </InfoBlock>
            )}

            {/* Tip */}
            {sel.tip && (
              <div style={{ background: C.tGreen2, border: `1px solid ${C.gm}`, borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>💡 PRO TIP</div>
                <div style={SX.bodyText}>{sel.tip}</div>
              </div>
            )}

            {/* Sources (recipes) */}
            {sel.sources && (
              <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5, margin: "8px 2px 4px" }}>📚 Sources: {sel.sources}</div>
            )}

            {/* Video link */}
            <div style={{ marginTop: 6 }}>
            </div>
          </Overlay>
        );
      })()}
    </div>
  );
}


/* ═══════════════════════════════════════════
   SEASONAL PLANTING CALENDAR
   Location-aware "what to plant this month"
   ═══════════════════════════════════════════ */
export function SeasonalCalendar({data, setPage, embedded}) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [filter, setFilter] = useState("sow"); // sow | harvest | all
  const [catFilter, setCatFilter] = useState("all");
  const monthStripRef = useRef(null);
  const monthBtnRefs = useRef([]);

  // 6.4.1 — auto-scroll month strip to the current month on mount and on month change
  useEffect(() => {
    const btn = monthBtnRefs.current[month];
    const strip = monthStripRef.current;
    if (!btn || !strip) return;
    // Center the active month button horizontally inside the strip
    const stripRect = strip.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const offset = (btnRect.left - stripRect.left) - (stripRect.width / 2) + (btnRect.width / 2);
    strip.scrollBy({ left: offset, behavior: "smooth" });
  }, [month]);

  const isCurrentMonth = month === new Date().getMonth();
  const alreadyPlanted = data.garden.plots.filter(p => p.status !== "harvested").map(p => p.crop);

  const results = useMemo(() => {
    const sow = [], harvest = [], maintain = [];
    rCR(data.region).forEach(c => {
      const sowM = parseSowMonths(c.sowIn);
      const harM = parseHarvestMonths(c.harvest);
      const diff = getCropDifficulty(c.name);
      const planted = alreadyPlanted.includes(c.name);
      if (sowM.includes(month)) sow.push({...c, diff, planted, action: "sow"});
      if (harM.includes(month)) harvest.push({...c, diff, planted, action: "harvest"});
    });
    // Maintenance: steps that fall in the SELECTED month (its middle ± 2 weeks covers the month), not just around today.
    const now = new Date();
    const midMonth = new Date(now.getFullYear() + (month < now.getMonth() - 6 ? 1 : 0), month, 15);
    data.garden.plots.filter(p => p.status !== "harvested" && p.plantDate).forEach(p => {
      const crop = rCM(data.region).get(p.crop);
      if (!crop) return;
      const ds = daysBetweenLocalKeys(p.plantDate, midMonth);
      const pendingSteps = (p.steps||[]).filter(s => !s.done && Math.abs(s.d - ds) <= 16);
      if (pendingSteps.length > 0) maintain.push({...crop, plot: p, pendingSteps, action: "maintain"});
    });
    return {sow, harvest, maintain};
  }, [month, data, alreadyPlanted]);

  const cats = useMemo(() => {
    const all = [...results.sow, ...results.harvest];
    return [...new Set(all.map(c => c.cat))].sort();
  }, [results]);

  const filtered = useMemo(() => {
    let items = filter === "sow" ? results.sow : filter === "harvest" ? results.harvest : [...results.sow, ...results.harvest];
    if (catFilter !== "all") items = items.filter(c => c.cat === catFilter);
    // Deduplicate by name for "all" view
    if (filter === "all") { const seen = new Set(); items = items.filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; }); }
    return items;
  }, [results, filter, catFilter]);

  // 6.4.3 — beginner tip data, pre-computed so the JSX stays IIFE-free
  const beginnerTip = useMemo(() => {
    const easyHere = results.sow.filter(c => c.diff.l === "Easy" && !c.planted);
    if (easyHere.length === 0) return { kind: "empty" };
    const examples = easyHere.slice(0, 2).map(c => c.name).join(" or ");
    return { kind: "tip", examples };
  }, [results]);

  const CropRow = ({c}) => (
    <Card style={{marginBottom:6, borderLeft:`4px solid ${c.color}`, opacity: c.planted ? 0.65 : 1}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <FarmIcon name={c.name} emoji={c.emoji} size={28}/>
        <div style={SX.flex1}>
          <div style={SX.rowCenterG6}>
            <span style={{fontSize:15,fontWeight:600}}>{c.name}</span>
            {c.planted && <Pill c={C.blue} bg={C.tBlue}>Already planted</Pill>}
          </div>
          <div style={SX.t2_12mt2}>{c.cat} · {c.days}d to harvest · {c.spacing}cm spacing</div>
          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
            <Pill sm c={c.diff.c} bg={c.diff.bg} border={c.diff.c}>{c.diff.e} {c.diff.l}</Pill>
            <Pill sm c={C.blue} bg={C.tBlue}>☀ {c.sun}</Pill>
            <Pill sm c={C.green} bg={C.tGreen}>💧 {c.waterFreq}</Pill>
          </div>
        </div>
        {!c.planted && <Btn sm onClick={() => setPage("crops", {crop: c.name, plantDate: todayLocalKey()})}>+ Plant</Btn>}
      </div>
    </Card>
  );

  return (
    <div className="page-enter" style={SX.mw800}>
      {!embedded && <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>🗓 Seasonal Calendar</h2>}
      {!embedded && <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>What to plant and harvest each month — tailored to your farm</p>}

      {/* Month selector — 6.4.1: horizontal scroll on mobile, auto-centers current month */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <button onClick={() => setMonth(m => m === 0 ? 11 : m-1)} aria-label="Previous month" style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t2,flexShrink:0}}>‹</button>
        <div
          ref={monthStripRef}
          style={{
            display:"flex",
            gap:4,
            flex:1,
            overflowX:"auto",
            scrollBehavior:"smooth",
            WebkitOverflowScrolling:"touch",
            scrollbarWidth:"none",
            msOverflowStyle:"none",
            justifyContent:"center",
          }}
        >
          {MN_ABR.map((m,i) => (
            <button
              key={i}
              ref={el => { monthBtnRefs.current[i] = el; }}
              onClick={() => setMonth(i)}
              aria-label={`Show ${MN_FULL[i]}`}
              aria-pressed={month===i}
              style={{
                padding:"6px 10px",borderRadius:20,border:"none",fontSize:12,fontWeight:month===i?700:500,cursor:"pointer",
                background:month===i?C.green:i===new Date().getMonth()?"#d8f3dc":"transparent",
                color:month===i?"#fff":C.text,
                flexShrink:0,
              }}
            >{m}</button>
          ))}
        </div>
        <button onClick={() => setMonth(m => m === 11 ? 0 : m+1)} aria-label="Next month" style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t2,flexShrink:0}}>›</button>
      </div>

      {/* Summary stats */}
      <div className="g3" style={{gap:10,marginBottom:16}}>
        <Stat label="Sow This Month" value={results.sow.length} sub={`${results.sow.filter(c=>!c.planted).length} new options`} color={C.green}/>
        <Stat label="Harvest" value={results.harvest.length} sub="crops in season" color={C.orange}/>
        <Stat label="Maintain" value={results.maintain.length} sub="steps due" color={C.blue}/>
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[{id:"sow",l:"🌱 Sow",n:results.sow.length},{id:"harvest",l:"🧺 Harvest",n:results.harvest.length},{id:"all",l:"📋 All",n:0}].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding:"7px 16px",borderRadius:20,border:filter===t.id?"none":`1.5px solid ${C.bdr}`,
            background:filter===t.id?C.green:C.card,color:filter===t.id?"#fff":C.t2,
            fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F.body
          }}>{t.l}{t.n > 0 ? ` (${t.n})` : ""}</button>
        ))}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:20,border:`1.5px solid ${C.bdr}`,fontSize:12,fontFamily:F.body,color:C.t2,background:C.card}}>
          <option value="all">All categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Beginner tip — 6.4.3: shown on every month, not just current; copy adapts to whether anything sows here */}
      {filter === "sow" && (
        beginnerTip.kind === "empty"
          ? <Card style={{marginBottom:12,background:C.tGreen2,border:`1px solid ${C.gm}`}}>
              <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:4}}>💡 New to farming?</div>
              <div style={{fontSize:13,lineHeight:1.6}}>No Easy crops to sow in {MN_FULL[month]} — flip through months to find a forgiving start. Spring and early autumn are the kindest for first-timers.</div>
            </Card>
          : <Card style={{marginBottom:12,background:C.tGreen2,border:`1px solid ${C.gm}`}}>
              <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:4}}>💡 New to farming?</div>
              <div style={{fontSize:13,lineHeight:1.6}}>Start with 🟢 Easy crops {isCurrentMonth ? "this month" : `in ${MN_FULL[month]}`}. They're forgiving, grow fast, and build your confidence. Try {beginnerTip.examples} — {isCurrentMonth ? "plant a row today and" : "when this month comes around"} you'll be harvesting in weeks.</div>
            </Card>
      )}

      {/* Crop list */}
      {filtered.length === 0
        ? <Card style={{textAlign:"center",padding:"56px 24px",background:C.grdWarm}}><div style={SX.emptyIcon}>🌾</div><div style={SX.s15Bold}>Quiet month</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Nothing to {filter} in {MN_FULL[month]} — try a different filter</div></Card>
        : filtered.map(c => <CropRow key={c.name + c.action} c={c}/>)
      }

      {/* Maintenance section */}
      {filter === "sow" && results.maintain.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:10}}>🔧 Maintenance Due This Month</div>
          {results.maintain.map((c, i) => (
            <Card key={i} style={{marginBottom:6,borderLeft:`3px solid ${C.blue}`}}>
              <div style={SX.rowCenterG10}>
                <FarmIcon name={c.name} emoji={c.emoji} size={20}/>
                <div style={SX.flex1}>
                  <div style={{fontSize:14,fontWeight:600}}>{c.plot.name || c.name}</div>
                  {c.pendingSteps.map((s,j) => <div key={j} style={SX.t2_12mt2}>→ {s.l}: {s.t}</div>)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DIY PROJECTS & INFRASTRUCTURE
   Track builds, materials, costs, maintenance
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   BLUEPRINT — full-image manual page per project
   Each manual is a single illustrated PNG in /public/manuals/.
   ═══════════════════════════════════════════ */

function Blueprint({type}) {
  const src = BLUEPRINT_IMAGES[type];
  const [failed,setFailed]=useState(null);
  if (!src) return null;
  return (
    <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:C.rs,padding:"12px",marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>📐 Step-by-Step Blueprint</div>
      {failed===src?<p role="status">The illustration could not load. The written instructions and materials below are still available. <button onClick={()=>setFailed(null)}>Retry illustration</button></p>:<a href={src} target="_blank" rel="noreferrer" aria-label="Open full-size blueprint"><img
        onError={()=>setFailed(src)} src={src}
        alt={`${type.replaceAll('_',' ')} build manual`}
        loading="lazy"
        style={{width:"100%",height:"auto",display:"block",borderRadius:C.rs}}
      /></a>}
    </div>
  );
}

function Projects({embedded}) {
  const [selKey, setSelKey] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const items = Object.entries(PROJECT_GUIDES);
  const cats = [...new Set(items.map(([,r]) => r.cat))].sort();
  const filtered = catFilter === "all" ? items : items.filter(([,r]) => r.cat === catFilter);
  const sel = selKey ? PROJECT_GUIDES[selKey] : null;

  const CAT_COLOR = {
    "Growing":        { bg: "#e8f5e9", c: "#2e7d32", accent: "#66bb6a" },
    "Animals":        { bg: "#fff3e0", c: "#e65100", accent: "#ffa726" },
    "Soil":           { bg: "#efebe9", c: "#4e342e", accent: "#8d6e63" },
    "Water":          { bg: "#e3f2fd", c: "#1565c0", accent: "#42a5f5" },
    "Infrastructure": { bg: "#eceff1", c: "#37474f", accent: "#78909c" },
  };
  const DIFF_COLOR = { Easy: C.green, Intermediate: C.orange, Advanced: C.red };

  const InfoBlock = ({ label, color, bg, children }) => (
    <div style={{ background: bg || C.soft, borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: color || C.green, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={SX.bodyText}>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      {!embedded && <>
        <h2 style={{ fontFamily: F.head, fontSize: 28, margin: "0 0 4px" }}>🔨 DIY Project Guides</h2>
        <p style={{ color: C.t2, fontSize: 14, margin: "0 0 16px" }}>
          Step-by-step build manuals with materials, methods, and maintenance — sourced from proven homesteading guides
        </p>
      </>}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setCatFilter("all")} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: catFilter === "all" ? C.green : C.card, color: catFilter === "all" ? "#fff" : C.t2, fontSize: 12, fontWeight: 600, boxShadow: catFilter === "all" ? "none" : C.sh }}>All</button>
        {cats.map(c => {
          const cc = CAT_COLOR[c] || { accent: C.green };
          return <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: catFilter === c ? (cc.accent) : C.card, color: catFilter === c ? "#fff" : C.t2, fontSize: 12, fontWeight: 600, boxShadow: catFilter === c ? "none" : C.sh }}>{c}</button>;
        })}
      </div>

      {/* Project cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {filtered.map(([key, r]) => {
          const cc = CAT_COLOR[r.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
          const dc = DIFF_COLOR[r.difficulty] || C.t2;
          return (
            <div key={key} onClick={() => setSelKey(key)} style={{ background: C.card, borderRadius: C.r, boxShadow: C.sh, cursor: "pointer", borderLeft: `5px solid ${cc.accent}`, padding: "16px 16px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                    <Pill sm c={cc.accent} bg={cc.accent + "22"}>{r.cat}</Pill>
                    <Pill sm bg={dc + "22"} c={dc}>{r.difficulty}</Pill>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: C.t2 }}>⏱ {r.time} · 💰 {r.cost}</span>
                <span style={{ fontSize: 11, color: cc.accent, fontWeight: 600 }}>Read guide →</span>
              </div>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{r.overview.slice(0, 120)}…</div>
            </div>
          );
        })}
      </div>

      {/* Detail overlay — full manual page */}
      {sel && (() => {
        const cc = CAT_COLOR[sel.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
        const dc = DIFF_COLOR[sel.difficulty] || C.t2;
        return (
          <Overlay title="" onClose={() => setSelKey(null)} wide>
            <div style={{ background: `linear-gradient(135deg, ${cc.accent}26, ${cc.accent}0a)`, borderRadius: C.rs, padding: "20px 20px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 44 }}>{sel.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontFamily: F.head, fontSize: 22, lineHeight: 1.2 }}>{sel.name}</h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <Pill c={cc.accent} bg={cc.accent + "22"}>{sel.cat}</Pill>
                    <Pill bg={C.card} c={dc} border={dc}>{sel.difficulty === "Easy" ? "✓ " : "◎ "}{sel.difficulty}</Pill>
                    <Pill bg={C.card} c={C.t2}>⏱ {sel.time}</Pill>
                    <Pill bg={C.card} c={C.t2}>💰 {sel.cost}</Pill>
                  </div>
                </div>
              </div>
              {sel.ref && <div style={{ fontSize: 11, color: cc.accent, marginTop: 10, fontStyle: "italic", opacity: 0.7 }}>📚 {sel.ref}</div>}
            </div>

            <InfoBlock label="📖 Overview" color={cc.accent} bg={cc.accent + "1a"}>{sel.overview}</InfoBlock>
            <Blueprint type={selKey}/>
            <InfoBlock label="🛠 Materials & Tools" color={C.t2} bg={C.soft}>{sel.materials}</InfoBlock>

            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: C.rs, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>🔧 Step-by-Step Method</div>
              {sel.method.split(/(?=\d+\. )/).map((step, i) => (
                step.trim() ? <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}><div style={{ flex: 1, fontSize: 13, lineHeight: 1.65, color: C.text }}>{step.trim()}</div></div> : null
              ))}
            </div>

            <InfoBlock label="🔧 Ongoing Maintenance" color={C.orange} bg={C.tOrange}>{sel.maintenance}</InfoBlock>

            {sel.tip && (
              <div style={{ background: C.tGreen2, border: `1px solid ${C.gm}`, borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>💡 PRO TIP</div>
                <div style={SX.bodyText}>{sel.tip}</div>
              </div>
            )}
          </Overlay>
        );
      })()}
    </div>
  );
}

export default Manuals;

