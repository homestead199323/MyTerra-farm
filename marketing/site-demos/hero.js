// node hero.js <h|v> [frames per space] : the looping shot behind the homepage headline.
// Three slow push-ins on the home map, one per space (balcony, backyard, farm), with every control hidden.
// hero_compose.py dissolves one into the next and the last back into the first.
// `node hero.js h 3` keeps three frames per space: check the framing that way before filming the full length.
const Rec = require('./rec2'); const fs = require('fs');
(async () => {
  const fmt = process.argv[2] || 'h'; const N = +(process.argv[3] || 150);
  const vp = fmt === 'h' ? { width: 853, height: 480 } : { width: 480, height: 853 };
  for (const env of ['balcony', 'backyard', 'farm']) {
    const out = `frames/hero-${fmt}/${env}`; fs.rmSync(out, { recursive: true, force: true });
    const storage = JSON.parse(fs.readFileSync(`states/${env}.json`));
    const r = await Rec.open({ out, time: '2027-06-26T09:30:00+01:00', storage, viewport: vp, dpr: 2.25, quality: 94, mobile: fmt === 'v' });
    const p = r.p; await r.ready(5000);
    // nothing but the map: hide every sibling on the way up from the canvas (capsules, panels, dock, labels, badges)
    const collapse = p.getByRole('button', { name: /^(Hide|Collapse)/ }).locator('visible=true').first(); if (await collapse.count()) { await collapse.click(); await r.jump(1.0); }
    await p.evaluate(() => { let e = document.querySelector('canvas'); while (e && e !== document.body) { for (const s of e.parentElement.children) if (s !== e && !/^(SCRIPT|STYLE)$/.test(s.tagName)) s.style.setProperty('display', 'none', 'important'); e = e.parentElement; } });
    const cx = vp.width * (fmt === 'h' ? 0.6 : 0.5), cy = vp.height * (fmt === 'h' ? 0.5 : 0.42);   // the headline sits on the left on wide screens
    // the wheel is sent straight to the canvas: a real pointer over the map would light up the plant under it and show its tip
    const wheel = (dy) => p.evaluate(([x, y, d]) => document.querySelector('canvas').dispatchEvent(new WheelEvent('wheel', { deltaY: d, clientX: x, clientY: y, bubbles: true, cancelable: true })), [cx, cy, dy]);
    await p.mouse.move(2, 2);
    const start = fmt === 'h' ? (env === 'farm' ? -320 : -120) : 40; const total = fmt === 'h' ? 110 : 90;   // wheel units: negative = closer
    for (let d = 0; Math.abs(d) < Math.abs(start); d += Math.sign(start) * 40) { await wheel(Math.sign(start) * 40); await r.jump(0.1); }
    await r.jump(1.5); await p.waitForTimeout(1200); await r.jump(1.0);
    r.recording = true;
    for (let i = 0; i < N; i++) { await wheel(-total / N); await r.frame(); }
    r.recording = false; await r.save(); console.log('hero', fmt, env, r.n, 'frames');
  }
})().catch(e => { console.error('FAIL', e.message.slice(0, 500)); process.exit(1); });
