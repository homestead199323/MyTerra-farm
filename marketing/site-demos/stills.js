// node stills.js <name> [scroll] : one still picture of the real app for the homepage → out/stills/<name>.png
// Phone size 390x844 at 2x. Same frozen clock, demo gardens and mocked forecast as the demo videos.
const Rec = require('./rec2'); const fs = require('fs');
// STATUS 2026-11-14: DRAFT shot list for the map-first home, not run yet (recording was paused). Check each still.
const J = '2027-06-26T08:10:00+01:00';
const btn = (r, name) => r.p.getByRole('button', { name }).locator('visible=true').first();
const SHOTS = {
  // hero phone: the game home of a balcony
  hero: { state: 'states/balcony.json', time: J, run: async (r) => { await r.jump(1.0); } },
  // (1) it tells you what to do today: the day's jobs over the farm map
  'why-jobs': { state: 'states/farm.json', time: J, run: async (r) => { await r.tap(btn(r, /^Today.s jobs/)); await r.jump(1.2); } },
  // (2) living 3D map: the backyard home with its job markers
  'why-map': { state: 'states/backyard.json', time: J, run: async (r) => { await r.settle(3000, 2.0); } },
  // (3) weather that knows the plan: a frosty May week
  'why-frost': { state: 'states/backyard_may.json', time: '2027-05-06T09:40:00+01:00', weather: 'frost', run: async (r) => { await r.tap(btn(r, /Open this week's weather/)); await r.jump(1.2); } },
  // (4) plants, animals, pantry, money: the farm's pantry
  'why-all': { state: 'states/farm.json', time: J, run: async (r) => { await r.tap(btn(r, 'More')); await r.jump(0.6); await r.tap(r.el(/^Pantry/)); await r.jump(1.2); } },
  // know-how: crops that fit the space, what to sow this month, a crop guide, the assistant
  'kh-fit': { state: 'states/balcony.json', time: J, run: async (r) => { await r.tap(btn(r, 'More')); await r.jump(0.6); await r.tap(r.el(/^Crops/)); await r.jump(0.8); await r.tap(btn(r, '+ Plant a crop')); await r.jump(1.2); } },
  'kh-sow': { state: 'states/balcony.json', time: J, run: async (r) => { await r.tap(btn(r, 'Calendar')); await r.jump(1.2); } },
  'kh-guide': { state: 'states/balcony.json', time: J, run: async (r) => { await r.tap(btn(r, 'More')); await r.jump(0.6); await r.tap(r.el(/^Learn/)); await r.jump(1.0); await r.tap(r.el(/^Tomato/)); await r.jump(1.2); } },
  'kh-ask': { state: 'states/balcony.json', time: J, run: async (r) => { await r.tap(btn(r, 'Ask the assistant')); await r.jump(1.2); } },
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
