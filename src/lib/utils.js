/* ═══════════════════════════════════════════
   UTILS — pure, non-React app helpers
   Extracted from App.jsx (Phase A.7, 2026-05-09)
   ═══════════════════════════════════════════ */

import { applySeedlingStage, markBedPrepared } from "./seedling-stage.js";

// Append an entry to the activity log, capped at 200 entries to prevent localStorage overflow.
export const appendLog = (logArr, entry) => [...(logArr || []), entry].slice(-200);

/** A weight for people: "40 g" under 1 kg, "1.5 kg", "12 kg" from 10 kg. */
export const fmtWeight = (kg) => {
  const v = Number(kg) || 0;
  if (v > 0 && v < 1) return `${Math.max(1, Math.round(v * 1000))} g`;
  return `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10} kg`;
};

// Local-time YYYY-MM-DD key. Replaces .toISOString().slice(0,10) which is UTC
// and can be off by one day in non-UTC timezones (e.g. Albania UTC+1/+2).
export const toLocalDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayLocalKey = () => toLocalDateKey(new Date());

export const localDateFromKey = (key) => {
  if (!key) return null;
  const [y, m, d] = String(key).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const addDaysToLocalKey = (key, days) => {
  const d = localDateFromKey(key);
  if (!d) return "";
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
};

// DST-safe ordinal of a local calendar day (whole days since 1970-01-01).
// Local midnights are NOT always 24 h apart (23 h / 25 h on clock-change
// days), so never divide a difference of local Dates by 864e5 and floor it —
// compare day numbers instead.
export const localDayNumber = (d) =>
  Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);

export const daysBetweenLocalKeys = (fromKey, toDate) => {
  const from = localDateFromKey(fromKey);
  if (!from) return 0;
  const to = toDate instanceof Date ? toDate : new Date(toDate);
  if (isNaN(to.getTime())) return 0;
  return localDayNumber(to) - localDayNumber(from);
};

// Append a task key to today's completions list (no-op if already present).
// Returns a new data object — does NOT mutate.
export const markTaskDone = (data, taskKey) => {
  if (!taskKey) return data;
  const todayKey = todayLocalKey();
  const existing = (data.completions && data.completions[todayKey]) || [];
  if (existing.includes(taskKey)) return data;
  // Nursery tasks ("seed-<batch>-<stage>") move the seedling batch along when ticked anywhere.
  const seed = /^seed-(.+)-(sown|sprouted|potted|hardening|planted|bedprep)$/.exec(taskKey);
  if (seed) data = seed[2] === "bedprep" ? markBedPrepared(data, seed[1]) : applySeedlingStage(data, seed[1], seed[2], todayKey);
  return {
    ...data,
    completions: {
      ...(data.completions || {}),
      [todayKey]: [...existing, taskKey],
    },
  };
};
