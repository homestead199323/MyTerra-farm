const { openMap, mapOpen, closeSheet, closeMap, dlg } = require('./lib');
const J = '2027-06-26T09:30:00+01:00';
module.exports = {
  env: 'backyard', label: 'Backyard',
  takes: [
    { time: '2027-05-15T09:30:00+01:00', storage: null, chapters: [
      { id: 'setup', title: 'Tell it what you already have', sub: 'Beds, a greenhouse, a coop. They land on your starter map, with a first bed sized for your time.',
        run: async (r, p) => {
          await r.tap('Get started'); await r.tap('Backyard'); await r.tap('Continue');
          const ins = () => p.locator('[role=dialog] input:not([type=checkbox]):not([type=radio])');
          await r.type(ins().nth(0), '10'); await r.type(ins().nth(1), '8'); await r.tap('Continue');
          await r.tap('Western Europe'); await r.tap('Continue'); await r.tap('5–7h'); await r.tap('All day'); await r.tap('Continue');
          await r.tap('Fresh food'); await r.tap('Continue'); await r.tap('Total beginner'); await r.tap('Continue'); await r.tap('15 min a day'); await r.tap('Continue');
          await r.tap(p.getByRole('button', { name: '2', exact: true })); await r.tap('Cook it fresh'); await r.tap('Continue'); await r.jump(0.5);
          await r.cam(true, 'own'); await r.hold(0.8);
          await r.tap('Raised bed', { pre: 0.55, post: 0.4 }); await r.tap('Greenhouse', { pre: 0.5, post: 0.4 }); await r.tap('Chicken coop', { pre: 0.5, post: 0.7 }); await r.tap('Continue', { offCamera: true });
          await r.cam(false);
          await r.tap('Lettuce'); await r.tap('Continue');
          for (let k = 0; k < 40; k++) { if (await p.evaluate(() => !!document.querySelector('[role=dialog] canvas'))) break; await p.waitForTimeout(500); }
          await r.settle(4000, 2.0); await p.waitForTimeout(3000); await r.jump(1.5); await p.waitForTimeout(1500); await r.jump(0.5);
          await r.cam(true, 'starter-map'); await r.hold(1.4); await r.scroll(250, 1.2, { x: 195, y: 420 }); await r.hold(1.8);
          await r.cam(false);
        } },
    ] },
    { time: J, storage: 'states/backyard.json', chapters: [
      { id: 'plant', title: 'Plant a bed. It works out how many fit.', sub: 'Pick a crop for the bed you tapped. Spacing, rows and good neighbours are filled in.',
        run: async (r, p) => {
          await r.ready(); await openMap(r); await mapOpen(r);
          await r.tap(p.getByRole('button', { name: 'Raised Bed 2', exact: true }).first()); await r.jump(2.5); await p.waitForTimeout(800); await r.jump(0.5);
          await r.cam(true, 'bed'); await r.hold(1.1);
          await r.tap(r.el('Plant in this bed'), { post: 0.8 });
          await r.tap(r.el(/^\W*Lettuce$/), { post: 1.0 });
          await r.scroll(330, 1.1, { x: 195, y: 400 }); await r.hold(0.3);
          await r.type(dlg(r).locator('input[type=number]').first(), '6'); await r.hold(0.8); await r.peek('typed-6');
          await r.scroll(250, 1.0, { x: 195, y: 400 }); await r.hold(1.4); await r.peek('preview');
          await r.tap(r.el('Save planting'), { post: 0.9 });
          await r.cam(false); await closeSheet(r); await closeMap(r);
        } },
      { id: 'seeds', title: 'Start seeds in trays', sub: 'It picks the tray, counts the weeks and tells you when to plant out.',
        run: async (r, p) => {
          await r.nav('Farm'); await r.jump(1.0);
          await r.cam(true, 'crops'); await r.hold(0.8);
          await r.tap(r.el('+ Start seeds'), { post: 0.8 });
          await r.pick(dlg(r).locator('select').first(), 'Kale', { post: 0.9 });
          await r.type(dlg(r).locator('input[type=number]').first(), '8'); await r.hold(0.7); await r.peek('typed-8');
          await r.tap(r.el('Add to nursery'), { post: 1.8 });
          await r.cam(false);
        } },
    ] },
    { time: J, storage: 'states/backyard.json', chapters: [
      { id: 'layout', title: 'Rearrange your garden any time', sub: 'Drag a bed to move it. Tap to add a bed, a greenhouse or a path.',
        run: async (r, p) => {
          await r.ready();
          await r.cam(true, 'today'); await r.hold(0.7);
          await r.tap('Edit farm layout', { post: 1.5 });
          const box = async (t) => { const b = await p.getByText(t, { exact: true }).locator('visible=true').first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
          const a = await box('Raised Bed'), c = await box('Chicken Coop'), v = await box('Veg patch');
          const ppx = (c.x - a.x) / 6.2, ppy = (v.y - a.y) / 5.2;   // label centres sit at the same place on every area
          const spot = { x: a.x + (4.8 - 2.0) * ppx, y: a.y + (5.3 - 2.2) * ppy - 10 };
          console.log('designer px/m', ppx.toFixed(1), ppy.toFixed(1), JSON.stringify(spot));
          await r.tap(p.locator('button:visible').filter({ hasText: /Herb Garden/ }).last(), { post: 0.7 });
          await r.tap(null, { at: spot, post: 1.2 }); await r.peek('placed');
          // the map resizes when an area is selected: find the new bed again by its label before dragging it
          const nb = await box('Herb Garden 2'); const from = { x: nb.x, y: nb.y - 13 };
          await r.drag(from, { x: from.x, y: from.y + 26 }, 1.3); await r.hold(1.5); await r.peek('dragged');
          await r.cam(false);
        } },
    ] },
    { time: J, storage: 'states/backyard.json', weather: 'heat', chapters: [
      { id: 'hens', title: 'Hens? Collect the eggs with one tap', sub: 'Daily care sits on the coop. Eggs are counted into your pantry.',
        run: async (r, p) => {
          await r.ready(); await openMap(r); await mapOpen(r);
          await r.cam(true, 'map'); await r.hold(0.8);
          await r.tap(p.getByRole('button', { name: /jobs? waiting at Chicken Coop/ }).first(), { post: 1.3 });
          await r.tap(dlg(r).getByRole('button', { name: 'Collect', exact: true }).first(), { post: 1.0 });
          await r.tap(dlg(r).getByRole('button', { name: 'Feed', exact: true }).first(), { pre: 0.5, post: 1.7 });
          await r.cam(false); await closeSheet(r); await closeMap(r);
        } },
      { id: 'weather', title: 'It warns you before the weather does', sub: 'Frost, heat, gales, heavy rain: the 7-day forecast is checked against what you grow.',
        run: async (r, p) => {
          await r.jump(1.0);
          await r.jump(4.5); await r.cam(true, 'today'); await r.hold(0.9);
          await r.scroll(400, 1.6); await r.hold(2.4);
          await r.cam(false);
        } },
    ] },
  ],
};
