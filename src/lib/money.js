/* ═══════════════════════════════════════════
   MONEY — the grower's own currency (UX pass 2026-09-28)
   Amounts are stored as plain numbers; only the symbol changes.
   Order: Settings choice (data.currency) → the device locale's country
   (en-GB → £, en-US → $, sv-SE → kr) → the farm's town (US → $, Canada → CAD) → climate region (US regions → $) → €.
   ═══════════════════════════════════════════ */
const COUNTRY_CCY = {
  GB: "GBP", UK: "GBP", US: "USD", CA: "CAD", AU: "AUD", NZ: "NZD", IE: "EUR", NL: "EUR", BE: "EUR",
  FR: "EUR", DE: "EUR", LU: "EUR", AT: "EUR", FI: "EUR", ES: "EUR", IT: "EUR", PT: "EUR", GR: "EUR",
  EE: "EUR", LV: "EUR", LT: "EUR", SK: "EUR", SI: "EUR", HR: "EUR", MT: "EUR", CY: "EUR",
  SE: "SEK", NO: "NOK", DK: "DKK", IS: "ISK", CH: "CHF", PL: "PLN", CZ: "CZK", AL: "ALL",
};
export const CURRENCIES = [
  { code: "EUR", label: "€ Euro" }, { code: "GBP", label: "£ Pound" }, { code: "USD", label: "$ US dollar" },
  { code: "CAD", label: "$ Canadian dollar" }, { code: "SEK", label: "kr Swedish krona" }, { code: "NOK", label: "kr Norwegian krone" },
  { code: "DKK", label: "kr Danish krone" }, { code: "CHF", label: "CHF Swiss franc" }, { code: "PLN", label: "zł Złoty" },
  { code: "CZK", label: "Kč Czech koruna" }, { code: "AUD", label: "$ Australian dollar" }, { code: "ALL", label: "L Albanian lek" },
];
const KNOWN = new Set(CURRENCIES.map((c) => c.code).concat(Object.values(COUNTRY_CCY)));

export function currencyCode(data) {
  if (data && data.currency && KNOWN.has(data.currency)) return data.currency;
  const langs = typeof navigator !== "undefined" ? navigator.languages || [navigator.language] : [];
  for (const l of langs) {
    const m = /[-_]([A-Za-z]{2})(?:$|[-_])/.exec(String(l || ""));
    if (m && COUNTRY_CCY[m[1].toUpperCase()]) return COUNTRY_CCY[m[1].toUpperCase()];
  }
  const city = String((data && data.city) || "");
  if (/, US$/.test(city)) return "USD";
  if (/, Canada$/.test(city)) return "CAD";
  const r = data && data.region;
  if (r === "us_warm" || r === "us_cold") return "USD";
  return "EUR";
}

const SYMBOLS = { EUR: "€", GBP: "£", USD: "$", CAD: "$", AUD: "$", NZD: "$", SEK: "kr ", NOK: "kr ", DKK: "kr ", ISK: "kr ", CHF: "CHF ", PLN: "zł ", CZK: "Kč ", ALL: "L " };

/** Short symbol for labels and prefixes: "£", "$", "kr ". */
export function currencySymbol(data) {
  return SYMBOLS[currencyCode(data)] || "€";
}

/** "£12.50" — decimals default 2. */
export function formatMoney(n, data, decimals) {
  const d = typeof decimals === "number" ? decimals : 2;
  return currencySymbol(data) + (Number(n) || 0).toFixed(d);
}
