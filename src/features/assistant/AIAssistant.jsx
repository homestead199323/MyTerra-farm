import { useState, useEffect, useMemo, useRef } from "react";
import { Leaf, MessageCircle } from "lucide-react";

import { C, F, SX } from "../../lib/theme";
import { LDB } from "../../data/livestock";
import { rCR } from "../../lib/regional";
import { farmKnowledgeEngine, buildAISuggestions } from "../../lib/ai";
import { daysBetweenLocalKeys, todayLocalKey } from "../../lib/utils";

export default function AIAssistant({data, lift }) {
  const [open, setOpen] = useState(false);
  // On a phone the button slides away while you scroll down a page and comes back when you scroll up, so it never sits on what you are reading.
  const [away, setAway] = useState(false);
  useEffect(() => {
    let last = 0;
    function onScroll(e) {
      const t = e.target === document ? document.scrollingElement : e.target; if (!t || t.scrollTop == null || t.clientHeight < 300) return;
      const y = t.scrollTop; if (Math.abs(y - last) < 12) return; setAway(y > last && y > 40); last = y;
    }
    document.addEventListener("scroll", onScroll, true); return () => document.removeEventListener("scroll", onScroll, true);
  }, []);
  const [msgs, setMsgs] = useState([
    {role:"assistant", content:`Hi! I'm your farm assistant. I know everything about the ${rCR(data.region).length} crops and ${Object.keys(LDB).length} animals in your database — and I work offline!\n\nStart typing a crop or animal name and pick from the dropdown, or tap a quick prompt below.`}
  ]);
  const [input, setInput] = useState("");
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
  const [selIdx, setSelIdx] = useState(-1);
  const scrollRef = useRef(null);
  const sugRef = useRef(null);

  // 6.8.3 — track viewport so the FAB can reposition above the mobile bottom-tab bar
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 6.8.2 — pulse signal: count plots that are ready to harvest (over-ripe = real loss).
  // This is the same "needs attention" intent as pri:0 in buildTaskQueue, but computed
  // locally to keep the FAB cheap and dependency-light.
  const urgentCount = useMemo(() => {
    const plots = data?.garden?.plots || [];
    const today = todayLocalKey();
    let count = 0;
    for (const p of plots) {
      if (p.status === "harvested" || !p.plantDate) continue;
      // crop.days is the days-to-harvest from the data layer; if elapsed >= days, it's ready
      const crop = rCR(data.region).find(c => c.name === p.crop);
      if (!crop) continue;
      const elapsed = daysBetweenLocalKeys(p.plantDate, today);
      if (elapsed >= crop.days) count += 1;
    }
    return count;
  }, [data]);

  // Pulse toggles every ~30s while there's something urgent AND the panel is closed.
  // Pure CSS animation via a class would be lighter, but the 30s cadence per plan needs JS.
  const [pulseOn, setPulseOn] = useState(false);
  useEffect(() => {
    if (open || urgentCount === 0) { setPulseOn(false); return; }
    let pulseOffTimer = null;
    // Trigger a 1.4s pulse on mount, then every 30s
    setPulseOn(true);
    const off1 = setTimeout(() => setPulseOn(false), 1400);
    const tick = setInterval(() => {
      setPulseOn(true);
      if (pulseOffTimer) clearTimeout(pulseOffTimer);
      pulseOffTimer = setTimeout(() => setPulseOn(false), 1400);
    }, 30000);
    return () => {
      clearTimeout(off1);
      if (pulseOffTimer) clearTimeout(pulseOffTimer);
      clearInterval(tick);
    };
  }, [open, urgentCount]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open]);

  // Score suggestions during render — derived, no setState-in-effect cascade.
  // The dropdown can be dismissed (Escape, Tab, send) via suggestionsHidden;
  // typing again sets suggestionsHidden=false in onChange and the dropdown
  // reappears against the next input value.
  // Region-scoped suggestion catalog — recomputed only when the user changes region.
  const aiCatalog = useMemo(() => buildAISuggestions(data.region), [data.region]);
  const scoredSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    const scored = aiCatalog.map(s => {
      let score = 0;
      if (s.keys.some(k => k.startsWith(q))) score += 10;
      else if (s.keys.some(k => k.includes(q))) score += 6;
      else {
        words.forEach(w => {
          if (w.length < 2) return;
          s.keys.forEach(k => { if (k.includes(w)) score += 3; });
          if (s.q.toLowerCase().includes(w)) score += 2;
          if (s.cat.toLowerCase().includes(w)) score += 1;
        });
      }
      return {...s, score};
    }).filter(s => s.score > 0).sort((a,b) => b.score - a.score);
    const seen = new Set();
    const unique = [];
    for (const s of scored) {
      if (!seen.has(s.q) && unique.length < 8) { seen.add(s.q); unique.push(s); }
    }
    return unique;
  }, [input, aiCatalog]);
  const suggestions = suggestionsHidden ? [] : scoredSuggestions;

  const sendQuery = (text) => {
    if (!text.trim()) return;
    const reply = farmKnowledgeEngine(text, data);
    setMsgs(prev => [...prev, {role:"user", content: text}, {role:"assistant", content: reply}]);
    setInput("");
    setSuggestionsHidden(true);
    setSelIdx(-1);
  };

  const send = () => sendQuery(input.trim());

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === "Enter" && !e.shiftKey && selIdx >= 0) { e.preventDefault(); sendQuery(suggestions[selIdx].q); return; }
      if (e.key === "Tab" && selIdx >= 0) { e.preventDefault(); setInput(suggestions[selIdx].q); setSuggestionsHidden(true); return; }
      if (e.key === "Escape") { setSuggestionsHidden(true); setSelIdx(-1); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const quickPrompts = [
    {e:"🌱", q:"What should I plant now?"},
    {e:"📋", q:"What should I do today?"},
    {e:"🌾", q:"My farm status"},
    {e:"🐔", q:"Chicken care guide"},
    {e:"🍅", q:"How to grow tomatoes"},
    {e:"🤝", q:"Companion planting tips"},
    {e:"💧", q:"Watering tips for my crops"},
    {e:"📚", q:"What can you help with?"},
  ];

  return (
    <>
      {/* 6.8.1 / 6.8.2 / 6.8.3 — Lucide icon, pulse on urgent, repositioned above mobile tab bar */}
      <button
        className={"mt-fab" + (away && !open ? " mt-fab-away" : "")}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close farm assistant" : urgentCount > 0 ? `Open farm assistant — ${urgentCount} ${urgentCount === 1 ? "plot" : "plots"} need attention` : "Open farm assistant"}
        style={{
          position:"fixed",
          // 6.8.3 — clear the 56px bottom nav + safe-area on mobile; standard on desktop
          bottom: isMobile ? (lift ? "calc(210px + env(safe-area-inset-bottom))" : "calc(72px + env(safe-area-inset-bottom))") : 24,
          right: 24,
          zIndex:2000,
          width:56, height:56, borderRadius:28,
          background:C.grd,
          border:"none", cursor:"pointer",
          // 6.8.2 — pulse rendered as an expanding ring via box-shadow, no extra DOM
          boxShadow: pulseOn
            ? `0 0 0 0 ${C.green}66, 0 4px 20px color-mix(in srgb, var(--color-green-dark) 50%, transparent)`
            : "0 4px 20px color-mix(in srgb, var(--color-green-dark) 50%, transparent)",
          animation: pulseOn ? "fabPulse 1.4s ease-out 1" : "none",
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#fff",
          transition:"transform .2s, box-shadow .2s, bottom .2s",
        }}
        title="Farm Assistant"
      >
        {open
          ? <span style={{fontSize:20,lineHeight:1}}>{"\u2715"}</span>
          : <span style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <MessageCircle size={26} strokeWidth={2} color="#fff" fill="rgba(255,255,255,.12)"/>
              <Leaf size={12} strokeWidth={2.4} color="#fff" style={{position:"absolute",top:6,left:"50%",transform:"translateX(-50%)"}}/>
            </span>
        }
        {/* Unread/attention badge — visible while panel is closed and there are urgent items */}
        {!open && urgentCount > 0 && (
          <span aria-hidden="true" style={{
            position:"absolute", top:-2, right:-2,
            minWidth:20, height:20, padding:"0 5px",
            background:C.orange, color:"#fff",
            borderRadius:10, fontSize:11, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center",
            border:"2px solid #fff",
            fontFamily:F.body,
          }}>{urgentCount > 9 ? "9+" : urgentCount}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="mt-ai-panel" style={{
          position:"fixed",
          // 6.8.3 — anchor above the repositioned FAB on mobile (FAB bottom + 56 height + 12 gap)
          bottom: isMobile ? "calc(140px + env(safe-area-inset-bottom))" : 92,
          right:24, zIndex:1999,
          width:380, maxWidth:"calc(100vw - 32px)",
          height:540, maxHeight:"calc(100vh - 120px)",
          background:C.card, borderRadius:20,
          boxShadow:"0 12px 48px rgba(0,0,0,.18)",
          display:"flex", flexDirection:"column",
          overflow:"hidden",
          border:`1px solid ${C.bdr}`,
          animation:"fadeUp .3s ease both",
        }}>
          {/* Header */}
          <div style={{background:C.grdHero,padding:"14px 18px",flexShrink:0}}>
            <div style={SX.rowCenterG10}>
              <div style={{width:36,height:36,borderRadius:18,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><Leaf size={20} strokeWidth={2} color="#fff"/></div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff",fontFamily:F.head}}>Farm Assistant</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Offline · {rCR(data.region).length} crops · {Object.keys(LDB).length} animals</div>
              </div>
              <button onClick={()=>setOpen(false)} style={{marginLeft:"auto",background:"rgba(255,255,255,.2)",border:"none",borderRadius:16,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"14px 14px 8px",display:"flex",flexDirection:"column",gap:10}}>
            {msgs.map((m,i) => (
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",gap:4}}>
                <div style={{
                  maxWidth:"88%", padding:"10px 13px",
                  background:m.role==="user"?C.green:C.surface,
                  color:m.role==="user"?"#fff":C.text,
                  borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  fontSize:13, lineHeight:1.6,
                  whiteSpace:"pre-wrap", fontFamily:F.body,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {/* Quick prompts */}
          {msgs.length <= 1 && (
            <div style={{padding:"4px 12px 2px",flexShrink:0,display:"flex",gap:4,flexWrap:"wrap"}}>
              {quickPrompts.map((p,i)=>(
                <button key={i} onClick={()=>sendQuery(p.q)} style={{padding:"5px 10px",borderRadius:16,border:`1px solid ${C.bdr}`,background:C.bg,fontSize:11,cursor:"pointer",color:C.t2,fontFamily:F.body,transition:"all .15s"}}>{p.e} {p.q}</button>
              ))}
            </div>
          )}

          {/* Input area with autocomplete dropdown */}
          <div style={{padding:"10px 12px",borderTop:`1px solid ${C.bdr}`,flexShrink:0,background:C.bg,position:"relative"}}>
            {/* Autocomplete dropdown — appears above input */}
            {suggestions.length > 0 && (
              <div ref={sugRef} style={{
                position:"absolute", bottom:"100%", left:0, right:0,
                background:C.card, borderTop:`1px solid ${C.bdr}`,
                boxShadow:"0 -4px 16px rgba(0,0,0,.1)",
                maxHeight:280, overflowY:"auto",
                borderRadius:"12px 12px 0 0",
              }}>
                {suggestions.map((s,i) => (
                  <button key={i}
                    onClick={() => sendQuery(s.q)}
                    onMouseEnter={() => setSelIdx(i)}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      width:"100%", padding:"10px 14px",
                      background: i === selIdx ? C.soft : "transparent",
                      border:"none", borderBottom:`1px solid ${C.bdr}`,
                      cursor:"pointer", textAlign:"left",
                      transition:"background .1s",
                    }}
                  >
                    <span style={{fontSize:18,flexShrink:0}}>{s.e}</span>
                    <div style={SX.flex1min0}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:F.body,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.q}</div>
                      <div style={{fontSize:10,color:C.t3,fontFamily:F.body}}>{s.cat}</div>
                    </div>
                    <span style={{fontSize:10,color:C.t3,flexShrink:0}}>tap</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <textarea
                value={input}
                onChange={e=>{setInput(e.target.value); setSuggestionsHidden(false); setSelIdx(-1);}}
                onKeyDown={handleKeyDown}
                placeholder="Type a crop or animal name..."
                rows={1}
                style={{
                  flex:1, padding:"8px 12px", border:`1.5px solid ${suggestions.length > 0 ? C.green : C.bdr}`,
                  borderRadius:18, fontSize:13, fontFamily:F.body,
                  outline:"none", resize:"none", background:C.card,color:C.text,
                  lineHeight:1.4, maxHeight:80, overflowY:"auto",
                  transition:"border-color .2s",
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                style={{flexShrink:0,width:44,height:44,borderRadius:22,background:!input.trim()?C.bdr:C.green,border:"none",cursor:!input.trim()?"default":"pointer",color:"#fff",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}
              >➤</button>
            </div>
            <div style={{fontSize:10,color:C.t3,textAlign:"center",marginTop:5}}>Type 2+ letters to see suggestions · Works offline</div>
          </div>
        </div>
      )}
    </>
  );
}
