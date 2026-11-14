/* ═══════════════════════════════════════════
   PUSH REMINDERS — morning digest on the phone (top-10 #2, 2026-09-30)

   How it works:
   1. This device subscribes to web push (VAPID key from the `push` Edge
      Function) and saves the subscription with its time zone and chosen
      hour (RPC save_push_subscription).
   2. Whenever the farm or forecast changes, the app works out the next 7
      mornings with the real task engine (buildTaskPlan with opts.now) and
      stores one short digest per day (table push_digests).
   3. pg_cron calls the function hourly; at the chosen hour each device gets
      that day's digest. Nothing is sent for days with no jobs, or once the
      app hasn't been opened for 7 days (no digest → no guess).
   iPhone/iPad: web push only works once MyTerra is added to the Home Screen
   (iOS 16.4+), so the UI says so instead of offering a switch that fails.
   ═══════════════════════════════════════════ */

import { getClient, isSupabaseConfigured } from "./db";
import { buildDigests } from "./digest";
import { loadPushPrefs, savePushPrefs } from "./storage";

export const DEFAULT_HOUR = 7;
const FN = "push";

export function pushPrefs() {
  const p = loadPushPrefs();
  return { on: !!p.on, hour: Number.isInteger(p.hour) ? p.hour : DEFAULT_HOUR, dismissed: !!p.dismissed };
}
export function setPushPrefs(patch) {
  const next = { ...pushPrefs(), ...patch };
  savePushPrefs(next);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("myterra:push", { detail: next }));
  return next;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
}

/** { ok } or { ok:false, reason: "no-cloud" | "ios-install" | "unsupported" | "denied" } */
export function pushSupport() {
  if (!isSupabaseConfigured) return { ok: false, reason: "no-cloud" };
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return { ok: false, reason: "unsupported" };
  if (isIOS() && !isStandalone()) return { ok: false, reason: "ios-install" };
  if (!("PushManager" in window) || !("Notification" in window)) return { ok: false, reason: "unsupported" };
  if (Notification.permission === "denied") return { ok: false, reason: "denied" };
  return { ok: true };
}

function b64uToBytes(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
function bytesToB64u(buf) {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function publicKey() {
  const { data, error } = await (await getClient()).functions.invoke(FN, { body: { action: "public-key" } });
  if (error || !data || !data.publicKey) throw new Error("Couldn't reach the reminder service. Check your connection and try again.");
  return data.publicKey;
}

async function saveSubscription(sub, hour) {
  const j = sub.toJSON();
  const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
  const { error } = await (await getClient()).rpc("save_push_subscription", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_tz: tz, p_hour: hour });
  if (error) throw new Error(/not signed in/i.test(error.message) ? "Sign in to turn on reminders." : "Couldn't save reminders on this device. Try again.");
}

/** Ask permission, subscribe this device, save it. Resolves with the new prefs. */
export async function enablePush(hour = pushPrefs().hour) {
  const support = pushSupport();
  if (!support.ok) throw new Error(support.reason === "denied" ? "Notifications are blocked for MyTerra. Allow them in your browser or phone settings, then try again." : "This device can't show MyTerra notifications.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications weren't allowed, so reminders stay off.");
  const reg = await navigator.serviceWorker.ready;
  const key = await publicKey();
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with another server key can't receive our pushes.
  if (sub && sub.options && sub.options.applicationServerKey && bytesToB64u(sub.options.applicationServerKey) !== key) {
    await sub.unsubscribe();
    sub = null;
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(key) });
  await saveSubscription(sub, hour);
  return setPushPrefs({ on: true, hour, dismissed: true });
}

export async function updatePushHour(hour) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) throw new Error("Reminders aren't on for this device.");
  await saveSubscription(sub, hour);
  return setPushPrefs({ hour });
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await (await getClient()).from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } finally {
    setPushPrefs({ on: false });
  }
  return pushPrefs();
}

/** Server sends "it works" to every device of this account. */
export async function sendTestPush() {
  const { data, error } = await (await getClient()).functions.invoke(FN, { body: { action: "test" } });
  if (error || !data || !data.ok) throw new Error("The test didn't go through. Turn reminders off and on again, then retry.");
  return data;
}

let lastSent = "";
/** Store the digests for this account (only when reminders are on for this device). */
export async function syncDigests(data, forecast) {
  if (!isSupabaseConfigured || !pushPrefs().on || !data) return false;
  const days = buildDigests(data, forecast);
  const json = JSON.stringify(days);
  if (json === lastSent) return true;
  const supabase = await getClient();
  const { data: s } = await supabase.auth.getSession();
  const uid = s && s.session && s.session.user && s.session.user.id;
  if (!uid) return false;
  const { error } = await supabase.from("push_digests").upsert({ user_id: uid, days, updated_at: new Date().toISOString() });
  if (!error) lastSent = json;
  return !error;
}
