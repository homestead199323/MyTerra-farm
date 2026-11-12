const { openMap, mapOpen, closeSheet, closeMap, dlg } = require('./lib');
const J = '2027-06-26T09:30:00+01:00';
module.exports = {
  env: 'farm', label: 'Farm',
  takes: [
    { time: J, storage: 'states/farm.json', chapters: [
      { id: 'map', title: 'Your whole farm on one living map', sub: 'Orchard, paddock, hives, greenhouse. Pick an area and fly to it.',
        run: async (r, p) => {
          await r.ready(5000);
          await r.cam(true, 'today'); await r.hold(1.0);
          await openMap(r); await r.hold(1.4); await mapOpen(r);
          await r.tap(p.getByRole('button', { name: /Showing Whole farm/ }), { post: 1.1 });
          await r.tap(p.getByRole('option', { name: /Orchard/ }).or(p.getByRole('menuitem', { name: /Orchard/ })).or(p.getByRole('button', { name: /^Orchard/ })).last(), { post: 2.5 });
          await r.cam(false); await closeSheet(r);
        } },
      { id: 'milk', title: 'Milk and eggs go straight to the pantry', sub: 'Daily care for 14 kinds of animals. Tick a job and the amount is logged.',
        run: async (r, p) => {
          await p.getByRole('button', { name: 'Reset view' }).click(); await r.jump(2.0); await r.p.waitForTimeout(800); await r.jump(1.0);
          await r.cam(true, 'map'); await r.hold(0.8);
          await r.tap(p.getByRole('button', { name: /jobs? waiting at Goat paddock/ }).first(), { post: 1.3 });
          await r.tap(dlg(r).getByRole('button', { name: 'Milk', exact: true }).first(), { post: 1.0 });
          await r.tap(dlg(r).getByRole('button', { name: 'Feed', exact: true }).first(), { pre: 0.5, post: 1.5 });
          await r.cam(false); await closeSheet(r);
        } },
      { id: 'orchard', title: 'Fruit trees that crop year after year', sub: 'Pick the cherries, log the kilos. The trees stay on the map for next season.',
        run: async (r, p) => {
          await r.jump(0.5);
          await r.cam(true, 'map'); await r.hold(0.7);
          await r.tap(p.getByRole('button', { name: /jobs? waiting at Orchard/ }).first(), { post: 1.5 });
          await r.tap(dlg(r).getByRole('button', { name: 'Harvest', exact: true }).first(), { post: 2.4 });
          await r.cam(false); await closeSheet(r); await closeMap(r);
          await r.jump(1.5); await r.dumpState('states/farm_after.json');
        } },
    ] },
    { time: J, storage: 'states/farm.json', chapters: [
      { id: 'animals', title: 'Animals grouped by where they live', sub: 'Each group keeps its feeding, housing and health guide a tap away.',
        run: async (r, p) => {
          await r.ready(4000); await r.nav('Farm'); await r.jump(0.8); await r.tap(r.el('Animals')); await r.jump(0.8);
          await r.cam(true, 'animals'); await r.hold(1.5);
          await r.scroll(240, 1.2); await r.hold(0.8);
          await r.tap(r.el(/Laying flock.*Guide/), { post: 2.3 });
          await r.cam(false); await closeSheet(r); await p.keyboard.press('Escape'); await r.jump(0.5);
        } },
      { id: 'sell', title: 'Sell the surplus. Money keeps the score.', sub: 'Pantry stock, sales and costs in one place.',
        run: async (r, p) => {
          await r.nav('More'); await r.jump(0.6); await r.tap(r.el(/^Pantry/)); await r.jump(1.2);
          await r.scroll(-2000, 0.3); await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach(e => { if (e.scrollTop > 0 && e.scrollHeight > e.clientHeight + 40) e.scrollTop = 0; }); }); await r.jump(0.5);
          await r.cam(true, 'pantry'); await r.hold(1.3);
          const card = p.locator('div,li,article,section').filter({ has: p.getByText('Chicken Eggs', { exact: true }) }).filter({ has: p.getByRole('button', { name: 'Sell' }) }).last();
          await r.tap(card.getByRole('button', { name: 'Sell' }).first(), { post: 1.2 });
          console.log('ICONS', JSON.stringify(await card.locator('img,svg').evaluateAll(els => els.slice(0, 4).map(e => [e.tagName, (e.getAttribute('src') || '').slice(-40), e.naturalWidth || 0]))));
          await r.tap(dlg(r).getByRole('button', { name: 'All', exact: true }), { post: 0.9 });
          await r.tap(dlg(r).getByRole('button', { name: /^Record sale/ }), { post: 1.3 });
          await r.tap(r.el('Money'), { post: 2.3 });
          await r.cam(false);
        } },
    ] },
    { time: J, storage: 'states/farm_after.json', chapters: [
      { id: 'walk', title: 'Morning walk: every job in walking order', sub: 'One stop at a time. The map shows where to go next.',
        run: async (r, p) => {
          await r.ready(4000);
          await r.cam(true, 'today'); await r.hold(0.8);
          await r.tap('Start morning walk', { post: 1.3 });
          await r.tap(r.el('Map', 'last'), { post: 1.6 });
          await r.tap(r.el(/Done · next/), { post: 1.7 });
          await r.tap(r.el(/Done · next/), { pre: 0.7, post: 2.0 });
          await r.cam(false);
        } },
    ] },
  ],
};
