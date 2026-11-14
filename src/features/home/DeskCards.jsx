import { useEffect, useMemo, useState } from "react";
import { ListChecks, Sprout, CloudRain, ShoppingBasket, Egg, Leaf, Wallet, ThermometerSnowflake, Package, Clock, LayoutGrid, Pencil, Check, Plus, X } from "lucide-react";
import PlantArt from "../quiet/PlantArt";
import { MAX_CARDS, allCards, shownCards, suggestedIds, addCard, removeCard, moveCard } from "./desk-model";

/* The desktop home's cards (spec: docs/superpowers/specs/2026-11-14-desktop-farm-cards-design.md).
   Up to four, chosen by the user: the app suggests, "Edit cards" lets them add, remove and reorder.
   Each card is a button — its click goes where the number comes from (HomeV2.goTarget). */

const ICON = { jobs: ListChecks, harvest: Sprout, rain: CloudRain, picked: ShoppingBasket, eggs: Egg, growing: Leaf, money: Wallet, cold: ThermometerSnowflake, pantry: Package, time: Clock, space: LayoutGrid };
const RING = 2 * Math.PI * 21;

function Visual({ v }) {
  if (!v) return null;
  if (v.kind === "ring") {
    const on = Math.max(0, Math.min(1, v.pct)) * RING;
    return (
      <svg className="dk-ring" width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="21" />
        {on > 0 && <circle className="dk-ring-on" cx="26" cy="26" r="21" strokeDasharray={`${on} ${RING}`} transform="rotate(-90 26 26)" />}
      </svg>
    );
  }
  if (v.kind === "bars") {
    const top = Math.max(1e-6, ...v.values);
    return (
      <span className="dk-bars" aria-hidden="true">
        {v.values.map(function (n, i) {
          return (
            <span key={i} className={v.hi == null || v.hi === i ? "is-on" : ""}>
              <i style={{ height: `${Math.max(8, Math.round((n / top) * 100))}%`, animationDelay: `${i * 35}ms` }} />
              {v.labels && <em>{v.labels[i]}</em>}
            </span>
          );
        })}
      </span>
    );
  }
  if (v.kind === "crop") return <span className="dk-crop" aria-hidden="true"><PlantArt crop={v.crop} stage={v.stage} size={44} /></span>;
  return null;
}

function Meter({ v }) {
  if (!v) return null;
  if (v.kind === "fill" || v.kind === "crop") return <span className="dk-meter" aria-hidden="true"><i style={{ width: `${Math.round(Math.max(0, Math.min(1, v.pct)) * 100)}%` }} /></span>;
  if (v.kind === "split") {
    const total = v.parts.reduce((a, p) => a + p.n, 0);
    if (!total) return null;
    return (
      <span className="dk-meter is-split" aria-hidden="true">
        {v.parts.map(function (p) { return p.n ? <i key={p.tone} className={`is-s${p.tone}`} style={{ flexGrow: p.n }} /> : null; })}
      </span>
    );
  }
  return null;
}

function Face({ c }) {
  const Icon = ICON[c.id];
  return (
    <>
      <span className="dk-label"><i>{Icon && <Icon size={14} strokeWidth={2.4} />}</i>{c.label}</span>
      <span className="dk-main">
        <span className="dk-num"><span><b>{c.big}</b>{c.unit && <em>{c.unit}</em>}</span>{c.sub && <small>{c.sub}</small>}</span>
        <Visual v={c.visual} />
      </span>
      <Meter v={c.visual} />
    </>
  );
}

export default function DeskCards({ data, setData, tasks, forecast, progress, todayKey, crops, onTarget }) {
  const [edit, setEdit] = useState(false), [drag, setDrag] = useState(null);
  const ctx = useMemo(() => ({ data, tasks, forecast, progress, todayKey, crops }), [data, tasks, forecast, progress, todayKey, crops]);
  const cards = useMemo(() => shownCards(data, ctx), [data, ctx]);
  const ids = cards.map((c) => c.id);
  // the picker: what could be added — the app's suggestions first, then the rest this farm can fill
  const offer = useMemo(() => {
    if (!edit) return { top: [], more: [] };
    const shown = new Set(cards.map((c) => c.id)), hint = suggestedIds(ctx), rest = allCards(ctx).filter((c) => c.available && !shown.has(c.id));
    return { top: rest.filter((c) => hint.includes(c.id) || ["picked", "eggs"].includes(c.id)), more: rest.filter((c) => !hint.includes(c.id) && !["picked", "eggs"].includes(c.id)) };
  }, [edit, cards, ctx]);

  useEffect(() => {
    if (!edit) return undefined;
    const key = (e) => { if (e.key === "Escape") setEdit(false); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [edit]);

  const save = (next) => setData({ ...data, deskCards: next });
  const full = ids.length >= MAX_CARDS;
  const nudge = (e, i) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    save(moveCard(ids, i, i + (e.key === "ArrowUp" ? -1 : 1)));
  };

  const option = function (c) {
    const Icon = ICON[c.id];
    return (
      <li key={c.id} className={`dk-opt is-${c.id}`}>
        <i>{Icon && <Icon size={17} strokeWidth={2.3} />}</i>
        <span><strong>{c.label}</strong><small>{[c.big, c.unit].filter(Boolean).join(" ")}{c.sub ? ` · ${c.sub}` : ""}</small></span>
        <button type="button" aria-label={`Add the ${c.label} card`} disabled={full} onClick={function () { save(addCard(ids, c.id)); }}><Plus size={18} strokeWidth={2.6} /></button>
      </li>
    );
  };

  return (
    <>
      <div className={`dk-cards${edit ? " is-edit" : ""}`}>
        {cards.map(function (c, i) {
          if (!edit) return <button type="button" key={c.id} className={`dk-card is-${c.id}`} style={{ animationDelay: `${i * 60}ms` }} onClick={function () { onTarget(c.target); }}><Face c={c} /></button>;
          return (
            <div key={c.id} className={`dk-card is-${c.id} is-edit${drag === i ? " is-drag" : ""}`} tabIndex={0} role="group" aria-label={`${c.label}. Arrow keys move it`} draggable
              onKeyDown={function (e) { nudge(e, i); }}
              onDragStart={function (e) { setDrag(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.id); }}
              onDragOver={function (e) { if (drag != null) e.preventDefault(); }}
              onDrop={function (e) { e.preventDefault(); if (drag != null && drag !== i) save(moveCard(ids, drag, i)); setDrag(null); }}
              onDragEnd={function () { setDrag(null); }}>
              <Face c={c} />
              <button type="button" className="dk-x" aria-label={`Remove the ${c.label} card`} onClick={function () { save(removeCard(ids, c.id)); }}><X size={14} strokeWidth={2.8} /></button>
            </div>
          );
        })}
        {edit && !full && <div className="dk-slot" aria-hidden="true"><Plus size={18} strokeWidth={2.6} />{ids.length ? "Room for more" : "Pick your cards"}</div>}
        {edit
          ? <span className="dk-edit-row"><button type="button" className="dk-done" onClick={() => setEdit(false)}><Check size={16} strokeWidth={2.8} />Done</button>{ids.length > 1 && <em>Drag a card to move it</em>}</span>
          : <button type="button" className="dk-edit" onClick={() => setEdit(true)}>{ids.length ? <Pencil size={15} strokeWidth={2.2} /> : <Plus size={16} strokeWidth={2.4} />}{ids.length ? "Edit cards" : "Add cards"}</button>}
      </div>
      {edit && (
        <section className="dk-picker" aria-label="Add a card">
          <header><h2>Add a card</h2><b>{ids.length} of {MAX_CARDS} shown</b></header>
          {offer.top.length > 0 && <><h3>Suggested for you</h3><ul>{offer.top.map(option)}</ul></>}
          {offer.more.length > 0 && <><h3>More</h3><ul>{offer.more.map(option)}</ul></>}
          {offer.top.length + offer.more.length === 0 && <p>All added</p>}
        </section>
      )}
    </>
  );
}
