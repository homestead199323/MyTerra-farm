import { spacingGuide, plantDensity } from "../../data/spacing.js";
import BedPlan from "./BedPlan";

const PATTERNS = [
  ["rows", "Grid", "Plants line up in straight rows."],
  ["offset", "Hexagonal (biointensive)", "Every other row is shifted; each plant is the same distance from its neighbours."],
];

function GridIcon({ offset, vertical }) {
  return (
    <svg viewBox="0 0 92 44" aria-hidden="true">
      {Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => {
          const along = 10 + c * 16 + (offset && r % 2 ? 8 : 0),
            across = 7 + r * 15;
          return vertical ? (
            <circle key={`${r}-${c}`} cx={30 + r * 15} cy={4 + (along / 92) * 40} r="3.2" />
          ) : (
            <circle key={`${r}-${c}`} cx={along} cy={across} r="3.6" />
          );
        }),
      )}
    </svg>
  );
}

/**
 * `value` is the planting form after plantingInput() defaults; edits are sent back through onChange.
 * Either the plant count or the row count drives the plan; the other is filled in from it.
 */
export default function PlantingControls({
  value,
  onChange,
  plan,
  crop,
  zone,
  yieldKg,
  plots,
  crops,
  editId,
  showAxis = true,
}) {
  const orchard = zone?.type === "orchard",
    scatter = value.pattern === "scatter",
    byRows = value.mode === "rows" && !scatter,
    vertical = value.axis === "vertical";
  // an auto row length is never written back to the form, so it keeps following the plants until the grower types one
  const update = (patch) => {
    const next = { ...value, ...patch, startM: undefined, alongStartM: undefined };
    if (!("lengthM" in patch)) next.lengthM = value.lengthAuto ? undefined : value.lengthM;
    delete next.lengthAuto;
    onChange(next);
  };
  const guide = spacingGuide(crop, value.pattern === "offset" ? "offset" : "rows");
  const alongMax = zone ? (vertical ? zone.hM : zone.wM) : 0;
  const density = scatter ? 0 : plantDensity(value.spacingCM, value.rowSpacingCM);
  const factor = plan?.yieldFactor ?? 1;
  // on (or wider than) the biointensive guide the lower per-plant figure is expected, not a mistake
  const onBioGuide =
    value.pattern === "offset" &&
    Number(value.spacingCM) >= guide.hexCM * 0.985 &&
    Number(value.rowSpacingCM) >= guide.rowCM * 0.97;
  // which field fixes the problem: the first one-tap fix's field, or the field a bad number lives in
  const problem = plan?.problem || null, badField = problem ? (problem.kind === "input" ? problem.field : problem.fixes[0]?.field || null) : null;
  const hints = {
    lengthM: problem?.free ? `Longest free run here: ${problem.free.lengthM.toFixed(1)} m` : "Between 0.3 m and the bed length",
    rowCount: problem?.free ? `Free width here fits fewer rows` : "A whole number, 1 or more",
    plantCount: problem?.free ? `Fewer plants would fit the free space` : "A whole number, 1 or more",
    spacingCM: problem?.free ? `Free width here: ${(problem.free.widthM * 100).toFixed(0)} cm` : "A positive number of centimetres",
    rowSpacingCM: problem?.free ? `Free width here: ${(problem.free.widthM * 100).toFixed(0)} cm` : "A positive number of centimetres",
  };
  const field = (key) => ({ className: badField === key ? "is-problem" : undefined, invalid: badField === key, hint: badField === key ? hints[key] : null });
  const hint = (k) => (badField === k ? <span className="q-field-hint" role="alert">{hints[k]}</span> : null);
  return (
    <section className="q-inset q-planting-controls">
      {orchard && (
        <fieldset className="q-pattern-picker">
          <legend>Tree layout</legend>
          <div className="q-row" role="group">
            <button
              type="button"
              className="q-secondary"
              aria-pressed={scatter}
              onClick={() =>
                update({ pattern: "scatter", mode: "plants", spacingCM: undefined, rowSpacingCM: undefined })
              }
            >
              Scattered (natural)
            </button>
            <button
              type="button"
              className="q-secondary"
              aria-pressed={!scatter}
              onClick={() => update({ pattern: "rows", spacingCM: undefined, rowSpacingCM: undefined })}
            >
              In rows
            </button>
          </div>
        </fieldset>
      )}
      {!scatter && (
        <>
          {showAxis && (
          <fieldset className="q-pattern-picker">
            <legend>Row direction</legend>
            <div className="q-grid2">
              {[
                ["horizontal", "Horizontal", "Rows run left–right on the map."],
                ["vertical", "Vertical", "Long streaks top–bottom on the map."],
              ].map(([key, label, description]) => (
                <label key={key} className={value.axis === key ? "is-selected" : ""}>
                  <input
                    type="radio"
                    name="planting-axis"
                    value={key}
                    checked={value.axis === key}
                    onChange={() => update({ axis: key, lengthM: undefined })}
                  />
                  <GridIcon vertical={key === "vertical"} offset={value.pattern === "offset"} />
                  <strong>{label}</strong>
                  <small>{description}</small>
                </label>
              ))}
            </div>
          </fieldset>
          )}
          {!orchard && (
            <fieldset className="q-pattern-picker">
              <legend>Planting pattern</legend>
              <div className="q-grid2">
                {PATTERNS.map(([key, label, description]) => (
                  <label key={key} className={value.pattern === key ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="planting-pattern"
                      value={key}
                      checked={value.pattern === key}
                      onChange={() => update({ pattern: key, spacingCM: undefined, rowSpacingCM: undefined })}
                    />
                    <GridIcon offset={key === "offset"} vertical={showAxis && vertical} />
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}
      {!showAxis && !scatter && (
        <small>
          Rows run {vertical ? "top to bottom" : "left to right"} along this bed. Change the bed's row
          direction on the farm map.
        </small>
      )}
      <div className="q-grid2">
        <label className={field("plantCount").className}>
          {orchard ? "Trees" : "Plants"}
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            aria-invalid={field("plantCount").invalid || undefined}
            value={byRows ? plan?.count || "" : (value.plantCount ?? "")}
            onChange={(e) => update({ mode: "plants", plantCount: e.target.value })}
          />
          {hint("plantCount")}
        </label>
        {!scatter && (
          <label className={field("rowCount").className}>
            Rows
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-invalid={field("rowCount").invalid || undefined}
              value={byRows ? (value.rowCount ?? "") : plan?.rows || ""}
              onChange={(e) => update({ mode: "rows", rowCount: e.target.value })}
            />
            {hint("rowCount")}
          </label>
        )}
      </div>
      <small>
        {scatter
          ? "Trees are placed naturally, keeping the spacing below from every other tree."
          : "Type how many plants (or how many rows) — the rest fills in. Row length follows your plants until you change it."}
      </small>
      <div className="q-grid2">
        <label className={field("spacingCM").className}>
          {scatter
            ? "Space between trees (cm)"
            : value.pattern === "offset"
              ? "Plant spacing (cm, all directions)"
              : "In-row spacing (cm)"}
          <input
            type="number"
            min="1"
            step="0.5"
            aria-invalid={field("spacingCM").invalid || undefined}
            value={value.spacingCM}
            onChange={(e) =>
              update({
                spacingCM: e.target.value,
                rowSpacingCM: value.pattern === "offset" ? undefined : value.rowSpacingCM,
              })
            }
          />
          {hint("spacingCM")}
        </label>
        {!scatter && (
          <label className={field("rowSpacingCM").className}>
            Between rows (cm)
            <input
              type="number"
              min="1"
              step="0.5"
              aria-invalid={field("rowSpacingCM").invalid || undefined}
              value={value.rowSpacingCM}
              onChange={(e) => update({ rowSpacingCM: e.target.value })}
            />
            {hint("rowSpacingCM")}
          </label>
        )}
        {!scatter && (
          <label className={field("lengthM").className}>
            Row length (m){value.lengthAuto && !badField ? <em className="q-auto-tag"> auto</em> : null}
            <input
              type="number"
              min="0.3"
              step="0.1"
              max={alongMax}
              aria-invalid={field("lengthM").invalid || undefined}
              value={plan?.layout?.lengthM ?? value.lengthM ?? alongMax}
              onChange={(e) => update({ lengthM: e.target.value })}
            />
            {hint("lengthM")}
            {value.lengthAuto && !badField ? <small className="q-auto-note">Set from your plants · bed is {alongMax} m</small> : null}
          </label>
        )}
      </div>
      <p className="q-spacing-guide">
        Guide for {crop?.name}:{" "}
        {scatter
          ? `${crop?.spacing} cm between trees`
          : value.pattern === "offset"
            ? `${guide.hexCM} cm biointensive spacing (rows ${guide.rowCM} cm apart)`
            : `${guide.inRowCM} cm in the row, ${guide.rowCM} cm between rows`}
        {(String(value.spacingCM) !== String(scatter ? crop?.spacing : guide.inRowCM) ||
          (!scatter && String(value.rowSpacingCM) !== String(guide.rowCM))) && (
          <>
            {" · "}
            <button
              type="button"
              className="q-text-button"
              onClick={() => update({ spacingCM: undefined, rowSpacingCM: undefined, lengthM: undefined })}
            >
              Use guide
            </button>
          </>
        )}
      </p>
      {scatter && (
        <button
          type="button"
          className="q-text-button"
          onClick={() => update({ seed: String(Date.now() % 100000) })}
        >
          Shuffle tree positions
        </button>
      )}
      <div role="status" className="q-planting-summary">
        <strong>
          {plan?.count || 0} {orchard ? "trees" : "plants"}
          {!scatter && ` · ${plan?.rows || 0} rows`}
          {density > 0 && ` · ${density >= 10 ? Math.round(density) : density.toFixed(1)} per m²`}
        </strong>
        {yieldKg != null && <span>Estimated harvest: ~{yieldKg} kg</span>}
      </div>
      {factor < 1 && !plan?.error && (onBioGuide ? (
        <small>
          Biointensive spacing is closer than standard rows, so each plant is estimated at{" "}
          {Math.round(factor * 100)}% of its row-grown yield. The estimate per square metre stays the same as
          standard rows.
        </small>
      ) : (
        <p className="q-warning">
          Closer than standard row spacing: each plant is estimated at {Math.round(factor * 100)}% of its
          usual yield, so the extra plants don’t raise the harvest estimate. Widen spacing to give each plant
          its full share.
        </p>
      ))}
      {plan?.shortened && (
        <small>Rows shortened to {plan.layout.lengthM} m to fit the free space in this bed.</small>
      )}
      {plan?.error && (
        <div className="q-problem" role="alert">
          <strong>{problem?.kind === "space" ? "Doesn’t fit yet" : "Check this value"}</strong>
          <p>{plan.error}</p>
          {problem?.fixes?.length > 0 && (
            <div className="q-problem-fixes">
              {problem.fixes.map(function (f) {
                return (
                  <button type="button" key={f.field + f.label} className="q-secondary" onClick={function () { update(f.patch); }}>
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}
          {problem?.canForce && <small>Or plant anyway — real beds can be fuller than the plan.</small>}
        </div>
      )}
      {plots && crops && zone && (
        <div className="q-planting-preview">
          <small>{plan?.error ? "Current bed" : "Preview — the new planting is highlighted"}</small>
          <BedPlan
            zone={zone}
            crops={crops}
            highlightId="__preview"
            fit
            plots={
              plan && !plan.error
                ? [
                    ...plots.filter((p) => p.id !== editId),
                    {
                      id: "__preview",
                      zone: zone.id,
                      crop: crop.name,
                      plantCount: plan.count,
                      layout: plan.layout,
                      status: "planned",
                    },
                  ]
                : plots
            }
          />
        </div>
      )}
    </section>
  );
}
