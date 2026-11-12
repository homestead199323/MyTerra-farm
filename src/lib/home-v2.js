/* The map-first home (docs/superpowers/specs/2026-11-12-map-first-home-design.md).
   A device switch while it is being tried out: OFF by default. `?home=new` turns it on for this
   device, `?home=old` turns it off; Settings has the same switch. */
import { useEffect, useState } from "react";

const KEY = "mt_home_v2";
const EVENT = "mt-home-v2";

/** What the switch should be, given the page's query string and what is stored. → { on, store } (store: "1" | null | undefined = leave) */
export function resolveHomeV2(search, stored) {
  let q = null;
  try { q = new URLSearchParams(search || "").get("home"); } catch { q = null; }
  if (q === "new") return { on: true, store: "1" };
  if (q === "old") return { on: false, store: null };
  return { on: stored === "1" };
}

export function isHomeV2() {
  try {
    const r = resolveHomeV2(window.location.search, localStorage.getItem(KEY));
    if (r.store === "1") localStorage.setItem(KEY, "1");
    else if (r.store === null) localStorage.removeItem(KEY);
    return r.on;
  } catch {
    return false;
  }
}

export function setHomeV2(on) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
    // a `?home=` left in the address would win over the stored value on the next load
    const url = new URL(window.location.href);
    if (url.searchParams.has("home")) { url.searchParams.delete("home"); window.history.replaceState(null, "", url); }
  } catch { /* private mode: the switch lasts for this visit only */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: !!on }));
}

export function useHomeV2() {
  const [on, setOn] = useState(isHomeV2);
  useEffect(() => {
    const sync = (e) => setOn(typeof e.detail === "boolean" ? e.detail : isHomeV2());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return on;
}

/** Wide screen with the new home on: pages have room for a detail panel beside their list. */
const WIDE = "(min-width: 1100px)";
export function useWideStage() {
  const on = useHomeV2();
  const [wide, setWide] = useState(() => typeof matchMedia === "function" && matchMedia(WIDE).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const q = matchMedia(WIDE), sync = () => setWide(q.matches);
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  return on && wide;
}
