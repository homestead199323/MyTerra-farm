import { useState } from "react";
import { Overlay, Inp, Sel, Btn } from "../../components/ui";
import { uid } from "../../lib/storage";
import { todayLocalKey, appendLog, addDaysToLocalKey, localDateFromKey } from "../../lib/utils";
import { applySeedlingStage } from "../../lib/seedling-stage";
import { rCR, rCM } from "../../lib/regional";
import { propagationOf } from "../../data/propagation";
import { suggestTrays, potTrayFor, trayOf } from "../../data/trays";
import {
  suggestDates,
  earliestPlantOut,
  seasonNote,
  frostDates,
  fmt,
  inDays,
  currentTray,
  STAGE_LABELS,
  stagesOf,
  scheduleOf,
  nextStage,
  planBatch,
  nurseryZones,
  activeBatches,
} from "./nursery-model";
import PlantingForm from "../quiet/PlantingForm";
import { SeedlingTray, TrayPicker, SeedTimeline, CropSeedInfo, StageTrack } from "./NurseryVisuals";

const STEP_WHY = {
  sown: (b) => `Sow ${b.cells} cells, label the tray, water from below.`,
  sprouted: (b) => `Usually ${b.germDays} days after sowing. Move into full light as soon as they're up.`,
  potted: () => "About 2 weeks after sprouting, when the first true leaves show.",
  hardening: () => "One week before planting out: outside a few hours a day, longer each day.",
  planted: () => "After a week of hardening off, into the bed at grid spacing. Water in well.",
};

function nextStepText(batch) {
  const next = nextStage(batch);
  if (!next) return "Planted out";
  return `${next === "sown" ? "Sow" : STAGE_LABELS[next]} ${inDays(scheduleOf(batch)[next])}`;
}

/** Card used in lists (Crops page, nursery area card). */
export function BatchCard({ batch, data, onOpen }) {
  const bed = data.zones.find((z) => z.id === batch.targetZoneId)?.name,
    nursery = data.zones.find((z) => z.id === batch.zoneId)?.name;
  return (
    <button type="button" className="q-batch-card" onClick={onOpen}>
      <SeedlingTray batch={batch} max={1} />
      <div className="q-grow">
        <strong>
          {batch.crop}
          {batch.variety ? ` (${batch.variety})` : ""}
        </strong>
        <small>
          {batch.cells} cells in {currentTray(batch).cells}-cell tray
          {batch.cells > currentTray(batch).cells ? "s" : ""} · {nursery || "Nursery"}
          {bed ? ` → ${bed}` : ""}
        </small>
        <StageTrack batch={batch} />
        <SeedTimeline batch={batch} compact />
        <small className="q-batch-next">Next: {nextStepText(batch)}</small>
      </div>
    </button>
  );
}

/** Detail of one batch: trays, dated steps, tick the next step, plant out. */
export function SeedlingOverlay({ batchId, data, setData, onClose }) {
  const [plantOut, setPlantOut] = useState(false);
  const [cellsDraft, setCellsDraft] = useState(null); // "Cells sown" while being typed (so it can be cleared)
  const batch = (data.nursery?.batches || []).find((b) => b.id === batchId);
  if (!batch) return null;
  const plot = batch.plotId && data.garden.plots.find((p) => p.id === batch.plotId);
  const bed = data.zones.find((z) => z.id === batch.targetZoneId)?.name;
  const schedule = scheduleOf(batch),
    stages = stagesOf(batch),
    next = nextStage(batch),
    today = todayLocalKey();
  const at = batch.stage ? stages.indexOf(batch.stage) : -1;
  function advance(stage) {
    if (stage === "planted" && !plot) {
      setPlantOut(true);
      return;
    }
    let next = applySeedlingStage(data, batch.id, stage, today);
    next = {
      ...next,
      log: appendLog(next.log, { text: `🌱 ${batch.crop} seedlings: ${STAGE_LABELS[stage].toLowerCase()}` }),
    };
    setData(next);
    if (stage === "planted") onClose();
  }
  function update(patch) {
    setData({
      ...data,
      nursery: {
        ...data.nursery,
        batches: data.nursery.batches.map((b) => (b.id === batch.id ? { ...b, ...patch } : b)),
      },
    });
  }
  // Changing the plant-out date: before sowing, the sowing date moves with it (never into the past);
  // after sowing, only the plant-out date changes. The reserved bed date follows.
  const sownOn = batch.stageDates?.sown;
  const minOut = sownOn
    ? scheduleOf({ ...batch, sowDate: sownOn, plantOutDate: sownOn }).planted
    : earliestPlantOut(batch, today);
  const weeksIn = Math.round(
    (localDateFromKey(schedule.planted) - localDateFromKey(schedule.sown)) / 7 / 864e5,
  );
  const notes = [
    schedule.delayedFrom &&
      `Plant-out moved from ${fmt(schedule.delayedFrom)} to ${fmt(schedule.planted)}: seedlings need time to sprout${batch.potOn ? ", be potted on" : ""} and harden off first.`,
    weeksIn < (batch.weeks || 4) * 0.75 &&
      `Only ${weeksIn} weeks in the nursery — ${batch.crop} usually needs about ${batch.weeks}, so seedlings will be small.`,
    seasonNote(
      rCM(data.region).get(batch.crop),
      schedule.planted,
      frostDates(data),
      data.zones.find((z) => z.id === batch.targetZoneId)?.type === "greenhouse",
    ),
  ].filter(Boolean);
  function movePlantOut(input) {
    const value = input < minOut ? minOut : input;
    const sown = batch.stageDates?.sown;
    const planned = addDaysToLocalKey(value, -(batch.weeks || 4) * 7);
    const sowDate = sown || (planned < today ? today : planned);
    setData({
      ...data,
      nursery: {
        ...data.nursery,
        batches: data.nursery.batches.map((b) =>
          b.id === batch.id ? { ...b, plantOutDate: value, sowDate } : b,
        ),
      },
      garden: {
        ...data.garden,
        plots: data.garden.plots.map((p) =>
          p.id === batch.plotId && p.status === "planned" ? { ...p, plannedDate: value } : p,
        ),
      },
    });
  }
  function remove() {
    if (
      !window.confirm(
        `Remove this ${batch.crop} seedling batch?${plot ? " The planned bed planting stays." : ""}`,
      )
    )
      return;
    setData({
      ...data,
      nursery: { ...data.nursery, batches: data.nursery.batches.filter((b) => b.id !== batch.id) },
    });
    onClose();
  }
  if (plantOut)
    return (
      <PlantingForm
        data={data}
        setData={setData}
        initial={{
          crop: batch.crop,
          variety: batch.variety,
          plantCount: String(batch.plants),
          plantDate: today,
          fromBatch: batch.id,
        }}
        onClose={() => {
          setPlantOut(false);
          onClose();
        }}
      />
    );
  return (
    <Overlay title={`${batch.crop} seedlings`} onClose={onClose}>
      <p className="q-zone-meta">
        {batch.cells} cells for {batch.plants} plants{bed ? ` in ${bed}` : ""} ·{" "}
        {Math.ceil(batch.cells / currentTray(batch).cells)} × {currentTray(batch).cells}-cell tray
        {batch.cells > currentTray(batch).cells ? "s" : ""}
      </p>
      {rCM(data.region).get(batch.crop) && <CropSeedInfo crop={rCM(data.region).get(batch.crop)} />}
      <SeedlingTray batch={batch} />
      <SeedTimeline batch={batch} />
      {notes.length > 0 && (
        <div className="q-warning q-notes">
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}
      <ol className="q-seed-steps">
        {stages.map((s, i) => {
          const done = i <= at,
            isNext = s === next;
          return (
            <li key={s} className={done ? "is-done" : isNext ? "is-next" : ""}>
              <div className="q-row q-between">
                <strong>
                  <span className="q-step-no">{done ? "✓" : i + 1}</span>
                  {STAGE_LABELS[s]}
                </strong>
                <small>
                  {done ? fmt(batch.stageDates?.[s]) : `${fmt(schedule[s])} · ${inDays(schedule[s])}`}
                </small>
              </div>
              {!done && <small className="q-step-why">{STEP_WHY[s](batch)}</small>}
              {isNext && (
                <button className="q-button" onClick={() => advance(s)}>
                  {s === "sown"
                    ? "I sowed them"
                    : s === "planted"
                      ? plot
                        ? `Plant out into ${bed}`
                        : "Plant out…"
                      : `Mark ${STAGE_LABELS[s].toLowerCase()}`}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {next && next !== "planted" && at >= 0 && (
        <button className="q-text-button" onClick={() => advance("planted")}>
          Ready early? Plant out now
        </button>
      )}
      <div className="q-grid2" style={{ marginTop: 12 }}>
        <Inp
          label="Plant out on"
          type="date"
          min={minOut}
          value={schedule.planted}
          onChange={(e) => e.target.value && movePlantOut(e.target.value)}
        />
        <Inp
          label="Cells sown"
          type="number"
          min="1"
          value={cellsDraft ?? batch.cells}
          onChange={(e) => { const t = e.target.value; setCellsDraft(t); if (+t >= 1) update({ cells: Math.max(batch.plants || 1, Math.round(+t)) }); }}
          onBlur={() => setCellsDraft(null)}
        />
      </div>
      <small className="q-step-why">
        Earliest plant-out {sownOn ? "for this sowing" : "if you sow today"}: {fmt(minOut)} — ~
        {batch.germDays} days to sprout{batch.potOn ? ", 2 weeks to pot on" : ""}, 1 week hardening off.
        Usual: {batch.weeks} weeks in the nursery.
      </small>
      <TrayPicker
        label="Sowing tray"
        value={batch.tray || 60}
        cells={batch.cells}
        suggested={suggestTrays({ name: batch.crop }, batch.cells).tray}
        reason={suggestTrays({ name: batch.crop }, batch.cells).sowReason}
        onChange={(n) =>
          update({ tray: n, potTray: potTrayFor(batch.potTray, n, { name: batch.crop }, batch.cells) })
        }
      />
      {batch.potOn && (
        <TrayPicker
          label="Pot on into"
          value={potTrayFor(batch.potTray, batch.tray || 60, { name: batch.crop }, batch.cells)}
          minCell={trayOf(batch.tray || 60).cellCM}
          cells={batch.cells}
          suggested={suggestTrays({ name: batch.crop }, batch.cells, batch.tray).potTray}
          reason={suggestTrays({ name: batch.crop }, batch.cells, batch.tray).potReason}
          onChange={(n) => update({ potTray: n })}
        />
      )}
      <small>
        Timings are guides for {batch.crop}: about {batch.germDays} days to sprout and {batch.weeks} weeks
        before planting out.
        {batch.potOn ? " Pot on once the first true leaves appear." : ""}
      </small>
      <div className="q-row" style={{ marginTop: 12 }}>
        <Btn v="secondary" onClick={remove}>
          Remove batch
        </Btn>
      </div>
    </Overlay>
  );
}

/** Start seeds without a bed yet: pick crop, nursery, how many plants you want and when. */
export function StartSeedsForm({ data, setData, onClose, zoneId = "" }) {
  const zones = nurseryZones(data);
  const crops = rCR(data.region).filter((c) => propagationOf(c).method !== "direct");
  const [form, setForm] = useState({
    crop: "",
    zone: zoneId || zones[0]?.id || "",
    plants: "",
    plantOutDate: "",
    tray: null,
    potTray: null,
  });
  const crop = rCM(data.region).get(form.crop);
  const frost = frostDates(data);
  const plantOutDate =
    form.plantOutDate || (crop ? suggestDates(crop, todayLocalKey(), frost).plantOutDate : "");
  const plan =
    crop && form.zone && Number.isInteger(+form.plants) && +form.plants > 0 && plantOutDate
      ? planBatch({
          crop,
          zoneId: form.zone,
          plants: +form.plants,
          plantOutDate,
          id: "preview",
          today: todayLocalKey(),
          tray: form.tray,
          potTray: form.potTray,
        })
      : null;
  const cellsNeeded = +form.plants > 0 ? Math.ceil(+form.plants * 1.2) : undefined;
  const suggested = crop ? suggestTrays(crop, cellsNeeded, form.tray) : {};
  const potValue = crop ? potTrayFor(form.potTray, form.tray || suggested.tray, crop, cellsNeeded) : null;
  function save() {
    if (!plan) return;
    const batch = { ...plan.batch, id: uid() };
    setData({
      ...data,
      nursery: { ...(data.nursery || {}), batches: [...(data.nursery?.batches || []), batch] },
      log: appendLog(data.log, { text: `Planned ${batch.cells} ${batch.crop} seedlings` }),
    });
    onClose();
  }
  return (
    <Overlay title="Start seeds" onClose={onClose}>
      {!zones.length && (
        <p className="q-warning">
          Add a Seedling Nursery area on your farm map first (Edit layout → Seedling Nursery).
        </p>
      )}
      <Sel
        label="Crop"
        value={form.crop}
        onChange={(e) => setForm({ ...form, crop: e.target.value })}
        options={[
          { value: "", label: "Choose a crop…" },
          ...crops.map((c) => ({ value: c.name, label: c.name })),
        ]}
      />
      {crop && <CropSeedInfo crop={crop} />}
      <Sel
        label="Nursery"
        value={form.zone}
        onChange={(e) => setForm({ ...form, zone: e.target.value })}
        options={zones.map((z) => ({ value: z.id, label: z.name }))}
      />
      <div className="q-grid2">
        <Inp
          label="Plants you want"
          type="number"
          min="1"
          step="1"
          value={form.plants}
          onChange={(e) => setForm({ ...form, plants: e.target.value })}
        />
        <Inp
          label="Plant out around"
          type="date"
          min={crop ? earliestPlantOut(propagationOf(crop), todayLocalKey()) : undefined}
          value={plantOutDate}
          onChange={(e) => setForm({ ...form, plantOutDate: e.target.value })}
        />
      </div>
      {crop && (
        <TrayPicker
          label="Sowing tray"
          value={form.tray || suggested.tray}
          cells={plan?.batch.cells}
          suggested={suggested.tray}
          reason={suggested.sowReason}
          onChange={(n) => setForm({ ...form, tray: n })}
        />
      )}
      {crop && propagationOf(crop).potOn && (
        <TrayPicker
          label="Pot on into"
          value={potValue}
          minCell={trayOf(form.tray || suggested.tray).cellCM}
          cells={plan?.batch.cells}
          suggested={suggested.potTray}
          reason={suggested.potReason}
          onChange={(n) => setForm({ ...form, potTray: n })}
        />
      )}
      {plan && (
        <>
          <p className="q-planting-summary">
            <strong>
              Sow {plan.batch.cells} cells on {fmt(plan.batch.sowDate)}
            </strong>
            <span>Includes {plan.batch.cells - plan.batch.plants} spare for losses.</span>
          </p>
          <SeedTimeline batch={plan.batch} />
          <SeedlingTray batch={plan.batch} />
        </>
      )}
      {plan?.warning && <p className="q-warning">{plan.warning}</p>}
      {crop && (
        <small className="q-frost-note">
          {frost.custom ? "Your" : frost.regionName} frost dates: last ~{fmt(`2000-${frost.last}`)}, first ~
          {fmt(`2000-${frost.first}`)}. Change them in Edit layout → Region.
        </small>
      )}
      {plan && seasonNote(crop, plantOutDate, frost) && (
        <p className="q-warning">{seasonNote(crop, plantOutDate, frost)}</p>
      )}
      <div className="q-row">
        <Btn v="secondary" onClick={onClose}>
          Cancel
        </Btn>
        <Btn onClick={save} dis={!plan}>
          Add to nursery
        </Btn>
      </div>
    </Overlay>
  );
}

/** Nursery list with its own open/start state, for the Crops page and a nursery's area card. */
export function NurseryList({ data, setData, zoneId }) {
  const [open, setOpen] = useState(null),
    [start, setStart] = useState(false);
  const batches = activeBatches(data)
    .filter((b) => !zoneId || b.zoneId === zoneId)
    .sort((a, b) => (scheduleOf(a)[nextStage(a)] || "").localeCompare(scheduleOf(b)[nextStage(b)] || ""));
  return (
    <div className="q-nursery-list">
      {batches.map((b) => (
        <BatchCard key={b.id} batch={b} data={data} onOpen={() => setOpen(b.id)} />
      ))}
      {!batches.length && (
        <p className="q-empty-note">
          No seedlings growing. Start a tray, or choose “Start from seed” when planting a bed.
        </p>
      )}
      <button type="button" className="q-secondary" onClick={() => setStart(true)}>
        + Start seeds
      </button>
      {open && <SeedlingOverlay batchId={open} data={data} setData={setData} onClose={() => setOpen(null)} />}
      {start && (
        <StartSeedsForm data={data} setData={setData} zoneId={zoneId} onClose={() => setStart(false)} />
      )}
    </div>
  );
}
