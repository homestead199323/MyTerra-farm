/* Plain words for gardening terms a first-time grower meets in steps and jobs (review 2026-11-13). */
export const SOW_THIN_NOTE = "Sow thinly: scatter the seed sparingly, so fewer seedlings need pulling out later.";
export const THIN_NOTE = "Thinning: pull out the weakest seedlings so the ones left have room to grow.";

const isSowThin = (l) => /^sow thin/i.test(l || "");
const isThin = (l) => /thin/i.test(l || "") && !isSowThin(l);

/** The note a step label needs, or "". */
export function stepNote(step) {
  const l = step && step.l;
  return isSowThin(l) ? SOW_THIN_NOTE : isThin(l) ? THIN_NOTE : "";
}

/** A step's text with its plain-words note, for a single job. */
export function stepText(step) {
  const note = stepNote(step);
  return note ? `${step.t} ${note}` : step.t;
}

/** In a full guide the note shows once per term: on the first step that uses it. */
export function guideStepNote(steps, i) {
  const s = steps[i], note = stepNote(s);
  if (!note) return "";
  return steps.findIndex((x) => stepNote(x) === note) === i ? note : "";
}

/** What a "Water …" job says: the rhythm, plus the crop note only when it is about watering. */
export function waterJobText(crop) {
  const freq = crop && crop.waterFreq, note = crop && crop.waterNote;
  const watery = note && /water|moist|dry|drench|soak|rain/i.test(note);
  if (freq && watery) return `${freq}. ${note}`;
  return freq || note || "";
}
