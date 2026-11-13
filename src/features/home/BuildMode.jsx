import { useEffect, useRef, useState } from "react";
import { Undo2, RotateCw, Trash2, Minus, Plus, Ruler, Hammer } from "lucide-react";
import { uid } from "../../lib/storage";
import { resolveEnvironment } from "../../lib/environment";
import { buildTypes, defaultSize, dropGeom, freeSpot, placeZone, setZoneGeom, resizeZone, turnZone, zoneUse, removeZone } from "./build-model";

/* Build mode: the farm is edited on the home map itself.
   Drag a piece from the tray onto the ground to place it (or tap it: it lands in free ground).
   Drag an area to move it; tap it for size, turn and remove. The map engine (Grove3D `onEngine`)
   says where a screen point meets the ground and draws the green footprint. */

const size = (z) => `${Math.round(z.wM * 10) / 10} × ${Math.round(z.hM * 10) / 10} m`;

export default function BuildMode({ data, setData, engine, onDone, onDesigner }) {
  const env = resolveEnvironment(data), types = buildTypes(env);
  const farmW = Math.max(1, data.farmW || 100), farmH = Math.max(1, data.farmH || 60);
  const [sel, setSel] = useState(null), [past, setPast] = useState([]), [chip, setChip] = useState(null), [ask, setAsk] = useState(false);
  const live = useRef({ data, engine, sel }), dragging = useRef(false), tray = useRef(null);
  useEffect(() => { live.current = { data, engine, sel }; });
  const zone = (data.zones || []).find((z) => z.id === sel) || null;

  // every change can be undone while build mode is open
  function commit(next, base) {
    setPast((p) => [...p.slice(-19), { zones: base.zones, garden: base.garden, livestock: base.livestock }]);
    setData(next);
  }
  function undo() {
    const last = past[past.length - 1]; if (!last) return;
    setPast(past.slice(0, -1)); setData({ ...data, ...last }); setSel(null); setAsk(false);
  }
  const change = (next) => { commit(next, data); setAsk(false); };

  // the green footprint marks the selected area (and follows a drag)
  const zx = zone ? zone.xM : null, zy = zone ? zone.yM : null, zw = zone ? zone.wM : null, zh = zone ? zone.hM : null;
  useEffect(() => {
    if (!engine || dragging.current) return;
    engine.setGhost(zx == null ? null : { xM: zx, yM: zy, wM: zw, hM: zh });
  }, [engine, zx, zy, zw, zh]);
  useEffect(() => () => { live.current.engine?.setGhost(null); }, []);
  const showSelection = () => {
    const { engine: en, data: d, sel: id } = live.current, z = (d.zones || []).find((q) => q.id === id);
    en?.setGhost(z ? { xM: z.xM, yM: z.yM, wM: z.wM, hM: z.hM } : null);
  };

  // a piece dragged out of the tray
  function tileDown(e, type) {
    if (e.button > 0) return;
    if (e.pointerType === "mouse") e.preventDefault();
    const piece = defaultSize(type, farmW, farmH), start = { x: e.clientX, y: e.clientY }, pid = e.pointerId, lift = e.pointerType === "touch" ? 56 : 0;
    let moved = false, geom = null;
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", cancel); dragging.current = false; setChip(null); };
    function move(ev) {
      if (ev.pointerId !== pid) return;
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 8) return;
      moved = true; dragging.current = true;
      const { engine: en, data: d } = live.current;
      const overTray = !!tray.current && ev.clientY > tray.current.getBoundingClientRect().top;
      const g = !overTray && en ? en.groundAt(ev.clientX, ev.clientY - lift) : null;
      geom = g ? dropGeom(d, piece, g.x, g.z) : null;
      if (en) en.setGhost(geom);
      setChip({ x: ev.clientX, y: ev.clientY, type, off: !geom });
    }
    function up(ev) {
      if (ev.pointerId !== pid) return;
      stop();
      const { engine: en, data: d } = live.current;
      if (!moved) { const c = en ? en.view() : { x: farmW / 2, z: farmH / 2 }; geom = freeSpot(d, piece, c.x, c.z); }
      if (!geom) { showSelection(); return; }
      const out = placeZone(d, type, geom, uid());
      if (!out.id) { showSelection(); return; }
      commit(out.data, d); setSel(out.id); setAsk(false);
    }
    function cancel(ev) { if (ev.pointerId !== pid) return; stop(); showSelection(); }
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", cancel);
  }

  // an area dragged on the map; a tap selects it, a tap on bare ground clears the selection
  useEffect(() => {
    if (!engine) return undefined;
    const host = engine.canvas.parentElement; if (!host) return undefined;
    let cur = null;
    const detach = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", abort); };
    function abort() { detach(); cur = null; dragging.current = false; const { data: d, sel: id } = live.current, z = (d.zones || []).find((q) => q.id === id); engine.setGhost(z ? { xM: z.xM, yM: z.yM, wM: z.wM, hM: z.hM } : null); }
    function move(e) {
      if (!cur || e.pointerId !== cur.pid) return;
      if (!cur.moved && Math.hypot(e.clientX - cur.x, e.clientY - cur.y) < 6) return;
      cur.moved = true; if (!cur.id) return;
      dragging.current = true;
      const g = engine.groundAt(e.clientX, e.clientY); if (!g) return;
      cur.geom = dropGeom(live.current.data, cur.piece, g.x - cur.off.x, g.z - cur.off.z, cur.id);
      engine.setGhost(cur.geom);
    }
    function up(e) {
      if (!cur || e.pointerId !== cur.pid) return;
      const c = cur; detach(); cur = null; dragging.current = false;
      if (!c.id) { if (!c.moved) { setSel(null); setAsk(false); } return; }
      if (c.moved && c.geom) { const d = live.current.data; setPast((p) => [...p.slice(-19), { zones: d.zones, garden: d.garden, livestock: d.livestock }]); setData(setZoneGeom(d, c.id, c.geom)); }
      setSel(c.id); setAsk(false);
    }
    function down(e) {
      if (e.target !== engine.canvas) return;
      if (cur) { if (cur.id) abort(); else { detach(); cur = null; } return; } // a second finger: this is a pinch, not a move
      if (e.button > 0) return;
      const id = engine.zoneAt(e.clientX, e.clientY);
      if (!id) { cur = { id: null, pid: e.pointerId, x: e.clientX, y: e.clientY, moved: false }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", abort); return; }
      const z = (live.current.data.zones || []).find((q) => q.id === id), g0 = engine.groundAt(e.clientX, e.clientY);
      if (!z || !g0) return;
      e.stopPropagation(); // the camera stays still while an area is being moved
      cur = { id, pid: e.pointerId, x: e.clientX, y: e.clientY, moved: false, geom: null, piece: { wM: z.wM, hM: z.hM }, off: { x: g0.x - (z.xM + z.wM / 2), z: g0.z - (z.yM + z.hM / 2) } };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", abort);
    }
    host.addEventListener("pointerdown", down, true);
    return () => { host.removeEventListener("pointerdown", down, true); detach(); };
  }, [engine, setData]);

  const use = zone ? zoneUse(data, zone.id) : null;
  const chipType = chip ? types.find((t) => t.id === chip.type) : null;
  return (
    <div className="hv2-build">
      <div className="hv2-build-top">
        <div className="hv2-build-title" role="status">
          <span className="hv2-ico"><Hammer size={17} strokeWidth={2.2} /></span>
          <span><b>Build mode</b><small>Drag or tap a piece to place it on your {env === "farm" ? "farm" : env === "balcony" ? "balcony" : "garden"} · drag an area to move it</small></span>
        </div>
        {past.length > 0 && <button type="button" className="hv2-build-btn" aria-label="Undo" onClick={undo}><Undo2 size={20} /></button>}
        <button type="button" className="hv2-build-btn is-done" onClick={onDone}>Done</button>
      </div>

      {zone && (
        <section className="hv2-build-card" aria-label={`${zone.name}, ${size(zone)}`}>
          {ask ? (
            <>
              <p className="hv2-build-ask"><b>Remove {zone.name}?</b>{use.crops + use.animals > 0 ? ` Its ${[use.crops ? `${use.crops} crop${use.crops === 1 ? "" : "s"}` : "", use.animals ? `${use.animals} animal group${use.animals === 1 ? "" : "s"}` : ""].filter(Boolean).join(" and ")} stay${use.crops + use.animals === 1 ? "s" : ""} on your list, without a place.` : ""}</p>
              <div className="hv2-build-row">
                <button type="button" className="hv2-build-act is-danger" onClick={() => { change(removeZone(data, zone.id)); setSel(null); }}>Remove</button>
                <button type="button" className="hv2-build-act" onClick={() => setAsk(false)}>Keep</button>
              </div>
            </>
          ) : (
            <>
              <div className="hv2-build-head"><b>{zone.name}</b><span>{size(zone)}</span></div>
              <div className="hv2-build-row">
                <span className="hv2-build-step" role="group" aria-label="Width">
                  <button type="button" aria-label="Narrower" onClick={() => change(resizeZone(data, zone.id, -1, 0))}><Minus size={18} /></button>
                  <i>Width</i>
                  <button type="button" aria-label="Wider" onClick={() => change(resizeZone(data, zone.id, 1, 0))}><Plus size={18} /></button>
                </span>
                <span className="hv2-build-step" role="group" aria-label="Depth">
                  <button type="button" aria-label="Shallower" onClick={() => change(resizeZone(data, zone.id, 0, -1))}><Minus size={18} /></button>
                  <i>Depth</i>
                  <button type="button" aria-label="Deeper" onClick={() => change(resizeZone(data, zone.id, 0, 1))}><Plus size={18} /></button>
                </span>
                <button type="button" className="hv2-build-act is-icon" aria-label="Turn a quarter" onClick={() => change(turnZone(data, zone.id))}><RotateCw size={19} /></button>
                <button type="button" className="hv2-build-act is-icon is-danger" aria-label={`Remove ${zone.name}`} onClick={() => setAsk(true)}><Trash2 size={19} /></button>
              </div>
            </>
          )}
        </section>
      )}

      <div className="hv2-build-tray" ref={tray} role="toolbar" aria-label="Things to build">
        {types.map(function (t) {
          return (
            <button type="button" key={t.id} className="hv2-build-tile" aria-label={`Add ${t.label}. Drag onto the map, or tap to place`} onPointerDown={function (e) { tileDown(e, t.id); }}>
              <span aria-hidden="true">{t.icon}</span><span>{t.label}</span>
            </button>
          );
        })}
        <button type="button" className="hv2-build-tile is-more" onClick={onDesigner}><span aria-hidden="true"><Ruler size={26} strokeWidth={1.8} /></span><span>Paths, decor, exact sizes</span></button>
      </div>

      {chip && chipType && <span className={`hv2-build-chip${chip.off ? " is-off" : ""}`} aria-hidden="true" style={{ left: chip.x, top: chip.y }}>{chipType.icon}</span>}
    </div>
  );
}
