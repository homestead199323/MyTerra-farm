// node verify_site.js <url> <prefix> : the homepage end to end, at desktop and phone size.
// Hero loop, each of the three demos (plays in view, last chapter jump, chapter list follows), pause carries over,
// the hero button, reduced motion, failed requests, console errors, sideways overflow. Prints one line per check.
const { chromium, devices } = require(process.env.PLAYWRIGHT || 'playwright');
const EXPECT = { balcony: 47.6, backyard: 50.8, farm: 49.0 };
(async () => {
  const [url, pre] = process.argv.slice(2); let bad = 0; const fail = (m) => { bad++; console.log('  FAIL', m); };
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [name, opt] of [['desk', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['iPhone 14'] }], ['phone-reduced', { ...devices['iPhone 14'], reducedMotion: 'reduce' }]]) {
    const ctx = await browser.newContext(opt); const p = await ctx.newPage(); const errs = [], reqs = [], badRes = [];
    p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });
    p.on('request', r => { const u = r.url(); if (/\/landing\/.*\.(mp4|webm|webp)/.test(u)) reqs.push(u.split('/').pop()); });
    p.on('response', r => { if (r.status() >= 400) badRes.push(r.status() + ' ' + r.url().split('/').slice(3).join('/').slice(0, 80)); });
    await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const hero = await p.evaluate(() => { const v = document.querySelector('#heroVideo'); return { src: (v.currentSrc || '').split('/').pop(), on: v.classList.contains('on'), paused: v.paused, t: +v.currentTime.toFixed(1), dur: +(v.duration || 0).toFixed(1), bg: getComputedStyle(document.querySelector('.hero-media')).backgroundImage.split('/').pop().replace(/["')]/g, '') }; });
    console.log(name, 'hero', JSON.stringify(hero), '| requested at the top:', [...new Set(reqs)].join(','));
    await p.screenshot({ path: `${pre}-${name}-top.jpg`, type: 'jpeg', quality: 80 });
    if (name === 'phone-reduced') {
      if (hero.src || !hero.paused) fail('hero video should stay a still picture with reduced motion');
      await p.evaluate(() => document.querySelector('.demo-player').scrollIntoView({ block: 'center' })); await p.waitForTimeout(3000);
      const s = await p.evaluate(() => { const v = document.querySelector('.panel:not([hidden]) video'); return { paused: v.paused, poster: (v.poster || '').split('/').pop(), label: document.querySelector('.panel:not([hidden]) .demo-toggle').getAttribute('aria-label') }; });
      console.log(name, 'demo in view', JSON.stringify(s)); if (!s.paused) fail('demo should wait for a tap with reduced motion'); if (!s.poster) fail('demo poster missing');
      await p.locator('.panel:not([hidden]) .demo-toggle').click(); await p.waitForTimeout(3000);
      const t = await p.evaluate(() => { const v = document.querySelector('.panel:not([hidden]) video'); return { paused: v.paused, t: +v.currentTime.toFixed(1) }; });
      console.log(name, 'after tapping play', JSON.stringify(t)); if (t.paused || t.t < 0.5) fail('demo did not play after the tap');
      console.log(name, 'bad responses:', badRes.join(' | ') || 'none', '| errors:', errs.slice(0, 5).join(' | ') || 'none'); if (badRes.length || errs.length) bad++;
      await ctx.close(); continue;
    }
    if (!/^hero4-/.test(hero.src) || !hero.on || hero.paused) fail('hero loop is not playing');
    if (name === 'desk' && !/hero4-h/.test(hero.src)) fail('desktop should get the wide hero'); if (name === 'phone' && !/hero4-v/.test(hero.src)) fail('phone should get the tall hero');
    if (reqs.some(r => /^demo-.*\.(mp4|webm)$/.test(r))) fail('a demo video was fetched before the section was near');
    const st = () => p.evaluate(() => { const pn = document.querySelector('.panel:not([hidden])'); const v = pn.querySelector('video'); return { env: pn.id.replace('panel-', ''), src: (v.currentSrc || '').split('/').pop(), paused: v.paused, t: +v.currentTime.toFixed(1), dur: +(v.duration || 0).toFixed(1), chap: [...pn.querySelectorAll('.chap')].findIndex(c => c.getAttribute('aria-current') === 'true') + 1, w: v.videoWidth, h: v.videoHeight, box: Math.round(v.getBoundingClientRect().width) + 'x' + Math.round(v.getBoundingClientRect().height) }; });
    for (const env of ['balcony', 'backyard', 'farm']) {
      await p.locator('#tab-' + env).click(); await p.evaluate(() => document.querySelector('.panel:not([hidden]) .demo-player').scrollIntoView({ block: 'center' })); await p.waitForTimeout(4500);
      const a = await st(); console.log(name, env, 'in view   ', JSON.stringify(a));
      if (a.env !== env || a.paused || a.t < 1 || a.chap !== 1) fail(env + ' did not start playing in view');
      if (Math.abs(a.dur - EXPECT[env]) > 0.3) fail(env + ' duration ' + a.dur + ' (expected ' + EXPECT[env] + ')'); if (a.w !== 720 || a.h !== 1280) fail(env + ' video size ' + a.w + 'x' + a.h);
      await p.screenshot({ path: `${pre}-${name}-${env}.jpg`, type: 'jpeg', quality: 80 });
      const want = await p.evaluate(() => +document.querySelector('.panel:not([hidden]) .chap:nth-of-type(1)').closest('ol').querySelectorAll('.chap')[5].dataset.t);
      await p.locator('.panel:not([hidden]) .chap').nth(5).click(); await p.waitForTimeout(3500);
      const b = await st(); console.log(name, env, 'chapter 6  ', JSON.stringify(b), 'chapter starts at', want);
      if (b.paused || b.t < want || b.t > want + 6 || b.chap !== 6) fail(env + ' chapter 6 jump');
      const others = await p.evaluate(() => [...document.querySelectorAll('.panel[hidden] video')].every(v => v.paused)); if (!others) fail('a hidden demo is still playing');
    }
    await p.locator('.panel:not([hidden]) .demo-toggle').click(); await p.waitForTimeout(600); const c = await st(); if (!c.paused) fail('pause button');
    await p.locator('#tab-balcony').click(); await p.waitForTimeout(1500); const d = await st(); console.log(name, 'paused, then balcony tab: paused =', d.paused); if (!d.paused) fail('pause should carry over to the next tab');
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600); await p.locator('#demoBtn').click(); await p.waitForTimeout(4500);
    const e = await st(); const vis = await p.evaluate(() => { const r = document.querySelector('.panel:not([hidden]) video').getBoundingClientRect(); return Math.round(100 * Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height); });
    console.log(name, 'hero button', JSON.stringify(e), 'film on screen: ' + vis + '%'); if (e.paused || vis < 45) fail('hero button should bring the demo on screen and play it');
    await p.screenshot({ path: `${pre}-${name}-herobtn.jpg`, type: 'jpeg', quality: 80 });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (over) fail('sideways overflow');
    console.log(name, 'files fetched:', [...new Set(reqs)].join(','), '| bad responses:', badRes.join(' | ') || 'none', '| errors:', errs.slice(0, 5).join(' | ') || 'none'); if (badRes.length || errs.length) bad++;
    await ctx.close();
  }
  await browser.close(); console.log(bad ? `RESULT: ${bad} problem(s)` : 'RESULT: all checks passed'); process.exit(bad ? 1 : 0);
})();
