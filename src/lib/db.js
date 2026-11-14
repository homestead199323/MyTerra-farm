/* ═══════════════════════════════════════════
   SUPABASE CLIENT — loaded on demand
   Single source of the Supabase client for the whole app. UI and lib code get
   it with `await getClient()` — never construct a client elsewhere (multiple
   GoTrueClient instances on the same storage key cause auth races).

   The client library is ~190 kB and lives in its own chunk (db-client.js).
   A visitor with no session on this device and no auth link in the address
   (the demo: most first visits) never needs it to start, so it is not in the
   startup script and is only fetched when someone could be signed in, or
   opens the sign-in screen. `sessionPossible()` is that test.

   Env vars are Vite-style (VITE_ prefix, read via import.meta.env).
   The publishable/anon key is safe in the client bundle — Row-Level
   Security on the `farms` + `profiles` tables is the real boundary.
   MARKER: SUPABASE_ON_DEMAND
   ═══════════════════════════════════════════ */
import { authInAddress } from "./auth-url";

// Read the auth redirect BEFORE the client is created: supabase-js parses and
// clears the URL hash while it initialises, so this is the only reliable
// moment to know that the page was opened from a password-reset email
// (#…type=recovery) or from an expired/used email link (#error_description=…).
const bootHash = typeof window !== "undefined" ? String(window.location.hash || "") : "";
export const recoveryInUrl = /(^|[#&])type=recovery(&|$)/.test(bootHash);
export const authLinkError = (() => {
  const m = /(?:^|[#&])error_description=([^&]*)/.exec(bootHash);
  if (!m) return "";
  try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch { return "This link is invalid or has expired."; }
})();

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fail loud at module load if the build was configured without env vars,
// rather than silently producing a client that 401s on every call.
if (!url || !key) {
  console.error(
    "[db] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Auth and cloud sync will not work. Check .env (local) or Vercel env vars (deploy)."
  );
}

// True only when both env vars are present — callers can branch on this
// to degrade gracefully to local-only mode if Supabase is unconfigured.
export const isSupabaseConfigured = Boolean(url && key);

// The session is kept in localStorage under this key (namespaced alongside hfm_data_v7 / hfm_theme).
const STORAGE_KEY = "hfm_auth";

// The address carried an auth redirect when the page opened (OAuth callback, email confirmation,
// password reset, or an error from one of those): the client has to be created to read it.
const bootSearch = typeof window !== "undefined" ? String(window.location.search || "") : "";
export const authInUrl = authInAddress(bootHash, bootSearch);

function hasStoredSession() {
  try { return !!window.localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

let _client = null, _loading = null;
const _waiters = [];

/** Could someone be signed in? False only when nothing on this device or in the address says so. */
export function sessionPossible() {
  return !!_client || !!_loading || authInUrl || hasStoredSession();
}

/** The client, created on first use. Rejects when its file cannot be fetched (offline with no cache); the next call tries again. */
export function getClient() {
  if (_client) return Promise.resolve(_client);
  if (!_loading) {
    _loading = import("./db-client").then((m) => {
      // Guard: createClient THROWS on a falsy url; with placeholder credentials the client
      // constructs fine and every call just fails — callers branch on isSupabaseConfigured.
      _client = m.createSupabase(url || "https://unconfigured.invalid", key || "unconfigured", STORAGE_KEY);
      // listeners registered before the client existed attach first, ahead of whoever asked for it
      _waiters.splice(0).forEach((fn) => { try { fn(_client); } catch (e) { console.warn("[db] listener failed:", e); } });
      return _client;
    }).catch((e) => { _loading = null; throw e; });
  }
  return _loading;
}

/** Run `fn(client)` as soon as the client exists — now if it does. Does not fetch it. → cancel() */
export function whenClient(fn) {
  if (_client) { fn(_client); return () => {}; }
  _waiters.push(fn);
  return () => { const i = _waiters.indexOf(fn); if (i >= 0) _waiters.splice(i, 1); };
}
