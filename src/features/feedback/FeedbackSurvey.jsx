import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { markFeedbackDone } from "../../lib/storage";
import { C, F, SX } from "../../lib/theme";
import { Btn } from "../../components/ui";
import "../grove/zone-tasks.css";

/* ═══════════════════════════════════════════
   FEEDBACK SURVEY — 4-question user feedback
   ═══════════════════════════════════════════ */
export default function FeedbackSurvey({ setPage }) {
  const [answers, setAnswers] = useState({ module: "", confusion: "", missing: "", pay: "" });
  const [submitted, setSubmitted] = useState(false);

  // Named as the menu names them since Stage 5 (Today, My Space, Plan, Learn, Progress).
  const modules = ["Today","Map","Crops","Animals","Plan","Learn","Progress","Pantry","Money","Farm Assistant"];

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    const subject = encodeURIComponent("MyTerra App Feedback");
    const body = encodeURIComponent(
      `Most used module: ${answers.module || "Not answered"}\n\n` +
      `Confusing in first 5 minutes: ${answers.confusion || "Not answered"}\n\n` +
      `Missing feature: ${answers.missing || "Not answered"}\n\n` +
      `Willingness to pay: ${answers.pay || "Not answered"}`
    );
    window.open(`mailto:dervis.kanina@gmail.com?subject=${subject}&body=${body}`, "_blank");
    setSubmitted(true);
    // Mark survey as done so 7-day prompt won't show again
    try { markFeedbackDone(); } catch(e) {}
  };

  if (submitted) {
    return (
      <div className="page-enter" style={{maxWidth:560,margin:"0 auto",textAlign:"center",padding:"60px 20px"}}>
        
        <h2 style={{fontFamily:F.head,fontSize:24,fontWeight:800,color:C.green,marginBottom:8}}>Thank you!</h2>
        <p style={{color:C.t2,fontSize:15,lineHeight:1.6,marginBottom:24}}>Your feedback helps us build a better tool for farmers like you. We read every single response.</p>
        <Btn onClick={() => setPage("home")}>Back to Today</Btn>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{maxWidth:600,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:F.head,fontSize:26,fontWeight:800,color:C.text,letterSpacing:"-0.02em"}}>Help Us Improve</h1>
        <p style={{color:C.t2,fontSize:14,marginTop:4}}>4 quick questions — takes about 1 minute</p>
      </div>

      {/* Q1: Most used module */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>1. Which module do you use the most?</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {modules.map(m => (
            <button key={m} onClick={() => update("module", m)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${answers.module === m ? C.green : C.bdr}`,background:answers.module === m ? C.gp : C.bg,color:answers.module === m ? C.green : C.t2,fontSize:13,fontWeight:answers.module === m ? 600 : 500,cursor:"pointer",fontFamily:F.body,transition:"all .2s"}}>{m}</button>
          ))}
        </div>
      </div>

      {/* Q2: Confusion */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>2. What confused you in the first 5 minutes?</div>
        <textarea value={answers.confusion} onChange={e => update("confusion", e.target.value)} placeholder="e.g. I didn't know where to start, the layout was unclear..." rows={3} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:12,fontSize:13,fontFamily:F.body,resize:"vertical",outline:"none",background:C.bg,boxSizing:"border-box"}}/>
      </div>

      {/* Q3: Missing feature */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>3. What feature is missing that you'd really want?</div>
        <textarea value={answers.missing} onChange={e => update("missing", e.target.value)} placeholder="e.g. Weather integration, community forum, export to PDF..." rows={3} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:12,fontSize:13,fontFamily:F.body,resize:"vertical",outline:"none",background:C.bg,boxSizing:"border-box"}}/>
      </div>

      {/* Q4: Willingness to pay */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>4. Would you pay for this app?</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {["No, must be free","Maybe, if it had more features","Yes, $4.99/mo sounds fair","Yes, I'd pay $9.99/mo for a pro version"].map(opt => (
            <button key={opt} onClick={() => update("pay", opt)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${answers.pay === opt ? C.green : C.bdr}`,background:answers.pay === opt ? C.gp : C.bg,color:answers.pay === opt ? C.green : C.t2,fontSize:13,fontWeight:answers.pay === opt ? 600 : 500,cursor:"pointer",fontFamily:F.body,transition:"all .2s",textAlign:"left"}}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Btn onClick={handleSubmit} style={{width:"100%",marginBottom:12}}>
        Send Feedback via Email
      </Btn>
      <p style={{color:C.t3,fontSize:12,textAlign:"center"}}>Opens your email app with the answers pre-filled. Just hit send!</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FEEDBACK PROMPT — shows once after 7 days. A small centred card over a faded backdrop
   (the same shape as the other popups), portalled to <body> so no page transform or the
   assistant button can push it off-screen. Backdrop tap and Escape count as "Maybe later".
   ═══════════════════════════════════════════ */
export function FeedbackPrompt({ onOpen, onDismiss }) {
  const card = useRef(null);
  useEffect(() => {
    card.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);
  return createPortal(
    <div className="q-tp-backdrop" onClick={onDismiss}>
      <section ref={card} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="fb-prompt-title" onClick={(e) => e.stopPropagation()}
        style={{position:"relative",width:"min(380px,100%)",background:C.card,color:C.text,borderRadius:24,boxShadow:"0 24px 60px #1c2a1f55",padding:"22px 20px 18px",outline:"none",animation:"q-tp-pop .34s cubic-bezier(.2,1.4,.4,1)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          
          <div style={SX.flex1}>
            <div id="fb-prompt-title" style={{fontSize:17,fontWeight:700,color:C.text,fontFamily:F.head,marginBottom:4}}>How's it going?</div>
            <p style={{fontSize:13,color:C.t2,lineHeight:1.5,margin:0}}>You've been using MyTerra for a week! We'd love your feedback — it takes just 1 minute.</p>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
          <Btn onClick={onOpen} style={{width:"100%",minHeight:44}}>Give feedback</Btn>
          <Btn onClick={onDismiss} v="secondary" style={{width:"100%",minHeight:44}}>Maybe later</Btn>
        </div>
      </section>
    </div>,
    document.body,
  );
}
