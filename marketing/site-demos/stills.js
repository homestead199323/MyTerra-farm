// node stills.js <name> : one still picture of the real app for the website's "Why MyTerra" cards → out/stills/<name>.jpg
// Phone size 390x844 at 2x. Same frozen clock, demo gardens and mocked forecast as the demo videos.
const Rec = require('./rec2'); const fs = require('fs'); const { openMap } = require('./lib');
const SHOTS = {
  // (1) the app makes the jobs: the Tasks list of the backyard
  jobs: { state: 'states/backyard.json', time: '2027-06-26T08:10:00+01:00', run: async (r) => { await r.nav('Tasks'); await r.jump(1.2); } },
  today: { state: 'states/backyard.json', time: '2027-06-26T08:10:00+01:00', run: async (r) => { await r.jump(1.0); } },
  // (2) living 3D map: the backyard's full-screen map with its job badges
  map: { state: 'states/backyard.json', time: '2027-06-26T08:10:00+01:00', run: async (r) => { await openMap(r); await r.settle(3000, 2.0); } },
  // (3) weather that knows the plan: a frosty May week on the Today screen
  frost: { state: 'states/backyard_may.json', time: '2027-05-06T09:40:00+01:00', weather: 'frost', run: async (r) => { await r.jump(1.0); } },
  // (4) plants, animals, pantry, money: the farm's Money screen
  money: { state: 'states/farm.json', time: '2027-06-26T08:10:00+01:00', run: async (r) => { await r.nav('More'); await r.jump(0.6); await r.tap(r.el(/^Money/)); await r.jump(1.2); } },
  pantry: { state: 'states/farm.json', time: '2027-06-26T08:10:00+01:00', run: async (r) => { await r.nav('More'); await r.jump(0.6); await r.tap(r.el(/^Pantry/)); await r.jump(1.2); } },
  animals: { state: 'states/farm.json', time: '2027-06-26T08:10:00+01:00', run: async (r) => { await r.nav('Farm'); await r.jump(0.8); await r.tap(r.el(/^Animals/)); await r.jump(1.2); } },
};
(async () => {
  const name = process.argv[2]; const s = SHOTS[name]; if (!s) throw new Error('unknown shot ' + name);
  fs.mkdirSync('out/stills', { recursive: true });
  const storage = JSON.parse(fs.readFileSync(s.state)); if (s.weather) { delete storage.hfm_forecast_cache_v1; delete storage.hfm_weather_cache_v1; } // a saved forecast would win over the mocked one
  const r = await Rec.open({ out: 'explore/stills', time: s.time, storage, viewport: { width: 390, height: 844 }, weather: s.weather || null });
  await r.ready(3500);
  await s.run(r);
  const dy = +(process.argv[3] || 0); if (dy) { await r.p.mouse.move(195, 500); await r.p.mouse.wheel(0, dy); await r.jump(0.8); }
  await r.jump(0.5);
  await r.p.screenshot({ type: 'png', path: `out/stills/${name}${dy ? '-' + dy : ''}.png` });
  console.log(name, 'saved', 'buttons:', (await r.buttons()).slice(0, 40).join(' | ').slice(0, 900));
  await r.browser.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 500)); process.exit(1); });
