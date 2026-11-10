/**
 * Whether the Plant a crop form is in "start as seedling" mode.
 * Planting is the default for every crop: the seedling section opens only when the grower asks
 * for it (the "Start as seedling" button) and a nursery area exists to raise it in.
 */
export function usesSeedling({ canNursery, nurseries, form }) {
  return !!canNursery && (nurseries?.length || 0) > 0 && form?.fromSeed === true;
}
