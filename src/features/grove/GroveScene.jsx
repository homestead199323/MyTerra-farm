import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Minus } from "lucide-react";
import { rCM } from "../../lib/regional";
import { todayLocalKey } from "../../lib/utils";
import { resolveEnvironment } from "../../lib/environment";
import { isPlantZone } from "../farm/living/visuals";
import { zoneGeometry, growthOf, animalZone, bedRows, layoutPlots } from "../quiet/farm-model";
import { plantingRows, plantingBounds } from "../quiet/planting-plan";
import GroveZoneCard from "./GroveZoneCard";
import ZoneTaskPopup from "./ZoneTaskPopup";
import { taskGlyph } from "./zone-tasks";
import { AerialDefs, Building, CropCrown, Fence, OverheadAnimal, Ornament, Canopy } from "./AerialArtwork";
import { accessPaths, plantedRows, plantPosition, buildingScale } from "./aerial-layout";
import { srand } from "./sceneMath";
import { TOY, GROUND_TONES, STAGE_HEX, pathTones } from "./palette";
import { cameraOf, projectBox } from "./camera";
const Grove3D = lazy(() => import("./Grove3D"));

const points = (ps) => ps.map((q) => `${q.xM},${q.yM}`).join(" ");
// Short names (bed numbers) get a compact chip so neighbouring beds' labels don't merge into a bar.
const zoneLabelWidth = (name = "") =>
  name.length <= 2 ? 15 + name.length * 3 : Math.min(140, Math.min(name.length, 23) * 5.9 + 16);
const buildings = new Set(["house", "barn", "coop", "storage", "beehive", "compost", "greenhouse"]);
// container plants stand in their own terracotta pot, as on the 3D map
const potUnder = (z, x, y, size, key) =>
  z.type === "container" ? <circle key={key} cx={x} cy={y} r={Math.max(0.18, Math.min(0.42, size * 0.6))} fill={TOY.pot} stroke={TOY.potRim} strokeWidth=".05" /> : null;
function ModernPlanting({ z, plot, crops, id }) {
  const stage = growthOf(plot, crops.get(plot.crop), todayLocalKey()).index;
  return plantingRows(z, plot).map((row, i) => {
    const n = Math.min(24, row.points.length),
      width = Math.min(0.6, row.gapM * 0.74),
      size = Math.min(row.gapM * 0.95, row.pitchM * 1.15 * (row.points.length / Math.max(1, n)), 0.85);
    const d = row.vertical ? `M${row.atM} ${row.fromM}V${row.toM}` : `M${row.fromM} ${row.atM}H${row.toM}`;
    return (
      <g key={i}>
        <path d={d} stroke={TOY.soilDark} strokeOpacity=".55" strokeWidth={width} strokeLinecap="butt" />
        {Array.from({ length: n }, (_, j) => {
          const q = row.points[Math.floor(((j + 0.5) * row.points.length) / n)];
          return [potUnder(z, q.xM, q.yM, size, `p${j}`),
            <CropCrown
              key={j}
              x={q.xM}
              y={q.yM}
              size={size}
              crop={plot.crop}
              stage={stage}
              id={id}
              seed={i * 39 + j}
            />];
        })}
      </g>
    );
  });
}
function Plantings({ z, plots, crops, id }) {
  const rows = plantedRows(z, plots).filter((r) => r.planting?.layout.version !== 2),
    modern = layoutPlots(z, plots).filter((p) => p.layout.version === 2 && p.layout.pattern !== "scatter"),
    vertical = z.rowAxis === "vertical",
    orchard = z.type === "orchard";
  const cross = vertical ? z.wM : z.hM,
    along = vertical ? z.hM : z.wM;
  const gap = cross / bedRows(z),
    margin = Math.min(0.14, along * 0.07);
  return (
    <g pointerEvents="none">
      {modern.map((p) => (
        <ModernPlanting key={p.id} z={z} plot={p} crops={crops} id={id} />
      ))}

      {rows.map((row, i) => {
        const pos = row.atM ?? (i + 0.5) * gap,
          length = row.pitch ? row.planting.layout.lengthM : (along - margin * 2) * row.fraction;
        const stage = row.planting
          ? growthOf(row.planting, crops.get(row.planting.crop), todayLocalKey()).index
          : 0;
        const n = Math.min(
          orchard ? 12 : 24,
          row.count || (row.planting && !row.planting.plantCount ? 4 : 0),
        );
        const size = Math.min(
          (row.pitch || gap) * 0.95,
          (length / Math.max(1, n)) * 1.15,
          orchard ? 4 : 0.85,
        );
        return (
          <g key={i}>
            {!orchard && z.type !== "container" && (
              <path
                d={
                  vertical
                    ? `M${pos} ${margin}v${along - margin * 2}`
                    : `M${margin} ${pos}h${along - margin * 2}`
                }
                stroke={TOY.soilDark}
                strokeOpacity=".55"
                strokeWidth={gap * 0.74}
                strokeLinecap="butt"
              />
            )}
            {!orchard && (
              <path
                d={
                  vertical
                    ? `M${pos - gap * 0.38} ${margin}v${along - margin * 2}`
                    : `M${margin} ${pos - gap * 0.38}h${along - margin * 2}`
                }
                stroke={TOY.soilLight}
                strokeOpacity="0"
                strokeWidth=".025"
              />
            )}
            {Array.from({ length: n }, (_, j) => {
              const at = (row.pitch ? 0 : margin) + plantPosition(row, j, n) * length;
              return [potUnder(z, vertical ? pos : at, vertical ? at : pos, size, `p${j}`),
                <CropCrown
                  key={j}
                  x={vertical ? pos : at}
                  y={vertical ? at : pos}
                  size={size}
                  crop={row.planting.crop}
                  stage={stage}
                  id={id}
                  seed={i * 39 + j}
                />];
            })}
          </g>
        );
      })}
      {plots
        .filter((p) => p.zone === z.id && p.status !== "harvested" && p.layout?.pattern === "scatter")
        .flatMap((p) =>
          (p.layout.points || []).map((q, i) => (
            <CropCrown
              key={`${p.id}-${i}`}
              x={q.xM}
              y={q.yM}
              crop={p.crop}
              stage={growthOf(p, crops.get(p.crop), todayLocalKey()).index}
              size={Math.min(4, (p.layout.spacingCM / 100) * 0.9)}
              id={id}
              seed={i}
            />
          )),
        )}
    </g>
  );
}
// Seedling nursery from above: benches along the long side, trays on them tinted by seedling stage.
function NurseryBenches({ z, data }) {
  const long = z.wM >= z.hM,
    along = long ? z.wM : z.hM,
    cross = long ? z.hM : z.wM;
  const benchW = Math.min(0.8, cross * 0.4),
    aisle = Math.min(0.6, cross * 0.25);
  const benches = Math.max(1, Math.floor((cross - 0.2 + aisle) / (benchW + aisle)));
  const trayA = 0.55,
    trayC = Math.min(0.35, benchW * 0.9);
  const perBench = Math.max(0, Math.floor((along - 0.3) / (trayA + 0.05)));
  const colour = { sown: STAGE_HEX[1], sprouted: STAGE_HEX[2], potted: STAGE_HEX[3], hardening: TOY.leaf[3] };
  const trays = (data.nursery?.batches || [])
    .filter((b) => b.zoneId === z.id && b.stage && b.stage !== "planted")
    .flatMap((b) =>
      Array.from({ length: Math.max(1, Math.ceil(b.cells / 60)) }, () => colour[b.stage] || STAGE_HEX[1]),
    );
  const offset = (cross - benches * benchW - (benches - 1) * aisle) / 2;
  let n = 0;
  return (
    <g pointerEvents="none">
      {Array.from({ length: benches }, (_, i) => {
        const c0 = offset + i * (benchW + aisle);
        return (
          <g key={i}>
            <rect
              x={long ? 0.15 : c0}
              y={long ? c0 : 0.15}
              width={long ? along - 0.3 : benchW}
              height={long ? benchW : along - 0.3}
              rx=".06"
              fill={TOY.wood}
              stroke={TOY.woodMid}
              strokeWidth=".04"
            />
            {Array.from({ length: perBench }, (_, j) => {
              const tint = trays[n++];
              if (!tint) return null;
              const a0 = 0.2 + j * (trayA + 0.05),
                cc = c0 + (benchW - trayC) / 2;
              return (
                <g key={j}>
                  <rect
                    x={long ? a0 : cc}
                    y={long ? cc : a0}
                    width={long ? trayA : trayC}
                    height={long ? trayC : trayA}
                    rx=".05"
                    fill={TOY.pot}
                  />
                  <rect
                    x={(long ? a0 : cc) + 0.03}
                    y={(long ? cc : a0) + 0.03}
                    width={(long ? trayA : trayC) - 0.06}
                    height={(long ? trayC : trayA) - 0.06}
                    fill={tint}
                    opacity=".9"
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
function Area({ z, data, crops, id, selected, interactive, onClick, onPointerDown, onKeyDown }) {
  const w = z.wM,
    h = z.hM,
    plant = isPlantZone(z.type),
    building = buildings.has(z.type),
    oval = z.shape === "oval" && !plant && !building;
  // bed edges as in 3D: raised beds wooden boards, herb beds stone kerbs, rows a low dark board, pots a patio
  const material =
    z.material === "stone" || z.type === "herbs" || z.type === "container"
      ? TOY.stone
      : z.material === "metal"
        ? TOY.zinc
        : z.type === "veg"
          ? TOY.woodDark
          : TOY.wood;
  const animals = (data.livestock?.animals || []).filter((a) => animalZone(a, data.zones)?.id === z.id);
  const fill =
    z.type === "nursery"
      ? TOY.gravel
      : z.type === "water"
        ? TOY.water
        : z.type === "yard"
          ? TOY.yard
        : z.type === "container"
          ? TOY.concrete
          : z.type === "veg"
            ? TOY.soilLight
            : plant && z.type !== "orchard"
              ? TOY.soil
              : z.type === "orchard"
                ? TOY.orchard
                : z.type === "pasture"
                  ? TOY.pasture
                  : TOY.lawn;
  const shapeProps = {
    fill,
    stroke: z.type === "water" ? TOY.stone : z.type === "yard" ? TOY.yardRim : plant && z.type !== "orchard" ? material : "none",
    strokeWidth: z.type === "water" ? 0.34 : z.type === "raised" ? 0.14 : z.type === "herbs" ? 0.24 : plant && z.type !== "orchard" ? 0.1 : 0,
  };
  return (
    <g
      transform={`translate(${z.xM} ${z.yM})`}
      className="quiet-zone"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${z.name}, ${w} by ${h} metres${plant && z.type !== "orchard" ? `, ${bedRows(z)} rows` : ""}. Open details`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
    >
      <rect x="-.06" y="-.06" width={w + 0.12} height={h + 0.12} fill="transparent" />
      {!building && (
        <g filter={plant || z.type === "water" ? `url(#${id}-shadow)` : undefined}>
          {oval ? (
            <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...shapeProps} />
          ) : (
            <rect
              width={w}
              height={h}
              rx={z.type === "water" ? Math.min(w, h) * 0.12 : plant ? 0.06 : 0.04}
              {...shapeProps}
            />
          )}
          {z.type === "yard" && Math.max(w, h) >= 5 && Array.from({ length: Math.floor(Math.max(w, h) / 2.6) - 1 }).map(function (_, i) { const u = (i + 1) * 2.6; return w >= h ? <path key={i} d={`M${u} 0.35V${h - 0.35}`} stroke="#ffffff" strokeWidth=".1" strokeLinecap="round" opacity=".9" /> : <path key={i} d={`M0.35 ${u}H${w - 0.35}`} stroke="#ffffff" strokeWidth=".1" strokeLinecap="round" opacity=".9" />; })}
          {z.type === "raised" &&
            [[0, 0], [w, 0], [0, h], [w, h]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r=".11" fill={TOY.woodDark} />)}
          {z.type === "water" && (
            <path
              d={`M${w * 0.2} ${h * 0.3}q${w * 0.13} ${-h * 0.04} ${w * 0.26} 0m${-w * 0.12} ${h * 0.06}q${w * 0.13} ${-h * 0.04} ${w * 0.26} 0`}
              stroke={TOY.ripple}
              strokeWidth=".03"
              strokeLinecap="round"
              opacity=".8"
              fill="none"
            />
          )}
        </g>
      )}
      {building ? (
        <Building type={z.type} w={w} h={h} id={id} clay={z.color === "clay"}>
          <Plantings z={z} plots={data.garden?.plots || []} crops={crops} id={id} />
        </Building>
      ) : plant ? (
        <>
          {z.type === "container" &&
            !(data.garden?.plots || []).some((p) => p.zone === z.id && p.status !== "harvested") &&
            Array.from({ length: Math.max(1, Math.floor(w / 0.8)) * Math.max(1, Math.floor(h / 0.8)) }, (_, i) => {
              const nx = Math.max(1, Math.floor(w / 0.8)), ny = Math.max(1, Math.floor(h / 0.8));
              const r = Math.min(0.3, w / nx * 0.36, h / ny * 0.36);
              return <circle key={i} cx={((i % nx) + 0.5) * w / nx} cy={(Math.floor(i / nx) + 0.5) * h / ny} r={r} fill={TOY.pot} stroke={TOY.potRim} strokeWidth=".05" filter={`url(#${id}-shadow)`} />;
            })}
          <Plantings z={z} plots={data.garden?.plots || []} crops={crops} id={id} />
        </>
      ) : z.type === "nursery" ? (
        <NurseryBenches z={z} data={data} id={id} />
      ) : null}
      {["pasture", "orchard"].includes(z.type) && (
        <Fence w={w} h={h} id={id} gate pickets={z.type === "orchard"} />
      )}
      {animals.slice(0, 5).map((a, i) =>
        Array.from({ length: Math.min(9, a.count || 1) }, (_, j) => {
          const bird = ["Chicken", "Duck", "Goose", "Turkey", "Quail", "Guinea Fowl", "Bee"].includes(a.type);
          const front = buildingScale(w, h, "barn").front;
          const size = Math.min(
            1,
            (w * 0.7) / (bird ? 1 : 3),
            (z.type === "barn" || z.type === "coop" ? front : h * 0.7) / (bird ? 0.7 : 2.1),
          );
          const xx = w * (0.16 + srand(i * 31 + j + 10) * 0.68),
            yy =
              z.type === "barn" || z.type === "coop"
                ? h - front * 0.5 + (srand(i * 29 + j + 5) - 0.5) * front * 0.2
                : h * (0.18 + srand(i * 29 + j + 5) * 0.62);
          return (
            <OverheadAnimal
              key={`${a.id}-${j}`}
              species={a.type}
              x={xx}
              y={yy}
              id={id}
              size={size}
              angle={srand(j + i * 70) * 270}
            />
          );
        }),
      )}
      {selected && (
        <rect
          x="-.15"
          y="-.15"
          width={w + 0.3}
          height={h + 0.3}
          rx=".1"
          fill="#f7c55238"
          stroke={TOY.gold}
          strokeWidth=".12"
          pointerEvents="none"
        />
      )}
      <rect
        className="q-area-focus"
        x="-.2"
        y="-.2"
        width={w + 0.4}
        height={h + 0.4}
        rx=".12"
        fill="none"
        stroke={TOY.green}
        strokeWidth=".07"
        pointerEvents="none"
      />
    </g>
  );
}

export default function GroveScene({
  data,
  setData,
  weather = null,
  skyOverride = null,
  tasksByZone = {},
  onEditLayout,
  onPlantInZone,
  onShowCrops,
  onZoneClick,
  onOpenTasks,
  taskZoneId = null,
  onTaskZone,
  interactive = true,
  showEditButton = true,
  showHelperText = true,
  noBorder = false,
  edit = null,
  activeZoneId,
  route = [],
  focus = null,
  onStartGuide,
}) {
  const id = useId().replace(/:/g, "");
  const svg = useRef(null),
    scroll = useRef(null),
    world = useRef(null),
    drag = useRef(null),
    moved = useRef(false);
  const [ownTaskZone, setOwnTaskZone] = useState(null);
  const [completionNotice, setCompletionNotice] = useState(null);
  const completedJobs = useRef(0);
  const [drawHover, setDrawHover] = useState(null);
  const taskZone = onTaskZone ? taskZoneId : ownTaskZone,
    setTaskZone = onTaskZone || setOwnTaskZone;
  useEffect(() => { completedJobs.current = 0; }, [taskZone]);
  useEffect(() => {
    if (!completionNotice) return undefined;
    const timer = setTimeout(() => setCompletionNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [completionNotice]);
  const [selected, setSelected] = useState(null),
    [zoom, setZoom] = useState(1),
    [screenWidth, setScreenWidth] = useState(800);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => setScreenWidth(entries[0].contentRect.width));
    observer.observe(scroll.current || svg.current.parentElement);
    return () => observer.disconnect();
  }, []);
  const fW = Math.max(1, data.farmW || 100),
    fH = Math.max(1, data.farmH || 60),
    env = resolveEnvironment(data);
  const margin = Math.max(0.4, Math.min(3, Math.min(fW, fH) * 0.065));
  const viewW = fW + margin * 2,
    viewH = fH + margin * 2;
  // Walk focus: frame the current stop and the way there, keeping the map's proportions.
  const stopPoint = (s) => ({ xM: s.xM ?? (s.cx / 100) * fW, yM: s.yM ?? (s.cy / 100) * fH });
  const focusZone = focus
    ? (data.zones || []).map((z, i) => zoneGeometry(z, fW, fH, i)).find((z) => z.id === focus.zoneId)
    : null;
  const focusPlot =
    focusZone && focus.plotId ? (data.garden?.plots || []).find((p) => p.id === focus.plotId) : null;
  const focusBox = focusZone
    ? (() => {
        const b = focusPlot
          ? plantingBounds(focusZone, focusPlot)
          : { x0: 0, y0: 0, x1: focusZone.wM, y1: focusZone.hM };
        return {
          x0: focusZone.xM + b.x0,
          y0: focusZone.yM + b.y0,
          x1: focusZone.xM + b.x1,
          y1: focusZone.yM + b.y1,
        };
      })()
    : null;
  let vb = { x: -margin, y: -margin, w: viewW, h: viewH };
  if (focusZone) {
    const from = focus.from ? stopPoint(focus.from) : null;
    const x0 = Math.min(focusZone.xM, from?.xM ?? Infinity),
      x1 = Math.max(focusZone.xM + focusZone.wM, from?.xM ?? -Infinity),
      y0 = Math.min(focusZone.yM, from?.yM ?? Infinity),
      y1 = Math.max(focusZone.yM + focusZone.hM, from?.yM ?? -Infinity);
    const pad = Math.max(1.5, Math.max(x1 - x0, y1 - y0) * 0.25),
      aspect = viewW / viewH;
    let w = Math.max(x1 - x0 + pad * 2, 6),
      h = Math.max(y1 - y0 + pad * 2, 6 / aspect);
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    if (w < viewW && h < viewH) {
      const cx = (x0 + x1) / 2,
        cy = (y0 + y1) / 2;
      vb = {
        x: Math.min(Math.max(cx - w / 2, -margin), -margin + viewW - w),
        y: Math.min(Math.max(cy - h / 2, -margin), -margin + viewH - h),
        w,
        h,
      };
    }
  }
  // Isometric camera (camera.js): the world group carries cam.W; the UI layer projects with P()
  const [noGL, setNoGL] = useState(false);
  const three = (data.mapStyle?.camera || "3d") !== "flat" && !edit && !focus && !noGL;
  const cam = cameraOf({ camera: "flat" }),
    P = cam.project,
    vbT = cam.on ? projectBox(cam, vb.x, vb.y, vb.x + vb.w, vb.y + vb.h, Math.max(4, margin * 1.4)) : vb;
  const labelUnit = vbT.w / Math.max(240, screenWidth) / zoom,
    selectedId = edit?.selectedId || activeZoneId || focus?.zoneId;
  const zones = useMemo(
    () => (data.zones || []).map((z, i) => zoneGeometry(z, fW, fH, i)),
    [data.zones, fW, fH],
  );
  const cropMap = useMemo(() => rCM(data.region), [data.region]);
  // Zone names: kept inside the map and never stacked on top of each other. On a small screen a
  // label that would collide (e.g. bed numbers packed side by side) is hidden until you zoom in;
  // the selected area's name always shows.
  const labelPlaces = useMemo(() => {
    const placed = [],
      out = new Map(),
      pad = 1.5 * labelUnit;
    const order = [...zones].sort(
      (a, b) => (b.id === selectedId) - (a.id === selectedId) || b.wM * b.hM - a.wM * a.hM,
    );
    const free = (box) => !placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0);
    order.forEach((z) => {
      const w = zoneLabelWidth(z.name) * labelUnit,
        h = 18 * labelUnit;
      // Short names on beds narrower than a chip (bed numbers) are painted on the bed's end instead.
      if (z.name.length <= 3 && z.wM < w * 1.15 && z.hM > h * 2) {
        const fs = Math.max(6, Math.min(10, (z.wM / labelUnit) * 0.8));
        out.set(z.id, { x: z.xM + z.wM / 2, y: z.yM + z.hM - (fs * 0.9 + 3) * labelUnit, inside: true, fs });
        return;
      }
      // Under the area (centred, then slid to either side), on it, above it — first at full size,
      // then slightly smaller. Buildings and other big areas always keep their name.
      for (const k of [1, 0.82]) {
        const ww = w * k,
          hh = h * k;
        const clampX = (x) => Math.max(ww / 2, Math.min(fW - ww / 2, x));
        const clampY = (y) => Math.max(hh / 2, Math.min(fH - hh / 2, y));
        const under = z.yM + z.hM + 0.33,
          above = z.yM - hh / 2 - 0.2,
          middle = z.yM + z.hM / 2;
        const spots = [
          [z.xM + z.wM / 2, under],
          [z.xM + ww / 2, under],
          [z.xM + z.wM - ww / 2, under],
          [z.xM + z.wM / 2, middle],
          [z.xM + z.wM / 2, above],
        ];
        for (const [sx, sy] of spots) {
          const x = clampX(sx),
            y = clampY(sy);
          const box = { x0: x - ww / 2 - pad, x1: x + ww / 2 + pad, y0: y - hh / 2, y1: y + hh / 2 };
          if (free(box) || z.id === selectedId) {
            placed.push(box);
            out.set(z.id, { x, y, k });
            return;
          }
        }
      }
      if (z.wM * z.hM >= 8) {
        const k = 0.82,
          x = Math.max((w * k) / 2, Math.min(fW - (w * k) / 2, z.xM + z.wM / 2)),
          y = z.yM + z.hM / 2;
        placed.push({ x0: x - (w * k) / 2, x1: x + (w * k) / 2, y0: y - (h * k) / 2, y1: y + (h * k) / 2 });
        out.set(z.id, { x, y, k });
      }
    });
    return out;
  }, [zones, labelUnit, selectedId, fW, fH]);
  // Automatic paths: a farm's start at the gate (front edge), a garden's at the back door by the house
  // (far edge). A balcony is one paved floor — no automatic paths, only ones the person draws.
  const roads = useMemo(
    () => (data.roadsEnabled === false || env === "balcony" ? [] : accessPaths(zones, fW, fH, data.mapLines, env === "backyard" ? { xM: fW / 2, yM: 0 } : null)),
    [zones, fW, fH, data.roadsEnabled, data.mapLines, env],
  );
  const roadWidth = Math.max(0.25, Math.min(0.75, Math.min(fW, fH) * 0.04));
  // Drawn paths render exactly like the automatic ones (same width, colour and texture).
  const drawnPaths = (data.mapLines || []).filter((l) => l.kind === "path" && (l.points || []).length > 1);
  const allPaths = [...roads, ...drawnPaths.map((l) => l.points)];
  const style = data.mapStyle || {},
    ground = style.groundMaterial || (env === "balcony" ? "stone" : "meadow");
  const pathTexture = style.pathMaterial === "earth" ? "soil" : style.pathMaterial || "gravel";
  const [pathColor, pathEdge] = pathTones(pathTexture, style.pathColor); // the same tones as the 3D map
  const groundTones = ground === "meadow" ? GROUND_TONES.meadow[style.groundColor] || GROUND_TONES.meadow.natural : GROUND_TONES[ground] || GROUND_TONES.stone;
  const apron = ground === "meadow" && groundTones === GROUND_TONES.meadow.natural ? TOY.apron : groundTones[2];
  const selectedZone = zones.find((z) => z.id === selected);
  const canInteract = interactive || !!edit;
  function coords(e) {
    const matrix = (world.current || svg.current).getScreenCTM();
    if (!matrix) return { xM: 0, yM: 0 };
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return { xM: q.x, yM: q.y };
  }
  function start(e, z, resize = false) {
    if (!edit || edit.armed || edit.draw || edit.ornamentMode || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    moved.current = false;
    edit.onSelect(z.id);
    drag.current = { id: z.id, resize, start: coords(e), orig: z };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function startOrnament(e, o) {
    if (!edit || edit.armed || edit.draw || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    moved.current = false;
    edit.onOrnamentSelect?.(o.id);
    drag.current = { id: o.id, ornament: true, start: coords(e), orig: o };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (edit?.draw) {
      const q = coords(e);
      setDrawHover(edit.snapPreview ? edit.snapPreview(q) : q);
      return;
    }
    if (!drag.current) return;
    const q = coords(e),
      d = drag.current,
      dx = q.xM - d.start.xM,
      dy = q.yM - d.start.yM;
    if (Math.abs(dx) + Math.abs(dy) > 0.03) moved.current = true;
    if (!moved.current) return;
    if (!d.begun) {
      d.begun = true;
      edit.onBeginEdit?.();
    }
    if (d.ornament) {
      edit.onOrnamentMove?.(d.id, d.orig.xM + dx, d.orig.yM + dy);
      return;
    }
    edit.onZoneGeom(
      d.id,
      d.resize
        ? { ...d.orig, wM: d.orig.wM + dx, hM: d.orig.hM + dy }
        : { ...d.orig, xM: d.orig.xM + dx, yM: d.orig.yM + dy },
      { drag: true, resize: d.resize },
    );
  }
  function end() {
    if (drag.current?.begun) edit?.onEndEdit?.();
    drag.current = null;
  }
  function open(e, z) {
    e.stopPropagation();
    if (moved.current) {
      moved.current = false;
      return;
    }
    if (edit?.draw) {
      edit.onDrawPoint(coords(e));
      return;
    }
    if (edit) {
      if (edit.armed) {
        const q = e.detail === 0 ? { xM: z.xM, yM: z.yM } : coords(e);
        edit.onPlaceAt(q.xM, q.yM);
      } else edit.onSelect(z.id);
      return;
    }
    if (!interactive) return;
    if (onZoneClick) onZoneClick(z);
    else setSelected(z.id);
  }
  function key(e, z) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open(e, z);
    } else if (edit && !edit.armed && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      edit.onSelect(z.id);
      const step = edit.grid > 0 ? edit.grid : e.shiftKey ? 1 : 0.1;
      edit.onZoneGeom(z.id, {
        ...z,
        xM: z.xM + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0),
        yM: z.yM + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0),
      });
    }
  }
  const scaleMetres = fW >= 40 ? 10 : fW >= 15 ? 2 : 1;
  return (
    <section
      className={`quiet-scene q-aerial-scene ${noBorder ? "borderless" : ""}`}
      data-grove-scene="aerial"
      data-grove-camera={three ? "3d" : "flat"}
    >
      {!edit && (
        <div className="quiet-map-top">
          <span>
            {env === "balcony" ? "Your balcony" : env === "backyard" ? "Your garden" : "Your farm"}{" "}
            <small>
              {fW} × {fH} m
            </small>
          </span>
          {showEditButton && onEditLayout && (
            <button className="q-icon" aria-label="Edit farm layout" onClick={onEditLayout}>
              <Pencil size={17} />
            </button>
          )}
        </div>
      )}
      <div ref={scroll} className={`quiet-map-scroll${three ? " grove3d" : ""}`} data-zoom={zoom} style={{ overflow: zoom > 1 ? "auto" : "hidden" }}>
        {three ? (
          <Suspense fallback={<div style={{ width: "100%", aspectRatio: "1 / 0.64" }} />}>
            <Grove3D data={data} zones={zones} roads={allPaths} crops={cropMap} fW={fW} fH={fH} margin={margin} env={env}
              pathTexture={pathTexture} roadWidth={roadWidth} tasksByZone={tasksByZone} selectedId={selectedId}
              onZoneOpen={open} onBadge={setTaskZone} interactive={canInteract} onUnavailable={() => setNoGL(true)} onShowCrops={onShowCrops} weather={weather} skyOverride={skyOverride} />
          </Suspense>
        ) : (
        <svg
          ref={svg}
          viewBox={`${vbT.x} ${vbT.y} ${vbT.w} ${vbT.h}`}
          style={{
            width: `${zoom * 100}%`,
            display: "block",
            touchAction: edit ? "none" : "auto",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
          aria-label={cam.on ? "Interactive 3D farm map" : "Interactive overhead farm map"}
          onDragStart={(e) => e.preventDefault()}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onClick={(e) => {
            if (edit) {
              if (moved.current) {
                moved.current = false;
                return;
              }
              const q = coords(e);
              if (edit.draw) edit.onDrawPoint(q);
              else if (edit.armed) edit.onPlaceAt(q.xM, q.yM);
              else {
                edit.onSelect(null);
                edit.onLineSelect?.(null);
              }
            }
          }}
          onDragOver={(e) => {
            if (edit) e.preventDefault();
          }}
          onDrop={(e) => {
            if (edit) {
              e.preventDefault();
              const q = coords(e);
              edit.onPlaceAt(q.xM, q.yM, e.dataTransfer.getData(edit.dragType));
            }
          }}
        >
          <AerialDefs id={id} />
          <defs>
            <clipPath id={`${id}-boundary`}>
              <rect width={fW} height={fH} />
            </clipPath>
          </defs>
          <g ref={world} transform={cam.W || undefined}>
          <g>
          {/* ground: one flat colour, the property a shade lighter (as in 3D) */}
          <rect x={-margin} y={-margin} width={viewW} height={viewH} fill={groundTones[0]} />
          <rect width={fW} height={fH} fill={apron} />
          {env === "balcony" ? (
            <g pointerEvents="none">
              <rect x="-.45" y="-.4" width={fW + 0.9} height=".32" rx=".06" fill={TOY.cream} filter={`url(#${id}-building-shadow)`} />
              <path d={`M0 0V${fH}H${fW}V0`} fill="none" stroke={TOY.zinc} strokeWidth=".1" strokeLinejoin="round" />
              <path d={`M0 0V${fH}H${fW}V0`} fill="none" stroke={TOY.trim} strokeWidth=".05" strokeLinejoin="round" />
            </g>
          ) : env === "backyard" ? (
            <g pointerEvents="none">
              {/* a back garden: the house along the far edge (its patio is outside the measured garden), a white picket fence down both sides and across the bottom */}
              <rect x="-.45" y={-Math.max(0.3, margin - 0.05)} width={fW + 0.9} height={Math.max(0.3, margin - 0.05)} rx=".06" fill={TOY.cream} filter={`url(#${id}-building-shadow)`} />
              <Fence w={fW} h={fH} id={id} pickets top={false} />
            </g>
          ) : (
            <g pointerEvents="none">
              {/* clipped hedge round the property, open at the entrance */}
              <path
                d={`M${fW / 2 - 2.3} ${fH + 0.75}H-.75V-.75H${fW + 0.75}V${fH + 0.75}H${fW / 2 + 2.3}`}
                fill="none"
                stroke={TOY.hedge}
                strokeWidth=".8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${id}-shadow)`}
              />
              <Fence w={fW} h={fH} id={id} gate gateW={2.4} />
              {[-1, 1].map((sd) => (
                <circle key={sd} cx={fW / 2 + sd * 1.32} cy={fH} r=".26" fill={TOY.stone} stroke={TOY.stoneDark} strokeWidth=".06" />
              ))}
            </g>
          )}
          {env !== "balcony" &&
            Array.from({ length: Math.min(100, Math.ceil((fW + fH) / 2)) }, (_, i) => {
              const edge = i % 4;
              if (env === "backyard" && edge === 2) return null; // the house side
              const
                t = srand(i + 91),
                r = margin * (0.48 + srand(i + 25) * 0.46);
              const x = edge === 0 ? -margin * 0.83 : edge === 1 ? fW + margin * 0.83 : t * fW;
              const y = edge === 2 ? -margin * 0.82 : edge === 3 ? fH + margin * 0.88 : t * fH;
              return <Canopy key={i} x={x} y={y} r={r} id={id} seed={i} />;
            })}

          <g clipPath={`url(#${id}-boundary)`}>
            {edit?.grid > 0 && fW / edit.grid <= 400 && fH / edit.grid <= 400 && (
              <g stroke={TOY.green} strokeWidth={0.6 * labelUnit} opacity=".16" pointerEvents="none">
                {Array.from({ length: Math.floor(fW / edit.grid) + 1 }, (_, i) => (
                  <line
                    key={`gx${i}`}
                    x1={i * edit.grid}
                    y1="0"
                    x2={i * edit.grid}
                    y2={fH}
                    strokeWidth={i % 5 === 0 ? 1.4 * labelUnit : 0.6 * labelUnit}
                  />
                ))}
                {Array.from({ length: Math.floor(fH / edit.grid) + 1 }, (_, i) => (
                  <line
                    key={`gy${i}`}
                    x1="0"
                    y1={i * edit.grid}
                    x2={fW}
                    y2={i * edit.grid}
                    strokeWidth={i % 5 === 0 ? 1.4 * labelUnit : 0.6 * labelUnit}
                  />
                ))}
              </g>
            )}
            <g fill="none" strokeLinejoin="round" strokeLinecap="round">
              {allPaths.map((line, i) => (
                <polyline key={i} points={points(line)} stroke={pathEdge} strokeWidth={roadWidth + 0.26} />
              ))}
              {allPaths.map((line, i) => (
                <polyline key={i} points={points(line)} stroke={pathColor} strokeWidth={roadWidth} />
              ))}
            </g>
            {zones.map((z) => (
              <Area
                key={z.id}
                z={z}
                data={data}
                crops={cropMap}
                id={id}
                selected={selectedId === z.id}
                interactive={canInteract}
                onClick={(e) => open(e, z)}
                onPointerDown={(e) => start(e, z)}
                onKeyDown={(e) => key(e, z)}
              />
            ))}
            {(data.mapLines || [])
              .filter((l) => l.kind !== "path")
              .map((l) => (
                <g key={l.id} filter={`url(#${id}-shadow)`}>
                  <polyline points={points(l.points)} fill="none" stroke={l.kind === "gate" ? TOY.green : TOY.woodMid} strokeWidth={l.kind === "gate" ? 0.14 : 0.1} strokeLinecap="round" strokeLinejoin="round" />
                  {l.points.map((p, i) => (
                    <circle key={i} cx={p.xM} cy={p.yM} r=".09" fill={TOY.woodDark} />
                  ))}
                </g>
              ))}
            {(data.ornaments || []).map((o) => (
              <g
                key={o.id}
                role={edit ? "button" : undefined}
                tabIndex={edit ? 0 : undefined}
                aria-label={`${o.type} decoration`}
                transform={`translate(${o.xM} ${o.yM})`}
                onPointerDown={(e) => startOrnament(e, o)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (edit?.draw) edit.onDrawPoint(coords(e));
                  else if (edit?.armed) {
                    const q = coords(e);
                    edit.onPlaceAt(q.xM, q.yM);
                  } else edit?.onOrnamentSelect?.(o.id);
                }}
                onKeyDown={(e) => {
                  if (edit && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    edit.onOrnamentSelect?.(o.id);
                  }
                }}
              >
                <Ornament o={o} id={id} />
                {edit?.ornamentSelectedId === o.id && (
                  <circle r=".65" fill="none" stroke={TOY.gold} strokeWidth=".1" />
                )}
              </g>
            ))}
          </g>
          </g>
          </g>
          <g transform={cam.W || undefined}>
          {edit &&
            !edit.draw &&
            (data.mapLines || [])
              .filter((l) => (l.points || []).length > 1)
              .map((l) => (
                <g key={`hit-${l.id}`}>
                  {edit.selectedLineId === l.id && (
                    <polyline
                      points={points(l.points)}
                      fill="none"
                      stroke="#f7c552"
                      strokeWidth={Math.max(roadWidth, 0.2) + 0.3}
                      strokeOpacity=".75"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  )}
                  <polyline
                    points={points(l.points)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={Math.max(roadWidth, 0.2) + 0.8}
                    strokeLinecap="round"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      edit.onLineSelect?.(l.id);
                    }}
                  />
                </g>
              ))}
          </g>
          {edit?.draw && (
            <g pointerEvents="none">
              <g transform={cam.W || undefined}>
              {edit.draw.points.length > 0 && drawHover && (
                <line
                  x1={edit.draw.points[edit.draw.points.length - 1].xM}
                  y1={edit.draw.points[edit.draw.points.length - 1].yM}
                  x2={drawHover.xM}
                  y2={drawHover.yM}
                  stroke={TOY.green}
                  strokeWidth={Math.max(roadWidth * 0.5, 0.12)}
                  strokeDasharray=".3 .2"
                  strokeLinecap="round"
                  opacity=".8"
                />
              )}
              {edit.draw.points.length > 1 && (
                <polyline
                  points={points(edit.draw.points)}
                  fill="none"
                  stroke={edit.draw.kind === "path" ? pathColor : edit.draw.kind === "gate" ? TOY.green : TOY.woodMid}
                  strokeWidth={edit.draw.kind === "path" ? roadWidth : 0.14}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity=".95"
                />
              )}
              </g>
              {edit.draw.points.map((p, i) => (
                <circle
                  key={i}
                  cx={P(p.xM, p.yM)[0]}
                  cy={P(p.xM, p.yM)[1]}
                  r={(i === edit.draw.points.length - 1 ? 7 : 5) * labelUnit}
                  fill={i === edit.draw.points.length - 1 ? TOY.gold : "#ffffff"}
                  stroke={TOY.green}
                  strokeWidth={1.5 * labelUnit}
                />
              ))}
            </g>
          )}
          {route.length > 1 && (
            <polyline
              transform={cam.W || undefined}
              points={points(route.map(stopPoint))}
              fill="none"
              stroke={TOY.green}
              strokeOpacity={focus ? 0.55 : 0.8}
              strokeWidth={focus ? 2.2 * labelUnit : 0.065}
              strokeDasharray={focus ? `${5 * labelUnit} ${5 * labelUnit}` : ".14 .14"}
              pointerEvents="none"
            />
          )}
          {focus &&
            route.map((s, i) => {
              const q = stopPoint(s),
                done = focus.visited?.includes(s.id),
                current = s.id === focus.stopId;
              if (current) return null;
              return (
                <g
                  key={s.id}
                  transform={`translate(${P(q.xM, q.yM)[0]} ${P(q.xM, q.yM)[1]}) scale(${labelUnit})`}
                  pointerEvents="none"
                >
                  <circle r="7" fill={done ? TOY.green : "#fffffff0"} stroke={TOY.green} strokeWidth="1.5" />
                  <text
                    textAnchor="middle"
                    y="3.2"
                    fontSize="8.5"
                    fontWeight="700"
                    fill={done ? "white" : TOY.green}
                  >
                    {done ? "✓" : i + 1}
                  </text>
                </g>
              );
            })}
          {focus?.from && focusBox && (
            <line
              x1={P(stopPoint(focus.from).xM, stopPoint(focus.from).yM)[0]}
              y1={P(stopPoint(focus.from).xM, stopPoint(focus.from).yM)[1]}
              x2={P((focusBox.x0 + focusBox.x1) / 2, (focusBox.y0 + focusBox.y1) / 2)[0]}
              y2={P((focusBox.x0 + focusBox.x1) / 2, (focusBox.y0 + focusBox.y1) / 2)[1]}
              stroke={TOY.gold}
              strokeWidth={3 * labelUnit}
              strokeDasharray={`${6 * labelUnit} ${4 * labelUnit}`}
              strokeLinecap="round"
              pointerEvents="none"
            />
          )}
          {focusBox && (
            <g pointerEvents="none" className="q-walk-focus">
              <rect
                transform={cam.W || undefined}
                x={focusBox.x0}
                y={focusBox.y0}
                width={focusBox.x1 - focusBox.x0}
                height={focusBox.y1 - focusBox.y0}
                rx={Math.min(0.15, (focusBox.x1 - focusBox.x0) / 4)}
                fill="#f7c55233"
                stroke={TOY.gold}
                strokeWidth={3 * labelUnit}
              />
              <g
                transform={`translate(${P((focusBox.x0 + focusBox.x1) / 2, focusBox.y0)[0]} ${P((focusBox.x0 + focusBox.x1) / 2, focusBox.y0)[1]}) scale(${labelUnit})`}
                className="q-walk-pin"
              >
                <path
                  d="M0 0C-3-6-11-10-11-19a11 11 0 0 1 22 0c0 9-8 13-11 19z"
                  fill="#c2482f"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cy="-19" r="4" fill="white" />
              </g>
            </g>
          )}
          {zones.map((z) => {
            const place = labelPlaces.get(z.id);
            if (!place) return null;
            const labelWidth = zoneLabelWidth(z.name);
            if (place.inside)
              return (
                <g
                  key={z.id}
                  transform={`translate(${place.x} ${place.y}) scale(${labelUnit})`}
                  className="q-map-label is-painted"
                  onClick={(e) => open(e, z)}
                  style={{ cursor: canInteract ? "pointer" : undefined }}
                  aria-hidden="true"
                >
                  {selectedId === z.id && (
                    <circle r={place.fs * 0.95} cy={-place.fs * 0.35} fill={TOY.green} stroke="#ffffff" strokeWidth=".8" />
                  )}
                  <text
                    textAnchor="middle"
                    fontSize={place.fs}
                    fontWeight="700"
                    style={{ fill: selectedId === z.id ? "#ffffff" : "var(--color-text, #23362e)", stroke: selectedId === z.id ? TOY.green : "var(--color-card, #ffffff)" }}
                    strokeOpacity=".9"
                    strokeWidth="2.4"
                    strokeLinejoin="round"
                    paintOrder="stroke"
                  >
                    {z.name}
                  </text>
                </g>
              );
            return (
              <g
                key={z.id}
                transform={`translate(${place.x} ${place.y}) scale(${labelUnit * (place.k || 1)})`}
                className="q-map-label"
                onClick={(e) => open(e, z)}
                style={{ cursor: canInteract ? "pointer" : undefined }}
                aria-hidden="true"
              >
                {/* the same white card pill as the 3D map; brand green when selected */}
                <rect
                  x={-labelWidth / 2}
                  y="-8.5"
                  width={labelWidth}
                  height="18"
                  rx="9"
                  style={{ fill: selectedId === z.id ? TOY.green : "var(--color-card, #ffffff)", stroke: selectedId === z.id ? TOY.green : "var(--color-border, #dce3dc)" }}
                  strokeWidth="0.8"
                />
                <text
                  className="q-map-label-text"
                  textAnchor="middle"
                  y="4"
                  fontSize="10"
                  fontWeight="650"
                  letterSpacing=".25"
                  style={{ fill: selectedId === z.id ? "#ffffff" : "var(--color-text, #23362e)" }}
                >
                  {z.name.length > 23 ? z.name.slice(0, 22) + "…" : z.name}
                </text>
              </g>
            );
          })}
          {!edit &&
            zones.map((z) => {
              const list = tasksByZone[z.id] || [];
              if (!list.length) return null;
              const pillW = list.length > 9 ? 40 : 34;
              // Top-right corner of the area; if the name is written on the area itself, sit at the
              // end of the name instead so the two never cover each other.
              const lp = labelPlaces.get(z.id),
                onArea = lp && !lp.inside && lp.y < z.yM + z.hM;
              const badgeAt = onArea
                ? { x: lp.x + ((zoneLabelWidth(z.name) * (lp.k || 1)) / 2 + pillW / 2 - 4) * labelUnit, y: lp.y }
                : {
                    x: Math.max(z.xM + (pillW / 2) * labelUnit, z.xM + z.wM - (pillW / 2 + 3) * labelUnit),
                    y: Math.max(12 * labelUnit, z.yM + 12 * labelUnit),
                  };
              return (
                <g
                  key={`badge-${z.id}`}
                  className="q-zone-badge"
                  transform={`translate(${badgeAt.x} ${badgeAt.y}) scale(${labelUnit})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${list.length} job${list.length === 1 ? "" : "s"} waiting at ${z.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTaskZone(z.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setTaskZone(z.id);
                    }
                  }}
                >
                  <circle r="22" fill="transparent" />
                  <g className="q-badge-bob">
                    <rect className="q-badge-ring" x={-pillW / 2} y="-10" width={pillW} height="20" rx="10" fill="none" stroke={TOY.orange} strokeWidth="2" />
                    <rect className="q-badge-pill" x={-pillW / 2} y="-10" width={pillW} height="20" rx="10" style={{ fill: "var(--color-orange, #c97f17)", stroke: "var(--color-card, #ffffff)" }} strokeWidth="2" />
                    <text x={-pillW / 2 + 10} y="4.2" textAnchor="middle" fontSize="11">
                      {taskGlyph(list[0])}
                    </text>
                    <text x={pillW / 2 - 9} y="4" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#ffffff">
                      {list.length}
                    </text>
                  </g>
                </g>
              );
            })}
          {edit &&
            zones
              .filter((z) => z.id === edit.selectedId)
              .map((z) => (
                <g key={z.id}>
                  <g
                    transform={`translate(${P(z.xM + z.wM, z.yM + z.hM)[0]} ${P(z.xM + z.wM, z.yM + z.hM)[1]}) scale(${labelUnit})`}
                    onPointerDown={(e) => start(e, z, true)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: "nwse-resize" }}
                  >
                    <circle r="22" fill="transparent" />
                    <circle r="9" fill={TOY.green} stroke="white" strokeWidth="2" />
                    <path d="M-4 4L4-4M-1-4H4V1M-4-1V4H1" fill="none" stroke="white" strokeWidth="1.2" />
                  </g>
                  {/* drawn at 11 px and scaled: Chrome mis-measures SVG text under 1 px font size */}
                  <g transform={`translate(${P(z.xM + z.wM / 2, z.yM - 0.25)[0]} ${P(z.xM + z.wM / 2, z.yM - 0.25, cam.on ? 2.5 : 0)[1]}) scale(${labelUnit})`} pointerEvents="none">
                    <text
                      fontSize="11"
                      fontWeight="650"
                      textAnchor="middle"
                      style={{ fill: "var(--color-text, #23362e)", stroke: "var(--color-card, #ffffff)" }}
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                      paintOrder="stroke"
                    >
                      {`${z.wM} × ${z.hM} m`}
                    </text>
                  </g>
                </g>
              ))}
          <g transform={`translate(${P(margin * 0.45, fH + margin * 0.53)[0]} ${P(margin * 0.45, fH + margin * 0.53)[1]})`} pointerEvents="none">
            <path
              d={`M0 -.08V.08M0 0H${scaleMetres}M${scaleMetres} -.08V.08`}
              stroke={TOY.woodDark}
              strokeWidth=".05"
              strokeLinecap="round"
            />
            <text transform={`translate(${scaleMetres / 2} -0.14) scale(${labelUnit})`} textAnchor="middle" fontSize="8" style={{ letterSpacing: 0, fill: "var(--color-text-2, #617169)" }}>
              {`${scaleMetres} m`}
            </text>
          </g>
          {env === "farm" && <g transform={`translate(${P(fW / 2, fH)[0]} ${P(fW / 2, fH)[1]})`} pointerEvents="none">

            <text
              transform={`translate(0 ${Math.max(0.3, 10 * labelUnit)}) scale(${labelUnit})`}
              textAnchor="middle"
              fontSize="8"
              style={{ letterSpacing: 0, fill: "var(--color-text-2, #617169)" }}
            >
              Entrance
            </text>
          </g>}
        </svg>
        )}
      </div>
      <div className="quiet-map-bottom">
        <span>
          {edit
            ? "Drag to move · corner to resize"
            : three
              ? interactive ? "Drag to look around · tap an area to open it" : "Drag to look around"
              : showHelperText
                ? "Tap an area to explore"
                : "Growth stages are estimates"}
        </span>
        {!three && (
        <div className="q-row">
          <button
            className="q-icon"
            aria-label="Zoom out map"
            onClick={() => setZoom(Math.max(1, zoom - 0.5))}
            disabled={zoom === 1}
          >
            <Minus size={16} />
          </button>
          <button className="q-icon" aria-label="Reset map zoom" title="Show the whole map again" onClick={() => setZoom(1)} disabled={zoom === 1}
            style={{ width: "auto", padding: "0 12px", borderRadius: 22, fontSize: 12.5, fontWeight: 650 }}>
            Reset
          </button>
          <button
            className="q-icon"
            aria-label="Zoom in map"
            onClick={() => setZoom(Math.min(3, zoom + 0.5))}
            disabled={zoom === 3}
          >
            <Plus size={16} />
          </button>
        </div>
        )}
      </div>
      {completionNotice && <div className="g3-completion" role="status">
        <span aria-hidden="true">✓</span> {completionNotice.count} {completionNotice.count === 1 ? "job" : "jobs"} completed in {completionNotice.name}
      </div>}
      {zones.length === 0 && (
        <div className="mt-empty-cta">
          <p>Your space is empty. Answer a few questions and MyTerra draws a starter bed and plans your first week — or place everything yourself.</p>
          <div className="q-row">
            {onStartGuide && <button type="button" className="q-button" onClick={onStartGuide}>Set up with the guide</button>}
            {onEditLayout && <button type="button" className="q-secondary" onClick={onEditLayout}>Add a bed myself</button>}
          </div>
        </div>
      )}
      {taskZone && zones.find((z) => z.id === taskZone) && (
        <ZoneTaskPopup
          zone={zones.find((z) => z.id === taskZone)}
          tasks={tasksByZone[taskZone] || []}
          data={data}
          setData={setData}
          onClose={() => {
            if (completedJobs.current > 0) setCompletionNotice({ count: completedJobs.current, name: zones.find((z) => z.id === taskZone)?.name || "this area" });
            setTaskZone(null);
          }}
          onCompleted={() => { completedJobs.current += 1; }}
          onOpenTasks={onOpenTasks}
          onOpenZone={() => setSelected(taskZone)}
        />
      )}
      {selectedZone && (
        <GroveZoneCard
          zone={selectedZone}
          data={data}
          setData={setData}
          onClose={() => setSelected(null)}
          onPlantInZone={onPlantInZone}
          onEditLayout={onEditLayout}
          onShowCrops={onShowCrops}
        />
      )}
    </section>
  );
}
