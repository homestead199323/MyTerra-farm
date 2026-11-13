/* The map-first home (docs/superpowers/specs/2026-11-12-map-first-home-design.md).
   Since 13 Nov 2026 it is the only home: the old dashboard and its device switch
   (`?home=new|old`, Settings toggle, localStorage "mt_home_v2") are gone. */
import { useEffect, useState } from "react";

const OLD_KEY = "mt_home_v2";

/** Always on. Clears the old per-device switch so nothing reads it again. */
export function isHomeV2() {
  try { localStorage.removeItem(OLD_KEY); } catch { /* private mode */ }
  return true;
}

export function useHomeV2() {
  return true;
}

/** Wide screen: pages have room for a detail panel beside their list. */
const WIDE = "(min-width: 1100px)";
export function useWideStage() {
  const [wide, setWide] = useState(() => typeof matchMedia === "function" && matchMedia(WIDE).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const q = matchMedia(WIDE), sync = () => setWide(q.matches);
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  return wide;
}
