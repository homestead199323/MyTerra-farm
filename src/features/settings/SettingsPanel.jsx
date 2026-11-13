import React, { useState, useEffect } from "react";
import { C, F } from "../../lib/theme";
import { Overlay, Card, Inp, Btn } from "../../components/ui";
import { SyncStatus } from "../../components/SyncStatus";
import { getSession } from "../../lib/auth";
import { rCR } from "../../lib/regional";
import { LDB } from "../../data/livestock";
import { resolveEnvironment, defaultSpaceTitle } from "../../lib/environment";
import { Download, Upload, Moon, Sun, LogOut } from "lucide-react";
import { CURRENCIES, currencyCode } from "../../lib/money";
import { farmSummary, describeSummary } from "../../lib/backup";
import { signInMethods } from "../../lib/auth-messages";
import { ChangePassword, DeleteAccount } from "./AccountSecurity";
import Reminders from "./Reminders";

function fileDay(ms) {
  if (!ms) return "";
  try { return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; }
}

/* ═══════════════════════════════════════════
   SETTINGS — single panel bundling account, appearance,
   data backup, and sign-out. Opened from the sidebar footer
   (desktop) and the account menu (mobile).
   ═══════════════════════════════════════════ */
export default function SettingsPanel({
  onClose, data, setData, exportData, readBackup, restoreBackup, darkMode, setDarkMode, onSignOut, plan, onUpgrade, ent, onAccountDeleted, onExitDemo,
}) {
  const [email, setEmail] = useState("");
  const [methods, setMethods] = useState({ password: true, google: false });
  // Import: pick a file → show what it holds → the user confirms before anything is replaced.
  const [pendingImport, setPendingImport] = useState(null); // { data, summary, fileName, fileDate }
  const [importErr, setImportErr] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  function pickBackup(file) {
    if (!file || !readBackup) return;
    setImportErr("");
    setPendingImport(null);
    setImportBusy(true);
    readBackup(file)
      .then(function (res) { setPendingImport({ data: res.data, summary: res.summary, fileName: file.name, fileDate: fileDay(file.lastModified) }); })
      .catch(function (err) { setImportErr((err && err.message) || "Couldn't read that file."); })
      .then(function () { setImportBusy(false); });
  }
  function confirmImport() {
    if (!pendingImport || !restoreBackup) return;
    if (restoreBackup(pendingImport.data)) setPendingImport(null);
  }
  useEffect(() => {
    let mounted = true;
    getSession()
      .then((s) => { if (mounted) { setEmail((s && s.user && s.user.email) || ""); setMethods(signInMethods(s && s.user)); } })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const cropCount = rCR(data && data.region).length;
  const animalCount = Object.keys(LDB).length;

  /* Stage 4c (brief §18): environment switcher. Writes profile.environment
     ONLY — zones, plots, canvas size, and dimensions are never touched. */
  const currentEnv = resolveEnvironment(data);
  const ENV_OPTIONS = [
    { id: "balcony", emoji: "🏙️", label: "Balcony" },
    { id: "backyard", emoji: "🏡", label: "Backyard" },
    { id: "farm", emoji: "🚜", label: "Farm" },
  ];
  function pickEnvironment(id) {
    if (id === currentEnv) return;
    setData({ ...data, profile: { ...(data.profile || {}), environment: id } });
  }

  const sectionLabel = {
    fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase",
    letterSpacing: "0.05em", margin: "2px 0 8px",
  };
  const rowBtn = {
    display: "flex", alignItems: "center", gap: 11, width: "100%",
    padding: "11px 13px", border: `1px solid ${C.bdr}`, background: C.card,
    color: C.text, cursor: "pointer", fontSize: 14, fontFamily: F.body,
    borderRadius: 10, textAlign: "left", marginBottom: 8, boxSizing: "border-box",
  };
  const ico = { width: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

  return (
    <Overlay title="Settings" onClose={onClose}>
      {/* Account */}
      <div style={sectionLabel}>Account</div>
      <Card style={{ marginBottom: 18, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Email</div>
        <div style={{ fontSize: 14, color: C.text, marginBottom: 12, wordBreak: "break-all" }}>{email || (onExitDemo ? "Demo — no account yet" : "Local account")}</div>
        <Inp label="Name of your space" placeholder={defaultSpaceTitle(data)} value={data.farmName || ""} onChange={(e) => setData({ ...data, farmName: e.target.value })} />
        {(plan || !onSignOut) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
            <span style={{ fontSize: 13, color: C.t2 }}>Plan</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.green, background: C.gp, padding: "3px 11px", borderRadius: 12 }}>{plan || "On this device only"}</span>
              {plan && plan !== "Lifetime Pro" && onUpgrade && (
                <button type="button" onClick={onUpgrade} style={{ border: `1px solid ${C.bdr}`, background: C.card, color: C.green, borderRadius: 10, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F.body }}>See plans</button>
              )}
            </span>
          </div>
        )}
      </Card>

      {onSignOut && email && <ChangePassword email={email} methods={methods} rowBtn={rowBtn} ico={ico} />}

      {/* My Space (Stage 4c) */}
      <div style={sectionLabel}>My space</div>
      <Card style={{ marginBottom: 18, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Environment</div>
        <div style={{ display: "flex", gap: 8 }}>
          {ENV_OPTIONS.map(function (o) {
            var active = o.id === currentEnv;
            return (
              <button key={o.id} type="button" onClick={function () { pickEnvironment(o.id); }}
                aria-pressed={active}
                style={{
                  flex: 1, padding: "10px 4px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${active ? C.green : C.bdr}`,
                  background: active ? C.gp : C.card, color: C.text,
                  fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: F.body,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                <span style={{ fontSize: 18 }}>{o.emoji}</span>
                {o.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 10, lineHeight: 1.45 }}>
          Changes how your map looks. Your zones, plants, and data stay exactly as they are.
        </div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.04em", margin: "16px 0 6px" }} htmlFor="settings-currency">Currency</label>
        <select id="settings-currency" value={data.currency || ""} onChange={(e) => setData({ ...data, currency: e.target.value || undefined })}
          style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.bdr}`, borderRadius: 10, background: C.card, color: C.text, fontSize: 15, fontFamily: F.body }}>
          <option value="">Automatic ({currencyCode({ region: data.region })})</option>
          {CURRENCIES.map(function (c) { return <option key={c.code} value={c.code}>{c.label}</option>; })}
        </select>
        <div style={{ fontSize: 11.5, color: C.t3, marginTop: 6, lineHeight: 1.45 }}>Only the symbol changes. Amounts you already entered stay as they are.</div>
      </Card>

      {/* Appearance */}
      <div style={sectionLabel}>Appearance</div>
      <button type="button" onClick={() => setDarkMode(!darkMode)} style={rowBtn}>
        <span style={ico}>{darkMode ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}</span>
        {darkMode ? "Switch to light mode" : "Switch to dark mode"}
      </button>

      {onSignOut && <Reminders rowBtn={rowBtn} ico={ico} sectionLabel={sectionLabel} />}

      {/* Data */}
      <div style={sectionLabel}>Data</div>
      <button type="button" onClick={exportData} style={rowBtn}>
        <span style={ico}><Download size={17} strokeWidth={1.8} /></span> Export backup
      </button>
      {!pendingImport && (
        <label style={{ ...rowBtn, opacity: importBusy ? 0.6 : 1 }}>
          <span style={ico}><Upload size={17} strokeWidth={1.8} /></span> {importBusy ? "Reading backup…" : "Import backup"}
          <input type="file" accept=".json,application/json" disabled={importBusy} onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) pickBackup(f); }} style={{ display: "none" }} />
        </label>
      )}
      {importErr && (
        <div role="alert" style={{ margin: "-2px 0 10px", padding: "10px 12px", borderRadius: 10, background: C.dangerBg, border: `1px solid ${C.red}`, color: C.red, fontSize: 12.5, lineHeight: 1.45 }}>
          {importErr}
        </div>
      )}
      {pendingImport && (
        <Card style={{ marginBottom: 12, padding: "14px 16px", border: `1.5px solid ${C.orange}` }}>
          <div role="alert" style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>Replace your farm with this backup?</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
            <div><span style={{ color: C.t2 }}>In the backup:</span> {describeSummary(pendingImport.summary)}</div>
            <div><span style={{ color: C.t2 }}>In your farm now:</span> {describeSummary(farmSummary(data))}</div>
            <div style={{ color: C.t3, fontSize: 12, marginTop: 2, wordBreak: "break-all" }}>{pendingImport.fileName}{pendingImport.fileDate ? ` · saved ${pendingImport.fileDate}` : ""}</div>
          </div>
          <p style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.5, margin: "10px 0 12px" }}>
            Everything in your farm now is replaced by the backup. You can undo it straight after; to be safe, download a copy of your farm first.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn v="danger" sm onClick={confirmImport}>Replace my farm</Btn>
            <Btn v="secondary" sm onClick={exportData}><Download size={15} strokeWidth={1.8} /> Download my farm first</Btn>
            <Btn v="ghost" sm onClick={function () { setPendingImport(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {onExitDemo && (
        <button type="button" onClick={onExitDemo} style={{ ...rowBtn, color: C.red }}>
          <span style={ico}><LogOut size={17} strokeWidth={1.8} /></span> Exit demo
        </button>
      )}
      {/* Sign out */}
      {onSignOut && (
        <button type="button" onClick={onSignOut} style={{ ...rowBtn, color: C.red }}>
          <span style={ico}><LogOut size={17} strokeWidth={1.8} /></span> Sign Out
        </button>
      )}
      {onSignOut && onAccountDeleted && email && (
        <DeleteAccount email={email} data={data} ent={ent} exportData={exportData} onDeleted={onAccountDeleted} rowBtn={rowBtn} ico={ico} />
      )}

      {/* Footer: data scope + sync status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.bdr}` }}>
        <span style={{ fontSize: 11, color: C.t3 }}>{cropCount} crops · {animalCount} animals</span>
        <SyncStatus />
      </div>
    </Overlay>
  );
}
