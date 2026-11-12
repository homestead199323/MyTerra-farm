import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Tractor, CalendarDays, Plus, X, MessageCircle, Menu, ChevronRight, Sprout, PawPrint, Hammer, ClipboardList, ShoppingBasket,
  Leaf, ListChecks, BookOpen, TrendingUp, Package, Wallet, Lightbulb, UserRound,
} from "lucide-react";
import { Overlay } from "../../components/ui";
import { isPlantZone } from "../farm/living/visuals";
import { fanTarget } from "./home-model";
import "./home-v2.css";

/* The floating dock of the map-first home. Phone: Farm · Calendar · + · Ask · More.
   Wider screens add Learn and Progress. + fans five round buttons out of itself (no sheet);
   More lists every other page. */

const FAN = [
  { id: "plant", l: "Plant", a: "Plant a crop", E: Sprout },
  { id: "animal", l: "Animal", a: "Add an animal", E: PawPrint },
  { id: "build", l: "Build", a: "Build a bed or area", E: Hammer },
  { id: "job", l: "Job", a: "Add a job", E: ClipboardList },
  { id: "harvest", l: "Harvest", a: "Log a harvest", E: ShoppingBasket },
];
const MORE = [
  { page: "crops", l: "Crops", s: "Everything planted", E: Leaf },
  { page: "live", l: "Animals", s: "Your animals by area", E: PawPrint },
  { page: "tasks", l: "All tasks", s: "Today and the week ahead", E: ListChecks },
  { page: "manuals", l: "Learn", s: "Guides for crops, animals, preserving", E: BookOpen },
  { page: "progress", l: "Progress", s: "What your space has given you", E: TrendingUp },
  { page: "pantry", l: "Pantry", s: "What is in stock", E: Package },
  { page: "fin", l: "Money", s: "Costs and income", E: Wallet },
  { page: "insights", l: "Insights", s: "Yields and cost per kilo", E: Lightbulb },
];

export default function GameDock({ page, setPage, data, onAsk, aiLocked, onAccount, wide = false }) {
  const [fan, setFan] = useState(false), [more, setMore] = useState(false);
  useEffect(() => {
    if (!fan) return undefined;
    const key = (e) => { if (e.key === "Escape") setFan(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [fan]);
  const canPlant = (data.zones || []).some((z) => isPlantZone(z.type));
  const go = (p, pd) => { setFan(false); setMore(false); setPage(p, pd); };
  const top = wide ? ["home", "plan", "manuals", "progress"] : ["home", "plan"];
  const rows = MORE.filter((r) => !top.includes(r.page));
  const inMore = !top.includes(page);
  return (
    <>
      <nav aria-label="Main navigation" className={`hv2-dock${wide ? " is-wide" : ""}`}>
        <button type="button" aria-current={page === "home" && !more ? "page" : undefined} onClick={() => go("home")}><Tractor size={22} strokeWidth={1.9} /><span>Farm</span></button>
        <button type="button" aria-current={page === "plan" && !more ? "page" : undefined} onClick={() => go("plan")}><CalendarDays size={22} strokeWidth={1.9} /><span>{wide ? "Plan" : "Calendar"}</span></button>
        {wide && <button type="button" aria-current={page === "manuals" && !more ? "page" : undefined} onClick={() => go("manuals")}><BookOpen size={22} strokeWidth={1.9} /><span>Learn</span></button>}
        <span className="hv2-dock-gap" aria-hidden="true" />
        {wide && <button type="button" aria-current={page === "progress" && !more ? "page" : undefined} onClick={() => go("progress")}><TrendingUp size={22} strokeWidth={1.9} /><span>Progress</span></button>}
        <button type="button" onClick={() => { setFan(false); setMore(false); onAsk(); }}><MessageCircle size={22} strokeWidth={1.9} /><span>Ask</span></button>
        <button type="button" aria-expanded={more} aria-current={more || inMore ? "page" : undefined} onClick={() => { setFan(false); setMore(!more); }}><Menu size={22} strokeWidth={1.9} /><span>More</span></button>
      </nav>
      {!fan && <button type="button" className="hv2-plus" aria-label="Add" aria-expanded="false" onClick={() => { setMore(false); setFan(true); }}><Plus size={28} strokeWidth={2.4} /></button>}
      {fan && createPortal(
        <div className="hv2-fan" role="dialog" aria-modal="true" aria-label="Add">
          <button type="button" className="hv2-fan-scrim" aria-label="Close" onClick={() => setFan(false)} />
          {FAN.map(function (f, i) {
            const target = fanTarget(f.id, canPlant);
            return (
              <button type="button" key={f.id} className={`hv2-fan-item hv2-fan-${i}`} aria-label={f.a} onClick={function () { go(target[0], target[1]); }}>
                <span className={`hv2-fan-dot is-${f.id}`}><f.E size={26} strokeWidth={2} /></span>
                <span className="hv2-fan-label">{f.l}</span>
              </button>
            );
          })}
          <button type="button" className="hv2-plus is-open" aria-label="Close add menu" aria-expanded="true" onClick={() => setFan(false)}><X size={26} strokeWidth={2.4} /></button>
        </div>,
        document.body,
      )}
      {more && (
        <Overlay title="More" onClose={() => setMore(false)}>
          <div className="mt-more">
            {rows.map(function (r) {
              return <button key={r.page} type="button" aria-current={page === r.page ? "page" : undefined} onClick={function () { go(r.page); }}><r.E size={22} strokeWidth={1.8} /><span><strong>{r.l}</strong><small>{r.s}</small></span><ChevronRight size={18} /></button>;
            })}
            <button type="button" onClick={() => { setMore(false); onAsk(); }}><MessageCircle size={22} strokeWidth={1.8} /><span><strong>Ask the assistant</strong><small>{aiLocked ? "Part of Pro" : "Answers about your crops and animals"}</small></span><ChevronRight size={18} /></button>
            {onAccount && <button type="button" onClick={() => { setMore(false); onAccount(); }}><UserRound size={22} strokeWidth={1.8} /><span><strong>Account</strong><small>Settings, plan and feedback</small></span><ChevronRight size={18} /></button>}
          </div>
        </Overlay>
      )}
    </>
  );
}
