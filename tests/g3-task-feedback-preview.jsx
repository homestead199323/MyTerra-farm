import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveScene from "../src/features/grove/GroveScene";
import { todayLocalKey } from "../src/lib/utils";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";

// In-memory fixture: safe to complete a task without touching a saved garden.
const task = { key: "fixture-water", type: "water", title: "Water the tomatoes", desc: "Check the soil first.", plotId: "tom", daysOut: 0 };
export default function Preview() {
  const [data, setData] = useState(fixture);
  const finished = (data.completions?.[todayLocalKey()] || []).includes(task.key);
  return <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
    <GroveScene data={data} setData={setData} tasksByZone={finished ? {} : { bed1: [task] }} />
  </main>;
}
createRoot(document.getElementById("root")).render(<Preview />);
