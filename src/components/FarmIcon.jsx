/* ═══════════════════════════════════════════
   FARM ICON SET — custom flat SVG icons
   MARKER: FARM_ICON_SET_V1

   Covers every crop/animal that has no proper Unicode emoji
   (the old "red dot for radishes" problem). Consistent style:
   32×32 viewBox, flat 2-tone fills + shared leaf green.
   <FarmIcon name emoji size/> renders the SVG when one exists,
   otherwise falls back to the data emoji.
   ═══════════════════════════════════════════ */
import React from "react";
import PlantArt from "../features/quiet/PlantArt";
import AnimalArt from "../features/quiet/AnimalArt";
import {CROP_MAP} from "../data/crops";
import {LDB} from "../data/livestock";
import {TOY} from "../features/grove/palette";
import { PRODUCE_SVG } from "./farm-icons-produce";

// leaf greens from the shared map palette, so produce icons sit with the 3D-rendered crop icons
const LEAF = TOY.leaf[1];
const LEAF_D = TOY.leaf[3];
const STEM = TOY.leafDark;

const Radish = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16 11 C13 6.5 9.5 5 7.5 6 C9.5 9.5 12.8 10.8 16 11.4 Z" fill={LEAF}/>
    <path d="M16 11 C19 6.5 22.5 5 24.5 6 C22.5 9.5 19.2 10.8 16 11.4 Z" fill={LEAF_D}/>
    <path d="M16 11.5 C15.4 7.5 15.4 5.5 16 3.5 C16.6 5.5 16.6 7.5 16 11.5 Z" fill={LEAF}/>
    <path d="M15.2 25.8 L16 30.6 L16.8 25.8 Z" fill="#ead9c8"/>
    <circle cx="16" cy="19" r="7.6" fill="#d94f54"/>
    <ellipse cx="13.2" cy="16.6" rx="2" ry="2.9" fill="#e8797d"/>
  </svg>
);

const Beetroot = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M13.6 12 L12.4 5.5" stroke="#b14a66" strokeWidth="1.6" fill="none"/>
    <path d="M18.4 12 L19.6 5.5" stroke="#b14a66" strokeWidth="1.6" fill="none"/>
    <ellipse cx="11.4" cy="5" rx="3" ry="2" fill={LEAF} transform="rotate(-24 11.4 5)"/>
    <ellipse cx="20.6" cy="5" rx="3" ry="2" fill={LEAF_D} transform="rotate(24 20.6 5)"/>
    <path d="M15.2 25.6 L16 30.4 L16.8 25.6 Z" fill="#6e2238"/>
    <circle cx="16" cy="19" r="7.6" fill="#93324e"/>
    <ellipse cx="13.2" cy="16.4" rx="2" ry="2.9" fill="#ad4a66"/>
  </svg>
);

const Turnip = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16 11.5 C13.2 7 10 5.6 8 6.4 C10 9.8 13 11 16 11.7 Z" fill={LEAF}/>
    <path d="M16 11.5 C18.8 7 22 5.6 24 6.4 C22 9.8 19 11 16 11.7 Z" fill={LEAF_D}/>
    <path d="M15.2 26 L16 30.4 L16.8 26 Z" fill="#e7dec9"/>
    <circle cx="16" cy="19.5" r="7.5" fill="#f3ecda"/>
    <path d="M8.6 18 A7.5 7.5 0 0 1 23.4 18 C21 19.6 18.5 20.3 16 20.3 C13.5 20.3 11 19.6 8.6 18 Z" fill="#9b6bb5"/>
  </svg>
);

const Leek = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16 15 C16 8 13 4.5 8.5 3 C11.5 8 12.8 11.5 13.3 15.5 Z" fill={LEAF}/>
    <path d="M16 15 C16 8 19 4.5 23.5 3 C20.5 8 19.2 11.5 18.7 15.5 Z" fill={LEAF_D}/>
    <path d="M15 15 C15.3 8.5 16.7 8.5 17 15 Z" fill="#6fae7f"/>
    <path d="M13 14.5 H19 L18.4 27 A2.4 2.6 0 0 1 13.6 27 Z" fill="#f4efdd"/>
    <path d="M14.2 29.4 L13.8 31 M16 29.8 L16 31.4 M17.8 29.4 L18.2 31" stroke="#d9cfae" strokeWidth="1" fill="none"/>
  </svg>
);

const Celery = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <rect x="11.4" y="12" width="3" height="17" rx="1.5" fill="#c5dc8e"/>
    <rect x="18" y="12" width="3" height="17" rx="1.5" fill="#c5dc8e"/>
    <rect x="14.6" y="10" width="3.2" height="19" rx="1.6" fill="#b6d37e"/>
    <circle cx="12.9" cy="10.4" r="2.5" fill="#5d9b6b"/>
    <circle cx="19.5" cy="10.4" r="2.5" fill="#5d9b6b"/>
    <circle cx="16.2" cy="8" r="2.8" fill={LEAF}/>
    <circle cx="14.4" cy="6.6" r="1.7" fill={LEAF_D}/>
    <circle cx="18.2" cy="6.8" r="1.6" fill={LEAF_D}/>
  </svg>
);

const Celeriac = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M15 11.5 L13.6 6" stroke={STEM} strokeWidth="1.5" fill="none"/>
    <path d="M17 11.5 L18.6 6.5" stroke={STEM} strokeWidth="1.5" fill="none"/>
    <circle cx="13.2" cy="5.2" r="1.8" fill={LEAF}/>
    <circle cx="19" cy="5.6" r="1.7" fill={LEAF_D}/>
    <circle cx="16" cy="19" r="8" fill="#e6d8b8"/>
    <circle cx="10.4" cy="22.6" r="2.1" fill="#d8c79f"/>
    <circle cx="13.6" cy="25.4" r="2.2" fill="#d8c79f"/>
    <circle cx="18.6" cy="25.6" r="2" fill="#d8c79f"/>
    <circle cx="21.8" cy="22.4" r="1.9" fill="#d8c79f"/>
    <path d="M12 28.5 L11 31 M16 29.4 L16 31.6 M20 28.5 L21 31" stroke="#c0ad84" strokeWidth="1" fill="none"/>
  </svg>
);

const Pea = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M5 14.5 C3.4 13 3.4 11.4 4.6 10.2 L6.5 12.4 Z" fill={LEAF_D}/>
    <path d="M4.6 18.5 C8 10.5 24 10.5 27.4 18.5 C24.5 23.8 7.5 23.8 4.6 18.5 Z" fill={LEAF}/>
    <circle cx="10.8" cy="17.4" r="3.1" fill="#8fd07c"/>
    <circle cx="16" cy="17.8" r="3.3" fill="#8fd07c"/>
    <circle cx="21.2" cy="17.4" r="3.1" fill="#8fd07c"/>
    <circle cx="9.9" cy="16.4" r="1" fill="#bce8ab"/>
    <circle cx="15.1" cy="16.8" r="1" fill="#bce8ab"/>
    <circle cx="20.3" cy="16.4" r="1" fill="#bce8ab"/>
  </svg>
);

const Okra = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M14.6 7 L17 3.6 L19.4 5.4 L17.2 8.4 Z" fill="#3f7a4f"/>
    <path d="M10 26.5 C8.2 20 11 11 15 6.6 C16.4 5.3 18.2 5.8 18.7 7.5 C20.2 12.5 17 22.5 13.4 27.6 C12.2 29.2 10.5 28.4 10 26.5 Z" fill="#5fae6e"/>
    <path d="M13.4 9 C11.6 13.5 10.8 19.5 11.2 24.5" stroke="#4a8f5c" strokeWidth="1" fill="none"/>
    <path d="M16.6 9.5 C15.4 14 14.4 20 13.4 24.8" stroke="#4a8f5c" strokeWidth="1" fill="none"/>
  </svg>
);

const Plum = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16.6 9.5 L18 5" stroke="#6b4a2f" strokeWidth="1.7" fill="none"/>
    <ellipse cx="21" cy="6" rx="3.2" ry="1.8" fill={LEAF} transform="rotate(-24 21 6)"/>
    <circle cx="16" cy="18.5" r="9" fill="#7350a0"/>
    <path d="M16 10 C14.2 12.6 14.2 24.4 16 27" stroke="#5c3f85" strokeWidth="1.4" fill="none"/>
    <ellipse cx="12.4" cy="14.4" rx="2.4" ry="3.4" fill="#8d6bbd"/>
  </svg>
);

const Apricot = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16.6 10 L18 5.4" stroke="#6b4a2f" strokeWidth="1.7" fill="none"/>
    <ellipse cx="21" cy="6.4" rx="3.2" ry="1.8" fill={LEAF} transform="rotate(-24 21 6.4)"/>
    <circle cx="16" cy="19" r="8.8" fill="#f2a24e"/>
    <circle cx="19.4" cy="21" r="5" fill="#e88a3c"/>
    <path d="M16 10.6 C14.4 13 14.4 25 16 27.4" stroke="#d27c2e" strokeWidth="1.3" fill="none"/>
    <ellipse cx="12.6" cy="15" rx="2.2" ry="3.2" fill="#f7bd7d"/>
  </svg>
);

const Persimmon = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <ellipse cx="16" cy="19.4" rx="9" ry="7.8" fill="#e7762d"/>
    <ellipse cx="12.4" cy="16.4" rx="2.4" ry="3" fill="#f29a52"/>
    <ellipse cx="16" cy="10.8" rx="4" ry="1.7" fill="#4f8a4f"/>
    <ellipse cx="16" cy="10.8" rx="1.6" ry="3.4" fill="#4f8a4f"/>
    <circle cx="16" cy="9" r="1.2" fill="#3c6e3e"/>
  </svg>
);

const Fig = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16 4 L16 8.5" stroke={STEM} strokeWidth="1.8" fill="none"/>
    <path d="M16 5.5 C17.2 9 24 11.5 24 18.5 A8 8 0 0 1 8 18.5 C8 11.5 14.8 9 16 5.5 Z" fill="#7c4d75"/>
    <circle cx="16" cy="21.4" r="4.6" fill="#92608a"/>
    <ellipse cx="12.6" cy="15.4" rx="1.8" ry="2.8" fill="#966690" transform="rotate(18 12.6 15.4)"/>
  </svg>
);

const Pomegranate = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M12.5 10 L12.5 6.4 L14.5 8.2 L16 5.4 L17.5 8.2 L19.5 6.4 L19.5 10 Z" fill="#a8332f"/>
    <circle cx="16" cy="18.8" r="8.8" fill="#c2403c"/>
    <ellipse cx="12.6" cy="15" rx="2.3" ry="3.2" fill="#d8625c"/>
  </svg>
);

const Lentil = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <circle cx="11" cy="18.6" r="4.8" fill="#b07a3f"/>
    <circle cx="11" cy="18.6" r="2.4" fill="none" stroke="#8d5d2b" strokeWidth="1"/>
    <circle cx="19" cy="14.6" r="4.8" fill="#c08a4c"/>
    <circle cx="19" cy="14.6" r="2.4" fill="none" stroke="#9d6c34" strokeWidth="1"/>
    <circle cx="18.4" cy="23" r="4.8" fill="#a06e36"/>
    <circle cx="18.4" cy="23" r="2.4" fill="none" stroke="#7d5226" strokeWidth="1"/>
  </svg>
);

const Chickpea = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <circle cx="21.6" cy="21.4" r="5.4" fill="#cfa75f"/>
    <circle cx="23.6" cy="17" r="2.2" fill="#cfa75f"/>
    <circle cx="13.6" cy="18.6" r="7" fill="#ddb873"/>
    <circle cx="17.8" cy="13.2" r="2.7" fill="#ddb873"/>
    <path d="M10.5 15.5 C9 17.5 9 20.5 10.5 22.5" stroke="#c39c54" strokeWidth="1.1" fill="none"/>
    <ellipse cx="12" cy="15.4" rx="1.5" ry="2.1" fill="#ecd09a"/>
  </svg>
);

const Rhubarb = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M12.2 29.5 L11 13 Q11 11 13 11 T15 13 L16.2 29.5 Z" fill="#d6486a"/>
    <path d="M17.4 29.5 L17.8 14 Q17.8 12 19.8 12 T21.8 14 L22.2 29.5 Z" fill="#c43c5e"/>
    <path d="M9 10.5 C7 5.5 13.5 2 17 4 C22 1.8 27.4 5.6 24.6 9.6 C27 12.6 21 15 18 13 C14 15.8 9 14.5 9 10.5 Z" fill={LEAF}/>
    <path d="M16.5 4.6 L16.8 12.4" stroke={LEAF_D} strokeWidth="1.1" fill="none"/>
  </svg>
);

const Lavender = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16 30 L16 13" stroke={STEM} strokeWidth="1.6" fill="none"/>
    <path d="M16 24 L11.5 20.6 M16 21.5 L20.5 18.4" stroke={STEM} strokeWidth="1.4" fill="none"/>
    <circle cx="16" cy="13.2" r="1.9" fill="#8e6cc0"/>
    <circle cx="14.3" cy="11.4" r="1.9" fill="#9a7bc9"/>
    <circle cx="17.7" cy="11.4" r="1.9" fill="#8e6cc0"/>
    <circle cx="16" cy="9.6" r="1.9" fill="#9a7bc9"/>
    <circle cx="14.3" cy="7.8" r="1.8" fill="#8e6cc0"/>
    <circle cx="17.7" cy="7.8" r="1.8" fill="#9a7bc9"/>
    <circle cx="16" cy="6" r="1.7" fill="#a285d4"/>
    <circle cx="16" cy="4" r="1.4" fill="#b39ae0"/>
  </svg>
);

const BerryCluster = ({ body, shine }) => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16 9 L16 5.2" stroke={STEM} strokeWidth="1.6" fill="none"/>
    <ellipse cx="12.6" cy="9.6" rx="2.8" ry="1.5" fill={LEAF} transform="rotate(-22 12.6 9.6)"/>
    <ellipse cx="19.4" cy="9.6" rx="2.8" ry="1.5" fill={LEAF_D} transform="rotate(22 19.4 9.6)"/>
    <circle cx="12.8" cy="13.6" r="2.5" fill={body}/>
    <circle cx="19.2" cy="13.6" r="2.5" fill={body}/>
    <circle cx="16" cy="15.4" r="2.5" fill={body}/>
    <circle cx="11.4" cy="18.4" r="2.5" fill={body}/>
    <circle cx="20.6" cy="18.4" r="2.5" fill={body}/>
    <circle cx="16" cy="20.2" r="2.5" fill={body}/>
    <circle cx="13.2" cy="23" r="2.5" fill={body}/>
    <circle cx="18.8" cy="23" r="2.5" fill={body}/>
    <circle cx="16" cy="25.8" r="2.3" fill={body}/>
    <circle cx="12.2" cy="13" r=".75" fill={shine}/>
    <circle cx="15.4" cy="14.8" r=".75" fill={shine}/>
    <circle cx="10.8" cy="17.8" r=".75" fill={shine}/>
    <circle cx="18.2" cy="22.4" r=".75" fill={shine}/>
  </svg>
);

const Raspberry = () => <BerryCluster body="#d23f5e" shine="#ee8aa0"/>;
const Blackberry = () => <BerryCluster body="#46355e" shine="#7a659a"/>;

const Walnut = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <circle cx="16" cy="17.5" r="9" fill="#b98a4f"/>
    <path d="M16 9 C13.6 13 13.6 22 16 26" stroke="#93693a" strokeWidth="1.3" fill="none"/>
    <path d="M16 9 C18.4 13 18.4 22 16 26" stroke="#93693a" strokeWidth="1.3" fill="none"/>
    <path d="M10 15.5 Q12 17 14 15.5" stroke="#9d7240" strokeWidth="1" fill="none"/>
    <path d="M18 20.5 Q20 22 22 20.5" stroke="#9d7240" strokeWidth="1" fill="none"/>
  </svg>
);

const Almond = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M16 4.5 C21.5 9 24 15 24 20 A8 8 0 0 1 8 20 C8 15 10.5 9 16 4.5 Z" fill="#d9a05b"/>
    <circle cx="13.2" cy="14" r=".8" fill="#b8813e"/>
    <circle cx="18.2" cy="12.6" r=".8" fill="#b8813e"/>
    <circle cx="15.2" cy="18.2" r=".8" fill="#b8813e"/>
    <circle cx="19.4" cy="18.4" r=".8" fill="#b8813e"/>
    <circle cx="12.2" cy="20.6" r=".8" fill="#b8813e"/>
    <circle cx="16.6" cy="23" r=".8" fill="#b8813e"/>
  </svg>
);

const Artichoke = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <rect x="14.7" y="25" width="2.6" height="5" rx="1.2" fill={STEM}/>
    <circle cx="16" cy="18.5" r="8.4" fill="#6fae7f"/>
    <path d="M8.6 15.5 C8 18.6 9 21.8 11 24 L13.8 19.6 Z" fill="#588f68"/>
    <path d="M23.4 15.5 C24 18.6 23 21.8 21 24 L18.2 19.6 Z" fill="#588f68"/>
    <path d="M16 5.5 C12.8 8.5 11.8 12 12.4 15.4 L16 13 L19.6 15.4 C20.2 12 19.2 8.5 16 5.5 Z" fill="#4a7d59"/>
    <path d="M10.6 21.8 Q16 24.8 21.4 21.8" stroke="#4a7d59" strokeWidth="1.1" fill="none"/>
  </svg>
);

const Asparagus = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <rect x="11" y="9" width="3" height="20" rx="1.5" fill="#7fae68"/>
    <rect x="14.6" y="6" width="3.2" height="23" rx="1.6" fill="#6fa05c"/>
    <rect x="18.4" y="9" width="3" height="20" rx="1.5" fill="#7fae68"/>
    <path d="M12.5 5.6 L10.7 9.8 L14.3 9.8 Z" fill="#587f45"/>
    <path d="M16.2 2.6 L14.2 7 L18.2 7 Z" fill="#587f45"/>
    <path d="M19.9 5.6 L18.1 9.8 L21.7 9.8 Z" fill="#587f45"/>
    <path d="M12.5 14 L11 16.4 L14 16.4 Z" fill="#5d8a4f"/>
    <path d="M16.2 12 L14.7 14.4 L17.7 14.4 Z" fill="#5d8a4f"/>
    <path d="M19.9 15 L18.4 17.4 L21.4 17.4 Z" fill="#5d8a4f"/>
  </svg>
);

const Quail = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M22.8 9 C22.3 5.8 24.4 3.4 26 3.5 C25.7 5.8 24.8 7.9 23.7 9.5 Z" fill="#4d3a26"/>
    <ellipse cx="15" cy="19.5" rx="9" ry="7.4" fill="#9c7a52"/>
    <ellipse cx="12.8" cy="22" rx="4.8" ry="3.8" fill="#e3d3b4"/>
    <ellipse cx="13.4" cy="16.6" rx="4.6" ry="3.2" fill="#87663f" transform="rotate(-14 13.4 16.6)"/>
    <circle cx="21.6" cy="12.6" r="4.6" fill="#8a6a45"/>
    <circle cx="9.6" cy="17" r=".7" fill="#f0e6cf"/>
    <circle cx="17" cy="22.6" r=".7" fill="#f0e6cf"/>
    <circle cx="11.8" cy="14" r=".7" fill="#f0e6cf"/>
    <circle cx="22.8" cy="11.8" r="1" fill="#2b2118"/>
    <path d="M25.9 13 L28.6 14 L26.1 15.4 Z" fill="#d9a05b"/>
  </svg>
);

const GuineaFowl = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%">
    <path d="M20.6 14.5 C21.8 11.8 23 10.6 24.3 10" stroke="#8d939b" strokeWidth="2.6" fill="none"/>
    <ellipse cx="14.5" cy="20" rx="9.4" ry="7.6" fill="#5a5f66"/>
    <circle cx="9.4" cy="17.4" r=".7" fill="#e9ecef"/>
    <circle cx="13" cy="15.6" r=".7" fill="#e9ecef"/>
    <circle cx="17" cy="16.6" r=".7" fill="#e9ecef"/>
    <circle cx="10.6" cy="21.4" r=".7" fill="#e9ecef"/>
    <circle cx="14.6" cy="20" r=".7" fill="#e9ecef"/>
    <circle cx="18.6" cy="21" r=".7" fill="#e9ecef"/>
    <circle cx="12.2" cy="24.4" r=".7" fill="#e9ecef"/>
    <circle cx="16.4" cy="24.8" r=".7" fill="#e9ecef"/>
    <circle cx="8.2" cy="20" r=".7" fill="#e9ecef"/>
    <circle cx="20" cy="18" r=".7" fill="#e9ecef"/>
    <circle cx="24.8" cy="9.2" r="2.7" fill="#c9cfd6"/>
    <path d="M23.7 7.2 L24.9 4.8 L26.1 7.2 Z" fill="#b9803c"/>
    <circle cx="25.9" cy="11.3" r="1.1" fill="#d24b48"/>
    <circle cx="25.5" cy="8.8" r=".8" fill="#2b2f33"/>
    <path d="M27.3 9.4 L29.6 10.2 L27.5 11.2 Z" fill="#b9803c"/>
  </svg>
);

/* Exact-name lookup. Keys must match CROPS[].name / LDB keys. */
// eslint-disable-next-line react-refresh/only-export-components -- icon registry lives with its components by design; dev-only Fast Refresh nit
export const FARM_SVG = {
  Radish, Beetroot, Turnip, Leek, Celery, Celeriac, Pea, Okra,
  Plum, Apricot, Persimmon, Fig, Pomegranate, Lentil, Chickpea,
  Rhubarb, Lavender, Raspberry, Blackberry, Walnut, Almond,
  Artichoke, Asparagus,
  Quail, "Guinea Fowl": GuineaFowl,
  ...PRODUCE_SVG, // part 2: one picture per crop (farm-icons-produce.jsx)
};

// eslint-disable-next-line react-refresh/only-export-components -- see FARM_SVG note
export function hasFarmIcon(name) {
  return !!FARM_SVG[name];
}

/* <FarmIcon name="Radish" emoji="🔴" size={24}/>
   Renders the custom SVG when one exists for `name`,
   otherwise the emoji fallback. Inline-flex so it sits
   in text rows like an emoji would. */
export default function FarmIcon({ name, emoji, size = 20, style, harvest = false }) {
  if(LDB[name])return <span aria-hidden="true" style={{display:'inline-flex',verticalAlign:'middle',...style}}><AnimalArt species={name} size={size}/></span>;
  if(!harvest&&CROP_MAP.has(name)&&!CROP_MAP.get(name).tray)return <span aria-hidden="true" style={{display:'inline-flex',verticalAlign:'middle',...style}}><PlantArt crop={name} stage={4} size={size}/></span>;
  const Ic = name ? FARM_SVG[name] : null;
  if (Ic) {
    return (
      <span
        data-farm-icon={name}
        aria-hidden="true"
        style={{
          display: "inline-flex",
          width: size,
          height: size,
          flexShrink: 0,
          verticalAlign: "-0.18em",
          ...style,
        }}
      >
        <Ic/>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ fontSize: Math.round(size * 0.92), lineHeight: 1, flexShrink: 0, ...style }}
    >
      {emoji || "🌱"}
    </span>
  );
}

