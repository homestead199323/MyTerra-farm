import { useState } from "react";
import { Overlay, Inp, Sel, Btn } from "../../components/ui";
import { rCR, rCM, getRegionalVarieties } from "../../lib/regional";
import { uid } from "../../lib/storage";
import { appendLog, todayLocalKey, addDaysToLocalKey } from "../../lib/utils";
import { expectedYield } from "../../lib/farm-calc";
import { zoneGeometry } from "./farm-model";
import { cropFitsZone, planPlanting, plantingInput } from "./planting-plan";
import PlantingControls from "./PlantingControls";
import CompanionPanel from "./CompanionPanel";
import { rotationCheck } from "../../lib/insights";
import FarmIcon from "../../components/FarmIcon";
import { propagationOf } from "../../data/propagation";
import {
  planBatch,
  nurseryZones,
  suggestDates,
  seasonNote,
  frostDates,
  earliestPlantOut,
} from "../nursery/nursery-model";
import { applySeedlingStage } from "../../lib/seedling-stage";
import { usesSeedling } from "./planting-mode";
import { suggestTrays, potTrayFor, trayOf } from "../../data/trays";
import { currencySymbol } from "../../lib/money";
import { plannedFields } from "../../lib/planned";
import { TrayPicker, SeedTimeline, SeedlingTray } from "../nursery/NurseryVisuals";
const PLANT_TYPES = ["veg", "raised", "greenhouse", "container", "herbs", "orchard"];
const empty = {
  crop: "",
  zone: "",
  variety: "",
  name: "",
  plantDate: "",
  cost: "",
  mode: "plants",
  plantCount: "",
  rowCount: "",
};
export default function PlantingForm({ data, setData, initial = {}, onClose }) {
  // One growing area on the map: it is the answer, so it is already chosen.
  const [form, setForm] = useState(() => {
      const beds = (data.zones || []).filter((z) => PLANT_TYPES.includes(z.type));
      return { ...empty, ...(beds.length === 1 ? { zone: beds[0].id } : {}), ...initial };
    }),
    // The seedling batch this form plants out — consumed by the FIRST save only, so a
    // companion follow-up planting doesn't re-link the batch to the wrong bed.
    [fromBatch, setFromBatch] = useState(initial.fromBatch || null),
    [query, setQuery] = useState(""),
    [browse, setBrowse] = useState(!initial.crop),
    [companion, setCompanion] = useState(""),
    [error, setError] = useState("");
  const crops = rCR(data.region),
    crop = rCM(data.region).get(form.crop),
    rawZone = data.zones.find((z) => z.id === form.zone),
    zone = rawZone ? zoneGeometry(rawZone, data.farmW, data.farmH) : null;
  const availableZones = data.zones.filter((z) =>
    crop
      ? cropFitsZone(crop, z)
      : PLANT_TYPES.includes(z.type),
  );
  const choices = crops.filter(
    (c) => (!zone || cropFitsZone(c, zone)) && c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const varieties = crop ? getRegionalVarieties(crop.name, data.region) : [],
    variety = varieties.find((v) => v.name === form.variety);
  const input = crop && zone ? plantingInput(form, crop, zone) : form;
  const plan = crop && zone ? planPlanting(zone, data.garden.plots, input, crop) : null;
  const baseYield =
    crop && plan?.count ? expectedYield(crop.name, plan.count, "plants", variety?.yld, data.region) : null;
  const yieldKg = baseYield == null ? null : Math.round(baseYield * (plan.yieldFactor ?? 1) * 10) / 10;
  function update(next) {
    setForm(next);
    setError("");
  }
  // Raise transplant crops in the nursery: the bed planting waits until the seedlings are planted out.
  const prop = crop ? propagationOf(crop) : null,
    nurseries = nurseryZones(data),
    canNursery = !!crop && prop.method !== "direct" && !fromBatch && zone?.type !== "orchard";
  const fromSeed = usesSeedling({ canNursery, nurseries, form });
  const frost = frostDates(data),
    covered = zone?.type === "greenhouse";
  const plantOutDate =
    form.plantOutDate || (crop ? suggestDates(crop, todayLocalKey(), frost, covered).plantOutDate : "");
  const nurseryId = nurseries.some((z) => z.id === form.nursery) ? form.nursery : nurseries[0]?.id;
  const seedPlan =
    fromSeed && plan?.count
      ? planBatch({
          crop,
          variety: form.variety,
          zoneId: nurseryId,
          plants: plan.count,
          plantOutDate,
          id: "preview",
          today: todayLocalKey(),
          tray: form.tray,
          potTray: form.potTray,
        })
      : null;
  const forcedPlan = plan?.problem?.canForce ? planPlanting(zone, data.garden.plots, { ...input, force: true }, crop) : null;
  function save(force = false) {
    if (!crop || !zone) {
      setError("Choose a crop and its growing area.");
      return;
    }
    const chosen = force && forcedPlan && !forcedPlan.error ? forcedPlan : plan;
    if (chosen.error) {
      setError(chosen.error);
      return;
    }
    if (!fromSeed && form.plantDate && form.plantDate > todayLocalKey()) {
      setError("The plant date can't be in the future — leave it blank to plan this planting.");
      return;
    }
    const name = form.name || (form.variety ? `${crop.name} (${form.variety})` : crop.name),
      plot = {
        id: uid(),
        crop: crop.name,
        variety: form.variety,
        varietyNote: variety?.note || "",
        name,
        zone: zone.id,
        layout: chosen.layout,
        plantingPattern: input.pattern,
        plantCount: chosen.count,
        qty: chosen.count,
        measureType: "plants",
        expectedYieldKg: force ? null : yieldKg,
        plantDate: fromSeed ? "" : form.plantDate,
        harvestDate:
          !fromSeed && form.plantDate ? addDaysToLocalKey(form.plantDate, variety?.days || crop.days) : "",
        status: !fromSeed && form.plantDate ? "planted" : "planned",
        growDays: variety?.days || crop.days,
        steps: crop.steps.map((s) => ({ ...s, done: false })),
      };
    if (fromSeed) plot.plannedDate = plantOutDate;
    // A plan with no date waits for its window: a job on Today now, or when its month comes (lib/sowing.js).
    else if (!form.plantDate) Object.assign(plot, plannedFields(crop.name, data.region, todayLocalKey()));
    let next = {
      ...data,
      garden: { ...data.garden, plots: [...data.garden.plots, plot] },
      log: appendLog(data.log, {
        text: fromSeed
          ? `Planned ${name} (${chosen.count} plants) from seed in the nursery`
          : `🌱 ${form.plantDate ? "Planted" : "Planned"} ${name} (${chosen.count} plants)${force ? " — placed over other plantings" : ""}`,
      }),
    };
    if (fromSeed) {
      const batch = planBatch({
        crop,
        variety: form.variety,
        zoneId: nurseryId,
        plants: chosen.count,
        plantOutDate,
        plotId: plot.id,
        targetZoneId: zone.id,
        id: uid(),
        today: todayLocalKey(),
        tray: form.tray,
        potTray: form.potTray,
      }).batch;
      next.nursery = { ...(data.nursery || {}), batches: [...(data.nursery?.batches || []), batch] };
    }
    if (fromBatch) {
      next.nursery = {
        ...(next.nursery || {}),
        batches: (next.nursery?.batches || []).map((b) =>
          b.id === fromBatch ? { ...b, plotId: plot.id, targetZoneId: zone.id } : b,
        ),
      };
      next = applySeedlingStage(next, fromBatch, "planted", todayLocalKey());
      setFromBatch(null);
    }
    if (+form.cost > 0)
      next.costs = {
        ...data.costs,
        items: [
          ...(data.costs?.items || []),
          {
            id: uid(),
            type: "expense",
            amount: +form.cost,
            label: `Seeds: ${name}`,
            date: todayLocalKey(),
            cat: "Seeds",
          },
        ],
      };
    setData(next);
    if (companion) {
      setForm({ ...empty, crop: companion, zone: form.zone, plantDate: form.plantDate });
      setCompanion("");
      setQuery("");
      setBrowse(false);
    } else onClose();
  }
  return (
    <Overlay title="Plant a crop" onClose={onClose}>
      <div className="q-crop-picker">
        <label htmlFor="crop-choice">Crop</label>
        <input
          id="crop-choice"
          value={browse ? query : form.crop}
          placeholder="Find a crop…"
          onClick={() => {
            setBrowse(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setBrowse(true);
          }}
        />
        {browse && (
          <div className="q-crop-options">
            {choices.map((c) => (
              <button
                type="button"
                key={c.name}
                onClick={() => {
                  update({
                    ...form,
                    crop: c.name,
                    variety: "",
                    spacingCM: undefined,
                    rowSpacingCM: undefined,
                    pattern: undefined,
                    startM: undefined,
                    lengthM: undefined,
                  });
                  setCompanion("");
                  setBrowse(false);
                }}
              >
                <FarmIcon name={c.name} emoji={c.emoji} size={30} harvest />
                <span>{c.name}</span>
              </button>
            ))}
            {!choices.length && <p>No matching crops for this area.</p>}
          </div>
        )}
      </div>
      <Sel
        label="Growing area"
        value={form.zone}
        onChange={(e) => {
          update({
            ...form,
            zone: e.target.value,
            startM: undefined,
            lengthM: undefined,
            pattern: undefined,
            axis: undefined,
            spacingCM: undefined,
            rowSpacingCM: undefined,
          });
          setCompanion("");
        }}
        options={[
          { value: "", label: "Choose an area…" },
          ...availableZones.map((z) => ({ value: z.id, label: z.name })),
        ]}
      />
      {crop && (
        <>
          <div className="q-row" style={{ margin: "12px 0" }}>
            <FarmIcon name={crop.name} emoji={crop.emoji} size={48} harvest />
            <div>
              <strong>{crop.name}</strong>
              <p style={{ margin: 0, fontSize: 12 }}>
                Harvest estimate: {variety?.days || crop.days} days · {crop.sun} sun
              </p>
            </div>
          </div>
          {varieties.length > 0 && (
            <Sel
              label="Variety"
              value={form.variety}
              onChange={(e) => update({ ...form, variety: e.target.value })}
              options={[
                { value: "", label: "General variety" },
                ...varieties.map((v) => ({ value: v.name, label: v.name })),
              ]}
            />
          )}
        </>
      )}
      {crop && zone && (
        <>
          <PlantingControls
            value={input}
            onChange={update}
            showAxis={false}
            plan={plan}
            crop={crop}
            zone={zone}
            yieldKg={yieldKg}
            plots={data.garden.plots}
            crops={rCM(data.region)}
          />
          <CompanionPanel
            crop={form.crop}
            zone={zone}
            plots={data.garden.plots}
            available={crops.filter((c) => cropFitsZone(c, zone))}
            onChoose={setCompanion}
            rotation={zone ? rotationCheck(data, zone.id, form.crop, form.plantDate || todayLocalKey()) : null}
          />
          {companion && (
            <p className="q-success">
              Next planting: {companion}.{" "}
              <button className="q-text-button" onClick={() => setCompanion("")}>
                Remove
              </button>
            </p>
          )}
        </>
      )}
      <Inp
        label="Name (optional)"
        value={form.name}
        onChange={(e) => update({ ...form, name: e.target.value })}
      />
      {canNursery && fromSeed && (
        <section className="q-inset q-seed-choice">
          <div className="q-row q-between">
            <strong>Start as seedling in the nursery</strong>
            <button type="button" className="q-text-button" onClick={() => update({ ...form, fromSeed: false })}>
              Plant directly instead
            </button>
          </div>
          <>
              <div className="q-grid2">
                {nurseries.length > 1 && (
                  <Sel
                    label="Nursery"
                    value={nurseryId}
                    onChange={(e) => update({ ...form, nursery: e.target.value })}
                    options={nurseries.map((z) => ({ value: z.id, label: z.name }))}
                  />
                )}
                <Inp
                  label="Plant out on"
                  type="date"
                  min={earliestPlantOut(prop, todayLocalKey())}
                  value={plantOutDate}
                  onChange={(e) => update({ ...form, plantOutDate: e.target.value })}
                />
              </div>
              {seedPlan && (
                <small>
                  Sow {seedPlan.batch.cells} cells on {seedPlan.batch.sowDate} · {prop.weeks} weeks in the nursery
                </small>
              )}
              <TrayPicker
                label="Sowing tray"
                value={form.tray || suggestTrays(crop, seedPlan?.batch.cells).tray}
                cells={seedPlan?.batch.cells}
                suggested={suggestTrays(crop, seedPlan?.batch.cells).tray}
                reason={suggestTrays(crop, seedPlan?.batch.cells).sowReason}
                onChange={(n) => update({ ...form, tray: n })}
              />
              {prop.potOn && (
                <TrayPicker
                  label="Pot on into"
                  value={potTrayFor(
                    form.potTray,
                    form.tray || suggestTrays(crop, seedPlan?.batch.cells).tray,
                    crop,
                    seedPlan?.batch.cells,
                  )}
                  minCell={trayOf(form.tray || suggestTrays(crop, seedPlan?.batch.cells).tray).cellCM}
                  cells={seedPlan?.batch.cells}
                  suggested={suggestTrays(crop, seedPlan?.batch.cells, form.tray).potTray}
                  reason={suggestTrays(crop, seedPlan?.batch.cells, form.tray).potReason}
                  onChange={(n) => update({ ...form, potTray: n })}
                />
              )}
              {seedPlan && <SeedTimeline batch={seedPlan.batch} />}
              {seedPlan && <SeedlingTray batch={seedPlan.batch} max={2} />}
              {seedPlan?.warning && <p className="q-warning">{seedPlan.warning}</p>}
              {seedPlan && seasonNote(crop, plantOutDate, frost, covered) && (
                <p className="q-warning">{seasonNote(crop, plantOutDate, frost, covered)}</p>
              )}
          </>
        </section>
      )}
      {!fromSeed && (
        <Inp
          label="Plant date"
          type="date"
          max={todayLocalKey()}
          value={form.plantDate}
          onChange={(e) => update({ ...form, plantDate: e.target.value })}
        />
      )}
      <Inp
        label={`Seed cost (${currencySymbol(data).trim()})`}
        type="number"
        min="0"
        value={form.cost}
        onChange={(e) => update({ ...form, cost: e.target.value })}
      />
      {canNursery && !fromSeed && (
        <section className="q-inset q-seed-choice">
          <button
            type="button"
            className="q-secondary"
            disabled={!nurseries.length}
            onClick={() => update({ ...form, fromSeed: true })}
          >
            Start as seedling
          </button>
          {!nurseries.length && <small>Needs a Seedling Nursery area on the map.</small>}
        </section>
      )}
      {error && (
        <p role="alert" className="q-warning">
          {error}
        </p>
      )}
      <div className="q-row">
        <Btn v="secondary" onClick={onClose}>
          Cancel
        </Btn>
        {forcedPlan && !forcedPlan.error && (
          <Btn v="secondary" onClick={() => save(true)} title="Save it at the start of the bed even though it overlaps other plantings">
            Plant anyway
          </Btn>
        )}
        <Btn onClick={() => save(false)} dis={!crop || !zone}>
          Save planting
        </Btn>
      </div>
    </Overlay>
  );
}
