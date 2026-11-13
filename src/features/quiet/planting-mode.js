/**
 * Whether the Plant a crop form is in "start as seedling" mode.
 * Planting is the default for every crop: the seedling section opens only when the grower asks
 * for it (the "Start as seedling" button) and a nursery area exists to raise it in.
 */
export function usesSeedling({ canNursery, form }) {
  return !!canNursery && form?.fromSeed === true; // no nursery on the map: they start on a windowsill
}
