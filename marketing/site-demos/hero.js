// node hero.js <h|v> [frames per space] : the looping shot behind the homepage headline.
// Three slow push-ins on the home map, one per space (balcony, backyard, farm), with every control hidden.
// hero_compose.py dissolves one into the next and the last back into the first.
// STATUS 2026-11-14: DRAFT, not run against the map-first home yet (recording was paused). Check the framing of each
// space in a rehearsal (`node hero.js h 3` keeps three frames per space) before filming the full length.
const Rec = require('./rec2'); const fs = require('fs');
(async () => {
  const fmt = process.argv[2] || 'h'; const N = +(process.argv[3] || 150);
  const vp = fmt === 'h' ? { width: 853, height: 480 } : { width: 480, height: 853 };
  for (const env of ['balcony', 'backyard', 'farm']) {
    const out = `frames/hero-${fmt}/${env}`; fs.rmSync(out, { recursive: true, force: true });
    const storage = JSON.parse(fs.readFileSync(`states/${env}.json`));
    const r = await Rec.open({ out, time: '2027-06-26T09:30:00+01:00', storage, viewport: vp, dpr: 2.25, quality: 94, mobile: fmt === 'v' });
    const p = r.p; await r.ready(5000);
    // nothing but the map: no capsules, dock, labels, badges or cards
    await p.addStyleTag({ content: '.hv2 > :not(.g3-host), .g3-host > :not(canvas), .hv2-dock, .hv2-hud, .hv2-next, .hv2-demo, .hv2-cues { display: none !important }' });
    const cx = vp.width * (fmt === 'h' ? 0.6 : 0.5), cy = vp.height * (fmt === 'h' ? 0.5 : 0.42);   // the headline sits on the left on wide screens
    await p.mouse.move(cx, cy);
    const start = fmt === 'h' ? -120 : 40; const total = fmt === 'h' ? 110 : 90;   // wheel units: negative = closer
    for (let d = 0; Math.abs(d) < Math.abs(start); d += Math.sign(start) * 40) { await p.mouse.wheel(0, Math.sign(start) * 40); await r.jump(0.1); }
    await r.jump(1.5); await p.waitForTimeout(1200); await r.jump(1.0);
    r.recording = true;
    for (let i = 0; i < N; i++) { await p.mouse.wheel(0, -total / N); await r.frame(); }
    r.recording = false; await r.save(); console.log('hero', fmt, env, r.n, 'frames');
  }
})().catch(e => { console.error('FAIL', e.message.slice(0, 500)); process.exit(1); });
