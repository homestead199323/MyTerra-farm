// The nine homepage clips, three per space. Each shows one thing, 6 to 10 seconds.
// { id, state, time, weather?, run(r, p) } — run() starts with the home map on screen and turns the camera on and off.
// Every clip opens and closes on the still home map (a hold at each end), so the dissolve back to the start is clean.
//
// All nine were rehearsed and filmed against the 14 November 2026 app (after the desktop cards update). A clip that opens
// an area's card ends on the card: closing it raises a "N jobs completed" note that sits on top of the Next-job card.
const JUNE = '2027-06-26T09:30:00+01:00';
const MAY = '2027-05-06T09:40:00+01:00';
const btn = (p, name, exact = false) => p.getByRole('button', { name, exact }).locator('visible=true').first();
const dlg = (p) => p.locator('[role=dialog]').last();
const log = async (r, tag) => { if (r.rehearse) console.log(tag, JSON.stringify(await r.buttons()).slice(0, 1600)); };
const jobs = (p, place) => btn(p, new RegExp('jobs? waiting at ' + place, 'i'));
// the + in the dock fans out: Plant a crop, Add an animal, Build a bed or area, Add a job, Log a harvest
const plus = (p) => btn(p, 'Add', true);

module.exports = [
  // ── Balcony (states/balcony.json: railing planters, tomato pots, herb pots; 7 jobs, strawberries ready) ──
  { id: 'b-jobs', state: 'states/balcony.json', time: JUNE, line: 'Each pot has its own jobs',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(1.0);
      await r.tap(jobs(p, 'Railing planters'), { pre: 0.7, post: 1.4 }); await log(r, 'POPUP');
      await r.tap(dlg(p).getByRole('button', { name: 'Harvest', exact: true }).first(), { pre: 0.7, post: 1.2 });   // +0.8 kg
      await r.tap(dlg(p).getByRole('button', { name: 'Water', exact: true }).first(), { pre: 0.6, post: 1.6 });     // Watered!
      await r.cam(false);   // ends on the card with two jobs done; the dissolve takes it back to the map
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
      // off camera: open the planting list once, so its screen is already loaded (as it is for a visitor a few seconds in)
      await plus(p).click(); await r.jump(0.8); await btn(p, 'Plant a crop', true).click(); await r.settle(1500, 1.0);
      await dlg(p).getByRole('button', { name: 'Cancel', exact: true }).click(); await r.jump(0.6);
      await p.locator('button[aria-label="Back to the farm"]').last().click({ force: true }); await r.settle(1200, 1.0);
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(plus(p), { pre: 0.6, post: 1.0 }); await log(r, 'FAN');
      await r.tap(btn(p, 'Plant a crop', true), { pre: 0.6, post: 1.5 });                       // the crop list: PLANT NOW, pot crops only
      await r.hold(0.6); await r.scroll(430, 2.6, { x: 195, y: 430 }); await r.hold(1.2);   // down the list: every crop on it suits a pot
      await r.cam(false);
    } },

  // ── Backyard (states/backyard.json: greenhouse, raised beds, herb bed, veg patch, fruit trees, coop) ──
  // a brand-new backyard (the demo garden is full: a new piece has nowhere to land), so the clip is also "your second minute"
  { id: 'y-build', state: null, time: '2027-04-17T09:30:00+01:00', line: 'Lay it out like a game',
    run: async (r, p) => {
      await r.jump(0.6); await btn(p, 'Backyard', true).click(); await r.jump(0.5); await btn(p, 'Create my starter map', true).click();
      await r.ready(4500);
      for (let i = 0; i < 3; i++) { const sk = btn(p, 'Skip', true); if (!(await sk.count())) break; await sk.click(); await r.jump(0.8); }   // the first-run pointers
      await r.settle(1500, 1.0); await log(r, 'HOME');
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(plus(p), { pre: 0.6, post: 1.0 });
      await r.tap(btn(p, 'Build a bed or area', true), { pre: 0.6, post: 1.5 });
      const from = await r.point(btn(p, /^Add Raised Bed\./)); const to = { x: 205, y: 450 };   // onto the lawn below the first bed
      await r.hold(0.4); await r.drag(from, to, 1.9); await r.hold(1.4); await r.peek('dropped');
      await r.tap(btn(p, 'Wider', true), { pre: 0.6, post: 1.5 });                              // 2.4 m → wider, on the map as you tap
      await r.cam(false);
    } },
  { id: 'y-eggs', state: 'states/backyard.json', time: JUNE, line: 'Eggs, counted for you',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(jobs(p, 'Chicken coop'), { pre: 0.7, post: 1.6 });
      await r.tap(dlg(p).getByRole('button', { name: 'Collect', exact: true }).first(), { pre: 0.7, post: 1.5 });   // +2 eggs
      await r.tap(dlg(p).getByRole('button', { name: 'Feed', exact: true }).first(), { pre: 0.6, post: 1.6 });
      await r.cam(false);
    } },
  { id: 'y-frost', state: 'states/backyard_may.json', time: MAY, weather: 'frost', line: 'Weather that knows what you grow',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(1.4);
      await r.tap(btn(p, /Open this week's weather/), { pre: 0.7, post: 2.3 });                 // This week: frost early Sat and Sun
      await r.tap(btn(p, 'Close dialog', true), { pre: 0.6, post: 0.9 });
      await r.tap(jobs(p, 'Veg patch'), { pre: 0.7, post: 2.6 }); await log(r, 'PATCH');          // the job that names what to cover
      await r.cam(false);
    } },

  // ── Farm (states/farm.json: goat paddock, hen house, beehives, orchard, kitchen garden, greenhouse; 21 jobs) ──
  { id: 'f-check', state: 'states/farm.json', time: JUNE, line: 'A morning round, one stop at a time',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(btn(p, /^Today.s jobs/), { pre: 0.6, post: 0.9 });
      await r.tap(btn(p, 'Farm check', true), { pre: 0.6, post: 2.3 });                                             // stop 1 of 12: the cherries
      await r.tap(dlg(p).getByRole('button', { name: 'Harvest', exact: true }).first(), { pre: 0.7, post: 1.3 });   // +10 for the job
      await r.tap(btn(p, /^Next:/), { pre: 0.6, post: 2.3 }); await log(r, 'STOP2');                                // the map moves on to the next stop
      await r.cam(false);
    } },
  { id: 'f-milk', state: 'states/farm.json', time: JUNE, line: 'From the goat to the ledger',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.7);
      await r.tap(jobs(p, 'Goat paddock'), { pre: 0.7, post: 1.0 });
      await r.tap(dlg(p).getByRole('button', { name: 'Milk', exact: true }).first(), { pre: 0.7, post: 1.3 });      // +6 L
      await r.cam(false);
      // off camera: to the pantry, down to the goat milk
      await p.keyboard.press('Escape'); await r.jump(0.6);
      const x = btn(p, 'Close', true); if (await x.count()) { await x.click(); await r.jump(0.6); }
      await btn(p, 'More', true).click(); await r.jump(0.8); await r.el(/^Pantry/).click(); await r.jump(1.2); await r.settle(1500, 1.0);
      const sell = btn(p, 'Remove all Goat Milk', true); await sell.scrollIntoViewIfNeeded(); await r.jump(0.6); await log(r, 'PANTRY');
      await r.cam(true, 'pantry'); await r.hold(1.0);                                                               // Goat Milk: 17 L in stock
      const row = p.locator('article, li, div').filter({ has: sell }).last();
      await r.tap(row.getByRole('button', { name: 'Sell', exact: true }).first(), { pre: 0.6, post: 1.3 });
      await r.tap(dlg(p).getByRole('button', { name: 'All', exact: true }).first(), { pre: 0.5, post: 0.9 });       // all 17 L
      await r.tap(dlg(p).getByRole('button', { name: /^Record sale/ }).first(), { pre: 0.6, post: 1.3 }); await log(r, 'SOLD');   // "Recorded as income in Money"
      await r.cam(false);
    } },
  { id: 'f-orchard', state: 'states/farm.json', time: JUNE, line: 'Trees that crop every year',
    run: async (r, p) => {
      await r.cam(true, 'home'); await r.hold(0.9);
      await r.tap(jobs(p, 'Orchard'), { pre: 0.7, post: 2.1 });                                                    // "Stays planted — due again next season"
      await r.tap(dlg(p).getByRole('button', { name: 'Harvest', exact: true }).first(), { pre: 0.7, post: 2.1 });   // +5.8 kg
      await r.cam(false);
    } },
];
