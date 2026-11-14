// "Your first minute": a new visitor on a balcony, from the setup card to the first job ticked.
// One take, four chapters. Simulated date: a Saturday in April, so the "plant now" list is full.
const dlg = (p) => p.locator('[role=dialog]').last();
module.exports = {
  env: 'first_minute', label: 'Your first minute',
  viewport: { width: 390, height: 720 },   // tall enough that the first-run pointer card sits beside the balcony, not over it
  takes: [
    { time: '2027-04-17T09:30:00+01:00', storage: null, chapters: [
      { id: 'setup',
        run: async (r, p) => {
          await r.jump(0.6);
          await r.cam(true, 'setup'); await r.hold(1.7);
          await r.tap('Balcony', { pre: 0.7, post: 0.6 });
          await r.tap('Medium', { pre: 0.6, post: 0.6 });
          await r.tap('Create my starter map', { pre: 0.8, offCamera: true });   // the map takes real seconds to build: cut on the press
          await r.cam(false);
        } },
      { id: 'map',
        run: async (r, p) => {
          await r.ready(4500);
          await r.cam(true, 'map'); await r.hold(5.0);
        } },
      { id: 'plant',
        run: async (r, p) => {
          await r.tap(p.getByRole('button', { name: 'Plant your first crop' }), { pre: 0.7, post: 1.5 });
          await r.tap(dlg(p).getByRole('button', { name: /^Lettuce/ }).first(), { pre: 0.8, post: 1.9 });
          await r.scroll(250, 1.1, { x: 195, y: 380 }); await r.hold(1.9); await r.peek('fit');   // "8 plants · 1 row · ~1.6 kg" and the bed plan
          const later = dlg(p).getByRole('button', { name: 'Plan for later', exact: true });
          const box = await later.boundingBox(); await r.scroll(Math.round(box.y - 360), 1.2, { x: 195, y: 380 }); await r.hold(0.3);
          await r.tap(later, { pre: 0.6, post: 0.7 });
          await r.tap(dlg(p).getByRole('button', { name: 'Save planting', exact: true }), { pre: 0.6, post: 2.6 });
        } },
      { id: 'job',
        run: async (r, p) => {
          await r.tap(p.getByRole('button', { name: /^Today.s jobs/ }).first(), { pre: 0.7, post: 1.3 });
          await r.tap(p.getByRole('button', { name: /^Lettuce: Sow/ }).first(), { pre: 0.7, post: 1.8 });
          await r.tap(p.getByRole('button', { name: 'Done', exact: true }).first(), { pre: 0.8, post: 3.2 });
          await r.peek('after-done'); console.log('BTN', JSON.stringify(await r.buttons()).slice(0, 600));
          await r.cam(false);
        } },
    ] },
  ],
};
