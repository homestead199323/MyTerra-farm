const { openMap, mapOpen, closeSheet, closeMap, dlg } = require('./lib');
module.exports = {
  env: 'balcony', label: 'Balcony',
  takes: [
    { time: '2027-05-15T09:30:00+01:00', storage: null, chapters: [
      { id: 'setup', title: 'A few questions about your balcony', sub: 'How big, how sunny, how much time. It matches plants that are happy in pots.',
        run: async (r, p) => {
          await r.tap('Get started'); await r.tap('Balcony'); await r.tap('Continue');
          const ins = () => p.locator('[role=dialog] input:not([type=checkbox]):not([type=radio])');
          await r.type(ins().nth(0), '5'); await r.type(ins().nth(1), '2'); await r.tap('Open sky'); await r.tap('Continue');
          await r.tap('Western Europe'); await r.tap('Continue'); await r.jump(0.5);
          await r.cam(true, 'sun'); await r.hold(0.9);
          await r.tap('5–7h', { post: 0.55 }); await r.tap('Afternoon', { post: 0.7 }); await r.tap('Continue', { offCamera: true });
          await r.cam(false);
          await r.tap('Fresh food'); await r.tap('Continue'); await r.tap('Total beginner'); await r.tap('Continue'); await r.tap('15 min a day'); await r.tap('Continue');
          await r.tap(p.getByRole('button', { name: '2', exact: true })); await r.tap('Cook it fresh'); await r.tap('Continue');
          await r.tap('Pots & containers'); await r.tap('Basic tools'); await r.tap('Continue'); await r.jump(0.6);
          await r.cam(true, 'plants'); await r.hold(1.3);
          await r.tap('Lettuce', { pre: 0.55, post: 0.4 }); await r.tap('Basil', { pre: 0.5, post: 0.4 }); await r.tap('Radish', { pre: 0.5, post: 1.3 });
          await r.cam(false);
        } },
    ] },
    { time: '2027-06-26T09:30:00+01:00', storage: 'states/balcony.json', chapters: [
      { id: 'map', title: 'Your balcony in 3D, at its real size', sub: 'Every pot, trough and railing planter. Tap one to fly in.',
        run: async (r, p) => {
          await r.ready();
          await r.cam(true, 'today'); await r.hold(1.1);
          await openMap(r); await r.hold(1.6); await mapOpen(r);
          await r.tap(p.getByRole('button', { name: 'Tomato pots', exact: true }).first(), { post: 2.6 });
          await r.cam(false); await closeSheet(r);
        } },
      { id: 'jobs', title: 'Each planter has its own jobs', sub: 'Tap a badge and tick it off. Harvests go straight into your pantry.',
        run: async (r, p) => {
          await p.getByRole('button', { name: 'Reset view' }).click(); await r.jump(1.5);
          await r.cam(true, 'map'); await r.hold(0.7);
          await r.tap(p.getByRole('button', { name: /jobs? waiting at Railing planters/ }).first(), { post: 1.3 });
          await r.tap(dlg(r).getByRole('button', { name: 'Harvest', exact: true }).first(), { post: 1.0 });
          await r.tap(dlg(r).getByRole('button', { name: 'Water', exact: true }).first(), { post: 0.8 });
          await r.tap(dlg(r).getByRole('button', { name: 'Water', exact: true }).first(), { pre: 0.5, post: 1.5 });
          await r.cam(false); await closeSheet(r); await closeMap(r);
        } },
      { id: 'diary', title: 'A diary for every plant', sub: 'Watered, fed, a problem, a note or a photo. One tap each.',
        run: async (r, p) => {
          await r.nav('Farm'); await r.jump(1.0);
          await r.cam(true, 'crops'); await r.hold(1.1);
          await r.tap(p.getByRole('button', { name: /^Tomato/ }).first(), { post: 1.4 });
          await r.tap(p.getByRole('button', { name: 'Watered', exact: true }), { post: 0.8 });
          await r.tap(p.getByRole('button', { name: 'Fed', exact: true }), { pre: 0.5, post: 1.7 });
          await r.cam(false); await closeSheet(r);
        } },
      { id: 'calendar', title: 'Know what to sow this month', sub: 'A calendar filtered for pots, with windowsill crops like cress and pea shoots.',
        run: async (r, p) => {
          await r.nav('Calendar'); await r.jump(1.2);
          await r.cam(true, 'calendar'); await r.hold(1.5);
          await r.scroll(300, 1.5); await r.hold(1.1); await r.scroll(330, 1.5); await r.hold(1.3);
          await r.cam(false);
        } },
      { id: 'growth', title: 'See it grow before you plant', sub: 'Slide the growth preview weeks ahead and watch every pot fill in and ripen.',
        run: async (r, p) => {
          await r.nav('Today'); await r.ready(1500); await openMap(r); await mapOpen(r);
          await r.cam(true, 'map'); await r.hold(0.7);
          await r.tap('Growth preview and legend', { post: 0.9 });
          await r.tap(p.getByRole('button', { name: '+1 mo', exact: true }), { post: 1.8 });
          await r.tap(p.getByRole('button', { name: '+2 mo', exact: true }), { post: 2.4 });
          await r.cam(false);
        } },
    ] },
  ],
};
