import React from "react";
import { createRoot } from "react-dom/client";
import { UpgradeSheet, LockedPage, TrialBanner } from "../src/features/payments/Paywall";
import "../src/index.css";
// The plan picker and the locked pages. ?ent=trial|grow|homestead|over  ?lock=animals|pantry|money
const q = new URLSearchParams(location.search);
const ENTS = {
  trial: { plan: "trial", state: "trial", canWrite: true, isPro: true, trialDaysLeft: 5, trialEndsAt: Date.now() + 5 * 864e5 },
  over: { plan: "trial", state: "trial_expired", canWrite: false, isPro: false, trialDaysLeft: 0 },
  grow: { plan: "basic", state: "active", canWrite: true, isPro: false, trialDaysLeft: 0 },
  homestead: { plan: "pro", state: "active", canWrite: true, isPro: true, trialDaysLeft: 0 },
};
const ent = ENTS[q.get("ent")] || ENTS.trial;
const lock = q.get("lock");
export default function Preview() {
  return (
    <div style={{ padding: 16, maxWidth: 560, margin: "0 auto" }}>
      <TrialBanner ent={ent} onUpgrade={() => {}} />
      {lock ? <LockedPage feature={lock} onUpgrade={() => {}} /> : <UpgradeSheet open onClose={() => {}} ent={ent} />}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Preview />);
