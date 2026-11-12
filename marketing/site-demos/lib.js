// Shared moves for the demo scripts.
const openMap = async (r) => {
  await r.tap('Open the farm map', { post: 0.6 });
  if (!r.recording) { for (let i = 0; i < 4; i++) { await r.settle(2500, 1.2); if (await r.p.getByRole('button', { name: 'Close full screen map' }).count()) return; await r.tap('Open the farm map'); } }
};
const mapOpen = async (r) => { if (!(await r.p.getByRole('button', { name: 'Close full screen map' }).count())) throw new Error('map did not open'); };
const closeSheet = async (r) => { for (const n of ['Close this card', 'Close', 'Close dialog']) { const c = r.p.getByRole('button', { name: n, exact: true }).locator('visible=true').first(); if (await c.count()) { await c.click(); await r.jump(0.6); return; } } };
const closeMap = async (r) => { const c = r.p.getByRole('button', { name: 'Close full screen map' }); if (await c.count()) { await c.click(); await r.jump(0.8); } };
const dlg = (r) => r.p.locator('[role=dialog]').last();
module.exports = { openMap, mapOpen, closeSheet, closeMap, dlg };
