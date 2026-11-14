/* ═══════════════════════════════════════════
   SYNC — cloud backup + multi-device layer (Phase 5 + Phase 6)

   Rides ALONGSIDE storage.js, never replaces it. localStorage stays
   the authoritative local copy and the offline safety net; this module
   mirrors the farm-data blob up to the `farms` table and pulls it back
   on login (and now on tab-focus, for multi-device). Conflict
   resolution is last-write-wins on the whole document, keyed by
   `updated_at` (Option A: one JSONB row per user).

   Integration points (App.jsx):
   - pullFarm(): call once when a session is detected on load / login.
   - pushFarm(data): call from setData(). Debounced + offline-aware.
   - flushPush(): force a pending push (reconnect, beforeunload, sign-out).
   - initSyncReconnect(): wire online/offline events once at mount.
   - pullIfRemoteNewer(): call on tab focus — hydrate if another device
       wrote a newer copy and we have no unpushed local edits.
   - subscribeSyncStatus(fn) / getSyncStatus(): drive the UI indicator.
   - noteAppliedUpdatedAt(ts): tell sync which cloud revision we hold
       (called by AuthGate after the initial reconcile pull).

   This module does NOT run migrations — App.jsx owns that. pull* return
   raw cloud data and the caller migrates before dispatching.
   ═══════════════════════════════════════════ */
import { getClient, isSupabaseConfigured } from "./db";
import { getSession } from "./auth";
import { markUnsynced, clearUnsynced } from "./storage";
import { retryDelay } from "./unsynced";

const SCHEMA_VERSION = 7;

// ── Push state (the "offline write queue" — latest-wins, not a log) ──
let _pushTimer = null;
let _pendingData = null; // latest farm-data awaiting push
let _dirty = false; // true when a push is queued but not yet confirmed
// ms timestamp of the cloud row we currently hold (set on pull + on a
// successful push). pullIfRemoteNewer compares against this to detect a
// write made on another device.
let _lastUpdatedAt = 0;
let _retryTimer = null; // a failed upload is tried again by itself (it used to wait for the next edit)
let _retries = 0;

// ── Sync status machine (Phase 6) ──────────────────────────────────
// 'synced'  — nothing pending; cloud is up to date
// 'syncing' — a push is queued or in flight
// 'offline' — no connectivity; writes are queued locally
// 'error'   — last push failed; data is safe locally, will retry
// 'local'   — Supabase not configured / signed out (no cloud target)
let _status = isSupabaseConfigured ? "synced" : "local";
const _statusListeners = new Set();

function setStatus(next) {
  if (_status === next) return;
  _status = next;
  _statusListeners.forEach((fn) => {
    try { fn(next); } catch (e) { /* a listener threw — don't break the rest */ }
  });
}

export function getSyncStatus() { return _status; }

// Subscribe to status changes. Emits the current status immediately so a
// freshly-mounted indicator paints the right state. Returns unsubscribe.
export function subscribeSyncStatus(fn) {
  _statusListeners.add(fn);
  try { fn(_status); } catch (e) { /* ignore */ }
  return () => { _statusListeners.delete(fn); };
}

// Record the updated_at we last applied locally (AuthGate calls this after
// the initial reconcile pull). Keeps multi-device detection honest.
export function noteAppliedUpdatedAt(ts) {
  _lastUpdatedAt = typeof ts === "number" ? ts : 0;
}

// ── PULL: fetch this user's farm row ────────────────────────────────
// Returns { data, source, updatedAt } or null when signed out / unconfigured.
//   source: "cloud" (a real saved farm) | "empty" (no row yet, or data === {})
//           | "error" (the query failed — the cloud farm may well exist, so the
//             caller must NOT treat this like an empty row and seed/push over it)
export async function pullFarm() {
  if (!isSupabaseConfigured) return null;
  const session = await getSession();
  if (!session) return null;

  let row, error;
  try {
    ({ data: row, error } = await (await getClient())
      .from("farms")
      .select("data, schema_version, updated_at")
      .eq("user_id", session.user.id)
      .maybeSingle());
  } catch (e) {
    error = e; // network failure (fetch rejected) — same as a query error
  }

  if (error) {
    console.warn("[sync] pullFarm failed:", error.message || error);
    return { data: null, source: "error", updatedAt: 0 };
  }
  if (!row) return { data: null, source: "empty", updatedAt: 0 }; // signup trigger should have created a row, but be safe

  const isEmpty =
    !row.data || (typeof row.data === "object" && Object.keys(row.data).length === 0);

  return {
    data: isEmpty ? null : row.data,
    source: isEmpty ? "empty" : "cloud",
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
  };
}

// pullFarm with a deadline. A slow network must never be mistaken for an
// empty cloud farm: on timeout the result is { source: "timeout" } and the
// caller decides (AuthGate: use this user's own local cache, or ask to retry).
export function pullFarmWithTimeout(ms) {
  let timer = null;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ data: null, source: "timeout", updatedAt: 0 }), ms);
  });
  return Promise.race([pullFarm(), deadline]).finally(() => { if (timer) clearTimeout(timer); });
}

// ── PUSH: upsert the farm blob (debounced, offline-aware) ───────────
export function pushFarm(data) {
  if (!isSupabaseConfigured) return;
  _pendingData = data;
  _dirty = true;
  markUnsynced(Date.now()); // stays on the device until the cloud confirms this edit (lib/unsynced.js)

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setStatus("offline"); // queued; will drain on reconnect
  } else {
    setStatus("syncing");
  }

  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => { void flushPush(); }, 1000);
}

// Immediately attempt to push whatever is pending. Safe to call directly
// (reconnect handler, beforeunload, sign-out). No-op when nothing pending
// or offline.
export async function flushPush() {
  if (!isSupabaseConfigured) return;
  if (!_dirty || _pendingData == null) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setStatus("offline");
    return; // stay queued
  }

  const session = await getSession();
  if (!session) { setStatus("local"); return; } // signed out — nothing to push

  const payload = _pendingData;
  setStatus("syncing");
  let rows, error;
  try {
    ({ data: rows, error } = await (await getClient())
      .from("farms")
      .upsert(
        { user_id: session.user.id, data: payload, schema_version: SCHEMA_VERSION },
        { onConflict: "user_id" }
      )
      .select("updated_at")
      .maybeSingle());
  } catch (e) {
    error = e; // the request itself failed (connection dropped mid-way)
  }

  if (error) {
    // Keep _dirty true and the queue as it is, and try again shortly: with no retry an upload that
    // failed once stayed un-backed-up until the next edit or reconnect.
    console.warn("[sync] pushFarm failed (retrying):", error.message || error);
    setStatus("error");
    if (_retryTimer) clearTimeout(_retryTimer);
    _retryTimer = setTimeout(() => { _retryTimer = null; void flushPush(); }, retryDelay(_retries++));
    return;
  }
  _retries = 0;
  if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }

  if (rows && rows.updated_at) {
    _lastUpdatedAt = new Date(rows.updated_at).getTime();
  }
  // Only clear dirty if no newer data arrived while the request was in flight.
  if (_pendingData === payload) {
    _dirty = false;
    clearUnsynced();
    setStatus("synced");
  } else {
    // Newer data queued mid-flight — keep going, schedule a follow-up flush.
    setStatus("syncing");
    if (_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(() => { void flushPush(); }, 300);
  }
}

// ── Reset (sign-out) ────────────────────────────────────────────────
// Clear all pending push state. Called on sign-out so a queued, unflushed
// write from one account can never drain into the NEXT account's session on
// a shared browser (the reconnect + beforeunload handlers survive sign-out,
// and flushPush writes under whatever session exists at flush time).
export function resetSync() {
  if (_pushTimer) { clearTimeout(_pushTimer); _pushTimer = null; }
  if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
  _retries = 0;
  _pendingData = null;
  _dirty = false;
  _lastUpdatedAt = 0;
  setStatus("local"); // signed out — no cloud target until the next sign-in
}

// ── Multi-device pull (Phase 6) ─────────────────────────────────────
// Called on tab focus / visibility regain. If the cloud row is newer than
// what we hold AND we have no unpushed local edits, returns the fresh cloud
// data for the caller to migrate + hydrate. Otherwise returns null (no-op).
//
// The _dirty guard implements last-write-wins: an unpushed local edit is a
// later write than the cloud copy, so we never clobber it here — we let it
// push on its own timer. Only a clean local state may be overwritten by a
// newer remote revision (i.e. an edit that happened on another device).
export async function pullIfRemoteNewer() {
  if (!isSupabaseConfigured) return null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
  if (_dirty) {
    // Local has unpushed edits — don't clobber them. If the last push failed
    // (status "error"), coming back to the app is a good moment to retry it.
    if (_status === "error") void flushPush();
    return null;
  }
  const session = await getSession();
  if (!session) return null;

  const pulled = await pullFarm();
  // An edit made while the pull was in flight wins: applying the pulled copy
  // now would drop it from the screen (and the queued push would then upload
  // a farm the user is no longer looking at).
  if (_dirty) return null;
  if (!pulled || pulled.source !== "cloud" || !pulled.data) return null;
  if (pulled.updatedAt > _lastUpdatedAt) {
    _lastUpdatedAt = pulled.updatedAt;
    return pulled.data; // caller migrates + dispatches
  }
  return null;
}

// ── Reconnect / connectivity (Phase 6) ──────────────────────────────
// Wires the browser online/offline events once. Online drains any queued
// write (or just flips the indicator back to synced when nothing is
// pending); offline flips the indicator immediately so the UI is truthful
// even before the next edit.
let _reconnectWired = false;
export function initSyncReconnect() {
  if (_reconnectWired || typeof window === "undefined") return;
  _reconnectWired = true;

  // Truthful at wire time if the app loaded while already offline.
  if (isSupabaseConfigured && typeof navigator !== "undefined" && navigator.onLine === false) {
    setStatus("offline");
  }

  window.addEventListener("online", () => {
    if (_dirty) { void flushPush(); }
    else if (isSupabaseConfigured) { setStatus("synced"); }
  });

  window.addEventListener("offline", () => {
    if (isSupabaseConfigured) setStatus("offline");
  });
}
