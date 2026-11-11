import { ChevronDown } from "lucide-react";
import React, { useMemo, useState } from "react";
import { C, F } from "../../lib/theme";
import { budgetCheck, hm, BUDGET_MIN, BUDGET_LABEL } from "../../lib/time-budget";
import { saveOwnTask } from "../../lib/own-tasks";
import { todayLocalKey, localDateFromKey } from "../../lib/utils";

/* ═══════════════════════════════════════════
   TIME BUDGET CARD — Tasks screen (lib/time-budget.js)
   ═══════════════════════════════════════════ */

const ORDER = ["min5", "min15", "weekly", "daily", "unlimited"];

export default function TimeBudgetCard({ data, setData, forecast }) {
  const today = todayLocalKey();
  const check = useMemo(function () { return budgetCheck(data, forecast, today); }, [data, forecast, today]);
  const [open, setOpen] = useState(null); // null = automatic: open when over budget
  const tb = data.profile && data.profile.timeBudget;
  const { status, load, budget } = check;
  if (load.total === 0 && status !== "over") return null;
  const warn = status === "tight" || status === "over";
  const expanded = open == null ? status === "over" : open;
  const maxDay = Math.max(1, ...load.days.map(function (d) { return d.minutes; }));

  function setBudget(id) {
    setData({ ...data, profile: { ...(data.profile || {}), timeBudget: id || null } });
  }

  const headline = status === "none"
    ? `This week: about ${hm(load.total)} of jobs`
    : status === "ok"
    ? `This week: about ${hm(load.total)} of jobs — fits your ${BUDGET_LABEL[tb].toLowerCase()}`
    : `This week: about ${hm(load.total)} of jobs — ${hm(check.over)} more than your ${BUDGET_LABEL[tb].toLowerCase()}`;

  return (
    <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 14, border: `1px solid ${warn ? C.orange : C.bdr}`, background: warn ? C.harvestBg : C.card }}>
      <button type="button" onClick={function () { setOpen(!expanded); }} aria-expanded={expanded}
        style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", color: C.text, fontFamily: F.body }}>
        
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 14 }}>{headline}</strong>
          {budget && <small style={{ display: "block", fontSize: 12, color: C.t2, marginTop: 2 }}>Your time: about {hm(budget)} a week</small>}
        </span>
        <ChevronDown size={20} aria-hidden="true" style={{ color: C.t2, flexShrink: 0, transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "none" }} />
      </button>
      {expanded && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, alignItems: "end", height: 64 }} role="img"
            aria-label={load.days.map(function (d) { return `${localDateFromKey(d.date).toLocaleDateString(undefined, { weekday: "short" })} ${d.minutes} minutes`; }).join(", ")}>
            {load.days.map(function (d) {
              return (
                <span key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 3 }}>
                  <b style={{ display: "block", width: "70%", maxWidth: 28, minHeight: 2, height: `${Math.round((d.minutes / maxDay) * 70)}%`, borderRadius: "5px 5px 2px 2px", background: budget && d.minutes > budget / 7 * 1.5 ? "#d9a441" : "#43a36a" }} />
                  <small style={{ fontSize: 10.5, color: C.t2 }}>{d.date === today ? "Today" : localDateFromKey(d.date).toLocaleDateString(undefined, { weekday: "short" })}</small>
                </span>
              );
            })}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, margin: "12px 0 4px" }}>Where the time goes</div>
          {load.groups.slice(0, 5).map(function (g) {
            return <div key={g.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", color: C.text }}><span>{g.label}</span><span style={{ color: C.t2 }}>{hm(g.minutes)}</span></div>;
          })}
          {check.trims.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, margin: "12px 0 6px" }}>Quick trims</div>
              {check.trims.map(function (t) {
                const own = (data.customTasks || []).find(function (x) { return x.id === t.id; });
                const label = t.change.repeat === "every" ? `every ${t.change.every} days` : t.change.repeat === "fortnightly" ? "every 2 weeks" : "every month";
                return (
                  <button key={t.id} type="button" onClick={function () { if (own) setData(saveOwnTask(data, { ...own, ...t.change })); }}
                    style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.bdr}`, background: C.card, color: C.text, fontSize: 13, cursor: "pointer", minHeight: 40 }}>
                    “{t.title}” {label} <span style={{ color: C.green, fontWeight: 700 }}>· saves ~{t.saves} min a week</span>
                  </button>
                );
              })}
            </>
          )}
          {warn && check.tips.length > 0 && (
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12.5, color: C.t2, lineHeight: 1.5 }}>
              {check.tips.map(function (t) { return <li key={t}>{t}</li>; })}
            </ul>
          )}
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.t2, margin: "12px 0 5px" }} htmlFor="tb-select">Time you have</label>
          <select id="tb-select" value={tb || ""} onChange={function (e) { setBudget(e.target.value); }}
            style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${C.bdr}`, borderRadius: 10, background: C.card, color: C.text, fontSize: 15, fontFamily: F.body }}>
            <option value="">Not set</option>
            {ORDER.map(function (id) { return <option key={id} value={id}>{BUDGET_LABEL[id]}{BUDGET_MIN[id] ? ` (~${hm(BUDGET_MIN[id])} a week)` : ""}</option>; })}
          </select>
          <p style={{ fontSize: 11.5, color: C.t3, margin: "6px 0 0", lineHeight: 1.45 }}>Minutes are a beginner's pace, rounded. Animal care and harvests are never dropped to fit — trim your own jobs, or plant less next season.</p>
        </div>
      )}
    </div>
  );
}
