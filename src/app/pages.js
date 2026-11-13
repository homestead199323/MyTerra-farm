/* Every screen that is not the farm map loads from its own file, the first time it is opened.
   The map is the home screen: a phone opening the app downloads and parses the map, not the
   guides, the money page and the designer along with it. Once the map is up and the device is
   idle, the other screens are fetched in the background, so opening one is instant (and the
   service worker has them for offline use). */
import { lazy } from "react";

const load = {
  Pantry: () => import("../features/pantry/Pantry"),
  Financials: () => import("../features/financials/Financials"),
  Manuals: () => import("../features/manuals/Manuals"),
  Livestock: () => import("../features/animals/Livestock"),
  Farm: () => import("../features/farm/Farm"),
  TaskQueue: () => import("../features/tasks/TaskQueue"),
  PlanScreen: () => import("../features/plan/PlanScreen"),
  ProgressScreen: () => import("../features/progress/ProgressScreen"),
  InsightsScreen: () => import("../features/progress/InsightsScreen"),
  FeedbackSurvey: () => import("../features/feedback/FeedbackSurvey"),
  AdminDashboard: () => import("../features/admin/AdminDashboard"),
  SettingsPanel: () => import("../features/settings/SettingsPanel"),
  AuthScreen: () => import("../features/auth/AuthScreen"),
};

export const PAGES = {
  Pantry: lazy(load.Pantry),
  Financials: lazy(load.Financials),
  Manuals: lazy(load.Manuals),
  Livestock: lazy(load.Livestock),
  MapScreen: lazy(load.Farm),
  CropsScreen: lazy(() => load.Farm().then((m) => ({ default: m.CropsScreen }))),
  TaskQueue: lazy(load.TaskQueue),
  PlanScreen: lazy(load.PlanScreen),
  ProgressScreen: lazy(load.ProgressScreen),
  InsightsScreen: lazy(load.InsightsScreen),
  FeedbackSurvey: lazy(load.FeedbackSurvey),
  AdminDashboard: lazy(load.AdminDashboard),
  SettingsPanel: lazy(load.SettingsPanel),
  AuthScreen: lazy(load.AuthScreen),
};

/* Screens a person reaches first come first; the owner-only and sign-in screens are not warmed. */
const WARM = ["Farm", "TaskQueue", "PlanScreen", "Manuals", "ProgressScreen", "Pantry", "Livestock", "Financials", "InsightsScreen", "SettingsPanel"];
let warmed = false;
/** Fetch the other screens one at a time while the device is idle. Safe to call more than once. */
export function warmPages() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  if (navigator.connection && navigator.connection.saveData) return; // the person asked the browser to save data
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 400));
  const queue = WARM.slice();
  const next = () => {
    const name = queue.shift();
    if (!name) return;
    load[name]().catch(() => { /* offline or a new deploy: it loads when opened */ }).finally(() => idle(next));
  };
  idle(next);
}
