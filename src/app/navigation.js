import { Sun, Tractor, CalendarDays, BookOpen, TrendingUp, ShieldCheck } from "lucide-react";

/* ═══════════════════════════════════════════
   NAVIGATION CONFIG — Launch Stage 5 (2026-09-28)
   Five areas for everyone (brief §8): Today, Farm, Plan, Learn,
   Progress. ("Farm" was "My Space", and "Map" on the phone tab bar, until 2026-11-11.
   It opens on Crops; the map is last because Today already shows it.) Each area groups existing pages; no page was removed and
   page ids are unchanged (they are persisted by savePage and used by
   setPage calls all over the app). New pages: "plan", "progress".

   Used by App.jsx: desktop sidebar (areas + their pages), tablet rail and
   mobile bottom tabs (areas only), and the sub-page tabs on top of a page
   (SectionBar) on screens without the full sidebar.
   ═══════════════════════════════════════════ */

export const SECTIONS = [
  { id: "today", l: "Today", E: Sun, pages: [
    { id: "home", l: "Overview" },
    { id: "tasks", l: "All tasks" },
  ] },
  { id: "space", l: "Farm", E: Tractor, pages: [
    { id: "crops", l: "Crops" },
    { id: "live", l: "Animals" },
    { id: "map", l: "Map" },
  ] },
  { id: "plan", l: "Plan", E: CalendarDays, pages: [
    { id: "plan", l: "Plan" },
  ] },
  { id: "learn", l: "Learn", E: BookOpen, pages: [
    { id: "manuals", l: "Guides" },
  ] },
  { id: "progress", l: "Progress", E: TrendingUp, pages: [
    { id: "progress", l: "Overview" },
    { id: "insights", l: "Insights" },
    { id: "pantry", l: "Pantry" },
    { id: "fin", l: "Money" },
  ] },
];

/* Owner-only page — appended at runtime in App.jsx when the signed-in user
   is the owner (checkIsAdmin). Regular users never see it. */
export const ADMIN_NAV = { id: "admin", l: "Admin", E: ShieldCheck };

/** Pages that exist but belong to no area (reached from the account menu). */
const LOOSE_PAGES = new Set(["feedback", "admin"]);

/** The area a page belongs to. Unknown pages fall back to Today. */
export function sectionOf(page) {
  for (const s of SECTIONS) {
    if (s.pages.some((p) => p.id === page)) return s;
  }
  return LOOSE_PAGES.has(page) ? null : SECTIONS[0];
}

/** Every page id the app can show (for validating a saved page). */
export const PAGE_IDS = new Set(SECTIONS.flatMap((s) => s.pages.map((p) => p.id)).concat([...LOOSE_PAGES]));

/** A page saved by an older version of the app → the page it is now. */
export function normalizePage(saved) {
  if (saved === "farm") return "map";
  if (saved === "season") return "plan"; // the seasonal calendar lives in Plan now
  if (!saved || saved === "setup" || !PAGE_IDS.has(saved)) return "home";
  return saved;
}
