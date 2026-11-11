import { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { uid } from "../../lib/storage";
import { todayLocalKey } from "../../lib/utils";
import { C, F, SX } from "../../lib/theme";
import { Btn, Card, Inp, Sel, Overlay, Stat } from "../../components/ui";
import { undoSale, markPaid, unpaidTotal } from "../../lib/inventory";
import { currencySymbol } from "../../lib/money";

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/; // local YYYY-MM-DD keys, as every other record in the app

const CAT_COLORS = {
  Seeds: "#27ae60", Tools: "#8d6e63", Feed: "#ffa726",
  Animals: "#e65100", Fuel: "#5e35b1", Infrastructure: "#37474f",
  "Produce Sales": "#42a5f5", "Stock purchases": "#8e6bb8", Other: "#90a4ae",
};

/* ═══════════════════════════════════════════
   FINANCIALS
   ═══════════════════════════════════════════ */
export default function Financials({data, setData}) {
  const E = currencySymbol(data);
  const [showAdd,setShowAdd]=useState(false);
  const [chartMode,setChartMode]=useState("monthly");
  const [chartM,setChartM]=useState(new Date().getMonth());
  const [form,setForm]=useState({type:"expense",amount:"",label:"",cat:"Seeds",date:todayLocalKey(),for:""});
  // "For": ties an expense to an animal group or bed, so Insights can show cost per egg / litre / kg.
  const forOptions=useMemo(()=>{
    const species=[...new Set((data.livestock?.animals||[]).map(a=>a.type).filter(t=>t!=="Bee"))];
    const beds=(data.zones||[]).filter(z=>["veg","raised","herbs","orchard","greenhouse","container","nursery"].includes(z.type));
    return [{value:"",label:"General"},...species.map(s=>({value:`species:${s}`,label:s})),...beds.map(z=>({value:`zone:${z.id}`,label:z.name}))];
  },[data.livestock,data.zones]);
  const forLabel=v=>{if(!v)return "";const o=forOptions.find(x=>x.value===v);return o?o.label:"";};
  const items = useMemo(() => data.costs?.items || [], [data.costs?.items]);
  // Tapping Add with something missing says what to fix instead of doing nothing.
  // Amounts are stored to the cent; anything over 10 million is treated as a typo.
  const [addErr,setAddErr]=useState("");
  const add=()=>{const amt=Math.round(Number(String(form.amount).replace(",","."))*100)/100;
    const err=!(amt>0)?"Enter an amount greater than zero.":amt>10000000?"That amount looks too high — check the number.":!String(form.label||"").trim()?"Add a short description, e.g. “Seed potatoes”.":"";
    if(err){setAddErr(err);return;}
    const date=DATE_RE.test(form.date||"")?form.date:todayLocalKey();setData({...data,costs:{...(data.costs||{}),items:[...items,{...form,label:form.label.trim(),date,id:uid(),amount:amt}]}});setForm({type:"expense",amount:"",label:"",cat:"Seeds",date:todayLocalKey(),for:""});setAddErr("");setShowAdd(false);};
  // Open the Add sheet with today's date (not the date the page was mounted on).
  const openAdd=()=>{setForm(f=>({...f,date:todayLocalKey()}));setShowAdd(true);};
  // Deleting a pantry sale puts the sold stock back in the pantry.
  const del=id=>{const it=items.find(i=>i.id===id);setData(it&&it.source==="pantry"&&it.type==="income"?undoSale(data,id,todayLocalKey()):{...data,costs:{...(data.costs||{}),items:items.filter(i=>i.id!==id)}});};
  const unpaid=unpaidTotal(data);
  const unpaidSales=items.filter(i=>i.type==="income"&&i.paid===false);
  const {exp,inc,net,catT}=useMemo(()=>{let e=0,r=0;const ct={};items.forEach(i=>{if(i.type==="expense"){e+=i.amount;ct[i.cat]=(ct[i.cat]||0)+i.amount;}else r+=i.amount;});return{exp:e,inc:r,net:r-e,catT:ct};},[items]);
  const mN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const year=new Date().getFullYear();
  const mData=useMemo(()=>{const acc=Array.from({length:12},()=>({e:0,r:0}));items.forEach(i=>{const d=String(i.date||"");if(!DATE_RE.test(d)||+d.slice(0,4)!==year)return;const m=+d.slice(5,7)-1;if(m<0||m>11)return;if(i.type==="expense")acc[m].e+=i.amount;else acc[m].r+=i.amount;});return acc;},[items,year]);
  const maxM=Math.max(1,...mData.map(d=>Math.max(d.e,d.r)));
  const dim=new Date(new Date().getFullYear(),chartM+1,0).getDate();
  const dData=useMemo(()=>{const acc=Array.from({length:dim},()=>({e:0,r:0}));const pfx=year+"-"+String(chartM+1).padStart(2,"0")+"-";items.forEach(i=>{const ds=String(i.date||"");if(!ds.startsWith(pfx))return;const d=parseInt(ds.slice(8,10),10)-1;if(d>=0&&d<dim){if(i.type==="expense")acc[d].e+=i.amount;else acc[d].r+=i.amount;}});return acc;},[items,chartM,dim,year]);
  const maxD=Math.max(1,...dData.map(d=>Math.max(d.e,d.r)));
  // catT computed in useMemo above
  const last5=items.slice(-5).reverse();

  // 6.6.2 — chart gating: monthly needs ≥2 months with data, daily needs ≥2 days
  const monthsWithData = mData.filter(d => d.e > 0 || d.r > 0).length;
  const daysWithData = dData.filter(d => d.e > 0 || d.r > 0).length;
  const chartHasEnough = chartMode === "monthly" ? monthsWithData >= 2 : daysWithData >= 2;

  // 6.6.3 — pie-chart geometry, pre-computed (no IIFE in render path)
  const catEntries = useMemo(() => Object.entries(catT).sort((a,b)=>b[1]-a[1]), [catT]);
  const pieSlices = useMemo(() => {
    if (exp <= 0) return [];
    let acc = 0;
    return catEntries.map(([cat, amt]) => {
      const frac = amt / exp;
      const start = acc;
      acc += frac;
      // Convert two fractions on [0,1] to SVG arc path on a 100px circle centered at 60,60 with r=50
      const a0 = start * Math.PI * 2 - Math.PI / 2;
      const a1 = acc   * Math.PI * 2 - Math.PI / 2;
      const x0 = 60 + 50 * Math.cos(a0);
      const y0 = 60 + 50 * Math.sin(a0);
      const x1 = 60 + 50 * Math.cos(a1);
      const y1 = 60 + 50 * Math.sin(a1);
      const largeArc = frac > 0.5 ? 1 : 0;
      const d = `M 60 60 L ${x0.toFixed(2)} ${y0.toFixed(2)} A 50 50 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
      return { cat, amt, frac, d, color: CAT_COLORS[cat] || "#90a4ae" };
    });
  }, [catEntries, exp]);

  return (
    <div className="page-enter" style={SX.mw800}>
      <div className="pg-head" style={SX.pageHead}>
        <div><h2 className="pg-h2" style={SX.headerH2}>Financials</h2><p className="pg-sub" style={SX.pageSubHead}>Income, expenses, and profitability</p></div>
        <Btn onClick={openAdd}>+ Add Entry</Btn>
      </div>
      {/* 6.6.1 — empty state replaces the body when there are zero entries */}
      {items.length === 0 ? (
        <Card style={{textAlign:"center",padding:"clamp(22px, 7vw, 64px) 24px",background:C.grdWarm,marginBottom:16}}>
          
          <div style={SX.s15Bold}>No money tracked yet</div>
          <div style={{color:C.t2,marginTop:8,fontSize:13,maxWidth:340,marginLeft:"auto",marginRight:"auto",lineHeight:1.5}}>
            Add your first seed packet to start tracking. We'll handle the math — categories, monthly trends, profit and loss.
          </div>
          <div style={{marginTop:18}}>
            <Btn onClick={openAdd}>+ Add your first entry</Btn>
          </div>
        </Card>
      ) : (
      <>
      <div className="g3" style={{gap:10,marginBottom:20}}>
        <Stat label="Spent" value={E+exp.toFixed(0)} color={C.red}/>
        <Stat label="Revenue" value={E+inc.toFixed(0)} sub={unpaid>0?`${E}${unpaid.toFixed(2)} to collect`:undefined} color={C.green}/>
        <Stat label="Net" value={E+Math.abs(net).toFixed(0)} sub={net>=0?"Profit":"Loss"} color={net>=0?C.green:C.red}/>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head}}>{chartMode==="monthly"?"Monthly Overview":mN[chartM]+" Daily"}</div>
          <div style={{display:"flex",gap:6}}>
            {["monthly","daily"].map(m=><button key={m} onClick={()=>setChartMode(m)} style={{padding:"4px 12px",borderRadius:16,border:"none",background:chartMode===m?C.green:C.card,color:chartMode===m?"#fff":C.t2,fontSize:11,fontWeight:600,cursor:"pointer"}}>{m==="monthly"?"Monthly":"Daily"}</button>)}
          </div>
        </div>
        {chartMode==="daily"&&<div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}><button onClick={()=>setChartM(Math.max(0,chartM-1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.t2}}>{"<"}</button><span style={{fontSize:13,fontWeight:600}}>{mN[chartM]}</span><button onClick={()=>setChartM(Math.min(11,chartM+1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.t2}}>{">"}</button></div>}
        {/* 6.6.2 — only render the chart when we have at least 2 data points in the active view */}
        {!chartHasEnough ? (
          <div style={{textAlign:"center",padding:"36px 16px",color:C.t2,fontSize:13,lineHeight:1.5}}>
            Not enough data yet for a {chartMode==="monthly"?"monthly":"daily"} chart.<br/>
            Add a second entry {chartMode==="monthly"?"in a different month":"on a different day"} to see the trend.
          </div>
        ) : (
        <div style={{overflowX:"auto"}}>
          <svg viewBox={"0 0 "+(chartMode==="monthly"?360:Math.max(360,dim*14))+" 140"} style={{width:"100%",display:"block"}}>
            {(chartMode==="monthly"?mData:dData).map((d,i)=>{const bw=chartMode==="monthly"?22:8;const gap=chartMode==="monthly"?8:6;const x=i*(bw*2+gap)+20;const mv=chartMode==="monthly"?maxM:maxD;const eH=(d.e/mv)*100;const rH=(d.r/mv)*100;return(
              <g key={i} onClick={()=>{if(chartMode==="monthly"){setChartMode("daily");setChartM(i);}}} style={{cursor:chartMode==="monthly"?"pointer":"default"}}>
                <rect x={x} y={120-eH} width={bw} height={Math.max(0,eH)} rx={3} fill={C.red} opacity=".7"/>
                <rect x={x+bw+2} y={120-rH} width={bw} height={Math.max(0,rH)} rx={3} fill={C.green} opacity=".7"/>
                <text x={x+bw} y={133} textAnchor="middle" fontSize="7" fill={C.t2} fontFamily={F.mono}>{chartMode==="monthly"?mN[i]:(i+1)}</text>
              </g>
            );})}
            <line x1="16" y1="120" x2={chartMode==="monthly"?"350":String(dim*14+10)} y2="120" stroke={C.bdr} strokeWidth="1"/>
          </svg>
        </div>
        )}
        <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}><span style={{fontSize:10,color:C.red}}>{"■"} Expenses</span><span style={{fontSize:10,color:C.green}}>{"■"} Income</span></div>
      </Card>
      {/* 6.6.3 — categorized spending as a donut with a category legend */}
      {pieSlices.length>0 && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:12}}>Expense Breakdown</div>
          <div style={{display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{flexShrink:0,position:"relative"}}>
              <svg viewBox="0 0 120 120" style={{width:140,height:140,display:"block"}} role="img" aria-label="Expense category pie chart">
                {pieSlices.length === 1
                  ? <circle cx="60" cy="60" r="50" fill={pieSlices[0].color}/>
                  : pieSlices.map(s => <path key={s.cat} d={s.d} fill={s.color}/>)
                }
                {/* donut hole */}
                <circle cx="60" cy="60" r="28" fill={C.card}/>
                <text x="60" y="58" textAnchor="middle" fontSize="9" fill={C.t2} fontFamily={F.body}>Total</text>
                <text x="60" y="72" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.text} fontFamily={F.mono}>{E}{exp.toFixed(0)}</text>
              </svg>
            </div>
            <div style={{flex:1,minWidth:180}}>
              {pieSlices.map(s => (
                <div key={s.cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{display:"inline-block",width:12,height:12,borderRadius:3,background:s.color,flexShrink:0}}/>
                  <div style={{flex:1,fontSize:13}}>{s.cat}</div>
                  <div style={{fontSize:12,color:C.t2,fontFamily:F.mono,width:48,textAlign:"right"}}>{Math.round(s.frac*100)}%</div>
                  <div style={{fontSize:13,fontWeight:600,fontFamily:F.mono,width:56,textAlign:"right"}}>{E}{s.amt.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      {unpaidSales.length>0&&(
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:10}}>To collect · {E}{unpaid.toFixed(2)}</div>
          {unpaidSales.map(i=>(
            <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderTop:`1px solid ${C.bdr}`}}>
              <div style={SX.flex1}><div style={{fontSize:13.5,fontWeight:600}}>{i.buyer||"No buyer named"}</div><div style={SX.t2_12}>{i.date} · {i.label}</div></div>
              <div style={{fontSize:15,fontWeight:700}}>{E}{i.amount.toFixed(2)}</div>
              <Btn sm v="secondary" onClick={()=>setData(markPaid(data,i.id))}>Mark paid</Btn>
            </div>
          ))}
        </Card>
      )}
      <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:10}}>Recent Transactions</div>
      {last5.length===0?<Card style={{textAlign:"center",padding:32}}><div style={{color:C.t2}}>No transactions yet</div></Card>:
      <div style={{display:"grid",gap:6}}>{last5.map(i=>(
        <Card key={i.id}><div style={SX.rowCenterG10}>
          <div style={{width:36,height:36,borderRadius:18,background:"var(--surface-soft)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{i.source==="pantry"?(i.type==="income"?"🧺":"📦"):i.type==="expense"?"📤":"📥"}</div>
          <div style={SX.flex1}><div style={{fontSize:14,fontWeight:600}}>{i.label}</div><div style={SX.t2_12}>{i.date} · {i.cat}{forLabel(i.for)?` · for ${forLabel(i.for)}`:""}{i.paid===false?" · to be paid":""}</div></div>
          <div style={{fontSize:16,fontWeight:700,color:i.type==="expense"?C.red:C.green,fontFamily:F.mono}}>{i.type==="expense"?"-":"+"}{E}{i.amount.toFixed(2)}</div>
          <Btn sm v="ghost" onClick={()=>del(i.id)}><Trash2 size={14} strokeWidth={1.8}/></Btn>
        </div></Card>
      ))}</div>}
      </>
      )}
      {showAdd&&<Overlay title="Add Entry" onClose={()=>setShowAdd(false)}>
        <div style={{display:"flex",gap:8,marginBottom:14}}>{["expense","income"].map(t=><Card key={t} onClick={()=>setForm({...form,type:t})} active={form.type===t} style={{flex:1,textAlign:"center",cursor:"pointer"}}><div style={SX.s20}>{t==="expense"?"📤":"📥"}</div><div style={{fontSize:13,fontWeight:600,marginTop:4}}>{t==="expense"?"Expense":"Income"}</div></Card>)}</div>
        <Inp label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={e=>{setAddErr("");setForm({...form,amount:e.target.value});}}/>
        <Inp label="Description" value={form.label} onChange={e=>{setAddErr("");setForm({...form,label:e.target.value});}}/>
        <div style={SX.grid2}><Sel label="Category" value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} options={["Seeds","Tools","Feed","Animals","Fuel","Infrastructure","Produce Sales","Stock purchases","Other"]}/><Inp label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        {form.type==="expense"&&forOptions.length>1&&<Sel label="For (optional)" value={form.for} onChange={e=>setForm({...form,for:e.target.value})} options={forOptions}/>}
        {addErr&&<p role="alert" style={{fontSize:12,color:C.red,margin:"0 0 10px"}}>{addErr}</p>}
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>{setAddErr("");setShowAdd(false);}}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}

