import { useState } from "react";
import PlantingControls from "./PlantingControls";
import { planPlanting, plantingInput } from "./planting-plan";
import { axisOf } from "./farm-model";
import { rCM, getRegionalVarieties } from "../../lib/regional";
import { expectedYield } from "../../lib/farm-calc";

/**
 * Edit plants and spacing of a planting already in a bed (opened from the planting's detail).
 * `zone` is the bed geometry and `plot` the planting with its laid-out layout (see editablePlanting).
 */
export default function PlantingLayoutEditor({ data, setData, zone, plot, onDone }) {
  const crops = rCM(data.region),
    crop = crops.get(plot.crop);
  const [draft, setDraft] = useState(() => ({
    ...plot.layout,
    axis: axisOf(zone, plot.layout),
    mode: "plants",
    startM: undefined,
    lengthM: undefined,
    plantCount: plot.plantCount || 1,
  }));
  const input = plantingInput(draft, crop, zone),
    plan = planPlanting(zone, data.garden.plots, input, crop, plot.id);
  const variety = getRegionalVarieties(plot.crop, data.region).find((v) => v.name === plot.variety);
  const yieldKg =
    Math.round((plan.yieldFactor ?? 1) * expectedYield(plot.crop, plan.count, "plants", variety?.yld, data.region) * 1000) / 1000;
  function save() {
    if (plan.error) return;
    setData({
      ...data,
      garden: {
        ...data.garden,
        plots: data.garden.plots.map((p) =>
          p.id === plot.id
            ? {
                ...p,
                layout: plan.layout,
                plantCount: plan.count,
                qty: plan.count,
                measureType: "plants",
                expectedYieldKg: yieldKg,
                plantingPattern: plan.layout.pattern,
              }
            : p,
        ),
      },
    });
    onDone();
  }
  return (
    <div className="q-inset q-layout-editor">
      <h3>Edit spacing & layout</h3>
      <PlantingControls
        value={input}
        onChange={setDraft}
        plan={plan}
        crop={crop}
        zone={zone}
        yieldKg={yieldKg}
        plots={data.garden.plots}
        crops={crops}
        editId={plot.id}
      />
      <div className="q-row">
        <button className="q-button" disabled={!!plan.error} onClick={save}>
          Save layout
        </button>
        <button className="q-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
