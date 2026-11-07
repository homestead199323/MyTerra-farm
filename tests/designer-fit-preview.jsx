import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Setup } from "../src/features/farm/Farm";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// Farm Designer letterbox check: ?w=90&h=130 sets the farm size (the whole farm must fit the stage).
const q = new URLSearchParams(location.search), W = +(q.get("w") || 90), H = +(q.get("h") || 130);
const zones = [{ id: "house", type: "house", name: "House", xM: 2, yM: 1, wM: 12, hM: 8 }, { id: "pond", type: "water", name: "Water", xM: W - 25, yM: H - 30, wM: 20, hM: 25 }];
const data = { ...fixture, farmW: W, farmH: H, zones, garden: { plots: [] }, livestock: { animals: [] }, ornaments: [], mapLines: [] };
export default function Preview() { const [d, setD] = useState(data); return <Setup data={d} setData={setD} onBack={() => {}} />; }
createRoot(document.getElementById("root")).render(<Preview />);
