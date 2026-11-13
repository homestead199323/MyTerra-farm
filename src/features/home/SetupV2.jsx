import { useState } from "react";
import { Building2, Home, Tractor, MapPin, Leaf } from "lucide-react";
import { REGIONS } from "../../data/regions";
import { uid } from "../../lib/storage";
import { SIZES, guessRegion, buildSetup } from "./setup-model";
import "./home-v2.css";

/* First run of the map-first home: one screen, three answers, then the map (with its cues) takes over.
   Replaces the 12-step onboarding when the new home is on. */

const SPACES = [
  { id: "balcony", l: "Balcony", E: Building2 },
  { id: "backyard", l: "Backyard", E: Home },
  { id: "farm", l: "Farm", E: Tractor },
];
const SIZE_IDS = ["small", "medium", "large"];
const SIZE_LABEL = { small: "Small", medium: "Medium", large: "Large" };

function deviceRegion() {
  try { return guessRegion(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { return "western_europe"; }
}

export default function SetupV2({ onComplete }) {
  const [environment, setEnvironment] = useState(null), [size, setSize] = useState("medium"), [region, setRegion] = useState(deviceRegion);
  const [zoneId] = useState(uid);
  const dims = environment ? SIZES[environment][size] : null;
  return (
    <div className="hv2-setup" role="dialog" aria-modal="true" aria-labelledby="hv2-setup-title">
      <div className="hv2-setup-card">
        <div className="hv2-setup-brand"><Leaf size={16} strokeWidth={2.2} /> MyTerra</div>
        <h1 id="hv2-setup-title">Where do you grow?</h1>
        <div className="hv2-setup-grid" role="group" aria-label="Kind of space">
          {SPACES.map(function (s) {
            return <button type="button" key={s.id} className="hv2-setup-tile" aria-pressed={environment === s.id} onClick={function () { setEnvironment(s.id); }}><s.E size={28} strokeWidth={1.9} />{s.l}</button>;
          })}
        </div>
        <h2>How big?</h2>
        <div className="hv2-setup-grid" role="group" aria-label="Size">
          {SIZE_IDS.map(function (id) {
            return <button type="button" key={id} className="hv2-setup-size" aria-pressed={size === id} onClick={function () { setSize(id); }}>{SIZE_LABEL[id]}</button>;
          })}
        </div>
        <p className="hv2-setup-dims" aria-live="polite">{dims ? `About ${dims[0]} × ${dims[1]} m` : ""}</p>
        <label className="hv2-setup-region">
          <MapPin size={20} strokeWidth={1.9} aria-hidden="true" />
          <span className="g3-sr-only">Growing region</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map(function (r) { return <option key={r.id} value={r.id}>{r.name}</option>; })}
          </select>
        </label>
        <p className="hv2-setup-note">We draw a map of your space, then help you pick a first crop. No account needed. Closest climate is fine — change it any time in Settings.</p>
        <button type="button" className="hv2-setup-go" disabled={!environment} onClick={() => onComplete(buildSetup({ environment, size, region, zoneId }))}>Create my starter map</button>
      </div>
    </div>
  );
}
