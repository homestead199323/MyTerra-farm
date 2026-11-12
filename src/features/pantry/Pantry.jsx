import { useEffect, useMemo, useState } from "react";
import { Trash2, Minus, Plus, ShoppingBasket, Utensils, PackagePlus, ChevronDown } from "lucide-react";
import { todayLocalKey } from "../../lib/utils";
import { rCM } from "../../lib/regional";
import { addBoughtStock, takeStock, sellStock, stockLines, stockValue, unpaidTotal, UNITS } from "../../lib/inventory";
import FarmIcon from "../../components/FarmIcon";
import { Overlay } from "../../components/ui";
import "./pantry.css";
import { currencySymbol, formatMoney } from "../../lib/money";

const CATS = ["Fresh Produce", "Meat", "Eggs", "Dairy", "Preserved", "Grain", "Other"];
const fmtQty = (n) => (Math.round((Number(n) || 0) * 100) / 100).toString();
const MOVE_LABEL = { in: "In", sell: "Sold", use: "Used", gift: "Given away", waste: "Spoiled", return: "Returned", remove: "Removed" };

function daysAgo(key, today) {
  if (!key) return "";
  const d = Math.round((new Date(`${today}T12:00:00`) - new Date(`${key}T12:00:00`)) / 864e5);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

/** − [qty] + stepper that works for kg, pcs and L. */
function QtyStepper({ value, onChange, unit, max }) {
  const step = unit === "pcs" ? 1 : 0.5;
  const set = (n) => onChange(String(Math.max(0, Math.min(max ?? Infinity, Math.round(n * 100) / 100))));
  return (
    <div className="q-tp-amount q-stock-stepper">
      <button type="button" aria-label="Less" onClick={() => set((Number(value) || 0) - step)}>
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={unit === "pcs" ? 1 : 0.1}
        value={value}
        aria-label={`Quantity in ${unit}`}
        onChange={(e) => onChange(e.target.value)}
      />
      <span>{unit}</span>
      <button type="button" aria-label="More" onClick={() => set((Number(value) || 0) + step)}>
        <Plus size={16} />
      </button>
    </div>
  );
}

function Segmented({ value, onChange, options, label }) {
  return (
    <div className="q-seg" role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PANTRY — the farm's inventory, tied to Financials
   ═══════════════════════════════════════════ */
export default function Pantry({ data, setData, pageData, clearPageData }) {
  const E = currencySymbol(data).trim();
  const money = (n) => formatMoney(n, data);
  const today = todayLocalKey();
  const [cat, setCat] = useState("All");
  const [sell, setSell] = useState(null);
  const [use, setUse] = useState(null);
  const [add, setAdd] = useState(null);
  useEffect(() => { if (pageData?.add) { setAdd({ name: "", category: "Fresh Produce", qty: "", unit: "kg", cost: "" }); clearPageData?.(); } }, [pageData, clearPageData]); // the + menu on the home map
  const [showMoves, setShowMoves] = useState(false);
  const cropMap = rCM(data.region);
  const lines = useMemo(() => stockLines(data.pantry?.items), [data.pantry?.items]);
  const prices = data.pantry?.prices || {};
  const shown = cat === "All" ? lines : lines.filter((l) => l.category === cat);
  const value = stockValue(data),
    unpaid = unpaidTotal(data);
  const month = today.slice(0, 7);
  const soldMonth = (data.costs?.items || [])
    .filter((c) => c.type === "income" && c.source === "pantry" && String(c.date).startsWith(month))
    .reduce((s, c) => s + c.amount, 0);
  const moves = [...(data.pantry?.moves || [])].reverse().slice(0, 25);

  const icon = (name, category, size = 26) => {
    if (category === "Eggs" || /\beggs?\b/i.test(name)) return ;
    if (/\bmilk\b/i.test(name)) return ;
    if (/\bhoney\b/i.test(name)) return ;
    if (/\bwool\b/i.test(name)) return ;
    const crop = cropMap.get(name);
    if (crop) return <FarmIcon name={crop.name} emoji={crop.emoji} size={size} harvest />;
    const e = { Meat: "🥩", Dairy: "🧀", Preserved: "🫙", Grain: "🌾", "Fresh Produce": "🥬" }[category] || "📦";
    return <span className="q-stock-emoji">{e}</span>;
  };

  function openSell(line) {
    setSell({ line, qty: fmtQty(line.unit === "pcs" ? Math.min(line.qty, 6) : Math.min(line.qty, 1)), price: prices[line.key] != null ? String(prices[line.key]) : "", buyer: "", paid: "paid", date: today });
  }
  function doSell() {
    setData(sellStock(data, { key: sell.line.key, qty: +sell.qty, price: +sell.price, buyer: sell.buyer, paid: sell.paid === "paid", today, date: sell.date }));
    setSell(null);
  }
  function doUse() {
    setData(takeStock(data, { key: use.line.key, qty: +use.qty, kind: use.kind, today }));
    setUse(null);
  }
  function doAdd() {
    setData(addBoughtStock(data, { name: add.name.trim(), category: add.category, qty: +add.qty, unit: add.unit }, +add.cost || 0, today));
    setAdd(null);
  }
  function remove(line) {
    setData(takeStock(data, { key: line.key, qty: line.qty, kind: "remove", today }));
  }

  const sellTotal = sell ? Math.round((+sell.qty || 0) * (+sell.price || 0) * 100) / 100 : 0;
  // Stock is kept to 3 decimals (lb/g conversions) but shown to 2: an amount within rounding of the stock is accepted (sellStock/takeStock clamp to what is there).
  const within = (q, have) => +q > 0 && +q <= have + 0.005;
  const sellValid = sell && within(sell.qty, sell.line.qty) && sell.price !== "" && +sell.price >= 0;
  const useValid = use && within(use.qty, use.line.qty);
  const addValid = add && add.name.trim() && +add.qty > 0;
  const known = [...new Set([...lines.map((l) => l.name), ...cropMap.keys()])];

  return (
    <div className="page-enter q-stock-page">
      <header className="q-stock-head">
        <div>
          <h2>Pantry &amp; stock</h2>
          <p className="pg-sub">Everything your farm produces. Use it, sell it, and see what it’s worth.</p>
        </div>
        <button className="q-secondary" onClick={() => setAdd({ name: "", category: "Fresh Produce", qty: "", unit: "kg", cost: "" })}>
          <PackagePlus size={17} /> Add stock
        </button>
      </header>

      <section className="q-stock-stats">
        <div>
          <small>In stock</small>
          <strong>{lines.length}</strong>
          <span>product{lines.length === 1 ? "" : "s"}</span>
        </div>
        <div>
          <small>Stock value</small>
          <strong>{value > 0 ? money(value) : "—"}</strong>
          <span>{value > 0 ? "at your last prices" : "set when you sell"}</span>
        </div>
        <div>
          <small>Sold this month</small>
          <strong>{money(soldMonth)}</strong>
          <span className={unpaid > 0 ? "is-due" : ""}>{unpaid > 0 ? `${money(unpaid)} to collect` : "all paid"}</span>
        </div>
      </section>

      <div className="q-stock-filters" role="group" aria-label="Filter by category">
        {["All", ...CATS].map((c) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="q-stock-empty">
          
          <strong>{lines.length === 0 ? "Nothing in stock yet" : `No ${cat.toLowerCase()} in stock`}</strong>
          <p>Harvests, eggs and milk you log land here automatically. Add bought-in or other stock with “Add stock”.</p>
        </div>
      ) : (
        <ul className="q-stock-list">
          {shown.map((l) => (
            <li key={l.key} className="q-stock-row">
              <span className="q-stock-icon">{icon(l.name, l.category)}</span>
              <div className="q-stock-body">
                <div className="q-stock-title">
                  <strong>{l.name}</strong>
                  <span className="q-stock-cat">{l.category}</span>
                </div>
                <div className="q-stock-qty">
                  {fmtQty(l.qty)} <small>{l.unit}</small>
                  {prices[l.key] != null && <em>≈ {money(l.qty * prices[l.key])}</em>}
                </div>
                <small className="q-stock-meta">
                  {l.lots.length > 1 ? `${l.lots.length} batches · oldest ${daysAgo(l.lots[0].addedDate, today)}` : `Added ${daysAgo(l.lots[0].addedDate, today)}`}
                  {l.storageNote ? ` · ${l.storageNote.slice(0, 70)}` : ""}
                </small>
              </div>
              <div className="q-stock-actions">
                <button type="button" className="q-stock-sell" onClick={() => openSell(l)}>
                  <ShoppingBasket size={16} /> Sell
                </button>
                <button type="button" className="q-secondary" onClick={() => setUse({ line: l, qty: fmtQty(l.unit === "pcs" ? 1 : Math.min(l.qty, 0.5)), kind: "use" })}>
                  <Utensils size={15} /> Use
                </button>
                <button type="button" className="q-stock-trash" aria-label={`Remove all ${l.name}`} onClick={() => remove(l)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {moves.length > 0 && (
        <section className="q-stock-moves">
          <button type="button" className="q-stock-moves-toggle" aria-expanded={showMoves} onClick={() => setShowMoves(!showMoves)}>
            <span>Stock movements</span>
            <ChevronDown size={18} style={{ transform: showMoves ? "rotate(180deg)" : "none" }} />
          </button>
          {showMoves && (
            <ul>
              {moves.map((m) => (
                <li key={m.id}>
                  <span className={`q-move-kind is-${m.kind}`}>{MOVE_LABEL[m.kind] || m.kind}</span>
                  <span className="q-grow">
                    {m.name}
                    {m.buyer ? <small> · {m.buyer}</small> : null}
                  </span>
                  <span className={m.qty > 0 ? "is-in" : "is-out"}>
                    {m.qty > 0 ? "+" : "−"}
                    {fmtQty(Math.abs(m.qty))} {m.unit}
                  </span>
                  <span className="q-move-money">{m.amount != null ? money(m.amount) : ""}</span>
                  <small className="q-move-date">{m.date}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {sell && (
        <Overlay title={`Sell ${sell.line.name}`} onClose={() => setSell(null)}>
          <div className="q-stock-dialog">
            <div className="q-stock-dialog-hero">
              <span className="q-stock-icon is-big">{icon(sell.line.name, sell.line.category, 40)}</span>
              <span>
                In stock: <strong>{fmtQty(sell.line.qty)} {sell.line.unit}</strong>
              </span>
            </div>
            <label className="q-field">
              Quantity
              <div className="q-row q-wrap">
                <QtyStepper value={sell.qty} unit={sell.line.unit} max={sell.line.qty} onChange={(qty) => setSell({ ...sell, qty })} />
                <button type="button" className="q-text-button" onClick={() => setSell({ ...sell, qty: String(sell.line.qty) })}>
                  All
                </button>
              </div>
            </label>
            <label className="q-field">
              Price per {sell.line.unit} ({E})
              <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={sell.price} onChange={(e) => setSell({ ...sell, price: e.target.value })} />
            </label>
            <label className="q-field">
              <span>
                Buyer <small>(optional)</small>
              </span>
              <input list="q-buyers" value={sell.buyer} placeholder="Market, restaurant, neighbour…" onChange={(e) => setSell({ ...sell, buyer: e.target.value })} />
              <datalist id="q-buyers">
                {(data.pantry?.buyers || []).map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </label>
            <div className="q-grid2">
              <label className="q-field">
                Payment
                <Segmented label="Payment" value={sell.paid} onChange={(paid) => setSell({ ...sell, paid })} options={[["paid", "Paid"], ["later", "Pay later"]]} />
              </label>
              <label className="q-field">
                Date
                <input type="date" value={sell.date} max={today} onChange={(e) => setSell({ ...sell, date: e.target.value })} />
              </label>
            </div>
            {+sell.qty > sell.line.qty && <p className="q-warning">Only {fmtQty(sell.line.qty)} {sell.line.unit} in stock.</p>}
            <div className="q-stock-total">
              <span>Total</span>
              <strong>{money(sellTotal)}</strong>
            </div>
            <p className="q-stock-note">Recorded as income in Financials{sell.paid === "later" ? " and listed as money to collect" : ""}.</p>
            <div className="q-stock-buttons">
              <button type="button" className="q-secondary" onClick={() => setSell(null)}>
                Cancel
              </button>
              <button type="button" className="q-button" disabled={!sellValid} onClick={doSell}>
                Record sale · {money(sellTotal)}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {use && (
        <Overlay title={`Use ${use.line.name}`} onClose={() => setUse(null)}>
          <div className="q-stock-dialog">
            <div className="q-stock-dialog-hero">
              <span className="q-stock-icon is-big">{icon(use.line.name, use.line.category, 40)}</span>
              <span>
                In stock: <strong>{fmtQty(use.line.qty)} {use.line.unit}</strong>
              </span>
            </div>
            <label className="q-field">
              Quantity
              <div className="q-row q-wrap">
                <QtyStepper value={use.qty} unit={use.line.unit} max={use.line.qty} onChange={(qty) => setUse({ ...use, qty })} />
                <button type="button" className="q-text-button" onClick={() => setUse({ ...use, qty: String(use.line.qty) })}>
                  All
                </button>
              </div>
            </label>
            <label className="q-field">
              What happened?
              <Segmented label="What happened" value={use.kind} onChange={(kind) => setUse({ ...use, kind })} options={[["use", "Used / eaten"], ["gift", "Given away"], ["waste", "Spoiled"]]} />
            </label>
            <p className="q-stock-note">
              Leaves {fmtQty(Math.max(0, use.line.qty - (+use.qty || 0)))} {use.line.unit} in stock.
            </p>
            <div className="q-stock-buttons">
              <button type="button" className="q-secondary" onClick={() => setUse(null)}>
                Cancel
              </button>
              <button type="button" className="q-button" disabled={!useValid} onClick={doUse}>
                Take out {fmtQty(+use.qty || 0)} {use.line.unit}
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {add && (
        <Overlay title="Add stock" onClose={() => setAdd(null)}>
          <div className="q-stock-dialog">
            <label className="q-field">
              Product
              <input list="q-products" value={add.name} placeholder="e.g. Tomato, Chicken Eggs, Jam" onChange={(e) => setAdd({ ...add, name: e.target.value })} />
              <datalist id="q-products">
                {known.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>
            <label className="q-field">
              Category
              <select value={add.category} onChange={(e) => setAdd({ ...add, category: e.target.value })}>
                {CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="q-field">
              Quantity
              <div className="q-row q-wrap">
                <QtyStepper value={add.qty} unit={add.unit} onChange={(qty) => setAdd({ ...add, qty })} />
                <Segmented label="Unit" value={add.unit} onChange={(unit) => setAdd({ ...add, unit })} options={UNITS.map((u) => [u, u])} />
              </div>
            </label>
            <label className="q-field">
              <span>
                Bought for ({E}) <small>(optional — recorded as an expense)</small>
              </span>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={add.cost} placeholder="0.00" onChange={(e) => setAdd({ ...add, cost: e.target.value })} />
            </label>
            <div className="q-stock-buttons">
              <button type="button" className="q-secondary" onClick={() => setAdd(null)}>
                Cancel
              </button>
              <button type="button" className="q-button" disabled={!addValid} onClick={doAdd}>
                Add to stock
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
