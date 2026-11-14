// The nine homepage clips, three per space. Each shows one thing, 6 to 10 seconds.
// { id, state, time, weather?, run(r, p) } — run() starts with the home map on screen and turns the camera on and off.
// Every clip opens and closes on the still home map (a hold at each end), so the dissolve back to the start is clean.
//
// STATUS 2026-11-14: DRAFT. Only `b-growth` uses taps that were checked against the app (14 Nov build). Recording was
// paused before the others could be rehearsed because the app's visuals were being changed. Before filming, run
// `node record_loop.js <id> rehearse` for each, look at rehearse/loop-<id>/, and correct the taps. Where the app
// does not do what the line on the page says, change the line on the page (public/landing.html), not the app's story.
const JUNE = '2027-06-26T09:30:00+01:00';
const MAY = '2027-05-06T09:40:00+01:00';
const btn = (p, name, exact = false) => p.getByRole('button', { name, exact }).locator('visible=true').first();
const dlg = (p) => p.locator('[role=dialog]').last();
const log = async (r, tag) => { if (r.rehearse) console.log(tag, JSON.stringify(await r.buttons()).slice(0, 1600)); };
const jobs = (p, place) => btn(p, new RegExp('jobs? waiting at ' + place));
// the + in the dock fans out: Plant, Animal, Build, Job, Harvest (label of the + itself to be confirmed in rehearsal)
const plus = (p) => p.locator('.hv2-dock button').filter({ has: p.locator('svg') }).nth(2);

module.exports = [
  // ── Balcony (states/balcony.json: railing planters, tomato pots, herb pots; 7 jobs, strawberries ready) ──
  { id: 'b-jobs', state: 'states/balcony.json', time: JUNE, line: 'Each pot has its own jobs',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(1.0);
      await r.tap(jobs(p, 'Railing planters'), { pre: 0.7, post: 1.4 }); await log(r, 'POPUP');
      // then: Harvest on the strawberries, Water on one row, close → back on the map with the count gone down
      await r.tap(dlg(p).getByRole('button', { name: 'Harvest', exact: true }).first(), { pre: 0.7, post: 1.1 });
      await r.tap(dlg(p).getByRole('button', { name: 'Water', exact: true }).first(), { pre: 0.6, post: 1.0 });
      await r.tap(dlg(p).getByRole('button', { name: 'Close', exact: true }).first(), { pre: 0.6, post: 1.3 });
      await r.cam(false);
    } },
  { id: 'b-growth', state: 'states/balcony.json', time: JUNE, line: 'Watch it grow before you plant',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(1.0);
      await r.tap(btn(p, 'Growth preview and legend'), { pre: 0.6, post: 0.9 });
      await r.tap(btn(p, '+1 mo', true), { pre: 0.6, post: 1.7 });
      await r.tap(btn(p, '+2 mo', true), { pre: 0.5, post: 2.0 });
      await r.tap(btn(p, 'Today', true), { pre: 0.5, post: 1.2 });
      await r.tap(btn(p, 'Growth preview and legend'), { pre: 0.5, post: 1.0 });
      await r.cam(false);
    } },
  { id: 'b-pots', state: 'states/balcony.json', time: JUNE, line: 'Only what really grows in pots',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(plus(p), { pre: 0.6, post: 1.0 }); await log(r, 'FAN');
      await r.tap(btn(p, /^Plant/), { pre: 0.6, post: 1.3 });                       // the crop list: PLANT NOW, pot crops only
      await r.scroll(420, 1.6, { x: 195, y: 420 }); await r.hold(0.8);              // let the list be read
      await r.tap(dlg(p).getByRole('button', { name: /^Basil/ }).first(), { pre: 0.7, post: 1.8 });   // "N plants · 1 row"
      await r.tap(dlg(p).getByRole('button', { name: 'Cancel', exact: true }), { pre: 0.6, post: 1.0 });
      await r.cam(false);
    } },

  // ── Backyard (states/backyard.json: greenhouse, raised beds, herb bed, veg patch, fruit trees, coop) ──
  { id: 'y-build', state: 'states/backyard.json', time: JUNE, line: 'Lay it out like a game',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(plus(p), { pre: 0.6, post: 1.0 });
      await r.tap(btn(p, /^Build/), { pre: 0.6, post: 1.4 }); await log(r, 'BUILD');
      // then: drag "Raised bed" from the tray onto the lawn (r.drag(from, to, 1.6)), hold, leave build mode without saving
      await r.cam(false);
    } },
  { id: 'y-eggs', state: 'states/backyard.json', time: JUNE, line: 'Eggs, counted for you',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(jobs(p, 'Chicken coop'), { pre: 0.7, post: 1.4 }); await log(r, 'COOP');
      await r.tap(dlg(p).getByRole('button', { name: /^Collect/ }).first(), { pre: 0.7, post: 1.6 });   // "+N eggs" → pantry
      await r.tap(dlg(p).getByRole('button', { name: 'Close', exact: true }).first(), { pre: 0.6, post: 1.2 });
      await r.cam(false);
    } },
  { id: 'y-frost', state: 'states/backyard_may.json', time: MAY, weather: 'frost', line: 'Weather that knows what you grow',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(btn(p, /Open this week's weather/), { pre: 0.7, post: 2.2 }); await log(r, 'WEEK');   // frost nights + what to do
      // then: tap the "Protect … crops" job so the map goes to the beds at risk; close
      await r.cam(false);
    } },

  // ── Farm (states/farm.json: goat paddock, hen house, beehives, orchard, kitchen garden, greenhouse; 21 jobs) ──
  { id: 'f-check', state: 'states/farm.json', time: JUNE, line: 'A morning round, one stop at a time',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(btn(p, /^Today.s jobs/), { pre: 0.6, post: 1.1 });
      await r.tap(btn(p, 'Farm check', true), { pre: 0.6, post: 2.4 }); await log(r, 'CHECK');           // camera flies to the first stop
      // then: tick the job at this stop, the camera moves to the next stop, tick again; leave the check
      await r.cam(false);
    } },
  { id: 'f-milk', state: 'states/farm.json', time: JUNE, line: 'From the goat to the ledger',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(jobs(p, 'Goat paddock'), { pre: 0.7, post: 1.4 }); await log(r, 'GOATS');
      await r.tap(dlg(p).getByRole('button', { name: /^Milk/ }).first(), { pre: 0.7, post: 1.5 });
      // then (cut): More → Pantry → Goat Milk → Sell → the amount under Money. Two cuts at most; if it needs more, split the line.
      await r.cam(false);
    } },
  { id: 'f-orchard', state: 'states/farm.json', time: JUNE, line: 'Trees that crop every year',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(jobs(p, 'Orchard'), { pre: 0.7, post: 1.6 }); await log(r, 'ORCHARD');
      await r.tap(dlg(p).getByRole('button', { name: 'Harvest', exact: true }).first(), { pre: 0.7, post: 1.8 });   // kilos logged; trees stay
      await r.tap(dlg(p).getByRole('button', { name: 'Close', exact: true }).first(), { pre: 0.6, post: 1.4 });
      await r.cam(false);
    } },
];
