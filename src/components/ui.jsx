import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { C, F, SX } from "../lib/theme";
import { localDateFromKey, addDaysToLocalKey } from "../lib/utils";
import { useSwipe } from "../lib/use-swipe";

// Re-export for consumers that want the spring config

/* ═══════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════ */
export const Btn = React.memo(function Btn({children,onClick,v="primary",sm,dis,disabled,style:s}) {
  dis = dis || disabled;
  // Same look as the popup buttons (.q-button / .q-secondary) so every screen matches.
  const st={
    primary:{bg:"#356b53",c:"#fff",shadow:"0 2px 0 #24503c"},
    secondary:{bg:"var(--color-card)",c:"var(--color-text)",border:"1px solid var(--color-border)",shadow:"none"},
    danger:{bg:"#a34f45",c:"#fff",shadow:"0 2px 0 #7c3a33"},
    ghost:{bg:"transparent",c:C.t2,shadow:"none"},
    success:{bg:"#356b53",c:"#fff",shadow:"0 2px 0 #24503c"},
    orange:{bg:"#966a32",c:"#fff",shadow:"0 2px 0 #6f4e24"}
  };
  const b=st[v]||st.primary;
  return <button type="button" disabled={dis} onClick={dis?undefined:onClick} style={{background:b.bg,color:b.c,border:b.border||"1px solid transparent",borderRadius:sm?12:14,fontFamily:F.body,fontWeight:600,fontSize:sm?13:14,minHeight:sm?40:46,padding:sm?"0 14px":"0 20px",boxSizing:"border-box",justifyContent:"center",cursor:dis?"not-allowed":"pointer",opacity:dis?0.4:1,display:"inline-flex",alignItems:"center",gap:7,transition:"background .2s, transform .08s",boxShadow:dis?"none":b.shadow,...s}}>{children}</button>;
});

export const Card = React.memo(function Card({children,onClick,active,style:s,p=true,className=""}) {
  return <div onClick={onClick} role={onClick?"button":undefined} tabIndex={onClick?0:undefined} onKeyDown={onClick?e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onClick(e);}}:undefined} className={`${onClick?"card-hover":""} ${className}`} style={{background:C.card,borderRadius:C.r,boxShadow:active?`0 0 0 2px ${C.green}, ${C.sh}`:C.sh,padding:p?"18px":0,cursor:onClick?"pointer":"default",transition:"all .25s cubic-bezier(.25,.46,.45,.94)",border:`1px solid ${active?C.green:"rgba(0,0,0,.04)"}`,...s}}>{children}</div>;
});

export const Inp = React.memo(function Inp({label,...p}) {
  const inputId=React.useId();
  return <div style={SX.mb12}>
    {label&&<label htmlFor={p.id||inputId} style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <input id={p.id||inputId} {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:16,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box",...p.style}}/>
  </div>;
});

export const Sel = React.memo(function Sel({label,options,...p}) {
  const inputId=React.useId();
  return <div style={SX.mb12}>
    {label&&<label htmlFor={p.id||inputId} style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <select id={p.id||inputId} {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:16,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>
  </div>;
});

export const Txt = React.memo(function Txt({label,...p}) {
  const inputId=React.useId();
  return <div style={SX.mb12}>
    {label&&<label htmlFor={p.id||inputId} style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <textarea id={p.id||inputId} {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:16,fontFamily:F.body,color:C.text,outline:"none",resize:"vertical",minHeight:60,boxSizing:"border-box"}}/>
  </div>;
});

export function Overlay({title,ariaLabel,onClose,children,wide,sheet,dock}) {
  const isSheet = !!sheet;
  const docked = !!dock; // beside the list (wide new home): no scrim, the page behind stays usable
  const dialogRef=useRef(null);
  const closeRef=useRef(onClose);
  useEffect(()=>{closeRef.current=onClose;},[onClose]);
  useEffect(()=>{const previous=document.activeElement;dialogRef.current?.focus({preventScroll:true});function key(e){if(dialogRef.current&&!dialogRef.current.contains(document.activeElement))return;if(e.key==='Escape'){e.stopPropagation();closeRef.current();}if(e.key==='Tab'){const items=dialogRef.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus?.();};},[]);
  // Touch drag-to-dismiss for sheet variant
  const [dragY, setDragY] = React.useState(0);
  const [startY, setStartY] = React.useState(null);
  const opacity = Math.max(0, 1 - dragY / 300);

  useEffect(function() {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function blockOuterScroll(e) {
      if (docked) return;
      let el = e.target;
      while (el && el !== document.body) {
        if (el.classList && el.classList.contains("overlay-sheet")) return;
        el = el.parentElement;
      }
      e.preventDefault();
    }
    document.addEventListener("touchmove", blockOuterScroll, {passive:false});
    return function() {
      document.body.style.overflow = prev;
      document.removeEventListener("touchmove", blockOuterScroll);
    };
  }, [docked]);

  function handleTouchStart(e) {
    setStartY(e.touches[0].clientY);
  }
  function handleTouchMove(e) {
    // Centered popups don't follow the finger any more (they close with X only).
    if (startY === null || e.touches.length < 0) return;
  }
  function handleTouchEnd() {
    // Popups close only with the X button (or Escape), never by a stray tap or swipe.
    setDragY(0);
    setStartY(null);
  }

  if (!isSheet) {
    return createPortal(
      <div className="overlay-backdrop" onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(18,26,20,.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16,boxSizing:"border-box",overflowX:"hidden"}}>
        <div
          onClick={function(e){e.stopPropagation();}}
          className="overlay-sheet overlay-pop" ref={dialogRef} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : (ariaLabel || "Dialog")} tabIndex={-1}
          style={{transform:dragY?`translateY(${dragY}px)`:undefined,transition:startY===null?"transform .22s ease":"none",background:C.card,borderRadius:C.r+4,maxWidth:wide?720:520,width:"100%",maxHeight:"calc(100% - 32px)",overflowY:"scroll",overflowX:"hidden",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",boxSizing:"border-box",boxShadow:"0 20px 60px rgba(0,0,0,.2), 0 8px 20px rgba(0,0,0,.1)"}}>
          <div className="overlay-handle-row" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px 0",position:"sticky",top:0,touchAction:"none",background:C.card,zIndex:1,borderRadius:`${C.r+4}px ${C.r+4}px 0 0`}}>
            <h3 style={{margin:0,fontSize:20,fontFamily:F.head,fontWeight:700}}>{title}</h3>
            <button aria-label="Close dialog" onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.t2,width:44,height:44,borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={18} strokeWidth={2}/></button>
          </div>
          <div className="overlay-body" style={{padding:"16px 24px 24px"}}>{children}</div>
        </div>
      </div>,
      document.body
    );
  }

  // Sheet variant — spring drag-to-dismiss
  return createPortal(
    <div className={`overlay-backdrop${docked ? " overlay-dock" : ""}`} onClick={docked ? undefined : onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:docked?130:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,boxSizing:"border-box",overflowX:"hidden"}}>
      {/* Backdrop fades as sheet is dragged down */}
      {!docked && <div style={{position:"absolute",inset:0,background:"rgba(18,26,20,.3)",opacity}}/>}
      <div
        onClick={function(e){e.stopPropagation();}}
        style={{
          transform:`translateY(${dragY}px)`,
          opacity,
          transition: startY === null ? "transform .25s ease, opacity .25s ease" : "none",
          position:"relative",
          background:C.card,
          borderRadius:C.r+4,
          width:"100%",
          maxWidth:wide?720:600,
          maxHeight:"min(86dvh, 860px)",
          display:"flex",
          flexDirection:"column",
          overflow:"hidden",
          boxSizing:"border-box",
          boxShadow:"0 20px 60px rgba(0,0,0,.22), 0 8px 20px rgba(0,0,0,.1)",
        }}
        className="overlay-sheet overlay-sheet--drag overlay-pop" ref={dialogRef} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : (ariaLabel || "Dialog")} tabIndex={-1}
      >
        {/* Drag zone — ONLY this top area drags the sheet. The body below
            scrolls normally on touch (previously the whole sheet captured
            vertical drags, so steps below the fold were unreachable on phones). */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{flexShrink:0,background:C.card,borderRadius:`${C.r+4}px ${C.r+4}px 0 0`,cursor:"grab",touchAction:"none"}}
        >
          <div className="overlay-handle-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px 8px 24px"}}>
            <h3 style={{margin:0,fontSize:20,fontFamily:F.head,fontWeight:700}}>{title}</h3>
            <button data-icon aria-label="Close dialog" onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.t2,width:44,height:44,borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation"}}><X size={18} strokeWidth={2}/></button>
          </div>
        </div>
        {/* Scrollable body */}
        <div className="overlay-body" style={{padding:"8px 24px 24px",overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",touchAction:"pan-y",flex:1}}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

export const Pill = React.memo(function Pill({children,c=C.green,bg=C.gp,sm=false,border=null}) {
  return <span style={{fontSize:sm?10:11,padding:sm?"2px 8px":"3px 10px",borderRadius:20,background:bg,color:c,fontWeight:600,fontFamily:F.body,whiteSpace:"nowrap",...(border?{border:`1px solid ${border}`}:{})}}>{children}</span>;
});

/* ═══════════════════════════════════════════
   TaskCheckbox — Things-3-style circular checkbox

   Empty circle → tap → fills green with white check. Scales up briefly
   to feel responsive. Used in task lists to replace the older "Done" pill
   button pattern. The caller is responsible for the row-level fade/slide
   transition that follows; this component only renders the box itself.

   Mobile note: the visible circle stays at `size` (default 22px) but the
   button hit target is 44px (WCAG 2.5.5 / Apple HIG minimum). Negative
   margins absorb the extra width so the surrounding flex row's layout
   doesn't shift on desktop — the visible circle stays anchored where a
   22px element would sit, while thumbs on mobile get a 44px tappable area.

   Props:
     checked          when true, renders filled + check icon
     onToggle         tap handler. Receives no args.
     size             outer diameter of the VISIBLE circle in px (default 22).
                      Hit target is always max(size, 44).
     stopPropagation  default true. Stops click bubbling so the surrounding
                      row's onClick (detail-open) doesn't fire.
     disabled         renders muted, no pointer events
   ════════════════════════════════════════════ */
export const TaskCheckbox = React.memo(function TaskCheckbox({checked, onToggle, size=22, stopPropagation=true, disabled=false}) {
  const handleClick = (e) => {
    if (stopPropagation) e.stopPropagation();
    if (disabled) return;
    if (onToggle) onToggle();
  };
  const borderColor = disabled ? C.bdr : checked ? C.green : C.bdr;
  const bgColor = checked ? C.green : "transparent";
  const hit = Math.max(size, 44);
  const gutter = (hit - size) / 2;
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={checked ? "Mark as not done" : "Mark as done"}
      aria-pressed={checked}
      disabled={disabled}
      style={{
        width: hit,
        height: hit,
        minHeight: hit,
        flexShrink: 0,
        margin: `-${gutter}px`,
        background: "transparent",
        border: "none",
        color: "#fff",
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          border: `2px solid ${borderColor}`,
          borderRadius: "50%",
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 180ms ease-out, border-color 180ms ease-out, transform 180ms ease-out",
          transform: checked ? "scale(1.08)" : "scale(1)",
        }}
      >
        {checked && (
          <svg width={Math.round(size*0.55)} height={Math.round(size*0.55)} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 8.5 7 12 13 4.5"/>
          </svg>
        )}
      </span>
    </button>
  );
});

// Hover tooltip — shows a floating info card on mouse enter, hides on leave
export const Tooltip = React.memo(function Tooltip({children, content, width=220}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({x:0, y:0});
  const ref = useRef(null);
  const handleEnter = (e) => {
    const rect = (ref.current || e.currentTarget).getBoundingClientRect();
    setPos({ x: rect.left + rect.width/2, y: rect.top });
    setShow(true);
  };
  return (
    <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={()=>setShow(false)} style={{position:"relative",display:"inline-block"}}>
      {children}
      {show && (
        <div style={{
          position:"fixed", left: Math.min(pos.x - width/2, window.innerWidth - width - 12), top: Math.max(8, pos.y - 8),
          transform:"translateY(-100%)", width, zIndex:9999, pointerEvents:"none",
        }}>
          <div style={{
            background:"#1d1d1f", color:"#fff", borderRadius:10, padding:"10px 14px",
            fontSize:12, lineHeight:1.5, fontFamily:F.body, boxShadow:"0 8px 24px rgba(0,0,0,.25)",
          }}>
            {content}
          </div>
          <div style={{width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1d1d1f",margin:"0 auto"}}/>
        </div>
      )}
    </div>
  );
});

export const Ring = React.memo(function Ring({pct,size=44,sw=3.5,color=C.green,children}) {
  const r=(size-sw)/2,ci=2*Math.PI*r,off=ci*(1-Math.min(1,pct));
  return <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bdr} strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={ci} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/></svg>
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.32}}>{children}</div>
  </div>;
});

export const Stat = React.memo(function Stat({label,value,sub,color=C.green}) {
  return <Card><div style={{fontSize:11,fontWeight:600,color:C.t2,textTransform:"uppercase",letterSpacing:".03em"}}>{label}</div><div style={{fontSize:26,fontWeight:700,fontFamily:F.head,marginTop:4,lineHeight:1}}>{value}</div>{sub&&<div style={{fontSize:12,color,marginTop:4,fontWeight:500}}>{sub}</div>}</Card>;
});

/* ═══════════════════════════════════════════
   SHARED CROP DETAIL COMPONENTS
   Used in both FarmMap zoomed view & Farming overlay
   ═══════════════════════════════════════════ */
export const StepChecklist = React.memo(function StepChecklist({steps, plantDate, onToggle, plotId}) {
  if (!steps || steps.length === 0) return null;
  return (
    <div style={SX.mb12}>
      <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:8}}>Growing Steps</div>
      {steps.map((s, i) => {
        const stepDate = localDateFromKey(addDaysToLocalKey(plantDate, s.d));
        const sd = stepDate ? stepDate.toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "";
        return (
          <div key={i} role="checkbox" aria-checked={!!s.done} tabIndex={0} onClick={e => {e.stopPropagation(); onToggle?.(plotId, i);}} onKeyDown={e => {if(e.key==="Enter"||e.key===" "){e.preventDefault();e.stopPropagation();onToggle?.(plotId, i);}}} style={{display:"flex",gap:10,padding:"10px 12px",background:s.done?"#f0faf0":C.card,border:`1px solid ${s.done?C.gm:C.bdr}`,borderRadius:C.rs,marginBottom:4,cursor:"pointer"}}>
            <div style={{width:22,height:22,borderRadius:22,border:`2px solid ${s.done?C.green:C.bdr}`,background:s.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0}}>{s.done?"✓":""}</div>
            <div style={SX.flex1}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <strong style={{fontSize:13,textDecoration:s.done?"line-through":"none"}}>{s.l}</strong>
                <span style={{fontSize:10,color:C.t2,fontFamily:F.mono}}>Day {s.d}{sd ? ` (${sd})` : ""}</span>
              </div>
              <div style={SX.t2_12mt2}>{s.t}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export const WaterCard = React.memo(function WaterCard({waterNote, waterFreq}) {
  if (!waterNote && !waterFreq) return null;
  // The note often covers more than water (site, support, succession), so the
  // heading carries the watering rhythm and the note reads as a growing tip.
  return <Card style={{marginBottom:12,background:C.tBlue}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>💧 {waterFreq ? `Water ${String(waterFreq).toLowerCase()}` : "Growing tip"}</div>{waterNote && <div style={SX.s13mt4}>{waterNote}</div>}</Card>;
});

export const StorageCard = React.memo(function StorageCard({storage}) {
  if (!storage) return null;
  return <Card style={{marginBottom:12,background:C.tYellow}}><div style={{fontSize:12,fontWeight:700,color:C.yellow}}>Storage</div><div style={SX.s13mt4}>{storage}</div></Card>;
});

/* ═══════════════════════════════════════════
   SwipeableRow — touch swipe wrapper for list rows

   Wraps any row content. On touch devices, horizontal swipes reveal
   an action and (past threshold) commit it. Desktop is unaffected —
   mouse interactions on the children keep working as normal.

   Props:
     onSwipeRight        callback for swipe-right (e.g. mark done)
     onSwipeLeft         callback for swipe-left (e.g. delete)
     rightActionLabel    label shown in the right-reveal background (default "✓ Done")
     rightActionBg       background color of the right reveal (default sage green)
     leftActionLabel     label shown in the left-reveal background (default "Delete")
     leftActionBg        background color of the left reveal (default red)
     disabled            if true, behaves like a passthrough wrapper
     style               passed through to the outer container

   Pass only the handler(s) you need. A missing handler disables that direction.
   ═══════════════════════════════════════════ */
export const SwipeableRow = React.memo(function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightActionLabel,
  rightActionBg = "#34c759",
  leftActionLabel,
  leftActionBg = "#ef4444",
  disabled = false,
  style: outerStyle,
}) {
  const { bind, offset, dragging, committed } = useSwipe({ onSwipeRight, onSwipeLeft, disabled });
  // x: while dragging track exactly; on commit slide off; on release spring back via CSS
  const x = dragging ? offset : committed ? (offset > 0 ? 400 : -400) : 0;

  const showingRight = offset > 4 && !!onSwipeRight;
  const showingLeft = offset < -4 && !!onSwipeLeft;
  const pastRight = offset >= 80;
  const pastLeft = offset <= -80;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 10, ...outerStyle }}>
      {onSwipeRight && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 18,
            background: rightActionBg,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: F.body,
            opacity: showingRight ? 1 : 0,
            transform: pastRight ? "scale(1.06)" : "scale(1)",
            transformOrigin: "left center",
            transition: "opacity 120ms, transform 120ms",
            pointerEvents: "none",
          }}
        >
          {rightActionLabel || "✓ Done"}
        </div>
      )}
      {onSwipeLeft && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 18,
            background: leftActionBg,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            fontFamily: F.body,
            opacity: showingLeft ? 1 : 0,
            transform: pastLeft ? "scale(1.06)" : "scale(1)",
            transformOrigin: "right center",
            transition: "opacity 120ms, transform 120ms",
            pointerEvents: "none",
          }}
        >
          {leftActionLabel || "Delete"}
        </div>
      )}
      <div
        {...bind}
        style={{
          position: "relative",
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : "transform .25s cubic-bezier(.25,.46,.45,.94)",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
});

