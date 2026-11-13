import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { C, F, SX } from "../../lib/theme";
import { Btn } from "../../components/ui";
import "../grove/zone-tasks.css";

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
