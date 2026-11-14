// node mk.js <env> [today] → states/<env>.json (localStorage dump with the demo garden)
// AGE_SHIFT=51 node mk.js backyard 2027-05-06 → the same garden seven weeks earlier (keep it as states/backyard_may.json)
const Rec = require('./rec2'); const seed = require('./seed'); const fs = require('fs');
(async () => {
  const env = process.argv[2]; const today = process.argv[3] || '2027-06-26'; const time = today + 'T09:30:00+01:00';
  let r = await Rec.open({ out: 'explore/mk', time });
  const res = await seed(r.p, env, today, +(process.env.AGE_SHIFT || 0));
  console.log(env, 'notes:', JSON.stringify(res.notes)); if (process.argv[4]) console.log(res.plots.join('\n'));
  await r.browser.close();
  const kv = { hfm_data_v7: JSON.stringify(res.data), hfm_first_use: String(new Date(today).getTime() - 2 * 864e5), hfm_feedback_dismissed: 'true', hfm_feedback_done: 'true', hfm_theme: 'light' };
  // second pass: the app opens the garden, awards its badges, fetches the (fixed) forecast; dismiss the celebrations and keep what it saved
  r = await Rec.open({ out: 'explore/mk', time, storage: kv });
  await r.ready(4000);
  for (let i = 0; i < 8; i++) { const b = r.p.getByText('Tap anywhere to continue'); if (!(await b.count())) break; await r.p.mouse.click(195, 120); await r.jump(0.8); await r.p.waitForTimeout(400); }
  await r.jump(2.0); await r.p.waitForTimeout(800); await r.jump(1.0);
  const out = await r.dumpState(`states/${env}.json`);
  const d = JSON.parse(out.hfm_data_v7); console.log(env, 'badges', (d.gamify.badges || []).length, 'zones', d.zones.length, 'plots', d.garden.plots.length, 'keys', Object.keys(out).join(','));
  await r.browser.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 600)); process.exit(1); });
