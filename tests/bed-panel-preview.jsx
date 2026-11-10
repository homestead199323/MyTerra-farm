import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveZoneCard from "../src/features/grove/GroveZoneCard";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// The map's bed panel (tap a bed on the farm map). ?zone=bed1 picks the bed.
const q = new URLSearchParams(location.search);
export default function Preview() {
  const [d, setD] = useState(fixture);
  const zone = d.zones.find((z) => z.id === (q.get("zone") || "bed1"));
  return <GroveZoneCard zone={zone} data={d} setData={setD} onClose={() => {}} onPlantInZone={() => {}} />;
}
createRoot(document.getElementById("root")).render(<Preview />);
