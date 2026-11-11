import React, { useMemo } from "react";
import { C, SX } from "../../lib/theme";
import { Btn, Card, Stat } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";
import { produceTotals, moneyTotals, badgeList, nextHarvest, plantingCounts, produceEmoji, PORTION_G } from "../../lib/progress";
import { cropByName } from "../../lib/plan";
import { stockLines } from "../../lib/inventory";
import { formatMoney } from "../../lib/money";
import { todayLocalKey, localDateFromKey } from "../../lib/utils";
import "../plan/plan.css";

/* ═══════════════════════════════════════════
   PROGRESS — Launch Stage 5 (2026-09-28)
   Real outcomes first (food grown, portions, harvests), then money,
   pantry and badges. Every block has an empty state that says how its
   numbers will start appearing. Pantry and Money keep their own pages.
   No shame: streaks show the best run, never a "you missed a day".
   ═══════════════════════════════════════════ */

function niceDate(key) {
  const d = localDateFromKey(key);
  return d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
}

function fmtNum(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

export default function ProgressScreen({ data, setPage }) {
  const today = todayLocalKey();
  const food = useMemo(function () { return produceTotals(data, today, 6); }, [data, today]);
  const money = useMemo(function () { return moneyTotals(data); }, [data]);
  const badges = useMemo(function () { return badgeList(data); }, [data]);
  const next = useMemo(function () { return nextHarvest(data, today); }, [data, today]);
  const counts = useMemo(function () { return plantingCounts(data, today); }, [data, today]);
  const lines = useMemo(function () {
    return stockLines((data.pantry && data.pantry.items) || []).filter(function (l) { return l.qty > 0; }).sort(function (a, b) { return b.qty - a.qty; });
  }, [data.pantry]);
  const g = data.gamify || {};
  const earned = badges.filter(function (b) { return b.earned; }).length;
  const maxMonth = Math.max(0.001, ...food.byMonth.map(function (m) { return m.kg; }));
  const hasFood = food.kg > 0 || food.eggs > 0 || food.milkL > 0;

  let nextTitle = "", nextSub = "";
  if (next) {
    nextTitle = next.inDays <= 0 ? `${next.name} is ready to pick` : `Next harvest: ${next.name}`;
    nextSub = next.inDays <= 0 ? "Pick it while it's at its best. It's on your Today list." : `In about ${next.inDays} day${next.inDays === 1 ? "" : "s"} · around ${niceDate(next.harvestKey)}`;
  } else if (counts.waiting > 0) {
    nextTitle = `${counts.waiting} planting${counts.waiting === 1 ? "" : "s"} waiting to go in`;
    nextSub = "Once they're sown, their harvest dates show up here.";
  } else {
    nextTitle = "Your first harvest starts with one planting";
    nextSub = "Pick something easy in Plan. Its harvest date shows up here.";
  }

  return (
    <div className="page-enter mt-progress" style={SX.mw800}>
      <div className="pg-head" style={SX.pageHead}>
        <div>
          <h2 className="pg-h2" style={SX.headerH2}>Progress</h2>
          <p className="pg-sub" style={SX.pageSubHead}>What your space has given you so far</p>
        </div>
      </div>

      <Card style={{ marginBottom: 16, background: C.grdLight, display: "flex", alignItems: "center", gap: 14 }}>
        {next ? <FarmIcon name={next.crop} emoji={produceEmoji(next.crop, cropByName(next.crop))} size={48} harvest /> : null}
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 15.5, color: C.text }}>{nextTitle}</strong>
          <small style={{ display: "block", fontSize: 12.5, color: C.t2, marginTop: 3, lineHeight: 1.45 }}>{nextSub}</small>
        </span>
        {!next && counts.waiting === 0 && <Btn sm onClick={function () { setPage("plan"); }}>Open Plan</Btn>}
        {next && next.inDays <= 0 && <Btn sm onClick={function () { setPage("home"); }}>Today</Btn>}
      </Card>

      <section className="mt-plan-sec" aria-labelledby="prog-food">
        <h3 id="prog-food">Food from your space</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
          <Stat label="Harvested" value={`${fmtNum(food.kg)} kg`} sub={food.kg > 0 ? `≈ ${food.portions} portions of veg` : "Nothing picked yet"} />
          <Stat label="Harvests" value={food.harvests} sub={food.harvests ? "logged in the pantry" : "Tick “Harvest” to log one"} />
          {food.eggs > 0 && <Stat label="Eggs" value={food.eggs} sub="collected" color={C.orange} />}
          {food.milkL > 0 && <Stat label="Milk" value={`${fmtNum(food.milkL)} L`} sub="collected" color={C.blue} />}
          <Stat label="Growing now" value={counts.growing} sub={counts.ready ? `${counts.ready} ready to pick` : counts.waiting ? `+${counts.waiting} waiting to sow` : "plantings"} color={counts.ready ? C.orange : C.green} />
          <Stat label="Best run" value={`${g.bestStreak || 0} day${g.bestStreak === 1 ? "" : "s"}`} sub={g.streak ? `${g.streak} day${g.streak === 1 ? "" : "s"} right now` : "Any day you check in counts"} />
        </div>
        {hasFood && food.kg > 0 && (
          <Card style={{ marginTop: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, marginBottom: 8 }}>Harvest per month (kg)</div>
            <div className="mt-bars" role="img" aria-label={food.byMonth.map(function (m) { return `${m.label} ${m.kg} kg`; }).join(", ")}>
              {food.byMonth.map(function (m) {
                return (
                  <span key={m.key} className="mt-bar-col">
                    <b style={{ height: `${Math.round((m.kg / maxMonth) * 100)}%` }} />
                    <small>{m.label}</small>
                  </span>
                );
              })}
            </div>
            <p className="mt-plan-note" style={{ margin: "8px 0 0" }}>A portion is {PORTION_G} g of fruit or veg (the NHS “5 A Day” measure).</p>
          </Card>
        )}
        {!hasFood && (
          <p className="mt-plan-note" style={{ marginTop: 10 }}>When you tick “Harvest” on a ready crop (or collect eggs), the amount is added to your Pantry and counted here.</p>
        )}
      </section>

      <Card style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
        
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 14.5, color: C.text }}>Insights</strong>
          <small style={{ display: "block", fontSize: 12.5, color: C.t2, marginTop: 2, lineHeight: 1.45 }}>Each crop and bed against the estimate, lay rate, cost per egg or kilo, what grew where, spreadsheet export.</small>
        </span>
        <Btn sm v="secondary" onClick={function () { setPage("insights"); }}>Open</Btn>
      </Card>

      <section className="mt-plan-sec" aria-labelledby="prog-pantry">
        <h3 id="prog-pantry">Pantry</h3>
        <Card p={false} style={{ overflow: "hidden" }}>
          {lines.length === 0
            ? <div className="mt-plan-row"><span className="mt-plan-grow"><strong>Empty for now</strong><small>Harvests and collections land here, ready to use, preserve or sell.</small></span><Btn sm v="secondary" onClick={function () { setPage("pantry"); }}>Open</Btn></div>
            : <>
                {lines.slice(0, 4).map(function (l) {
                  return (
                    <div key={l.key} className="mt-plan-row">
                      <FarmIcon name={l.name} emoji={produceEmoji(l.name, cropByName(l.name))} size={28} harvest />
                      <span className="mt-plan-grow"><strong>{l.name}</strong><small>{fmtNum(l.qty)} {l.unit}</small></span>
                    </div>
                  );
                })}
                <div className="mt-plan-row"><span className="mt-plan-grow"><small>{lines.length} item{lines.length === 1 ? "" : "s"} in stock</small></span><Btn sm v="secondary" onClick={function () { setPage("pantry"); }}>Open Pantry</Btn></div>
              </>}
        </Card>
      </section>

      <section className="mt-plan-sec" aria-labelledby="prog-money">
        <h3 id="prog-money">Money</h3>
        {money.entries === 0
          ? <Card p={false}><div className="mt-plan-row"><span className="mt-plan-grow"><strong>Nothing tracked yet</strong><small>Add seed, compost and tool costs (and any sales) to see what your food really costs.</small></span><Btn sm v="secondary" onClick={function () { setPage("fin"); }}>Open Money</Btn></div></Card>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
              <Stat label="Spent" value={formatMoney(money.spent, data, 0)} sub="seeds, tools, feed…" color={C.t2} />
              <Stat label="Earned" value={formatMoney(money.earned, data, 0)} sub="sales" />
              <Stat label="Balance" value={`${money.net < 0 ? "−" : ""}${formatMoney(Math.abs(money.net), data, 0)}`} sub={money.net < 0 ? "spent more than earned so far" : "ahead"} color={money.net < 0 ? C.orange : C.green} />
            </div>}
      </section>

      <section className="mt-plan-sec" aria-labelledby="prog-badges">
        <h3 id="prog-badges">Badges <small style={{ fontSize: 12.5, fontWeight: 500, color: C.t2 }}>{earned} of {badges.length}</small></h3>
        <div className="mt-badges">
          {badges.map(function (b) {
            return (
              <div key={b.id} className={b.earned ? "mt-badge on" : "mt-badge"}>
                <span className="mt-badge-ico" aria-hidden="true">{b.emoji}</span>
                <strong>{b.name}</strong>
                <small>{b.earned ? `Earned ${niceDate(b.unlockedAt)}` : b.desc}</small>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
