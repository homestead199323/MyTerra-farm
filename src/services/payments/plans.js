/* ═══════════════════════════════════════════
   PLANS — the plan catalogue and what each plan unlocks.
   No imports: unit-tested (tests/plans.test.js).

   Pricing restructure 2026-11-17 (see LAUNCH_PLAN.md):
   - Grow       (profiles.tier 'basic')    $4.99/month or $39/year
   - Homestead  (profiles.tier 'pro')      $9.99/month or $79/year
                adds Animals, Pantry, Money, Insights, the assistant
   - Lifetime   (profiles.tier 'lifetime') $129 once, Founding price,
                first 100 buyers; same features as Homestead

   The tier ids in the database stay 'basic' / 'pro' / 'lifetime';
   only the names people see changed.

   Every price here MUST match: the prices in the Paddle catalogue,
   PRICE_TIER in supabase/functions/paddle-webhook/index.ts, and the
   prices on public/landing.html and public/terms.html. The tests fail
   if any of them drifts.
   ═══════════════════════════════════════════ */

// Paddle price ids. A yearly and a monthly price sit on the same Paddle
// product, so both map to the same tier in the webhook.
export const PRICE_IDS = {
  basic: { month: "pri_01kxdcntw2905t5fky81fy8cp0", year: "PENDING_PADDLE_GROW_YEARLY_39" },
  pro: { month: "pri_01kxdcqpgjd5z1qrpd6hxgmxr2", year: "PENDING_PADDLE_HOMESTEAD_YEARLY_79" },
  lifetime: { once: "PENDING_PADDLE_FOUNDING_LIFETIME_129" },
};

export const PLANS = [
  { id: "basic", name: "Grow", month: 4.99, year: 39,
    blurb: "Your space in 3D with today's jobs, crops, seedlings, the seasonal calendar, weather alerts and every guide." },
  { id: "pro", name: "Homestead", month: 9.99, year: 79, highlight: true,
    blurb: "Everything in Grow, plus Animals, Pantry, Money, Insights and the farm assistant." },
  { id: "lifetime", name: "Lifetime", once: 129,
    blurb: "Everything in Homestead, with no renewal. Founding price for the first 100 members." },
];

const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p]));

/** The name people see for a profiles.tier value ("" when it is not a paid plan). */
export function planName(tier) {
  return PLAN_BY_ID[tier] ? PLAN_BY_ID[tier].name : "";
}

/** The Paddle price for a plan and billing period ('month' | 'year'). Lifetime has one price. */
export function priceIdFor(planId, interval) {
  const ids = PRICE_IDS[planId];
  if (!ids) return null;
  if (ids.once) return ids.once;
  return ids[interval === "year" ? "year" : "month"] || null;
}

/** Whole-percent saving of the yearly price against twelve monthly payments (0 when there is no yearly price). */
export function yearlySaving(plan) {
  if (!plan || !plan.month || !plan.year) return 0;
  return Math.round((1 - plan.year / (plan.month * 12)) * 100);
}

// Feature → minimum plan. The trial gets everything so people taste it all.
export const HOMESTEAD_FEATURES = ["ai", "multizone", "analytics", "animals", "pantry", "money"];

/** hasFeature(ent, feature): Homestead-level features need isPro; anything else needs write access. */
export function hasFeature(ent, feature) {
  if (!ent) return false;
  if (HOMESTEAD_FEATURES.includes(feature)) return !!ent.isPro;
  return !!ent.canWrite;
}

// Pages that Grow does not include.
const GROW_LOCKED_PAGES = { live: "animals", pantry: "pantry", fin: "money" };

/*
 * pageLock(ent, page) → the feature a page is locked behind, or null when it is open.
 * - Animals / Pantry / Money: locked on the Grow plan only. A finished trial or an
 *   ended Homestead plan is read-only but keeps its records visible ("your data is
 *   safe"), so those are never locked here.
 * - Insights: locked for anyone without Homestead-level features (unchanged).
 * - Unknown entitlement (first load, offline with no cache): never locked.
 */
export function pageLock(ent, page) {
  if (!ent || ent.state === "unknown") return null;
  if (page === "insights") return ent.isPro ? null : "analytics";
  const feature = GROW_LOCKED_PAGES[page];
  if (!feature) return null;
  return ent.plan === "basic" ? feature : null;
}

// What the locked page says, per feature.
export const LOCK_COPY = {
  animals: { title: "Animals are part of Homestead", body: "Keep hens, goats, bees and more: add them to your space, get their daily care jobs, and record eggs and milk. Any animals you already added are kept, with their records." },
  pantry: { title: "Pantry is part of Homestead", body: "See what your space has produced and what is in stock, then mark it used, given away or sold. Your harvests keep being recorded either way, so nothing is lost." },
  money: { title: "Money is part of Homestead", body: "Track what your space costs and what it brings in, and see where the money goes. Anything you already entered is kept." },
};

// Founding Lifetime: the offer closes after this many purchases.
export const FOUNDING_LIMIT = 100;

/** Places left given how many were sold; null when the count is unknown (which must not close the offer). */
export function foundingLeft(sold) {
  if (typeof sold !== "number" || !Number.isFinite(sold)) return null;
  return Math.max(0, FOUNDING_LIMIT - Math.floor(sold));
}
