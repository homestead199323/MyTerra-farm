import React, { useState } from "react";
import { KeyRound, Trash2, Download } from "lucide-react";
import { C, F } from "../../lib/theme";
import { Btn, Card, Inp } from "../../components/ui";
import { verifyPassword, updatePassword, deleteAccount } from "../../lib/auth";
import { friendlyAuthError, deleteAccountError, SUPPORT_EMAIL } from "../../lib/auth-messages";
import { farmSummary, describeSummary } from "../../lib/backup";

/* ═══════════════════════════════════════════
   ACCOUNT SECURITY — change password + delete account (Settings)
   UX audit 2026-09-28: neither existed in the app (GDPR right to erasure,
   App Store 5.1.1(v) requires in-app account deletion).
   ═══════════════════════════════════════════ */

const note = { fontSize: 12.5, color: C.t2, lineHeight: 1.5, margin: "0 0 12px" };
const errBox = { margin: "0 0 12px", padding: "10px 12px", borderRadius: 10, background: C.dangerBg, border: `1px solid ${C.red}`, color: C.red, fontSize: 12.5, lineHeight: 1.45 };
const okBox = { margin: "0 0 10px", padding: "10px 12px", borderRadius: 10, background: C.gp, border: `1px solid ${C.green}`, color: C.green, fontSize: 12.5, lineHeight: 1.45 };

/** Change password: current password first (proves it's you, refreshes the session), then the new one. */
export function ChangePassword({ email, methods, rowBtn, ico }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  if (!methods.password) {
    return (
      <p style={{ ...note, margin: "0 0 10px" }}>
        You sign in with Google, so there's no MyTerra password to change. Manage it in your Google account.
      </p>
    );
  }

  function close() {
    setOpen(false); setCurrent(""); setNext(""); setErr(""); setBusy(false);
  }

  async function save() {
    if (busy) return;
    setErr(""); setDone("");
    if (!current) { setErr("Enter your current password."); return; }
    if (next.length < 6) { setErr(next ? "Your new password needs at least 6 characters." : "Enter a new password."); return; }
    if (next === current) { setErr("That's your current password. Pick a new one."); return; }
    setBusy(true);
    try {
      const check = await verifyPassword(email, current);
      if (check.error) {
        setErr(/invalid login credentials/i.test(check.error.message || "") ? "Your current password isn't right." : friendlyAuthError(check.error.message, "signin"));
        setBusy(false);
        return;
      }
      const { error } = await updatePassword(next);
      if (error) { setErr(friendlyAuthError(error.message, "reset")); setBusy(false); return; }
      close();
      setDone("Password changed. Use the new one next time you sign in.");
    } catch (e) {
      setErr(friendlyAuthError(e && e.message, "signin"));
      setBusy(false);
    }
  }

  function onEnter(e) { if (e.key === "Enter") { e.preventDefault(); save(); } }

  if (!open) {
    return (
      <>
        {done && <div role="status" style={okBox}>{done}</div>}
        <button type="button" onClick={function () { setDone(""); setOpen(true); }} style={rowBtn}>
          <span style={ico}><KeyRound size={17} strokeWidth={1.8} /></span> Change password
        </button>
      </>
    );
  }
  return (
    <Card style={{ marginBottom: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>Change password</div>
      <Inp label="Current password" type={show ? "text" : "password"} autoComplete="current-password" value={current}
        onChange={function (e) { setCurrent(e.target.value); }} onKeyDown={onEnter} />
      <Inp label="New password" type={show ? "text" : "password"} autoComplete="new-password" value={next} placeholder="At least 6 characters"
        onChange={function (e) { setNext(e.target.value); }} onKeyDown={onEnter} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.t2, margin: "-4px 0 12px", cursor: "pointer" }}>
        <input type="checkbox" checked={show} onChange={function () { setShow(!show); }} /> Show passwords
      </label>
      {err && <div role="alert" style={errBox}>{err}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn sm onClick={save} dis={busy}>{busy ? "Saving…" : "Save new password"}</Btn>
        <Btn sm v="ghost" onClick={close}>Cancel</Btn>
      </div>
    </Card>
  );
}

/** Delete account: says exactly what goes, offers a download, and needs DELETE typed. */
export function DeleteAccount({ email, data, ent, exportData, onDeleted, rowBtn, ico }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null); // { text, contact }
  const ready = typed.trim().toUpperCase() === "DELETE";
  const subscribed = !!ent && (ent.plan === "basic" || ent.plan === "pro") && (ent.state === "active" || ent.state === "past_due");
  const lifetime = !!ent && ent.plan === "lifetime";
  const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my MyTerra account")}&body=${encodeURIComponent(`Please cancel any subscription and delete my MyTerra account${email ? ` (${email})` : ""}.`)}`;

  async function run() {
    if (!ready || busy) return;
    setBusy(true);
    setErr(null);
    let res;
    try { res = await deleteAccount(); } catch { res = { ok: false }; }
    if (res && res.ok) { if (onDeleted) onDeleted(); return; }
    setErr(deleteAccountError(res));
    setBusy(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={function () { setOpen(true); }} style={{ ...rowBtn, color: C.red, border: "1px solid transparent", background: "transparent" }}>
        <span style={ico}><Trash2 size={17} strokeWidth={1.8} /></span> Delete account
      </button>
    );
  }
  return (
    <Card style={{ marginBottom: 12, padding: "14px 16px", border: `1.5px solid ${C.red}` }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>Delete your account?</div>
      <p style={note}>
        This permanently deletes your login and everything in your farm ({describeSummary(farmSummary(data))}, plus your tasks, notes and records) on every device. It can't be undone.
      </p>
      {subscribed && <p style={note}>Your {ent.plan === "pro" ? "Homestead" : "Grow"} subscription is cancelled at the same time, so you won't be charged again.</p>}
      {lifetime && <p style={note}>Your Lifetime plan belongs to this account and ends with it.</p>}
      <div style={{ marginBottom: 12 }}>
        <Btn sm v="secondary" onClick={exportData}><Download size={15} strokeWidth={1.8} /> Download my farm first</Btn>
      </div>
      <Inp label="Type DELETE to confirm" value={typed} autoComplete="off" autoCapitalize="characters" spellCheck={false}
        onChange={function (e) { setTyped(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter") { e.preventDefault(); run(); } }} />
      {err && (
        <div role="alert" style={errBox}>
          {err.text}
          {err.contact && <> <a href={mail} style={{ color: C.red, fontWeight: 700 }}>{SUPPORT_EMAIL}</a></>}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn sm v="danger" onClick={run} dis={!ready || busy}>{busy ? "Deleting…" : "Delete my account"}</Btn>
        <Btn sm v="ghost" onClick={function () { setOpen(false); setTyped(""); setErr(null); }}>Cancel</Btn>
      </div>
      {(subscribed || lifetime || (ent && (ent.plan === "basic" || ent.plan === "pro"))) && (
        <p style={{ ...note, fontSize: 11.5, margin: "10px 0 0", fontFamily: F.body }}>
          Payment records stay with our payment provider (Paddle) as tax law requires.
        </p>
      )}
    </Card>
  );
}
