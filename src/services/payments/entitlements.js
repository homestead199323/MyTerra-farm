/* ═══════════════════════════════════════════
   ENTITLEMENTS — Phase 8 payments core (processor-agnostic)

   Single client-side source of truth for "what can this user do".
   Mirrors the Postgres predicate public.has_write_access() — if you
   change the rules here, change them there too (and vice versa). The
   database RLS check is the real security boundary; this module only
   drives UI (read-only lock, trial banner, Pro feature gates).

   Plan model (profiles.tier):
   - trial    — 7 days with everything unlocked, from signup (trial_started_at)
   - basic    — paid "Grow": map, daily jobs, crops, calendar, weather, guides
   - pro      — paid "Homestead": + animals, pantry, money, insights, assistant
   - lifetime — one-time purchase, same features as pro, never expires
   Names, prices and the feature list live in ./plans.js.

   After trial expiry with no plan: READ-ONLY. Data stays visible and
   syncable DOWN (pull), but the farms RLS rejects upserts and the UI
   locks edits.

   Offline grace (the "72h grace token" from ARCHITECTURE_PLAN Phase 8):
   the last server-verified entitlement is cached in localStorage with
   a verifiedAt stamp. When offline, a cached PAID entitlement stays
   honored for 72h from that stamp, then degrades to read-only until
   the app can re-verify. Trial entitlements need no grace — expiry is
   computed deterministically from the cached trial_started_at.

   Anti-tamper note: everything here is client code and can be edited
   in devtools. That is fine — the DB rejects writes regardless, and
   Pro features that cost money server-side (AI) must ALSO be gated
   server-side when they get a backend. UI gates are UX, not security.
   ═══════════════════════════════════════════ */
import { getClient, sessionPossible, isSupabaseConfigured } from "../../lib/db";

// ── Constants ───────────────────────────────────────────────────────
export const TRIAL_DAYS = 7;
export const OFFLINE_GRACE_HOURS = 72;
const CACHE_KEY = "hfm_entitlement_v1"; // namespaced with hfm_data_v7 etc.

const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_MS = OFFLINE_GRACE_HOURS * 60 * 60 * 1000;


// ── Pure logic (unit-testable, no I/O) ──────────────────────────────

/*
 * computeEntitlement(profile, nowMs) → entitlement object
 *
 * profile: { tier, trial_started_at, subscription_status,
 *            current_period_end } — the profiles row (snake_case, as
 *            returned by Supabase) or null/undefined when unknown.
 *
 * Returns:
 * {
 *   plan:          'trial'|'basic'|'pro'|'lifetime'|'none',
 *   state:         'lifetime'|'active'|'past_due'|'trial'|
 *                  'trial_expired'|'expired'|'unknown',
 *   canWrite:      boolean — mirrors public.has_write_access()
 *   isPro:         boolean — Pro-level features unlocked
 *   trialDaysLeft: integer ≥ 0 (0 when not on trial)
 * }
 */
export function computeEntitlement(profile, nowMs) {
  const now = typeof nowMs === "number" ? nowMs : Date.now();

  if (!profile || !profile.tier) {
    return { plan: "none", state: "unknown", canWrite: false, isPro: false, trialDaysLeft: 0 };
  }

  const tier = profile.tier;

  if (tier === "lifetime") {
    return { plan: "lifetime", state: "lifetime", canWrite: true, isPro: true, trialDaysLeft: 0 };
  }

  if (tier === "basic" || tier === "pro") {
    const status = profile.subscription_status;
    const periodEnd = profile.current_period_end
      ? new Date(profile.current_period_end).getTime()
      : null;

    // Paddle dunning: keep access while Paddle retries the card.
    if (status === "past_due") {
      return { plan: tier, state: "past_due", canWrite: true, isPro: tier === "pro", trialDaysLeft: 0 };
    }
    const periodValid = periodEnd === null || periodEnd > now;
    if ((status === "active" || status === "trialing") && periodValid) {
      return { plan: tier, state: "active", canWrite: true, isPro: tier === "pro", trialDaysLeft: 0 };
    }
    // canceled / paused / lapsed period → read-only.
    return { plan: tier, state: "expired", canWrite: false, isPro: false, trialDaysLeft: 0 };
  }

  // tier === 'trial' (and any unknown value degrades to trial rules)
  const startedAt = profile.trial_started_at
    ? new Date(profile.trial_started_at).getTime()
    : 0;
  const expiresAt = startedAt + TRIAL_DAYS * DAY_MS;
  if (startedAt > 0 && expiresAt > now) {
    const daysLeft = Math.max(1, Math.ceil((expiresAt - now) / DAY_MS));
    return { plan: "trial", state: "trial", canWrite: true, isPro: true, trialDaysLeft: daysLeft, trialEndsAt: expiresAt };
  }
  return { plan: "trial", state: "trial_expired", canWrite: false, isPro: false, trialDaysLeft: 0 };
}

// planLabel / trialEndsAt live in a dependency-free module so they can be unit-tested.
export { planLabel, trialEndsAt } from "./plan-label.js";

// hasFeature / pageLock / plan catalogue live in a dependency-free module (unit-tested).
export { hasFeature, pageLock, planName, foundingLeft } from "./plans.js";

// ── Cache (offline grace) ───────────────────────────────────────────

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(profile) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ profile, verifiedAt: Date.now() }));
  } catch {
    /* storage full/blocked — grace simply won't apply; server checks still work */
  }
}

// Sign-out / account-switch hygiene — mirrors resetSync() in sync.js.
// MUST be called from the same place resetSync() is, or a paid user's
// cached grace leaks to the next account on this device.
export function resetEntitlement() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/*
 * Offline path. Returns an entitlement derived from the cached profile:
 * - paid plans: honored as-is for OFFLINE_GRACE_HOURS from verifiedAt,
 *   read-only after (state 'expired', plan preserved for messaging).
 * - trial: recomputed from cached trial_started_at — deterministic,
 *   no grace needed or given.
 * Returns the 'unknown' entitlement when there is no usable cache.
 */
export function getCachedEntitlement(nowMs) {
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  const cached = readCache();
  if (!cached || !cached.profile) {
    return { plan: "none", state: "unknown", canWrite: false, isPro: false, trialDaysLeft: 0 };
  }
  const ent = computeEntitlement(cached.profile, now);
  const paid = ent.plan === "basic" || ent.plan === "pro" || ent.plan === "lifetime";
  if (paid && ent.canWrite && now - (cached.verifiedAt || 0) > GRACE_MS) {
    return { ...ent, state: "expired", canWrite: false, isPro: false };
  }
  return ent;
}

// ── Server fetch ────────────────────────────────────────────────────

/*
 * fetchEntitlement() → entitlement
 * Reads the caller's own profiles row (RLS: select-own only), caches
 * it for offline grace, and returns the computed entitlement. On any
 * failure (offline, Supabase paused, RLS error) falls back to
 * getCachedEntitlement() so the app never hard-crashes on a network
 * blip — worst case it degrades to read-only.
 */
export async function fetchEntitlement() {
  if (!isSupabaseConfigured || !sessionPossible()) return getCachedEntitlement(); // nobody signed in: no row to read
  try {
    const supabase = await getClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData && userData.user;
    if (!user) return getCachedEntitlement();

    const { data, error } = await supabase
      .from("profiles")
      .select("tier, trial_started_at, subscription_status, current_period_end")
      .eq("id", user.id)
      .single();

    if (error || !data) return getCachedEntitlement();

    writeCache(data);
    return computeEntitlement(data);
  } catch {
    return getCachedEntitlement();
  }
}

/*
 * fetchFoundingSold() → number of Founding Lifetime purchases so far, or null
 * when it cannot be read (offline, signed out, database paused). Backed by the
 * SQL function public.founding_lifetime_sold() (security definer: profiles RLS
 * is select-own, so the client cannot count rows itself). Callers treat null
 * as "unknown" and keep the offer open — see foundingLeft() in plans.js.
 */
export async function fetchFoundingSold() {
  if (!isSupabaseConfigured || !sessionPossible()) return null;
  try {
    const supabase = await getClient();
    const { data, error } = await supabase.rpc("founding_lifetime_sold");
    if (error || typeof data !== "number") return null;
    return data;
  } catch {
    return null;
  }
}
