/* The area card on the map.
   Phones and narrow windows: a bottom sheet about half the screen high, so the 3D bed stays in view above it;
   the handle pulls it up to nearly full height and back. Wide windows: a panel down the right side.
   Not modal: the map stays live, and tapping another area swaps the card. It closes with the X or Escape only
   (never by a stray tap or swipe, like the app's other cards). It reports the part of the screen it covers
   (cover.js) so the map can frame the area in what is left. MARKER: ZONE_SHEET_V1 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { isCoarse } from "./gestures";
import { setCover, sheetMode } from "./cover";
import { publishDockHeight } from "./dock";
import "./zone-sheet.css";

export default function ZoneSheet({ title, subtitle, onClose, children }) {
  const card = useRef(null), closeRef = useRef(onClose), drag = useRef(null);
  const [mode, setMode] = useState(function () { return sheetMode(window.innerWidth, isCoarse()); });
  const [tall, setTall] = useState(false);
  useEffect(function () { closeRef.current = onClose; }, [onClose]);

  // tell the map what is hidden: now, when the sheet changes height, when the window changes, and on close
  useEffect(function () {
    const el = card.current; if (!el) return undefined;
    function report() {
      const w = window.innerWidth, h = window.innerHeight;
      if (mode === "sheet") setCover({ left: 0, right: w, top: h - el.offsetHeight, bottom: h });
      else setCover({ left: el.offsetLeft, right: el.offsetLeft + el.offsetWidth, top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight });
    }
    function resize() { setMode(sheetMode(window.innerWidth, isCoarse())); report(); }
    report();
    el.addEventListener("transitionend", report); window.addEventListener("resize", resize);
    return function () { el.removeEventListener("transitionend", report); window.removeEventListener("resize", resize); };
  }, [mode, tall]);
  useEffect(function () { return function () { setCover(null); }; }, []);
  // on the desktop home the card is docked in the side column: the panel below it needs its height
  useEffect(function () { return publishDockHeight(card.current); }, []);

  // focus moves into the card (for screen readers and Escape) and back to where it was on close
  useEffect(function () {
    const previous = document.activeElement; card.current?.focus({ preventScroll: true });
    function key(e) { if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector(".overlay-sheet")) { e.stopPropagation(); closeRef.current(); } }
    window.addEventListener("keydown", key, true);
    // A tap on the map outside the card closes it. Taps on buttons and area labels are left alone, and if the tap opened another area the card has already changed.
    const t0 = performance.now(); let gone = false;
    function outside(e) {
      if (e.timeStamp < t0 + 120 || !card.current || card.current.contains(e.target) || document.querySelector(".overlay-sheet")) return;
      if (e.target.closest && e.target.closest("button, a, .g3-pill")) return;
      const before = card.current.getAttribute("aria-label"); setTimeout(function () { if (!gone && card.current && card.current.getAttribute("aria-label") === before) closeRef.current(); }, 80);
    }
    document.addEventListener("click", outside);
    return function () { gone = true; document.removeEventListener("click", outside); window.removeEventListener("keydown", key, true); if (previous instanceof HTMLElement && document.contains(previous)) previous.focus({ preventScroll: true }); };
  }, []);

  // a phone sheet locks the page behind it; a desktop panel leaves the page scrolling
  useEffect(function () {
    if (mode !== "sheet") return undefined;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return function () { document.body.style.overflow = prev; };
  }, [mode]);

  // the handle: a tap toggles the height, a drag of 36 px up or down sets it
  function grabDown(e) { drag.current = { y: e.clientY, moved: false }; e.currentTarget.setPointerCapture?.(e.pointerId); }
  function grabMove(e) { const d = drag.current; if (!d) return; const dy = e.clientY - d.y; if (Math.abs(dy) > 36) { d.moved = true; setTall(dy < 0); drag.current = { y: e.clientY, moved: true }; } }
  function grabUp() { const d = drag.current; drag.current = null; if (d && !d.moved) setTall(!tall); }

  return createPortal(
    <div className={"zs-root zs-" + mode + (tall ? " tall" : "")}>
      <section className="zs-card" ref={card} role="dialog" aria-modal="false" aria-label={title} tabIndex={-1}>
        {mode === "sheet" && (
          <button type="button" className="zs-grab" aria-label={tall ? "Make this card smaller" : "Make this card taller"} aria-expanded={tall}
            onPointerDown={grabDown} onPointerMove={grabMove} onPointerUp={grabUp} onPointerCancel={function () { drag.current = null; }}
            onKeyDown={function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTall(!tall); } }}><i aria-hidden="true" /></button>
        )}
        <header className="zs-head">
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" className="zs-x" aria-label="Close this card" onClick={onClose}><X size={18} strokeWidth={2} /></button>
        </header>
        <div className="zs-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
