import { zoneGeometry, layoutPlots, growthOf } from "./farm-model";
import { todayLocalKey } from "../../lib/utils";
import { rCM } from "../../lib/regional";
import PlantArt from "./PlantArt";
import BedPlan from "./BedPlan";

/**
 * A bed's plantings: the top-view plan and one short row per planting.
 * Everything else about a planting (stages, growth stage, spacing & layout, care) is one tap away (onPlot).
 */
export default function BedDetail({ zone: rawZone, data, onPlot, highlightId }) {
  const zone = zoneGeometry(rawZone, data.farmW, data.farmH);
  const plots = layoutPlots(zone, data.garden?.plots || []),
    crops = rCM(data.region),
    today = todayLocalKey();
  return (
    <section className="q-bed-detail">
      <h3 className="q-plant-list-title">
        {plots.length ? `${plots.length} ${plots.length === 1 ? "planting" : "plantings"}` : "Nothing planted here yet"}
      </h3>
      {/* an empty bed gets no plan: a blank brown rectangle only pushed everything else off the screen */}
      {plots.length > 0 && <BedPlan zone={zone} plots={data.garden?.plots || []} crops={crops} onPlot={onPlot} highlightId={highlightId} />}
      {plots.length > 0 && (
        <ul className="q-plant-list">
          {plots.map((p) => {
            const stage = growthOf(p, crops.get(p.crop), today),
              check = p.inferred || p.outside;
            const body = (
              <>
                <PlantArt crop={p.crop} stage={stage.index} size={40} />
                <span className="q-grow">
                  <strong>{p.name || p.crop}</strong>
                  <small>
                    {p.plantCount ? `${p.plantCount} ${p.layout?.pattern === "scatter" ? "trees" : "plants"} · ` : ""}
                    {stage.label}
                    {check && <span className="q-plant-flag"> · check layout</span>}
                  </small>
                </span>
                {onPlot && <span className="q-chev" aria-hidden="true">›</span>}
              </>
            );
            return (
              <li key={p.id}>
                {onPlot ? (
                  <button type="button" className="q-plant-row" onClick={() => onPlot(p.id)}>
                    {body}
                  </button>
                ) : (
                  <div className="q-plant-row">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
