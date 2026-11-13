/* Edits that never reached the cloud (pure, unit tested).

   The cloud copy of a farm used to win every time the app opened. So anything done offline — or ticked
   a moment before the app was closed, while the save was still on its way — was thrown away on the next
   open, without a word. Now every local edit leaves a time stamp on the device until the cloud confirms
   it (lib/storage.js markUnsynced / clearUnsynced, set and cleared by lib/sync.js). When the app opens
   and that stamp is newer than the cloud copy, this device's farm is kept and uploaded.
   Still last-write-wins: if another device has saved since, its newer copy wins as before. */

/** → true when this device's cached farm holds edits newer than the cloud copy. */
export function keepLocalEdits({ unsyncedAt, cloudUpdatedAt, hasLocal }) {
  const mine = Number(unsyncedAt) || 0, theirs = Number(cloudUpdatedAt) || 0;
  return !!hasLocal && mine > 0 && mine > theirs;
}

/** How long to wait before trying a failed upload again: 5 s, 10 s, 20 s … capped at one minute. */
export function retryDelay(attempt) {
  return Math.min(60000, 5000 * 2 ** Math.max(0, Math.min(10, Number(attempt) || 0)));
}
