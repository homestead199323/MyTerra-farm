import React, { useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { C, F } from "../../lib/theme";
import { usePushPrefs } from "../../lib/use-push-prefs";
import { pushSupport, enablePush, disablePush, updatePushHour, sendTestPush, setPushPrefs } from "../../lib/push";

/* ═══════════════════════════════════════════
   REMINDERS — morning digest on this device (lib/push.js)
   Settings row + the one-time card on Home. Both read the same per-device
   prefs and stay in sync through the "myterra:push" event.
   ═══════════════════════════════════════════ */

const HOURS = [5, 6, 7, 8, 9, 10, 12, 17, 18, 19, 20];
function hourLabel(h) {
  const d = new Date(2026, 0, 1, h, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const WHY = {
  "ios-install": "On iPhone and iPad, notifications work once MyTerra is on your Home Screen: tap Share, then “Add to Home Screen”, and open MyTerra from there.",
  denied: "Notifications are blocked for MyTerra. Allow them in your browser or phone settings, then come back here.",
  unsupported: "This browser can't show notifications from web apps. Chrome, Edge, Firefox and Safari (Mac, or iPhone from the Home Screen) can.",
  "no-cloud": "Reminders need a signed-in account.",
};

/** Settings section. */
export default function Reminders({ rowBtn, ico, sectionLabel }) {
  const prefs = usePushPrefs();
  const support = pushSupport();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone: "ok" | "err", text }

  function run(fn, okText) {
    setBusy(true); setMsg(null);
    fn().then(function () { if (okText) setMsg({ tone: "ok", text: okText }); })
      .catch(function (e) { setMsg({ tone: "err", text: (e && e.message) || "Something went wrong." }); })
      .then(function () { setBusy(false); });
  }

  return (
    <>
      <div style={sectionLabel}>Reminders</div>
      <div style={{ marginBottom: 18 }}>
        {!support.ok && !prefs.on ? (
          <div style={{ padding: "12px 14px", border: `1px solid ${C.bdr}`, borderRadius: 10, fontSize: 13, color: C.t2, lineHeight: 1.5 }}>
            <strong style={{ color: C.text, display: "block", marginBottom: 3 }}>Morning jobs as a notification</strong>
            {WHY[support.reason] || WHY.unsupported}
          </div>
        ) : prefs.on ? (
          <>
            <div style={{ padding: "12px 14px", border: `1px solid ${C.bdr}`, borderRadius: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginBottom: 8 }}>On for this device</div>
              <label htmlFor="settings-push-hour" style={{ fontSize: 12, color: C.t2 }}>Send my jobs at</label>
              <select id="settings-push-hour" value={prefs.hour} disabled={busy}
                onChange={(e) => { const h = Number(e.target.value); run(() => updatePushHour(h), `Reminders will come at ${hourLabel(h)}.`); }}
                style={{ width: "100%", marginTop: 5, padding: "10px 12px", border: `1.5px solid ${C.bdr}`, borderRadius: 10, background: C.card, color: C.text, fontSize: 15, fontFamily: F.body }}>
                {(HOURS.includes(prefs.hour) ? HOURS : HOURS.concat([prefs.hour]).sort((a, b) => a - b)).map(function (h) { return <option key={h} value={h}>{hourLabel(h)}</option>; })}
              </select>
              <div style={{ fontSize: 11.5, color: C.t3, marginTop: 6, lineHeight: 1.45 }}>
                Today's jobs and weather warnings, in your local time. Nothing is sent on days with no jobs, or if MyTerra hasn't been opened for a week.
              </div>
            </div>
            <button type="button" disabled={busy} style={rowBtn} onClick={() => run(sendTestPush, "Test sent. It should appear within a minute.")}>
              <span style={ico}><Send size={17} strokeWidth={1.8} /></span> Send a test notification
            </button>
            <button type="button" disabled={busy} style={rowBtn} onClick={() => run(disablePush, "Reminders are off for this device.")}>
              <span style={ico}><BellOff size={17} strokeWidth={1.8} /></span> Turn off reminders
            </button>
          </>
        ) : (
          <button type="button" disabled={busy} style={rowBtn} onClick={() => run(() => enablePush(prefs.hour), "Reminders are on. You'll get your jobs each morning.")}>
            <span style={ico}><Bell size={17} strokeWidth={1.8} /></span> {busy ? "Turning on…" : `Morning jobs as a notification (${hourLabel(prefs.hour)})`}
          </button>
        )}
        {msg && (
          <div role={msg.tone === "err" ? "alert" : "status"} style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.45, color: msg.tone === "err" ? C.red : C.green }}>{msg.text}</div>
        )}
      </div>
    </>
  );
}

/** One-time card on Home: offers reminders where they can work. */
export function RemindersPrompt() {
  const prefs = usePushPrefs();
  const support = pushSupport();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (prefs.on || prefs.dismissed) return null;
  if (!support.ok && support.reason !== "ios-install") return null;
  return (
    <section className="mt-remind" aria-label="Reminders">
      
      <span className="q-grow">
        <strong>Get today's jobs each morning</strong>
        <small>{support.ok ? `A short notification at ${hourLabel(prefs.hour)} with what needs doing, plus frost and storm warnings.` : WHY["ios-install"]}</small>
        {err && <small role="alert" style={{ color: "var(--color-red, #c0392b)" }}>{err}</small>}
      </span>
      <span className="mt-remind-actions">
        {support.ok && <button type="button" className="q-button" disabled={busy} onClick={() => { setBusy(true); setErr(""); enablePush(prefs.hour).catch((e) => setErr(e.message)).then(() => setBusy(false)); }}>{busy ? "…" : "Turn on"}</button>}
        <button type="button" className="q-text-button" onClick={() => setPushPrefs({ dismissed: true })}>{support.ok ? "Not now" : "OK"}</button>
      </span>
    </section>
  );
}
