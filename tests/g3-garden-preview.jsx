import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveScene from "../src/features/grove/GroveScene";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// A small back garden (the UX-audit persona: 8 x 5 m, a starter raised bed, a few pots, a lawn).
const zone = (id, type, name, xM, yM, wM, hM, extra = {}) => ({ id, type, name, xM, yM, wM, hM, rowCount: 2, ...extra });
const zones = [zone("bed", "raised", "Raised bed", 1, 1.2, 2, 1.2), zone("pots", "container", "Pots", 5.2, 1, 2, 1.4), zone("herbs", "herbs", "Herbs", 1, 3.2, 2.4, .9)];
const plot = (crop, z, start, rowCount, count) => ({ id: z + "-" + start, zone: z, crop, status: "planted", plantDate: "2026-05-01", observedStage: 5, plantCount: count, layout: { startRow: start, rowCount, pattern: "rows", lengthM: zones.find((a) => a.id === z).wM } });
const data = { ...fixture, farmW: 8, farmH: 5, profile: { ...fixture.profile, environment: "backyard" }, zones, garden: { plots: [plot("Lettuce", "bed", 1, 1, 8), plot("Radish", "bed", 2, 1, 24), plot("Tomato", "pots", 1, 2, 3), plot("Basil", "herbs", 1, 2, 8)] }, livestock: { animals: [] }, ornaments: [], mapLines: [] };
const q = new URLSearchParams(location.search);
const skyOverride = q.has("hour") || q.has("wx") || q.has("fixed") ? { hour: q.has("hour") ? +q.get("hour") : null, wx: q.get("wx") || undefined, fixed: q.get("fixed") === "1" } : null;
window.__g3harness = { coarse: q.get('coarse') === '1', full: q.get('full') === '1' };
export default function Preview() { const [d, setD] = useState(data); return <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}><GroveScene data={d} setData={setD} skyOverride={skyOverride} /></main>; }
createRoot(document.getElementById("root")).render(<Preview />);
