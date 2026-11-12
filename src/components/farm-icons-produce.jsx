/* ═══════════════════════════════════════════
   FARM ICON SET, part 2 — one picture per crop
   MARKER: FARM_ICON_SET_V2

   Until 2026-11-12 these crops fell back to a shared emoji in lists
   (ten herbs were all 🌿, five leaf crops all 🥬, the three windowsill
   trays all 🌱). Same style as FarmIcon.jsx: 32×32 viewBox, flat fills,
   the map's leaf greens. Merged into FARM_SVG there.
   ═══════════════════════════════════════════ */
/* eslint-disable react-refresh/only-export-components -- an icon table read by FarmIcon.jsx, not a component module */
import React from "react";
import { TOY } from "../features/grove/palette";

const LEAF = TOY.leaf[1];
const LEAF_D = TOY.leaf[3];
const S = { viewBox: "0 0 32 32", width: "100%", height: "100%" };
const round = { strokeLinecap: "round", fill: "none" };

/* ── leaf crops ── */
const Cabbage = () => (
  <svg {...S}>
    <circle cx="16" cy="17" r="11" fill="#9ccb72"/>
    <path d="M5.5 15 C7 23.5 12 28 16 28 C12.5 24 11 19 11.5 12.5 C9 12.5 7 13.4 5.5 15 Z" fill="#7fb35c"/>
    <path d="M26.5 15 C25 23.5 20 28 16 28 C19.5 24 21 19 20.5 12.5 C23 12.5 25 13.4 26.5 15 Z" fill="#6da552"/>
    <circle cx="16" cy="15.5" r="7" fill="#c9e59c"/>
    <path d="M16 9 C13 12 13 17 16 22 M16 9 C19 12 19 17 16 22" stroke="#9ccb72" strokeWidth="1" fill="none"/>
  </svg>
);

const Spinach = () => (
  <svg {...S}>
    <path d="M16 30 L16 20" stroke="#8fc46a" strokeWidth="2" {...round}/>
    <path d="M16 21 C10 20 7 14.5 8.5 7.5 C14 9 17 14 16 21 Z" fill={LEAF_D}/>
    <path d="M16 21 C22 20 25 14.5 23.5 7.5 C18 9 15 14 16 21 Z" fill={LEAF}/>
    <path d="M16 22 C12.5 17 12.5 9 16 3.5 C19.5 9 19.5 17 16 22 Z" fill="#3f8a3a"/>
    <path d="M16 22 L16 7 M16 16 L13.6 12.5 M16 16 L18.4 12.5" stroke="#8fc46a" strokeWidth="0.9" {...round}/>
  </svg>
);

const Lettuce = () => (
  <svg {...S}>
    {[[23, 17], [16, 24], [9, 17], [16, 10]].map(([x, y]) => <circle key={`a${x}${y}`} cx={x} cy={y} r="5.2" fill="#93c96c"/>)}
    {[[20.95, 21.95], [11.05, 21.95], [11.05, 12.05], [20.95, 12.05]].map(([x, y]) => <circle key={`b${x}${y}`} cx={x} cy={y} r="5.2" fill="#a9d67e"/>)}
    {[[19.3, 18.9], [16, 20.8], [12.7, 18.9], [12.7, 15.1], [16, 13.2], [19.3, 15.1]].map(([x, y]) => <circle key={`c${x}${y}`} cx={x} cy={y} r="3.6" fill="#c4e69a"/>)}
    <circle cx="16" cy="17" r="2.8" fill="#e6f6c8"/>
  </svg>
);

const Kale = () => (
  <svg {...S}>
    <path d="M16 30 L16 20" stroke="#b9d8a0" strokeWidth="2.2" {...round}/>
    <ellipse cx="16" cy="13" rx="7" ry="10" fill="#3d7d55"/>
    {[[9.5, 8], [8.6, 13], [9.6, 18], [12, 22], [22.5, 8], [23.4, 13], [22.4, 18], [20, 22], [12.5, 4.5], [16, 3.2], [19.5, 4.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.6" fill="#4f946a"/>)}
    <path d="M16 26 L16 6" stroke="#cfe6b8" strokeWidth="1.4" {...round}/>
    <path d="M16 18 L11.5 14 M16 18 L20.5 14 M16 12.5 L12.5 9.5 M16 12.5 L19.5 9.5" stroke="#a9cf9a" strokeWidth="0.9" {...round}/>
  </svg>
);

const BrusselsSprouts = () => (
  <svg {...S}>
    {[[10.5, 21, "#8fc46a"], [21.5, 21, "#7fb35c"], [16, 11.5, "#9ccb72"]].map(([x, y, c]) => (
      <g key={`${x}${y}`}>
        <circle cx={x} cy={y} r="6.2" fill={c}/>
        <path d={`M${x - 4.8} ${y - 1.4} Q${x} ${y + 6} ${x + 4.8} ${y - 1.4}`} stroke="#5f9a48" strokeWidth="1" {...round}/>
        <ellipse cx={x - 2} cy={y - 3} rx="1.4" ry="0.9" fill="#c9e59c"/>
      </g>
    ))}
  </svg>
);

/* ── beans, courgette, cucumber ── */
const KIDNEY = "M-7 0 C-7 -5 -2 -6.5 2.5 -5 C6.5 -3.7 8 0 6.5 3.4 C5.6 5.4 3 5.6 2 3.6 C1.2 2 -1 2 -2.2 3.6 C-3.6 5.6 -7 4.6 -7 0 Z";
const BeanDry = () => (
  <svg {...S}>
    <g transform="translate(12.5 11.5) rotate(-25)">
      <path d={KIDNEY} fill="#8e3b3b"/>
      <ellipse cx="-1.5" cy="-2.8" rx="2.6" ry="1" fill="#b25a55"/>
    </g>
    <g transform="translate(19.5 21.5) rotate(18)">
      <path d={KIDNEY} fill="#e9dcc3"/>
      {[[-3, -1], [0, -2.8], [3, -1.6], [4.6, 1], [-4.8, 1.6], [1, 0]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.75" fill="#a2463f"/>)}
    </g>
  </svg>
);

const BroadBean = () => (
  <svg {...S}>
    <g transform="rotate(-35 16 16)">
      <path d="M28 16 L31 15.2" stroke={LEAF_D} strokeWidth="1.8" {...round}/>
      <path d="M3.5 16 C6 9 26 9 28.5 16 C26 23 6 23 3.5 16 Z" fill="#6da552"/>
      <path d="M6 16 C8.5 11.8 23.5 11.8 26 16 C23.5 20.2 8.5 20.2 6 16 Z" fill="#eef4dc"/>
      <ellipse cx="10.6" cy="16" rx="2.9" ry="2.6" fill="#b7d68a"/>
      <ellipse cx="16" cy="16" rx="3.1" ry="2.8" fill="#b7d68a"/>
      <ellipse cx="21.4" cy="16" rx="2.9" ry="2.6" fill="#b7d68a"/>
      <path d="M9.4 14.4 q1.2 -0.9 2.4 0 M14.8 14.2 q1.2 -0.9 2.4 0 M20.2 14.4 q1.2 -0.9 2.4 0" stroke="#4d6e2f" strokeWidth="1" {...round}/>
    </g>
  </svg>
);

const Zucchini = () => (
  <svg {...S}>
    <g transform="rotate(-38 16 16)">
      <path d="M26 16 L31.5 12 L29.8 16 L31.5 20 Z" fill="#f2c230"/>
      <rect x="4" y="12" width="23" height="8" rx="4" fill="#3f7d3a"/>
      <path d="M8 13.6 H23 M8 16 H24 M8 18.4 H23" stroke="#6aa85a" strokeWidth="0.9" {...round}/>
      <rect x="0.8" y="14.2" width="4.4" height="3.6" rx="1.2" fill="#8a9a4a"/>
    </g>
  </svg>
);

const Cucumber = () => (
  <svg {...S}>
    <g transform="rotate(35 14 13)">
      <rect x="1.5" y="9" width="24" height="8.6" rx="4.3" fill="#5fa04e"/>
      <path d="M5.5 10.8 H21" stroke="#8cc777" strokeWidth="1.2" {...round}/>
      {[[7, 14.6], [11, 15.6], [15, 14.2], [19, 15.4], [22, 13.4]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.7" fill="#3f7d3a"/>)}
    </g>
    <circle cx="22.5" cy="23" r="6.4" fill="#5fa04e"/>
    <circle cx="22.5" cy="23" r="5.1" fill="#dff0c2"/>
    {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="22.5" cy="20.6" rx="0.8" ry="1.3" fill="#a9c97c" transform={`rotate(${a} 22.5 23)`}/>)}
  </svg>
);

/* ── herbs ── */
const Basil = () => (
  <svg {...S}>
    <path d="M16 30 L16 10" stroke="#4a9438" strokeWidth="1.6" {...round}/>
    <path d="M16 23.5 C10 24.5 5.5 21.5 5 16 C10.5 15 15 18 16 23.5 Z" fill="#4a9438"/>
    <path d="M16 23.5 C22 24.5 26.5 21.5 27 16 C21.5 15 17 18 16 23.5 Z" fill="#5aa843"/>
    <path d="M16 15.5 C11.5 15.5 8.2 12.5 8.5 7.5 C13 7.8 16 10.5 16 15.5 Z" fill="#5aa843"/>
    <path d="M16 15.5 C20.5 15.5 23.8 12.5 23.5 7.5 C19 7.8 16 10.5 16 15.5 Z" fill="#6dbb52"/>
    <path d="M16 11 C13.8 8.6 14 5.2 16 3 C18 5.2 18.2 8.6 16 11 Z" fill="#7cc95f"/>
    <path d="M15 22.6 L8.5 18 M17 22.6 L23.5 18" stroke="#8fd07c" strokeWidth="0.8" {...round}/>
  </svg>
);

const Oregano = () => (
  <svg {...S}>
    <path d="M16 30 L16 9" stroke="#6b8f4a" strokeWidth="1.3" {...round}/>
    <circle cx="12" cy="25" r="3" fill="#5c9150"/><circle cx="20" cy="25" r="3" fill="#6fa25a"/>
    <circle cx="12.3" cy="19.5" r="2.7" fill="#6fa25a"/><circle cx="19.7" cy="19.5" r="2.7" fill="#5c9150"/>
    <circle cx="12.7" cy="14.4" r="2.3" fill="#5c9150"/><circle cx="19.3" cy="14.4" r="2.3" fill="#6fa25a"/>
    <circle cx="13" cy="8.4" r="2.3" fill="#c59ad6"/><circle cx="19" cy="8.4" r="2.3" fill="#c59ad6"/><circle cx="16" cy="6" r="2.5" fill="#d3b0e2"/>
    <circle cx="13" cy="8.4" r="0.7" fill="#8e5fae"/><circle cx="19" cy="8.4" r="0.7" fill="#8e5fae"/><circle cx="16" cy="6" r="0.8" fill="#8e5fae"/>
  </svg>
);

const Rosemary = () => (
  <svg {...S}>
    <path d="M16 30 L16 5" stroke="#7a6248" strokeWidth="1.6" {...round}/>
    <path d="M16 27 L9.5 23 M16 24 L9.5 20 M16 21 L9.8 17 M16 18 L10.2 14 M16 15 L10.8 11 M16 12 L11.5 8 M16 9 L12.6 5.4" stroke="#3f7466" strokeWidth="1.9" {...round}/>
    <path d="M16 27 L22.5 23 M16 24 L22.5 20 M16 21 L22.2 17 M16 18 L21.8 14 M16 15 L21.2 11 M16 12 L20.5 8 M16 9 L19.4 5.4" stroke="#5e9a86" strokeWidth="1.9" {...round}/>
    <path d="M16 6 L16 2.2" stroke="#5e9a86" strokeWidth="1.9" {...round}/>
  </svg>
);

const Sage = () => (
  <svg {...S}>
    <path d="M16 30 L16 20" stroke="#7d9379" strokeWidth="1.8" {...round}/>
    <ellipse cx="9.5" cy="17" rx="4" ry="8" transform="rotate(-32 9.5 17)" fill="#86a184"/>
    <ellipse cx="22.5" cy="17" rx="4" ry="8" transform="rotate(32 22.5 17)" fill="#7b9779"/>
    <ellipse cx="16" cy="12.5" rx="4.6" ry="9.5" fill="#9db59a"/>
    <path d="M16 21 L16 5 M12.8 22 L7 12.5 M19.2 22 L25 12.5" stroke="#d7e3d2" strokeWidth="1" {...round}/>
  </svg>
);

const TOOTHED = "M0 0 L-2.4 -1.2 L-2.2 -2.6 L-3.6 -3.4 L-3 -4.8 L-3.6 -6 L-2.4 -6.8 L-2 -8.2 L0 -10 L2 -8.2 L2.4 -6.8 L3.6 -6 L3 -4.8 L3.6 -3.4 L2.2 -2.6 L2.4 -1.2 Z";
const Mint = () => (
  <svg {...S}>
    <path d="M16 30 L16 9" stroke="#2f8f5a" strokeWidth="1.5" {...round}/>
    {[[16, 24.5, -68, 1.2, "#2f8f5a"], [16, 24.5, 68, 1.2, "#3fa56b"], [16, 17, -58, 1.02, "#3fa56b"], [16, 17, 58, 1.02, "#2f8f5a"], [16, 11.5, 0, 0.9, "#55ba80"]].map(([x, y, r, s, c]) => (
      <g key={`${y}${r}`} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
        <path d={TOOTHED} fill={c}/>
        <path d="M0 -1 L0 -8.6" stroke="#a6e3c0" strokeWidth="0.7" {...round}/>
      </g>
    ))}
  </svg>
);

const SwissChard = () => (
  <svg {...S}>
    <path d="M14.2 30.5 L15 14 H17 L17.8 30.5 Z" fill="#d6384e"/>
    <path d="M16 3 C22 3.5 26 8 25.5 13.5 C25.2 18 21.5 21.5 17 22 L15 22 C10.5 21.5 6.8 18 6.5 13.5 C6 8 10 3.5 16 3 Z" fill="#3f7d3a"/>
    <circle cx="11" cy="9" r="2.4" fill="#56974c"/><circle cx="21" cy="9" r="2.4" fill="#56974c"/><circle cx="10" cy="15.2" r="2.2" fill="#56974c"/><circle cx="22" cy="15.2" r="2.2" fill="#56974c"/>
    <path d="M16 22 L16 5.5" stroke="#e9566b" strokeWidth="1.8" {...round}/>
    <path d="M16 17 L10.5 12.5 M16 17 L21.5 12.5 M16 11.5 L12 8 M16 11.5 L20 8" stroke="#e9566b" strokeWidth="1" {...round}/>
  </svg>
);

const Thyme = () => (
  <svg {...S}>
    <path d="M16 30 L16 6 M16 30 L8 9 M16 30 L24 9" stroke="#8a6f55" strokeWidth="1.1" {...round}/>
    {[[14.4, 24], [17.6, 22], [14.4, 18], [17.6, 16], [14.4, 12], [17.6, 10],
      [15, 23.2], [12.2, 24.2], [13.4, 19], [10.6, 20], [11.8, 14.8], [9, 15.8], [10.2, 10.6], [7.4, 11.6],
      [19.8, 24.2], [18.6, 19], [21.4, 20], [20.2, 14.8], [23, 15.8], [21.8, 10.6], [24.6, 11.6]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.35" fill={i % 2 ? "#6a9c5a" : "#58894c"}/>)}
    <circle cx="16" cy="5" r="1.8" fill="#e59bc4"/><circle cx="8" cy="8" r="1.8" fill="#e59bc4"/><circle cx="24" cy="8" r="1.8" fill="#e59bc4"/>
  </svg>
);

const TREFOIL = "M0 0 C-1 -2 -5 -2 -6 -6 C-3.5 -6.5 -2 -5 -1.5 -4 C-2 -7 -1 -9 0 -10.5 C1 -9 2 -7 1.5 -4 C2 -5 3.5 -6.5 6 -6 C5 -2 1 -2 0 0 Z";
const Parsley = () => (
  <svg {...S}>
    <path d="M16 30 L16 16 M16 27 L10.5 20.5 M16 27 L21.5 20.5" stroke="#4f9a3c" strokeWidth="1.3" {...round}/>
    <g transform="translate(10.5 21) rotate(-48) scale(1.05)"><path d={TREFOIL} fill="#3f8732"/></g>
    <g transform="translate(21.5 21) rotate(48) scale(1.05)"><path d={TREFOIL} fill="#4f9a3c"/></g>
    <g transform="translate(16 16.5) scale(1.25)"><path d={TREFOIL} fill="#5fae4a"/></g>
  </svg>
);

const Dill = () => (
  <svg {...S}>
    <path d="M16 30 L16 15" stroke="#6b9a4a" strokeWidth="1.4" {...round}/>
    <path d="M16 24 L9 20 M16 24 L23 20 M12.5 22 L10.5 18.5 M19.5 22 L21.5 18.5 M12.5 22 L9.5 23.5 M19.5 22 L22.5 23.5" stroke="#5c9150" strokeWidth="0.9" {...round}/>
    <path d="M16 15 L6 8.5 M16 15 L9.5 5.8 M16 15 L13 4.2 M16 15 L16 3.6 M16 15 L19 4.2 M16 15 L22.5 5.8 M16 15 L26 8.5" stroke="#7fae5c" strokeWidth="0.9" {...round}/>
    {[[6, 8.5], [9.5, 5.8], [13, 4.2], [16, 3.6], [19, 4.2], [22.5, 5.8], [26, 8.5]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.9" fill="#e8cf3a"/>)}
  </svg>
);

const Fennel = () => (
  <svg {...S}>
    <path d="M12.5 17 L10 7.5 M16 16 L16 5.5 M19.5 17 L22 7.5" stroke="#8fc46a" strokeWidth="2.2" {...round}/>
    <path d="M10 7.5 L6.5 4.5 M10 7.5 L10 3 M10 7.5 L13 4 M16 5.5 L13 2.5 M16 5.5 L16 1.5 M16 5.5 L19 2.5 M22 7.5 L19 4 M22 7.5 L22 3 M22 7.5 L25.5 4.5" stroke="#5c9150" strokeWidth="0.9" {...round}/>
    <path d="M16 30.5 C9 30.5 6.5 25.5 8 21 C9.2 17.5 12.5 16 16 16 C19.5 16 22.8 17.5 24 21 C25.5 25.5 23 30.5 16 30.5 Z" fill="#f1efdc"/>
    <path d="M12 17 C10.5 21.5 11.5 26.5 14 30 M20 17 C21.5 21.5 20.5 26.5 18 30" stroke="#cfd4b0" strokeWidth="1" {...round}/>
  </svg>
);

/* ── fruit and nuts ── */
const Pear = () => (
  <svg {...S}>
    <path d="M16 8 L17 3.5" stroke="#7a5a3a" strokeWidth="1.5" {...round}/>
    <path d="M17 5 C19.5 2.5 23 2.8 24.5 4.6 C22.5 7 19 7 17 5 Z" fill={LEAF}/>
    <path d="M16 7.5 C13.2 7.5 12.4 10.5 12 13.5 C11.4 17 7.5 18.5 7.5 23 C7.5 27.2 11.3 30 16 30 C20.7 30 24.5 27.2 24.5 23 C24.5 18.5 20.6 17 20 13.5 C19.6 10.5 18.8 7.5 16 7.5 Z" fill="#b9cf4e"/>
    <ellipse cx="12.2" cy="22" rx="1.8" ry="3.4" fill="#d4e37a"/>
  </svg>
);

const Quince = () => (
  <svg {...S}>
    <path d="M16 9.5 L16 5" stroke="#7a5a3a" strokeWidth="1.6" {...round}/>
    <path d="M16 6.5 C12.5 3 8.5 3.5 6.5 6 C9 9 13 9 16 6.5 Z" fill={LEAF_D}/>
    <path d="M16 8.5 C13.5 8.5 12.5 10.5 10.5 11.8 C7 14 5.5 17.5 5.5 21 C5.5 26.2 10 30 16 30 C22 30 26.5 26.2 26.5 21 C26.5 17.5 25 14 21.5 11.8 C19.5 10.5 18.5 8.5 16 8.5 Z" fill="#e6b73a"/>
    <path d="M16 10.5 C15 16 15 23 16 28" stroke="#d19f28" strokeWidth="0.9" {...round}/>
    <ellipse cx="10.8" cy="19.5" rx="2" ry="3.6" fill="#f3d46e"/>
    <path d="M14.3 29.6 L16 27.4 L17.7 29.6 Z" fill="#8a6a2a"/>
  </svg>
);

const Chestnut = () => (
  <svg {...S}>
    <path d="M11 5 L11 2.5 M5.3 7.3 L3.5 5.5 M3 13 L0.6 13 M5.3 18.7 L3.5 20.5 M16.7 7.3 L18.5 5.5 M7.5 5.8 L6.5 3.4 M14.5 5.8 L15.5 3.4 M3.6 10 L1.3 9 M3.6 16 L1.3 17" stroke="#6f8f36" strokeWidth="1.1" {...round}/>
    <circle cx="11" cy="13" r="8" fill="#8fb04a"/>
    <path d="M19 12 L18 9.4 L20.4 11.9 Z" fill="#7a4526"/>
    <path d="M19 12 C24.5 12.5 28.5 17 28.5 21.5 C28.5 26.5 24.5 29.5 19 29.5 C13.5 29.5 9.5 26.5 9.5 21.5 C9.5 17 13.5 12.5 19 12 Z" fill="#7a4526"/>
    <path d="M11.2 25.5 C13.5 23.8 24.5 23.8 26.8 25.5 C25.2 28 22.4 29.5 19 29.5 C15.6 29.5 12.8 28 11.2 25.5 Z" fill="#d9bb8f"/>
    <ellipse cx="15" cy="18" rx="1.5" ry="3" transform="rotate(25 15 18)" fill="#a1643c"/>
  </svg>
);

const Hazelnut = () => (
  <svg {...S}>
    <path d="M16 3.5 C22.5 5.5 26 11.5 26 17 C26 23 21.5 27 16 27 C10.5 27 6 23 6 17 C6 11.5 9.5 5.5 16 3.5 Z" fill="#b9793f"/>
    <ellipse cx="12" cy="12" rx="1.8" ry="3.6" transform="rotate(20 12 12)" fill="#d59a5e"/>
    <path d="M5 18 L8 15.5 L10.5 19 L13.5 15.8 L16 19.5 L18.5 15.8 L21.5 19 L24 15.5 L27 18 C27.5 25 22.5 30 16 30 C9.5 30 4.5 25 5 18 Z" fill="#8fb04a"/>
    <path d="M16 19.5 L18.5 15.8 L21.5 19 L24 15.5 L27 18 C27.5 25 22.5 30 16 30 Z" fill="#7a9c3c"/>
  </svg>
);

/* ── brassica heads ── */
const Broccoli = () => (
  <svg {...S}>
    <path d="M13 30.5 L13.6 20 L9.5 16 L12 14 L16 18 L20 14 L22.5 16 L18.4 20 L19 30.5 Z" fill="#9cc46a"/>
    <circle cx="9" cy="12" r="5" fill="#3f8a3a"/><circle cx="23" cy="12" r="5" fill="#3f8a3a"/><circle cx="16" cy="9" r="6" fill="#3f8a3a"/>
    <circle cx="12.5" cy="14.5" r="4" fill="#3f8a3a"/><circle cx="19.5" cy="14.5" r="4" fill="#3f8a3a"/>
    <circle cx="7.5" cy="10.5" r="2" fill="#56a34c"/><circle cx="14" cy="6.5" r="2.4" fill="#56a34c"/><circle cx="18.5" cy="7.5" r="2" fill="#56a34c"/>
    <circle cx="23.5" cy="10.5" r="2" fill="#56a34c"/><circle cx="11" cy="13.5" r="1.6" fill="#56a34c"/><circle cx="20.5" cy="13" r="1.6" fill="#56a34c"/>
  </svg>
);

const Cauliflower = () => (
  <svg {...S}>
    <path d="M3.5 14 C3 23 8 29.5 16 29.5 C24 29.5 29 23 28.5 14 C25 15 23 18 22.5 22 L9.5 22 C9 18 7 15 3.5 14 Z" fill={LEAF}/>
    <path d="M3.5 14 C3 23 8 29.5 16 29.5 C12 27 10 24 9.5 22 C9 18 7 15 3.5 14 Z" fill={LEAF_D}/>
    <circle cx="11" cy="14" r="5" fill="#f4f0e0"/><circle cx="21" cy="14" r="5" fill="#f4f0e0"/><circle cx="16" cy="10.5" r="5.5" fill="#f4f0e0"/>
    <circle cx="13.5" cy="18.5" r="4.6" fill="#f4f0e0"/><circle cx="18.5" cy="18.5" r="4.6" fill="#f4f0e0"/>
    <path d="M9 14.5 q2 1.6 4 0 M14 10.5 q2 1.8 4 0 M19 14.5 q2 1.6 4 0 M12 19 q1.6 1.4 3.2 0 M17 19 q1.6 1.4 3.2 0" stroke="#d6ceb0" strokeWidth="1" {...round}/>
  </svg>
);

/* ── windowsill trays ── */
const Cress = () => (
  <svg {...S}>
    {[[7.5, 12], [10.5, 10.5], [13.5, 12.5], [16.5, 10], [19.5, 12], [22.5, 10.5], [25, 12.5]].map(([x, y], i) => (
      <g key={x}>
        <path d={`M${x} 21 L${x} ${y}`} stroke="#b9d68f" strokeWidth="1" {...round}/>
        <circle cx={x - 1.5} cy={y} r="1.75" fill={i % 2 ? "#4a9438" : "#5aa843"}/><circle cx={x + 1.5} cy={y} r="1.75" fill={i % 2 ? "#5aa843" : "#6dbb52"}/>
      </g>
    ))}
    <path d="M5 22 H27 L25.5 29.5 H6.5 Z" fill="#c9a97b"/>
    <rect x="4" y="20.5" width="24" height="2.8" rx="1" fill="#a98659"/>
  </svg>
);

const PeaShoots = () => (
  <svg {...S}>
    <path d="M16 22 C16 15 15 10 16 5 M12.5 22 C12 16 10 13 8.5 10 M19.5 22 C20 16 22 13 23.5 10" stroke="#6dbb52" strokeWidth="1.5" {...round}/>
    <path d="M16 5 C16 2.5 19.5 2.5 19.5 4.8 C19.5 6.2 17.8 6.2 17.8 5 M8.5 10 C6 9.5 5 6.5 7 5.6 M23.5 10 C26 9.5 27 6.5 25 5.6" stroke="#8fd07c" strokeWidth="0.9" {...round}/>
    <ellipse cx="13" cy="13.5" rx="3" ry="1.9" transform="rotate(-25 13 13.5)" fill="#5aa843"/>
    <ellipse cx="19" cy="11" rx="3" ry="1.9" transform="rotate(25 19 11)" fill="#4a9438"/>
    <ellipse cx="8.2" cy="12.6" rx="2.6" ry="1.7" transform="rotate(40 8.2 12.6)" fill="#4a9438"/>
    <ellipse cx="23.8" cy="12.6" rx="2.6" ry="1.7" transform="rotate(-40 23.8 12.6)" fill="#5aa843"/>
    <path d="M9 23 H23 L21.5 30 H10.5 Z" fill="#c9764a"/>
    <rect x="8" y="21.5" width="16" height="2.8" rx="1" fill="#a85d38"/>
  </svg>
);

const Microgreens = () => (
  <svg {...S}>
    {[[6.5, 14, "#bfd99a", "#5aa843"], [9.5, 12, "#d9608a", "#9b4f8e"], [12.5, 15, "#bfd99a", "#6dbb52"], [15.5, 11.5, "#d9608a", "#5aa843"], [18.5, 14.5, "#d9608a", "#9b4f8e"], [21.5, 12, "#bfd99a", "#6dbb52"], [24.5, 14.5, "#d9608a", "#5aa843"]].map(([x, y, stem, leaf]) => (
      <g key={x}>
        <path d={`M${x} 21.5 L${x} ${y}`} stroke={stem} strokeWidth="1.1" {...round}/>
        <circle cx={x - 1.6} cy={y - 0.4} r="1.9" fill={leaf}/><circle cx={x + 1.6} cy={y - 0.4} r="1.9" fill={leaf}/>
      </g>
    ))}
    <rect x="3.5" y="21" width="25" height="8" rx="2" fill="#4a5a57"/>
    <rect x="3.5" y="21" width="25" height="2.6" rx="1.3" fill="#34413f"/>
  </svg>
);

export const PRODUCE_SVG = {
  Cabbage, Spinach, Lettuce, Kale, "Brussels Sprouts": BrusselsSprouts,
  "Bean (Dry)": BeanDry, "Broad Bean": BroadBean, Zucchini, Cucumber,
  Basil, Oregano, Rosemary, Sage, Mint, "Swiss Chard": SwissChard, Thyme, Parsley, Dill, Fennel,
  Pear, Quince, Chestnut, Hazelnut, Broccoli, Cauliflower,
  Cress, "Pea Shoots": PeaShoots, Microgreens,
};

/* ── part 3: the crops that still showed a device emoji (a carved 🎃 for pumpkin, glossy on one phone and
   flat on another). With these every crop in data/crops.js has its own drawn icon. ── */
const CALYX = "M16 10.5 L12 7 L14.6 10.4 L9.5 10 L14 12.4 L16 15 L18 12.4 L22.5 10 L17.4 10.4 L20 7 Z";
const Tomato = () => (
  <svg {...S}>
    <ellipse cx="16" cy="18.5" rx="10.8" ry="9.8" fill="#e04a3f"/>
    <ellipse cx="11.2" cy="16" rx="2.2" ry="3.2" fill="#ee7468"/>
    <rect x="15.2" y="4.6" width="1.6" height="5" rx="0.8" fill={LEAF_D}/>
    <path d={CALYX} fill={LEAF}/>
  </svg>
);

const PepperSweet = () => (
  <svg {...S}>
    <path d="M14.5 10 C14.5 7.5 15.5 6.5 16.5 4 L18.6 4.8 C17.8 6.8 17.6 8 17.6 10 Z" fill={LEAF_D}/>
    <path d="M16 9.5 C12 7.5 6.5 10 6.5 16.5 C6.5 23 9 29.5 12.5 29.5 C14 29.5 14.8 28.5 16 28.5 C17.2 28.5 18 29.5 19.5 29.5 C23 29.5 25.5 23 25.5 16.5 C25.5 10 20 7.5 16 9.5 Z" fill="#f0b429"/>
    <path d="M12.5 11 C11.5 16 11.8 23 12.8 28.4 M19.5 11 C20.5 16 20.2 23 19.2 28.4" stroke="#d99a1a" strokeWidth="1" {...round}/>
    <ellipse cx="9.6" cy="16.5" rx="1.3" ry="3.4" fill="#f7cf63"/>
  </svg>
);

const PepperHot = () => (
  <svg {...S}>
    <path d="M10 7.6 C9.5 5.5 8 4 6 3.2" stroke={LEAF_D} strokeWidth="1.9" {...round}/>
    <path d="M7 10.5 C7 8 12 6.5 14.5 9 C19 13.5 19.5 22.5 27.5 27 C18 28.5 9 22.5 7 10.5 Z" fill="#d93a2f"/>
    <path d="M10 13.5 C11.5 18 14.5 22 18.5 24.5" stroke="#ef6a5c" strokeWidth="1.2" {...round}/>
    <path d="M6.4 11 C6 8.4 11.5 5.8 14.8 9 C12 9.3 9 10 6.4 11 Z" fill={LEAF_D}/>
  </svg>
);

const Potato = () => (
  <svg {...S}>
    <path d="M6 18 C5 12 10.5 7.5 17 8 C23.5 8.5 28 13 27 19 C26 24.5 20.5 27 14.5 26 C9.5 25.2 6.6 22.5 6 18 Z" fill="#c9a26b"/>
    <ellipse cx="10.6" cy="17" rx="1.6" ry="2.6" fill="#dbb986"/>
    {[[13, 13], [19.5, 12.5], [22, 19.5], [14, 22], [17.5, 17]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.2" ry="0.75" fill="#9c7743"/>)}
  </svg>
);

const SweetPotato = () => (
  <svg {...S}>
    <g transform="rotate(-30 16 16)">
      <path d="M2.5 16 C6 11 12 9.5 18 10 C23.5 10.5 27.5 13 29.5 16 C27.5 19 23.5 21.5 18 22 C12 22.5 6 21 2.5 16 Z" fill="#b5527a"/>
      <path d="M9 14 h2.4 M13.5 18.6 h2.6 M17 13.4 h2.2" stroke="#8f3c5e" strokeWidth="0.9" {...round}/>
      <ellipse cx="24.6" cy="16" rx="3.2" ry="4.4" fill="#f0a04a"/>
      <ellipse cx="24.6" cy="16" rx="1.5" ry="2.2" fill="#f6bd78"/>
    </g>
  </svg>
);

const ROOTS = "M14 28.5 L13.4 30.6 M16 28.8 L16 31 M18 28.5 L18.6 30.6";
const Onion = () => (
  <svg {...S}>
    <path d="M16 6 L15 2.5 M16 6 L17.4 3" stroke="#b97a2e" strokeWidth="1.2" {...round}/>
    <path d={ROOTS} stroke="#c9b28a" strokeWidth="0.9" {...round}/>
    <path d="M16 5 C16 9 8 11 7 19 C6.3 25 10.5 28.5 16 28.5 C21.5 28.5 25.7 25 25 19 C24 11 16 9 16 5 Z" fill="#d99a4a"/>
    <path d="M16 8 C12.5 13 11.5 20 13 27.5 M16 8 C19.5 13 20.5 20 19 27.5" stroke="#b97a2e" strokeWidth="1" {...round}/>
    <ellipse cx="10.6" cy="19.5" rx="1.4" ry="3.4" fill="#eab873"/>
  </svg>
);

const Garlic = () => (
  <svg {...S}>
    <path d={ROOTS} stroke="#c9b28a" strokeWidth="0.9" {...round}/>
    <path d="M16 3.5 C16.5 8 24.5 11.5 25 19.5 C25.4 25.5 21 28.5 16 28.5 C11 28.5 6.6 25.5 7 19.5 C7.5 11.5 15.5 8 16 3.5 Z" fill="#efe8d8" stroke="#d3c8ae" strokeWidth="0.8"/>
    <path d="M7.4 19.5 C7.7 14.5 10.5 11.8 13.2 10 C10.8 13.5 9.8 19 11 26.4 C8.4 25 7.2 22.5 7.4 19.5 Z" fill="#dccbe6"/>
    <path d="M16 9 C13 14 12.5 21 14 28 M16 9 C19 14 19.5 21 18 28" stroke="#c3b3d1" strokeWidth="1.1" {...round}/>
  </svg>
);

const Carrot = () => (
  <svg {...S}>
    <g transform="rotate(35 16 16)">
      <path d="M16 9 C14 6 11 4.5 9 2.5 C12.5 2.5 15 4.5 16 9 Z" fill={LEAF}/>
      <path d="M16 9 C18 6 21 4.5 23 2.5 C19.5 2.5 17 4.5 16 9 Z" fill={LEAF_D}/>
      <path d="M16 9 C15 6 15.2 3 16 0.8 C16.8 3 17 6 16 9 Z" fill="#6dbb52"/>
      <path d="M12.2 9.5 C12.2 8 19.8 8 19.8 9.5 C19.8 16 17.5 26 16 30.5 C14.5 26 12.2 16 12.2 9.5 Z" fill="#ee8a2e"/>
      <path d="M13.5 14 H16.5 M15.5 19 H18 M14.6 23.5 H16.6" stroke="#cf6f1c" strokeWidth="1" {...round}/>
    </g>
  </svg>
);

const Pumpkin = () => (
  <svg {...S}>
    <path d="M14.6 10.5 C14.6 8 15 6.5 17.5 5 L18.8 6.6 C17.4 7.6 17.4 9 17.4 10.5 Z" fill={LEAF_D}/>
    <ellipse cx="16" cy="19" rx="11.5" ry="9.2" fill="#e8892b"/>
    <ellipse cx="16" cy="19" rx="6.4" ry="9.2" fill="#f09a3e"/>
    <path d="M16 10 C13.6 13 13.6 25 16 28 M16 10 C18.4 13 18.4 25 16 28 M10 11.5 C6.5 15 6.5 23 10 26.5 M22 11.5 C25.5 15 25.5 23 22 26.5" stroke="#c96f1a" strokeWidth="1" {...round}/>
    <ellipse cx="8.4" cy="17.5" rx="1.2" ry="2.8" fill="#f3ac5c"/>
  </svg>
);

const Eggplant = () => (
  <svg {...S}>
    <g transform="rotate(40 16 16)">
      <rect x="15" y="2.6" width="2" height="5" rx="1" fill={LEAF_D}/>
      <path d="M16 8 C20 8 22.5 13 22.5 20 C22.5 26 19.8 30 16 30 C12.2 30 9.5 26 9.5 20 C9.5 13 12 8 16 8 Z" fill="#6b3a86"/>
      <ellipse cx="12.6" cy="19.5" rx="1.3" ry="4" fill="#8a57a6"/>
      <path d="M12 9.6 C12 6.6 20 6.6 20 9.6 L18.6 12.4 L16 10.8 L13.4 12.4 Z" fill={LEAF}/>
    </g>
  </svg>
);

const Watermelon = () => (
  <svg {...S}>
    <path d="M3.5 12 A12.5 12.5 0 0 0 28.5 12 Z" fill="#3f8a3a"/>
    <path d="M5.3 12 A10.7 10.7 0 0 0 26.7 12 Z" fill="#dff0c2"/>
    <path d="M6.4 12 A9.6 9.6 0 0 0 25.6 12 Z" fill="#e8505a"/>
    {[[11, 14.6], [16, 17], [21, 14.6], [13.5, 18.6], [18.5, 19]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="0.8" ry="1.3" fill="#3a2a2a"/>)}
  </svg>
);

const Melon = () => (
  <svg {...S}>
    <path d="M14 6 L14 3.4" stroke="#7a8a4a" strokeWidth="2" {...round}/>
    <circle cx="14" cy="16" r="10.5" fill="#dcc27e"/>
    <path d="M14 5.5 C9.5 9.5 9.5 22.5 14 26.5 M14 5.5 C18.5 9.5 18.5 22.5 14 26.5 M6.5 8.6 C2.4 13 2.4 19 6.5 23.4 M4 12.6 C10 10.4 18 10.4 24 12.6 M4 19.4 C10 21.6 18 21.6 24 19.4" stroke="#b9a25e" strokeWidth="0.9" {...round}/>
    <path d="M17 20.5 H30.5 C30 26.5 27 30 23.8 30 C20.5 30 17.5 26.5 17 20.5 Z" fill="#cdb26a"/>
    <path d="M18.6 20.5 H28.9 C28.4 25.4 26.2 28.4 23.8 28.4 C21.3 28.4 19.1 25.4 18.6 20.5 Z" fill="#f2a55a"/>
  </svg>
);

const Corn = () => (
  <svg {...S}>
    <path d="M16 3 C19.5 3 21.5 8 21.5 15 C21.5 21 19.5 26 16 26 C12.5 26 10.5 21 10.5 15 C10.5 8 12.5 3 16 3 Z" fill="#f2c230"/>
    <path d="M13.3 6 V24 M16 4 V25.5 M18.7 6 V24 M11 9 H21 M10.6 13 H21.4 M10.6 17 H21.4 M11.2 21 H20.8" stroke="#d9a81c" strokeWidth="0.9" {...round}/>
    <path d="M16 30.5 C9 29 5.5 21 7 12 C10.5 16 13.5 23 16 30.5 Z" fill={LEAF}/>
    <path d="M16 30.5 C23 29 26.5 21 25 12 C21.5 16 18.5 23 16 30.5 Z" fill={LEAF_D}/>
  </svg>
);

const Wheat = () => (
  <svg {...S}>
    <path d="M16 30.5 L16 8" stroke="#c9a23c" strokeWidth="1.4" {...round}/>
    <path d="M16 4 L16 1 M13 9.5 L10 5 M19 9.5 L22 5" stroke="#d1a436" strokeWidth="0.8" {...round}/>
    {[[13, 22.5, -25], [19, 22.5, 25], [13, 17.5, -25], [19, 17.5, 25], [13.3, 12.5, -22], [18.7, 12.5, 22]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="2.2" ry="3.4" transform={`rotate(${r} ${x} ${y})`} fill={i % 2 ? "#d1a436" : "#e3b94a"}/>)}
    <ellipse cx="16" cy="7" rx="2.2" ry="3.6" fill="#e3b94a"/>
  </svg>
);

const Strawberry = () => (
  <svg {...S}>
    <path d="M16 6.5 L16.6 2.6" stroke={LEAF_D} strokeWidth="1.6" {...round}/>
    <path d="M16 29.5 C9 25.5 6 19.5 6.5 14.5 C7 10.5 11.5 9 16 11 C20.5 9 25 10.5 25.5 14.5 C26 19.5 23 25.5 16 29.5 Z" fill="#e23b4a"/>
    {[[11, 15.5], [16, 15], [21, 15.5], [13.3, 19.5], [18.7, 19.5], [16, 23.5], [11.6, 22.4], [20.4, 22.4]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="0.7" ry="1" fill="#f6d36b"/>)}
    <path d="M16 12.5 L10 10 L13.5 7.8 L12.5 4.4 L16 6.6 L19.5 4.4 L18.5 7.8 L22 10 Z" fill={LEAF}/>
  </svg>
);

const Apple = () => (
  <svg {...S}>
    <path d="M16 11 C16 8 16.6 6 18 4" stroke="#7a5a3a" strokeWidth="1.5" {...round}/>
    <path d="M18 5.5 C20.5 3 24 3.4 25.5 5.4 C23.5 7.6 20 7.4 18 5.5 Z" fill={LEAF}/>
    <path d="M16 10.5 C12 7.5 5.5 9.5 5.5 17.5 C5.5 24 10 30 13.5 30 C14.8 30 15.2 29.3 16 29.3 C16.8 29.3 17.2 30 18.5 30 C22 30 26.5 24 26.5 17.5 C26.5 9.5 20 7.5 16 10.5 Z" fill="#d93a3a"/>
    <ellipse cx="9.8" cy="16.5" rx="1.5" ry="3.2" fill="#ec6a64"/>
  </svg>
);

const Peach = () => (
  <svg {...S}>
    <path d="M15 8.5 C11.5 4.5 7.5 4.8 5.5 7.5 C8.5 10.6 12 10.4 15 8.5 Z" fill={LEAF}/>
    <circle cx="16" cy="18.5" r="10.6" fill="#f6a66e"/>
    <path d="M16 7.9 C22.5 7.9 26.6 13 26.6 18.5 C26.6 24 22.5 29.1 16 29.1 C19 24 19 13 16 7.9 Z" fill="#ee7f63"/>
    <path d="M16 9 C13.6 15 13.6 23 16 29" stroke="#d9774a" strokeWidth="1" {...round}/>
    <ellipse cx="10" cy="15.5" rx="1.5" ry="2.8" fill="#fbc49a"/>
  </svg>
);

const Cherry = () => (
  <svg {...S}>
    <path d="M10.5 18 C11 12 14 7 19 4 M21.5 19.5 C21.5 13 20.5 8 19 4" stroke="#6b8f3a" strokeWidth="1.3" {...round}/>
    <path d="M19 4 C22 2 26 3 27.5 5.6 C24.5 7.6 21 7 19 4 Z" fill={LEAF}/>
    <circle cx="10.5" cy="22.5" r="5.7" fill="#c8202f"/>
    <circle cx="21.5" cy="24" r="5.7" fill="#a81a2c"/>
    <circle cx="8.6" cy="20.6" r="1.3" fill="#e8596a"/><circle cx="19.6" cy="22.1" r="1.3" fill="#d04a5c"/>
  </svg>
);

const Lemon = () => (
  <svg {...S}>
    <path d="M19.5 10.5 C20.5 7 24 5.5 27 6.5 C26.5 10 23 12 19.5 10.5 Z" fill={LEAF}/>
    <g transform="rotate(-30 16 18)">
      <path d="M4 18 C5.5 16.5 6.5 16.5 7.5 15 C10 10.5 22 10.5 24.5 15 C25.5 16.5 26.5 16.5 28 18 C26.5 19.5 25.5 19.5 24.5 21 C22 25.5 10 25.5 7.5 21 C6.5 19.5 5.5 19.5 4 18 Z" fill="#f4d03f"/>
      <ellipse cx="12.5" cy="15.4" rx="3" ry="1.2" fill="#f9e27a"/>
    </g>
  </svg>
);

const Orange = () => (
  <svg {...S}>
    <circle cx="16" cy="18.5" r="10.8" fill="#f28c28"/>
    <ellipse cx="11" cy="14.5" rx="2" ry="3" transform="rotate(30 11 14.5)" fill="#f8ab55"/>
    {[[18, 14.5], [21, 19.5], [15, 22.5], [11, 20.5], [19, 24.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.6" fill="#d9741a"/>)}
    <path d="M16.5 8 C19 4 23.5 3.7 26 6 C23.5 9.5 19.5 9.9 16.5 8 Z" fill={LEAF}/>
    <circle cx="16" cy="8.2" r="1.2" fill="#6b8f3a"/>
  </svg>
);

const Olive = () => (
  <svg {...S}>
    <path d="M5 6.5 C12 8.5 20 8.5 27 5.5 M12 8 L11.5 12.5 M20 8.2 L20.5 13.5" stroke="#7a6248" strokeWidth="1.2" {...round}/>
    <ellipse cx="9.5" cy="4.6" rx="4.6" ry="1.6" transform="rotate(-18 9.5 4.6)" fill="#7d9a6a"/>
    <ellipse cx="22.5" cy="4" rx="4.6" ry="1.6" transform="rotate(12 22.5 4)" fill="#93ad80"/>
    <ellipse cx="11.2" cy="18.5" rx="5" ry="6.4" fill="#7f9a3c"/><ellipse cx="9.6" cy="16.5" rx="1.1" ry="2.2" fill="#a3bc5c"/>
    <ellipse cx="20.8" cy="20.5" rx="5.2" ry="6.8" fill="#3b2d45"/><ellipse cx="19" cy="18.5" rx="1.1" ry="2.3" fill="#66557a"/>
  </svg>
);

const Grape = () => (
  <svg {...S}>
    <path d="M16 8 L16 3" stroke="#7a5a3a" strokeWidth="1.5" {...round}/>
    <path d="M16 4.5 C19 1.5 24 2 26 5 C23 8 19 7.5 16 4.5 Z" fill={LEAF}/>
    {[[9.5, 10.8], [16, 10.8], [22.5, 10.8], [12.75, 15.8], [19.25, 15.8], [16, 20.8], [16, 25.6]].map(([x, y], i) => (
      <g key={i}><circle cx={x} cy={y} r={i === 6 ? 2.9 : 3.4} fill={i % 2 ? "#6d4494" : "#7b4fa3"}/><circle cx={x - 1.1} cy={y - 1.1} r="0.9" fill="#a47fca"/></g>
    ))}
  </svg>
);

const Chamomile = () => (
  <svg {...S}>
    <path d="M16 30.5 L16 17" stroke={LEAF} strokeWidth="1.4" {...round}/>
    <path d="M16 25 L11 22 M16 25 L21 22 M16 28 L12 27 M16 28 L20 27" stroke={LEAF} strokeWidth="0.9" {...round}/>
    {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((a) => <ellipse key={a} cx="16" cy="5.6" rx="2" ry="4.4" transform={`rotate(${a} 16 11.5)`} fill="#f4f0e2" stroke="#d6cfb8" strokeWidth="0.5"/>)}
    <circle cx="16" cy="11.5" r="3.7" fill="#f2c230"/><circle cx="15" cy="10.5" r="1.4" fill="#f8dc6b"/>
  </svg>
);

const Sunflower = () => (
  <svg {...S}>
    <path d="M16 30.5 L16 20" stroke={LEAF_D} strokeWidth="1.8" {...round}/>
    <path d="M16 26 C12.5 26.5 10 24.5 9.5 21.5 C12.5 21.5 15 23 16 26 Z" fill={LEAF}/>
    <path d="M16 27.5 C19.5 28 22 26 22.5 23 C19.5 23 17 24.5 16 27.5 Z" fill={LEAF_D}/>
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, i) => <ellipse key={a} cx="16" cy="4.8" rx="2" ry="4.2" transform={`rotate(${a} 16 12)`} fill={i % 2 ? "#e8a91c" : "#f2c230"}/>)}
    <circle cx="16" cy="12" r="5" fill="#6b4226"/><circle cx="16" cy="12" r="3" fill="#8a5a36"/>
  </svg>
);

Object.assign(PRODUCE_SVG, {
  Tomato, "Pepper (Sweet)": PepperSweet, "Pepper (Hot)": PepperHot, Potato, "Sweet Potato": SweetPotato, Onion, Garlic, Carrot,
  Pumpkin, Eggplant, Watermelon, Melon, Corn, Wheat, Strawberry, Apple, Peach, Cherry, Lemon, Orange, Olive, Grape, Chamomile, Sunflower,
});
