/* ═══════════════════════════════════════════
   AUTH SCREEN — the front door (Phase 5)
   Create account / sign in / forgot password / set a new password.
   Matches the app's Notion×Planta aesthetic: cream bg, forest gradient
   hero panel, the shared Btn/Inp primitives.

   This component does NOT manage the session itself. On success the
   supabase auth state changes, AuthGate's onAuthChange listener fires,
   and AuthGate swaps this screen for the app. Keeps session logic in
   one place. The one exception is "reset": AuthGate renders this screen
   with a live recovery session and passes onPasswordUpdated.

   Mode on first open: landing-page "Start free" links carry ?signup, so
   new visitors land on "Create account" instead of "Welcome back".
   ═══════════════════════════════════════════ */
import React, { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { C, F } from "../../lib/theme";
import { Btn, Inp } from "../../components/ui";
import { signUpEmail, signInEmail, sendPasswordReset, updatePassword, warmAuth } from "../../lib/auth";
import { initialAuthMode, friendlyAuthError } from "../../lib/auth-messages";

const COPY = {
  signup: { title: "Start your 7-day free trial", sub: "No card needed. Your growing plan is about 3 minutes away.", cta: "Create my account" },
  signin: { title: "Welcome back", sub: "Sign in to your farm.", cta: "Sign in" },
  forgot: { title: "Reset your password", sub: "Enter your email and we'll send you a link to choose a new password.", cta: "Send reset link" },
  reset: { title: "Choose a new password", sub: "You're almost back in. Pick something you'll remember.", cta: "Save new password" },
};

export default function AuthScreen({ initialMode, initialNotice, onPasswordUpdated, onTryDemo }) {
  useEffect(() => { warmAuth(); }, []); // the sign-in library is fetched while the form is being filled in
  const [mode, setMode] = useState(() => initialMode || initialAuthMode(typeof window !== "undefined" ? window.location.search : ""));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState(initialNotice || "");

  const copy = COPY[mode] || COPY.signin;
  const needsEmail = mode !== "reset";
  const needsPassword = mode !== "forgot";

  function switchMode(next) {
    setMode(next);
    setErr("");
    setNotice("");
    setBusy(false);
  }

  async function submit() {
    if (busy) return;
    setErr("");
    setNotice("");
    const mail = email.trim();
    if (needsEmail && !mail) { setErr("Enter your email address."); return; }
    if (needsPassword && password.length < 6) {
      setErr(password ? "Password must be at least 6 characters." : "Enter a password.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await sendPasswordReset(mail);
        if (error) { setErr(friendlyAuthError(error.message, mode)); setBusy(false); return; }
        setNotice(`If an account exists for ${mail}, a reset link is on its way. It can take a few minutes, and check your spam folder too.`);
        setBusy(false);
        return;
      }
      if (mode === "reset") {
        const { error } = await updatePassword(password);
        if (error) { setErr(friendlyAuthError(error.message, mode)); setBusy(false); return; }
        if (onPasswordUpdated) onPasswordUpdated();
        return; // AuthGate takes over
      }
      const isSignup = mode === "signup";
      const fn = isSignup ? signUpEmail : signInEmail;
      const { data, error } = await fn(mail, password);
      if (error) {
        setErr(friendlyAuthError(error.message, mode));
        setBusy(false);
        return;
      }
      // If "Confirm email" is ON in Supabase, signUp succeeds without a session.
      // (supabase-js ≥2.10x may also return user: null here, so don't require
      // data.user.) Show a check-your-email notice instead of hanging on "Please wait…".
      if (isSignup && !(data && data.session)) {
        // An email that already has a confirmed account comes back as a user
        // with NO identities (Supabase anti-enumeration): no link is sent, so
        // tell them to sign in — in the same breath, so nothing is given away.
        const existing = !!(data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
        setNotice(existing
          ? `If ${mail} is new to MyTerra, a confirmation link is on its way (check spam too). Already have an account with this email? Use "Sign in" or "Forgot password?" instead.`
          : `Almost there: we sent a confirmation link to ${mail}. Open it on this device to start your trial (check spam too).`);
        setBusy(false);
        return;
      }
      // Success with a session → AuthGate's onAuthChange takes over.
      // Leave busy=true so the button stays disabled during the swap.
    } catch (e) {
      setErr(friendlyAuthError(e && e.message ? e.message : String(e), mode));
      setBusy(false);
    }
  }

  function onEnter(e) {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
  }

  const tabStyle = function (active) {
    return {
      flex: 1, minHeight: 40, border: "none", borderRadius: 10, cursor: "pointer",
      background: active ? C.card : "transparent", color: active ? C.text : C.t2,
      fontFamily: F.body, fontSize: 13.5, fontWeight: active ? 700 : 500,
      boxShadow: active ? "0 1px 3px rgba(0,0,0,.12)" : "none",
    };
  };
  const linkBtn = { border: "none", background: "transparent", color: C.green, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: F.body, padding: "6px 0" };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,fontFamily:F.body,padding:20}}>
      <div style={{width:"100%",maxWidth:400,background:C.card,borderRadius:20,boxShadow:C.shL,overflow:"hidden"}}>
        {/* Hero header — matches sidebar brand gradient */}
        <div style={{background:C.grdHero,padding:"28px 28px 22px",textAlign:"center"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,color:"#fff",fontFamily:F.head,fontSize:24,fontWeight:800,letterSpacing:"-0.02em"}}>
            <Leaf size={24} strokeWidth={2}/> MyTerra
          </div>
          <div style={{color:"rgba(255,255,255,.78)",fontSize:13,marginTop:6,fontWeight:500}}>
            A farm game simulator running on real life
          </div>
        </div>

        <div style={{padding:"20px 28px 28px"}}>
          {(mode === "signup" || mode === "signin") && (
            <div role="tablist" aria-label="Account" style={{display:"flex",gap:4,padding:4,background:C.soft,borderRadius:12,marginBottom:18}}>
              <button type="button" role="tab" aria-selected={mode === "signup"} onClick={function(){ switchMode("signup"); }} style={tabStyle(mode === "signup")}>Create account</button>
              <button type="button" role="tab" aria-selected={mode === "signin"} onClick={function(){ switchMode("signin"); }} style={tabStyle(mode === "signin")}>Sign in</button>
            </div>
          )}

          <h1 style={{fontFamily:F.head,fontSize:20,fontWeight:700,color:C.text,marginBottom:4,textAlign:"center"}}>{copy.title}</h1>
          <p style={{fontSize:13,color:C.t2,marginBottom:18,textAlign:"center",lineHeight:1.45}}>{copy.sub}</p>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {needsEmail && (
              <Inp label="Email" type="email" autoComplete="email" inputMode="email" value={email}
                onChange={function(e){ setEmail(e.target.value); }} onKeyDown={onEnter} placeholder="you@example.com"/>
            )}
            {needsPassword && (
              <div style={{position:"relative"}}>
                <Inp label={mode === "reset" ? "New password" : "Password"} type={showPw ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password} onChange={function(e){ setPassword(e.target.value); }} onKeyDown={onEnter}
                  placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
                  style={{paddingRight:64}}/>
                <button type="button" onClick={function(){ setShowPw(!showPw); }} aria-label={showPw ? "Hide password" : "Show password"}
                  style={{position:"absolute",right:6,bottom:11,border:"none",background:"transparent",color:C.t2,fontSize:12,fontWeight:600,cursor:"pointer",padding:"6px 8px",fontFamily:F.body}}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            )}
          </div>

          {mode === "signin" && (
            <div style={{textAlign:"right",marginTop:-6}}>
              <button type="button" onClick={function(){ switchMode("forgot"); }} style={{...linkBtn,fontWeight:600,fontSize:12.5}}>Forgot password?</button>
            </div>
          )}

          {err && (
            <div role="alert" style={{marginTop:12,padding:"10px 12px",borderRadius:10,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",color:"#dc2626",fontSize:12.5,lineHeight:1.4}}>
              {err}
              {mode === "signup" && /already an account/.test(err) && (
                <> <button type="button" onClick={function(){ switchMode("signin"); }} style={{...linkBtn,fontSize:12.5,padding:0}}>Sign in</button></>
              )}
            </div>
          )}
          {notice && (
            <div role="status" style={{marginTop:12,padding:"10px 12px",borderRadius:10,background:C.gp,border:`1px solid ${C.green}`,color:C.green,fontSize:12.5,lineHeight:1.45}}>
              {notice}
            </div>
          )}

          <div style={{marginTop:16}}>
            <Btn onClick={submit} dis={busy} style={{width:"100%"}}>
              {busy ? "Please wait…" : copy.cta}
            </Btn>
          </div>

          {/* Phase 8.3 — legal consent line, shown on the signup form only */}
          {mode === "signup" && (
            <div style={{textAlign:"center",marginTop:12,fontSize:11.5,color:C.t2,lineHeight:1.5}}>
              7 days of Pro free, then choose a plan or keep your farm read-only. By creating an account you agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener" style={{color:C.green,fontWeight:600}}>Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" rel="noopener" style={{color:C.green,fontWeight:600}}>Privacy Policy</a>.
            </div>
          )}

          {onTryDemo && (mode === "signup" || mode === "signin") && (
            <div style={{textAlign:"center",marginTop:16,paddingTop:14,borderTop:`1px solid ${C.bdr}`}}>
              <div style={{fontSize:12,color:C.t2,marginBottom:2}}>Not ready for an account?</div>
              <button type="button" onClick={function(){ onTryDemo(); }} style={linkBtn}>Try the demo first — no sign-up needed</button>
            </div>
          )}

          {mode === "forgot" && (
            <div style={{textAlign:"center",marginTop:14}}>
              <button type="button" onClick={function(){ switchMode("signin"); }} style={linkBtn}>← Back to sign in</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
