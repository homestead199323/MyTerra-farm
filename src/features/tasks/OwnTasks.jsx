import React, { useState } from "react";
import { Overlay, Inp, Sel, Btn, Actions } from "../../components/ui";
import { C } from "../../lib/theme";
import { uid } from "../../lib/storage";
import { todayLocalKey } from "../../lib/utils";
import { REPEATS, repeatText, saveOwnTask, deleteOwnTask, ownTaskIdeas, weeklyMinutes } from "../../lib/own-tasks";

/* ═══════════════════════════════════════════
   YOUR OWN JOBS — add / edit form and the list on the Tasks screen
   (lib/own-tasks.js holds the rules).
   ═══════════════════════════════════════════ */

const EMOJIS = ["📝", "🌿", "♻️", "💧", "🧰", "🪵", "🛒", "🧽", "🐔", "🍎"];
const GROWING_OR_PLACE = new Set(["veg", "raised", "herbs", "orchard", "greenhouse", "container", "nursery", "barn", "coop", "pasture", "beehive", "compost", "water", "storage", "house"]);

export function OwnTaskForm({ data, setData, initial, onClose }) {
  const editing = !!(initial && initial.id);
  const [f, setF] = useState(() => ({
    title: "", note: "", emoji: "📝", zoneId: "", start: todayLocalKey(), repeat: "once", every: 3, minutes: 10,
    ...(initial || {}),
  }));
  const [err, setErr] = useState("");
  const zones = (data.zones || []).filter((z) => GROWING_OR_PLACE.has(z.type));
  const ideas = editing ? [] : ownTaskIdeas(data);

  function pickIdea(i) {
    const z = i.zoneType ? zones.find((x) => x.type === i.zoneType) : null;
    setF({ ...f, title: i.title, emoji: i.emoji, repeat: i.repeat, minutes: i.minutes, zoneId: z ? z.id : f.zoneId });
  }
  function save() {
    const title = String(f.title || "").trim();
    if (!title) { setErr("Give the job a name."); return; }
    if (!f.start) { setErr("Pick a start date."); return; }
    const every = Math.round(Number(f.every));
    if (f.repeat === "every" && !(every >= 1 && every <= 365)) { setErr("Repeat every 1 to 365 days."); return; }
    const minutes = Math.round(Number(f.minutes));
    const task = {
      id: f.id || uid(), title: title.slice(0, 80), note: String(f.note || "").trim().slice(0, 300), emoji: f.emoji || "📝",
      zoneId: f.zoneId || "", start: f.start, repeat: f.repeat, every: f.repeat === "every" ? every : undefined,
      minutes: minutes > 0 && minutes <= 600 ? minutes : 10, paused: !!f.paused, createdAt: f.createdAt || new Date().toISOString(),
    };
    // Editing the date or repeat of a one-off that was already ticked makes it due again.
    if (editing && (initial.start !== task.start || initial.repeat !== task.repeat)) task.doneOn = undefined;
    else if (f.doneOn) task.doneOn = f.doneOn;
    setData(saveOwnTask(data, task));
    onClose();
  }

  return (
    <Overlay title={editing ? "Edit your job" : "Add your own job"} onClose={onClose}>
      {ideas.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 6 }}>Ideas</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ideas.map(function (i) {
              return <button key={i.title} type="button" onClick={function () { pickIdea(i); }} className="mt-plan-chip" style={{ border: 0, cursor: "pointer", minHeight: 34 }}>{i.emoji} {i.title}</button>;
            })}
          </div>
        </div>
      )}
      <Inp label="What needs doing" value={f.title} maxLength={80} placeholder="e.g. Turn the compost" onChange={(e) => setF({ ...f, title: e.target.value })} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "-4px 0 12px" }} role="radiogroup" aria-label="Icon">
        {EMOJIS.map(function (e) {
          return <button key={e} type="button" role="radio" aria-checked={f.emoji === e} aria-label={`Icon ${e}`} onClick={function () { setF({ ...f, emoji: e }); }}
            style={{ width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: "pointer", border: `1.5px solid ${f.emoji === e ? C.green : C.bdr}`, background: f.emoji === e ? C.gp : C.card }}>{e}</button>;
        })}
      </div>
      <Sel label="Where" value={f.zoneId} onChange={(e) => setF({ ...f, zoneId: e.target.value })}
        options={[{ value: "", label: "Anywhere (not on the map)" }].concat(zones.map(function (z) { return { value: z.id, label: z.name }; }))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Sel label="How often" value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} options={REPEATS.map(function (r) { return { value: r.id, label: r.label }; })} />
        <Inp label={f.repeat === "once" ? "When" : "Starting"} type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
      </div>
      {f.repeat === "every" && <Inp label="Every how many days" type="number" min="1" max="365" value={f.every} onChange={(e) => setF({ ...f, every: e.target.value })} />}
      <Inp label="About how many minutes" type="number" min="1" max="600" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} />
      <Inp label="Note (optional)" value={f.note} maxLength={300} placeholder="Anything to remember" onChange={(e) => setF({ ...f, note: e.target.value })} />
      <p style={{ fontSize: 12, color: C.t2, margin: "-4px 0 12px" }}>{f.start ? repeatText({ ...f, every: Number(f.every) }) : ""}{f.zoneId ? " · shows on your map and walk" : ""}</p>
      {err && <p role="alert" style={{ color: C.red, fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
      <Actions>
        {editing && <button type="button" className="mt-danger-link" onClick={function () { setData(deleteOwnTask(data, f.id)); onClose(); }}>Delete</button>}
        <Btn v="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save}>{editing ? "Save" : "Add job"}</Btn>
      </Actions>
    </Overlay>
  );
}

/** The user's jobs, with pause / edit. */
export function OwnTaskList({ data, setData, onEdit }) {
  const list = Array.isArray(data.customTasks) ? data.customTasks : [];
  const zones = new Map((data.zones || []).map((z) => [z.id, z.name]));
  const active = list.filter((t) => !(t.repeat === "once" && t.doneOn));
  if (active.length === 0) return <p style={{ fontSize: 13, color: C.t2, margin: "4px 2px 0" }}>Add jobs MyTerra doesn't know about — turning the compost, fixing a fence, buying seed. They show up on Today when they're due.</p>;
  return (
    <div>
      {active.map(function (t) {
        const wk = Math.round(weeklyMinutes(t));
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.bdr}`, opacity: t.paused ? 0.55 : 1 }}>
            <span style={{ fontSize: 20, width: 28, textAlign: "center" }} aria-hidden="true">{t.emoji || "📝"}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 14, color: C.text }}>{t.title}{t.paused ? " · paused" : ""}</strong>
              <small style={{ display: "block", fontSize: 12, color: C.t2 }}>{repeatText(t)}{t.zoneId && zones.get(t.zoneId) ? ` · ${zones.get(t.zoneId)}` : ""} · ~{t.minutes || 10} min{wk > 0 && t.repeat !== "once" ? ` (~${wk} min a week)` : ""}</small>
            </span>
            {t.repeat !== "once" && <Btn sm v="ghost" onClick={function () { setData(saveOwnTask(data, { ...t, paused: !t.paused })); }}>{t.paused ? "Resume" : "Pause"}</Btn>}
            <Btn sm v="secondary" onClick={function () { onEdit(t); }}>Edit</Btn>
          </div>
        );
      })}
    </div>
  );
}
