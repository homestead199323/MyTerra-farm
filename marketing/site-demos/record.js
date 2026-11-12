// node record.js <env> [rehearse] [only=<chapterId>]  → frames/<env>/takeN/ + frames/<env>/manifest.json
const Rec = require('./rec2'); const fs = require('fs');
(async () => {
  const env = process.argv[2]; const onlyTake = +((process.argv.find(a => a.startsWith('take=')) || '').slice(5)) || 0; const rehearse = process.argv.includes('rehearse'); const only = (process.argv.find(a => a.startsWith('only=')) || '').slice(5);
  const demo = require('./demo_' + env + '.js'); const base = (rehearse ? 'rehearse/' : 'frames/') + env; const manifest = { env, label: demo.label, fps: 30, segments: [] };
  for (let ti = 0; ti < demo.takes.length; ti++) {
    const take = demo.takes[ti]; const out = `${base}/take${ti + 1}`;
    if (only && !take.chapters.some(c => c.id === only)) continue;
    if (onlyTake && onlyTake !== ti + 1) continue;
    fs.rmSync(out, { recursive: true, force: true });
    const storage = take.storage ? JSON.parse(fs.readFileSync(take.storage)) : null;
    if (storage && take.weather) { delete storage.hfm_weather_cache_v1; delete storage.hfm_forecast_cache_v1; }
    const r = await Rec.open({ out, time: take.time, storage, weather: take.weather || null, rehearse });
    const t0 = Date.now();
    for (const ch of take.chapters) {
      const f0 = r.n; const c0 = Date.now();
      try { await ch.run(r, r.p); } catch (e) { console.log('CHAPTER FAIL', ch.id, e.message.slice(0, 400)); try { await r.p.screenshot({ type: 'jpeg', quality: 70, path: `${out}/zz-fail-${ch.id}.jpg` }); console.log('BTN', JSON.stringify(await r.buttons()).slice(0, 1500)); } catch (x) {} r.recording = false; if (!rehearse) { await r.save(); process.exit(1); } }
      manifest.segments.push({ id: ch.id, title: ch.title, sub: ch.sub, dir: `take${ti + 1}`, f0, f1: r.n });
      console.log(env, ch.id, 'frames', r.n - f0, ((r.n - f0) / 30).toFixed(1) + 's', 'took', Math.round((Date.now() - c0) / 1000) + 's');
    }
    await r.save(); console.log('take', ti + 1, 'done in', Math.round((Date.now() - t0) / 1000) + 's');
  }
  if (!rehearse && !only && !onlyTake) fs.writeFileSync(`${base}/manifest.json`, JSON.stringify(manifest, null, 1));
  if (!rehearse && onlyTake && fs.existsSync(`${base}/manifest.json`)) {
    // one take filmed again: swap its chapters into the existing manifest, in script order
    const old = JSON.parse(fs.readFileSync(`${base}/manifest.json`)); const fresh = new Map(manifest.segments.map(s => [s.id, s]));
    old.segments = old.segments.map(s => fresh.get(s.id) || s);
    fs.writeFileSync(`${base}/manifest.json`, JSON.stringify(old, null, 1));
  }
})().catch(e => { console.error('FAIL', e.message.slice(0, 600)); process.exit(1); });
