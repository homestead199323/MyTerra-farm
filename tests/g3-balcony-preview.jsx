import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveScene from "../src/features/grove/GroveScene";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// A balcony: containers, a herb trough and a raised planter on a stone floor — no hedge, no trees, no fence posts.
const zone = (id, type, name, xM, yM, wM, hM, extra = {}) => ({ id, type, name, xM, yM, wM, hM, rowCount: 2, ...extra });
const sparse = new URLSearchParams(location.search).get("sparse") === "1"; // ?sparse=1: only the pots, so the free-floor props (bistro set, rug, trellis) show
const small = new URLSearchParams(location.search).get("small") === "1"; // ?small=1: a realistic 4 x 1.5 m starter balcony (one strip along the railing, a few pots by the wall)
const zones = small ? [zone("strip", "container", "Railing planters", .3, .9, 3.4, .5, { rowCount: 1 }), zone("pots", "container", "Pots", 2.4, .15, 1.4, .6, { rowCount: 1 })] : [zone("pots", "container", "Pots", .5, .5, 4, 3), zone("herbs", "herbs", "Herb trough", 5.5, .5, 5, 1.2), zone("raised", "raised", "Planter", 5.5, 2.6, 5, 1.4)].filter((z) => !sparse || z.id === "pots");
const plot = (crop, z, start, rowCount, count) => ({ id: z + "-" + start, zone: z, crop, status: "planted", plantDate: "2026-05-01", observedStage: 5, plantCount: count, layout: { startRow: start, rowCount, pattern: "rows", lengthM: zones.find((a) => a.id === z).wM } });
const data = { ...fixture, farmW: small ? 4 : 11, farmH: small ? 1.5 : 4.5, profile: { ...fixture.profile, environment: "balcony" }, zones, garden: { plots: (small ? [["Lettuce", "strip", 1, 1, 8], ["Tomato", "pots", 1, 1, 2]] : [["Tomato", "pots", 1, 2, 6], ["Basil", "herbs", 1, 2, 12], ["Strawberry", "raised", 1, 2, 10]]).filter((a) => zones.some((z) => z.id === a[1])).map((a) => plot(...a)) }, livestock: { animals: [] }, ornaments: small ? [] : [{ id: "bn", type: "bench", xM: 2.5, yM: 4 }, { id: "hp", type: "hangpot", xM: 10, yM: 4.2 }], mapLines: [] };
// phone branches for Playwright: ?coarse=1 forces the coarse-pointer tier, ?full=1 opens full screen on mount
const q = new URLSearchParams(location.search);
const skyOverride = q.has("hour") || q.has("wx") || q.has("fixed") ? { hour: q.has("hour") ? +q.get("hour") : null, wx: q.get("wx") || undefined, fixed: q.get("fixed") === "1" } : null;
window.__g3harness = { coarse: q.get('coarse') === '1', full: q.get('full') === '1' };
export default function Preview() { const [d, setD] = useState(data); return <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}><GroveScene data={d} setData={setD} skyOverride={skyOverride} /></main>; }
createRoot(document.getElementById("root")).render(<Preview />);
