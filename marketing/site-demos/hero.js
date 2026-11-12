// node hero.js <h|v> [frames] [out] : the looping farm shot behind the homepage headline.
// One slow push-in on the full-screen 3D map (no buttons or labels), recorded frame by frame.
const Rec = require('./rec2'); const fs = require('fs'); const { openMap } = require('./lib');
(async () => {
  const fmt = process.argv[2] || 'h'; const N = +(process.argv[3] || 390); const out = process.argv[4] || `frames/hero-${fmt}`;
  const vp = fmt === 'h' ? { width: 853, height: 480 } : { width: 480, height: 853 };
  const storage = JSON.parse(fs.readFileSync('states/farm.json'));
  const r = await Rec.open({ out, time: '2027-06-26T09:30:00+01:00', storage, viewport: vp, dpr: 2.25, quality: 94 });
  const p = r.p; await r.ready(5000); await openMap(r);
  if (!(await p.getByRole('button', { name: 'Close full screen map' }).count())) throw new Error('map did not open');
  await p.addStyleTag({ content: '.g3-host.full > :not(canvas) { display: none !important }' });
  const cx = vp.width * (fmt === 'h' ? 0.6 : 0.5), cy = vp.height * (fmt === 'h' ? 0.5 : 0.42);
  await p.mouse.move(cx, cy);
  // start a little wider than the home view, then push in at a constant rate
  const start = fmt === 'h' ? -260 : 60; const total = fmt === 'h' ? 200 : 170;   // wheel units: negative = closer
  for (let d = 0; Math.abs(d) < Math.abs(start); d += Math.sign(start) * 60) { await p.mouse.wheel(0, Math.sign(start) * 60); await r.jump(0.1); }
  await r.jump(1.5); await p.waitForTimeout(1200); await r.jump(1.0);
  r.recording = true;
  for (let i = 0; i < N; i++) { await p.mouse.wheel(0, -total / N); await r.frame(); }
  r.recording = false; await r.save(); console.log('hero', fmt, r.n, 'frames');
})().catch(e => { console.error('FAIL', e.message.slice(0, 500)); process.exit(1); });
