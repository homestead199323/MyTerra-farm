import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import PlantingForm from "../src/features/quiet/PlantingForm";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// A long narrow bed that is nearly full: two 20 cm lettuce rows take 0.1–0.5 m of its 0.8 m width.
// ?crop=Garlic&plants=10&spacing=9.5 reproduces the "doesn't fit" case from the owner's screenshot.
const q = new URLSearchParams(location.search);
const bed = { id: "nb", type: "veg", name: "Long bed", xM: 1, yM: 1, wM: 10, hM: 0.8, rowCount: 2 };
const nurseryBed = { id: "nur", type: "nursery", name: "Seedling nursery", xM: 14, yM: 1, wM: 3, hM: 2 };
const data = { ...fixture, zones: [...fixture.zones, bed, ...(q.get("nursery") ? [nurseryBed] : [])], garden: { plots: [...fixture.garden.plots, { id: "old", zone: "nb", crop: "Lettuce", name: "Lettuce", status: "planted", plantDate: "2026-09-01", plantCount: 60, steps: [], layout: { version: 2, pattern: "rows", spacingCM: 20, rowSpacingCM: 20, startM: .1, alongStartM: 0, rowCount: 2, lengthM: 10 } }] } };
const initial = { crop: q.get("crop") || "Garlic", zone: "nb", mode: "plants", plantCount: q.get("plants") || "10", pattern: q.get("pattern") || "offset", spacingCM: q.get("spacing") || undefined, lengthM: q.get("length") || undefined };
export default function Preview() { const [d, setD] = useState(data); useEffect(() => { window.__pf = { data: d }; }, [d]); return <main style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}><PlantingForm data={d} setData={setD} initial={initial} onClose={() => {}} /></main>; }
createRoot(document.getElementById("root")).render(<Preview />);
