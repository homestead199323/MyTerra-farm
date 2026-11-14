/* ═══════════════════════════════════════════
   AUTH WRAPPER
   Thin wrapper over supabase.auth so UI code never touches the raw
   client. Covers email (password) + Google OAuth, sign-out, current
   session, and a subscription helper for auth-state changes.

   Design notes:
   - signUpEmail / signInEmail return { data, error } unchanged from
     Supabase so callers can show the real error message.
   - Google uses window.location.origin so the redirect auto-adapts to
     localhost (dev) and the Vercel domain (prod) with no hardcoding.
     The same origin+/app URL must be whitelisted in the Supabase
     dashboard (Authentication > URL Configuration) and Google Cloud.
   - onAuthChange returns the unsubscribe function so callers can clean
     up in a useEffect teardown.
   ═══════════════════════════════════════════ */
import { getClient, whenClient, sessionPossible } from "./db";

// The sign-in screen is open: fetch the client now so the first button press does not wait for it.
export function warmAuth() {
  getClient().catch(() => { /* offline: the form says so when it is submitted */ });
}

// Where email links (confirm sign-up, reset password) send people back to.
// If this URL is not on the Supabase redirect allow-list, Supabase falls back
// to the Site URL; the landing page forwards auth hashes to /app either way.
function appUrl() {
  return typeof window !== "undefined" ? window.location.origin + "/app" : undefined;
}

// ── Email + password ───────────────────────────────────────────────
export async function signUpEmail(email, password) {
  return (await getClient()).auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
}

export async function signInEmail(email, password) {
  return (await getClient()).auth.signInWithPassword({ email, password });
}

// ── Password reset ─────────────────────────────────────────────────
// Step 1: email a reset link. Step 2: the link opens /app with a recovery
// session (supabase-js emits PASSWORD_RECOVERY) and the user picks a new
// password via updatePassword.
export async function sendPasswordReset(email) {
  return (await getClient()).auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
}

export async function updatePassword(password) {
  return (await getClient()).auth.updateUser({ password });
}

// ── Account settings (change password / delete account) ───────────
// Check the current password before a sensitive change. Signing in again
// also makes the session "recent", which Supabase's secure password change
// requires. Same user, so AuthGate's reconcile guard ignores the SIGNED_IN.
export async function verifyPassword(email, password) {
  return (await getClient()).auth.signInWithPassword({ email, password });
}

// Settings → Delete account. Runs the delete-account Edge Function as the
// signed-in user. Returns { ok: true } or { ok: false, code, status }.
export async function deleteAccount() {
  const { error } = await (await getClient()).functions.invoke("delete-account", { body: { confirm: "DELETE" } });
  if (!error) return { ok: true };
  let code = "", status = 0;
  try {
    const res = error.context;
    status = (res && res.status) || 0;
    const body = res && typeof res.json === "function" ? await res.json() : null;
    code = (body && body.error) || "";
  } catch {
    /* not a JSON error (network failure, function missing) */
  }
  return { ok: false, code, status };
}

// Drop the session on this device only (the account no longer exists, so a
// global sign-out call to the server would just fail).
export async function signOutLocal() {
  return (await getClient()).auth.signOut({ scope: "local" });
}

// ── Google OAuth ───────────────────────────────────────────────────
export async function signInGoogle() {
  return (await getClient()).auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/app",
    },
  });
}

// ── Session / sign-out ─────────────────────────────────────────────
export async function signOut() {
  return (await getClient()).auth.signOut();
}

// Nothing on this device or in the address says anyone is signed in: the answer is "no" without
// fetching the client (this is what lets a first visit open the demo straight away).
export async function getSession() {
  if (!sessionPossible()) return null;
  const { data } = await (await getClient()).auth.getSession();
  return data.session; // null when signed out
}

export async function getUser() {
  if (!sessionPossible()) return null;
  const { data } = await (await getClient()).auth.getUser();
  return data.user; // null when signed out
}

// ── Auth-state subscription ────────────────────────────────────────
// callback receives (event, session). Returns an unsubscribe fn.
// The listener attaches the moment the client exists — before the call that caused it to be
// fetched goes on — so no sign-in event is missed. It does not fetch the client itself.
export function onAuthChange(callback) {
  let unsubscribe = null, stopped = false;
  const cancel = whenClient((client) => {
    if (stopped) return;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    unsubscribe = () => data.subscription.unsubscribe();
  });
  return () => { stopped = true; cancel(); if (unsubscribe) unsubscribe(); };
}
