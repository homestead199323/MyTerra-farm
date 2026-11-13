// Farm inventory (the Pantry) — a small stock ledger tied to Financials.
//
// data.pantry.items   stock lots {id, name, category, qty, unit, source, addedDate, storageNote}
// data.pantry.moves   ledger {id, date, name, unit, qty (+in / −out), kind, price?, amount?, buyer?, costId?}
// data.pantry.prices  last selling price per product key ("Chicken Eggs|pcs" → 0.3)
// data.costs.items    a sale is an income entry {type:"income", cat:"Produce Sales", source:"pantry", saleId, …}
//
// Units are kg, pcs or L. Products with the same name and unit are one stock line; selling or using
// takes from the oldest lot first (FIFO).

import { formatMoney } from "./money.js";
import { appendLog } from "./utils.js";

export const UNITS = ["kg", "pcs", "L"];
const MOVE_CAP = 500;
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Map any legacy unit to kg / pcs / L, converting the quantity where needed. */
export function normalizeUnit(unit, qty = 0, name = "") {
  const u = String(unit || "").trim().toLowerCase();
  if (["lb", "lbs"].includes(u)) return { unit: "kg", qty: r3(qty * 0.4536) };
  if (["g", "gram", "grams"].includes(u)) return { unit: "kg", qty: r3(qty / 1000) };
  if (["oz"].includes(u)) return { unit: "kg", qty: r3(qty * 0.02835) };
  if (["l", "litre", "litres", "liter", "liters"].includes(u)) return { unit: "L", qty };
  if (["ml"].includes(u)) return { unit: "L", qty: r3(qty / 1000) };
  if (["count", "eggs", "egg", "unit", "units", "jar", "jars", "pc", "pcs", "piece", "pieces"].includes(u))
    return { unit: "pcs", qty };
  // Milk logged in kg before litres existed: 1 kg of milk ≈ 1 L.
  if (u === "kg" && /\bmilk\b/i.test(name)) return { unit: "L", qty };
  return { unit: "kg", qty };
}

export const productKey = (item) => `${item.name}|${item.unit}`;

// Storage notes are copied onto stock when it is added. Notes we have since withdrawn as unsafe
// (water-glassing eggs, months-long oil storage) are swapped for the current advice when shown.
const RETIRED_NOTES = {
  "Unwashed 2-3wk. Water glass 12+mo.": "Fridge: about 4 weeks. Freeze cracked: 12 months.",
  "Fresh 3-5 days. Grill+freeze. Preserve in oil.": "Fresh 3-5 days. Grill+freeze. In oil: fridge, 4 days max.",
  "Fresh 1-2wk. Hearts in oil 3-6mo. Freeze hearts. Italian: preserved in brine.": "Fresh 1-2wk. Blanch+freeze hearts. In oil: fridge, 4 days max.",
};
export function currentStorageNote(note) {
  if (!note) return "";
  if (RETIRED_NOTES[note]) return RETIRED_NOTES[note];
  return /water.?glass/i.test(note) ? "" : note;
}

/** One line per product: total quantity, lots oldest first. */
export function stockLines(items) {
  const lines = new Map();
  (items || []).forEach((it) => {
    const key = productKey(it);
    if (!lines.has(key))
      lines.set(key, { key, name: it.name, unit: it.unit, category: it.category, qty: 0, lots: [], storageNote: "" });
    const line = lines.get(key);
    line.qty = r3(line.qty + (Number(it.qty) || 0));
    line.lots.push(it);
    if (!line.storageNote && it.storageNote) line.storageNote = currentStorageNote(it.storageNote);
  });
  lines.forEach((l) => l.lots.sort((a, b) => String(a.addedDate || "").localeCompare(String(b.addedDate || ""))));
  return [...lines.values()];
}

function logMove(pantry, move) {
  return [...(pantry.moves || []), { id: newId(), ...move }].slice(-MOVE_CAP);
}

/** Put stock in (harvest, collection, purchase). Returns new data. */
export function addStock(data, lot, today) {
  const pantry = data.pantry || { items: [] };
  const norm = normalizeUnit(lot.unit, Number(lot.qty) || 0, lot.name);
  const item = { id: newId(), source: "manual", addedDate: today, ...lot, unit: norm.unit, qty: norm.qty };
  return {
    ...data,
    pantry: {
      ...pantry,
      items: [...(pantry.items || []), item],
      moves: logMove(pantry, { date: today, name: item.name, unit: item.unit, qty: item.qty, kind: "in", source: item.source }),
    },
  };
}

/** Bought-in stock: goes into the pantry and, with a cost, into Financials as an expense. */
export function addBoughtStock(data, lot, cost, today) {
  const next = addStock(data, { ...lot, source: cost > 0 ? "bought" : lot.source || "manual" }, today);
  if (!(cost > 0)) return next;
  const expense = { id: newId(), type: "expense", cat: "Stock purchases", label: `Bought ${lot.qty} ${lot.unit} ${lot.name}`, amount: r2(cost), date: today, source: "pantry" };
  return { ...next, costs: { ...(next.costs || {}), items: [...(next.costs?.items || []), expense] } };
}

/** Take quantity out of a product line, oldest lot first. */
function takeFifo(items, key, qty) {
  let left = qty;
  const out = [];
  const sorted = [...items].sort((a, b) => String(a.addedDate || "").localeCompare(String(b.addedDate || "")));
  const taken = new Map();
  sorted.forEach((it) => {
    if (left <= 0 || productKey(it) !== key) return;
    const t = Math.min(left, Number(it.qty) || 0);
    taken.set(it.id, t);
    left = r3(left - t);
  });
  items.forEach((it) => {
    const t = taken.get(it.id) || 0;
    const rest = r3((Number(it.qty) || 0) - t);
    if (!taken.has(it.id)) out.push(it);
    else if (rest > 0) out.push({ ...it, qty: rest });
  });
  return out;
}

export function lineQty(data, key) {
  return (data.pantry?.items || []).filter((i) => productKey(i) === key).reduce((s, i) => r3(s + (Number(i.qty) || 0)), 0);
}

/** Use stock without selling it: eaten, given away or spoiled. */
export function takeStock(data, { key, qty, kind = "use", today }) {
  const [name, unit] = key.split("|");
  const have = lineQty(data, key);
  const q = Math.min(Number(qty) || 0, have);
  if (q <= 0) return data;
  const pantry = data.pantry;
  const verb = kind === "waste" ? "Spoiled" : kind === "gift" ? "Gave away" : kind === "remove" ? "Removed" : "Used";
  return {
    ...data,
    pantry: {
      ...pantry,
      items: takeFifo(pantry.items, key, q),
      moves: logMove(pantry, { date: today, name, unit, qty: -q, kind }),
    },
    log: appendLogLite(data.log, `${verb} ${q} ${unit} ${name}`),
  };
}

/**
 * Sell stock: removes it (FIFO), records the sale as income in Financials, remembers the price.
 * `paid: false` leaves the income as money still to collect.
 */
export function sellStock(data, { key, qty, price, buyer = "", paid = true, today, date }) {
  const [name, unit] = key.split("|");
  const have = lineQty(data, key);
  const q = Math.min(Number(qty) || 0, have);
  const p = Number(price) || 0;
  if (q <= 0 || p < 0) return data;
  const amount = r2(q * p),
    saleId = newId(),
    day = date || today;
  const pantry = data.pantry;
  const cost = {
    id: newId(),
    type: "income",
    cat: "Produce Sales",
    label: `Sold ${q} ${unit} ${name}${buyer ? ` to ${buyer}` : ""}`,
    amount,
    date: day,
    source: "pantry",
    saleId,
    product: name,
    unit,
    qty: q,
    price: p,
    buyer: buyer.trim(),
    paid: !!paid,
  };
  return {
    ...data,
    pantry: {
      ...pantry,
      items: takeFifo(pantry.items, key, q),
      moves: logMove(pantry, { date: day, name, unit, qty: -q, kind: "sell", price: p, amount, buyer: cost.buyer, costId: cost.id }),
      prices: { ...(pantry.prices || {}), [key]: p },
      buyers: cost.buyer ? [...new Set([cost.buyer, ...(pantry.buyers || [])])].slice(0, 30) : pantry.buyers || [],
    },
    costs: { ...(data.costs || {}), items: [...(data.costs?.items || []), cost] },
    log: appendLogLite(data.log, `💶 Sold ${q} ${unit} ${name} for ${formatMoney(amount, data)}${paid ? "" : " (to be paid)"}`),
  };
}

/** Deleting a sale in Financials puts the stock back. */
export function undoSale(data, costId, today) {
  const cost = (data.costs?.items || []).find((c) => c.id === costId);
  const costs = { ...(data.costs || {}), items: (data.costs?.items || []).filter((c) => c.id !== costId) };
  if (!cost || cost.source !== "pantry" || !cost.qty) return { ...data, costs };
  const restored = addStock({ ...data, costs }, { name: cost.product, unit: cost.unit, qty: cost.qty, category: categoryOf(data, cost.product), source: "returned" }, today);
  const moves = restored.pantry.moves.slice(0, -1);
  return {
    ...restored,
    pantry: { ...restored.pantry, moves: logMove({ moves }, { date: today, name: cost.product, unit: cost.unit, qty: cost.qty, kind: "return" }) },
  };
}

function categoryOf(data, name) {
  const past = (data.pantry?.items || []).find((i) => i.name === name);
  if (past) return past.category;
  return /egg/i.test(name) ? "Eggs" : /milk|cheese/i.test(name) ? "Dairy" : /meat/i.test(name) ? "Meat" : "Other";
}

export function markPaid(data, costId) {
  return {
    ...data,
    costs: { ...(data.costs || {}), items: (data.costs?.items || []).map((c) => (c.id === costId ? { ...c, paid: true } : c)) },
  };
}

/** Value of stock at last selling prices (only products that have been sold before). */
export function stockValue(data) {
  const prices = data.pantry?.prices || {};
  return r2(stockLines(data.pantry?.items).reduce((s, l) => s + (prices[l.key] != null ? l.qty * prices[l.key] : 0), 0));
}

export function unpaidTotal(data) {
  return r2((data.costs?.items || []).filter((c) => c.type === "income" && c.paid === false).reduce((s, c) => s + c.amount, 0));
}

function appendLogLite(log, text) {
  return appendLog(log, { text });
}

/** One-off tidy of old pantry data: units to kg / pcs / L; a bare "Eggs" line named after the only laying flock. */
export function migratePantry(data) {
  const items = data?.pantry?.items;
  if (!Array.isArray(items) || !items.length) return data;
  const layers = [...new Set((data.livestock?.animals || []).map((a) => a.type).filter((t) => /Chicken|Duck|Quail|Goose|Turkey|Guinea/.test(t)))];
  let changed = false;
  const next = items.map((it) => {
    const norm = normalizeUnit(it.unit, Number(it.qty) || 0, it.name);
    let name = it.name;
    if (name === "Eggs" && layers.length === 1) name = `${layers[0]} Eggs`;
    // Lots are taken out by id (takeFifo): an old lot without one must get its own.
    const id = it.id || newId();
    if (norm.unit === it.unit && norm.qty === it.qty && name === it.name && id === it.id) return it;
    changed = true;
    return { ...it, id, name, unit: norm.unit, qty: norm.qty };
  });
  return changed ? { ...data, pantry: { ...data.pantry, items: next } } : data;
}
