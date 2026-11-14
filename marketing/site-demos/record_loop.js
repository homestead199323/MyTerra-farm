// node record_loop.js <id> [rehearse] → frames/loop-<id>/ (+ events.json). One short loop for the homepage.
// Each loop in loops.js: { id, state, time, weather?, run(r, p) }. run() turns the camera on and off itself.
const Rec = require('./rec2'); const fs = require('fs'); const LOOPS = require('./loops');
(async () => {
  const id = process.argv[2]; const rehearse = process.argv.includes('rehearse'); const L = LOOPS.find((l) => l.id === id);
  if (!L) throw new Error('unknown loop ' + id + ' (have: ' + LOOPS.map((l) => l.id).join(', ') + ')');
  const out = (rehearse ? 'rehearse/loop-' : 'frames/loop-') + id; fs.rmSync(out, { recursive: true, force: true });
  const storage = L.state ? JSON.parse(fs.readFileSync(L.state)) : null;
  if (storage && L.weather) { delete storage.hfm_weather_cache_v1; delete storage.hfm_forecast_cache_v1; }   // a saved forecast would win over the mocked one
  const r = await Rec.open({ out, time: L.time, storage, weather: L.weather || null, rehearse, viewport: { width: 390, height: 694 } });
  const t0 = Date.now();
  try { await r.ready(L.readyMs || 3500); await L.run(r, r.p); }
  catch (e) { console.log('LOOP FAIL', id, e.message.slice(0, 500)); try { await r.p.screenshot({ type: 'jpeg', quality: 70, path: `${out}/zz-fail.jpg` }); console.log('BTN', JSON.stringify(await r.buttons()).slice(0, 1800)); } catch (x) {} r.recording = false; await r.save(); process.exit(1); }
  r.recording = false; console.log(id, 'frames', r.n, (r.n / 30).toFixed(1) + 's', 'took', Math.round((Date.now() - t0) / 1000) + 's');
  await r.save();
})().catch(e => { console.error('FAIL', e.message.slice(0, 600)); process.exit(1); });
