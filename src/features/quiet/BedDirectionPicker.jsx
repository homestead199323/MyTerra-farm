const OPTIONS = [
  ["horizontal", "Left to right", ""],
  ["vertical", "Top to bottom", ""],
];

function BedIcon({ vertical }) {
  const lines = Array.from({ length: 4 }, (_, i) => 10 + i * 8);
  return (
    <svg viewBox="0 0 92 44" aria-hidden="true">
      <rect x="2" y="2" width="88" height="40" rx="4" style={{ fill: "none", stroke: "#547943" }} strokeWidth="1.5" opacity="0.55" />
      {lines.map((n) =>
        vertical ? (
          <line key={n} x1={n * 2.6} y1="8" x2={n * 2.6} y2="36" style={{ stroke: "#547943" }} strokeWidth="3" strokeLinecap="round" />
        ) : (
          <line key={n} x1="10" y1={n - 1} x2="82" y2={n - 1} style={{ stroke: "#547943" }} strokeWidth="3" strokeLinecap="round" />
        ),
      )}
    </svg>
  );
}

/**
 * Which way plant rows run in a bed. Plantings follow the bed, so this is also how a bed is rotated:
 * choosing the other direction turns the bed 90° together with its plantings (onRotate).
 * `fits` is false when the rotated bed would not fit inside the farm.
 */
export default function BedDirectionPicker({ zone, fits = true, onRotate }) {
  const current = zone?.rowAxis === "vertical" ? "vertical" : "horizontal";
  return (
    <fieldset className="q-pattern-picker q-bed-direction">
      <legend>Row direction</legend>
      <div className="q-grid2">
        {OPTIONS.map(([key, label, description]) => (
          <label key={key} className={current === key ? "is-selected" : ""}>
            <input
              type="radio"
              name={`bed-direction-${zone.id}`}
              value={key}
              checked={current === key}
              disabled={current !== key && !fits}
              onChange={() => {
                if (current !== key) onRotate();
              }}
            />
            <BedIcon vertical={key === "vertical"} />
            <strong>{label}</strong>
            {description ? <small>{description}</small> : null}
          </label>
        ))}
      </div>
      <small>
        {fits
          ? "Plantings follow this direction. Switching turns the bed 90° with its plantings."
          : "The turned bed would not fit within your farm dimensions."}
      </small>
    </fieldset>
  );
}
