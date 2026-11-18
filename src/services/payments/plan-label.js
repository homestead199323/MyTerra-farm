/* Human labels for the entitlement object (see entitlements.js). No imports: unit-tested. */
/*
 * planLabel(ent) → short human label for the account's plan, e.g.
 * "Free trial · 5 days left", "Grow plan", "Trial ended · read-only".
 * Returns "" when the plan is not known yet (offline first run, local-only
 * mode) so callers can hide the chip instead of guessing.
 */
export function planLabel(ent) {
  if (!ent) return "";
  switch (ent.state) {
    case "trial":
      return ent.trialDaysLeft === 1 ? "Free trial · last day" : `Free trial · ${ent.trialDaysLeft} days left`;
    case "trial_expired":
      return "Trial ended · read-only";
    case "lifetime":
      return "Lifetime";
    case "active":
      return ent.plan === "pro" ? "Homestead plan" : "Grow plan";
    case "past_due":
      return (ent.plan === "pro" ? "Homestead" : "Grow") + " · payment issue";
    case "expired":
      return "Plan ended · read-only";
    default:
      return "";
  }
}

/*
 * trialEndsAt(ent) → Date the 7-day trial ends, or null. Used by the
 * trial banner so people see a real date, not only a countdown.
 */
export function trialEndsAt(ent) {
  return ent && ent.trialEndsAt ? new Date(ent.trialEndsAt) : null;
}

