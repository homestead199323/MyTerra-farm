/* ═══════════════════════════════════════════
   DIARY — notes, photos and quick logs on one planting (2026-11-11)

   A diary entry is an observation (data.observations): the same list the
   morning walk writes to, so a plant has one story whoever wrote the line.
   `kind` says what the entry is; walk checks have no kind.
   Pure: no DOM, no clock (the caller passes the time and the id).
   ═══════════════════════════════════════════ */
import { appendLog } from "./utils.js";

export const DIARY_KINDS = ["water", "feed", "issue", "note", "photo", "ok"];
const LABEL = { water: "Watered", feed: "Fed", issue: "Problem", note: "Note", photo: "Photo", ok: "Sorted" };
/** Saved data may not grow past this many characters (photos are the bulk); same ceiling as the walk. */
export const PHOTO_BUDGET = 1800000;
/** The list is trimmed past this length: the oldest waterings and feeds go first, never a note, photo or check. */
export const DIARY_CAP = 600;

/** What an entry is called in a journal: diary kinds by name, walk checks by their verdict. */
export function entryLabel(e) {
  if (e && e.kind && LABEL[e.kind]) return LABEL[e.kind];
  return e && e.status === "issue" ? "Needs a closer look" : e && e.status === "healthy" ? "Looking good" : "Checked";
}

/** Does a later entry mean the area was looked at again? A walk check, a new problem and "Sorted" do; a watering or a note does not. */
export function revisits(e) {
  return !e.kind || e.kind === "issue" || e.kind === "ok";
}

/** Problems nobody has come back to (one per entry; Today counts them as areas to revisit). */
export function openIssues(observations) {
  const all = observations || [];
  return all.filter(function (e) {
    return e.status === "issue" && !all.some(function (n) { return n.zoneId === e.zoneId && n.at > e.at && revisits(n); });
  });
}

/** The entries of one planting, newest first. Older area-level walk notes (no plotId) show on each crop they covered. */
export function diaryOf(data, plotId) {
  return ((data && data.observations) || [])
    .filter(function (e) { return e.plotId === plotId || (!e.plotId && Array.isArray(e.plotIds) && e.plotIds.includes(plotId)); })
    .slice()
    .reverse();
}

function trim(list) {
  if (list.length <= DIARY_CAP) return list;
  let extra = list.length - DIARY_CAP;
  return list.filter(function (e) {
    if (extra > 0 && (e.kind === "water" || e.kind === "feed")) { extra -= 1; return false; }
    return true;
  });
}

/** Add one entry to a planting: fields = { kind, note, photo }. Returns the new data. */
export function addDiary(data, plot, fields, at, id) {
  const kind = DIARY_KINDS.includes(fields && fields.kind) ? fields.kind : "note";
  const note = String((fields && fields.note) || "").trim().slice(0, 500);
  const entry = {
    id, at, zoneId: plot.zone || null, plotId: plot.id, plotIds: [plot.id], kind,
    status: kind === "issue" ? "issue" : kind === "ok" ? "healthy" : "log",
    note, photo: (fields && fields.photo) || null, tasks: [],
  };
  const next = { ...data, observations: trim([...(data.observations || []), entry]) };
  // Daily waterings and feeds stay out of the activity log: it keeps 200 lines and they would push the rest out.
  if (kind !== "water" && kind !== "feed") {
    next.log = appendLog(data.log, { text: (plot.name || plot.crop) + ": " + LABEL[kind].toLowerCase() + (note ? " — " + note : ""), zoneId: entry.zoneId || undefined, plotId: plot.id });
  }
  return next;
}

/** Remove one entry (diary entries only; a walk check stays). */
export function removeDiary(data, id) {
  return { ...data, observations: (data.observations || []).filter(function (e) { return !(e.id === id && e.kind); }) };
}

/** "Today", "Yesterday" or "11 Nov" (with the year when it is not this one). */
export function diaryDate(at, now) {
  const d = new Date(at), n = now || new Date();
  const day = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
  const diff = Math.round((day(n) - day(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, d.getFullYear() === n.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}
