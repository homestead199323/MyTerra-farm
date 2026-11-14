// node verify_site.js <url> <prefix> : the homepage end to end, at desktop, phone and 320 px.
// Hero loop; the first-minute film (plays in view, last-part jump, hero button); the three clips of each space
// (play in view, stop in a hidden tab and off screen); one pause for all; reduced motion; old links; failed
// requests; console errors; sideways overflow. Prints one line per check.
const { chromium, devices } = require(process.env.PLAYWRIGHT || 'playwright');
const CLIPS = { balcony: ['b-jobs', 'b-growth', 'b-pots'], backyard: ['y-build', 'y-eggs', 'y-frost'], farm: ['f-check', 'f-milk', 'f-orchard'] };
(async () => {
  const [url, pre] = process.argv.slice(2); let bad = 0; const fail = (m) => { bad++; console.log('  FAIL', m); };
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const phone = devices['iPhone 14'];
  for (const [name, opt] of [['desk', { viewport: { width: 1440, height: 900 } }], ['phone', { ...phone }], ['narrow', { ...phone, viewport: { width: 320, height: 640 } }], ['phone-reduced', { ...phone, reducedMotion: 'reduce' }]]) {
    const ctx = await browser.newContext(opt); const p = await ctx.newPage(); const errs = [], reqs = [], badRes = [];
    await p.addInitScript(() => { const s = document.createElement('style'); s.textContent = 'html{scroll-behavior:auto!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s)); });
    p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });
    p.on('request', r => { const u = r.url(); if (/\/landing\/.*\.(mp4|webm|webp)/.test(u)) reqs.push(u.split('/').pop()); });
    p.on('response', r => { if (r.status() >= 400) badRes.push(r.status() + ' ' + r.url().split('/').slice(3).join('/').slice(0, 80)); });
    await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(3500);
    const wide = name === 'desk';
    const vids = () => p.evaluate(() => [...document.querySelectorAll('.demo-player video, .loop-player video')].map(v => { const b = v.parentNode; return { id: b.dataset.loop || 'film', paused: v.paused, t: +v.currentTime.toFixed(1), dur: +(v.duration || 0).toFixed(1), w: v.videoWidth, h: v.videoHeight, src: (v.currentSrc || '').split('/').pop(), poster: (v.poster || '').split('/').pop(), shown: b.offsetParent !== null }; }));
    const show = (sel, block = 'center') => p.evaluate(([s, b]) => document.querySelector(s).scrollIntoView({ block: b }), [sel, block]);
    const hero = await p.evaluate(() => { const v = document.querySelector('#heroVideo'); return { src: (v.currentSrc || '').split('/').pop(), on: v.classList.contains('on'), paused: v.paused, t: +v.currentTime.toFixed(1) }; });
    console.log(name, 'hero', JSON.stringify(hero), '| fetched at the top:', [...new Set(reqs)].join(','));
    await p.screenshot({ path: `${pre}-${name}-top.jpg`, type: 'jpeg', quality: 80 });
    const text = await p.evaluate(() => document.body.innerText); if (/FILM-SECONDS/.test(text)) fail('FILM-SECONDS token left on the page (run apply_times.py)');
    for (const id of ['first', 'spaces', 'why', 'knowhow', 'pricing', 'faq', 'demo', 'how', 'tour']) if (!(await p.locator('#' + id).count())) fail('no element for the link #' + id);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fail('sideways overflow at the top');

    if (name === 'phone-reduced') {
      if (hero.src || !hero.paused) fail('hero should stay a still picture with reduced motion');
      await show('.demo-player'); await p.waitForTimeout(2500);
      let f = (await vids())[0]; console.log(name, 'film in view', JSON.stringify(f)); if (!f.paused) fail('film should wait for a tap with reduced motion'); if (!f.poster) fail('film poster missing');
      await show('#panel-balcony .loop-player'); await p.waitForTimeout(2500);
      const c = (await vids()).filter(v => v.shown && v.id !== 'film'); console.log(name, 'clips in view', JSON.stringify(c.map(v => [v.id, v.paused, v.poster])));
      if (c.some(v => !v.paused)) fail('clips should wait for a tap with reduced motion'); if (c.some(v => !v.poster)) fail('a clip poster is missing');
      if (reqs.some(r => /\.(mp4|webm)$/.test(r))) fail('a video was fetched with reduced motion before any tap: ' + reqs.filter(r => /\.(mp4|webm)$/.test(r)).join(','));
      await p.locator('#panel-balcony .loop-toggle').first().click(); await p.waitForTimeout(3000);
      const d = (await vids()).filter(v => v.shown && v.id !== 'film'); console.log(name, 'after tapping play', JSON.stringify(d.map(v => [v.id, v.paused, v.t])));
      if (!d.some(v => !v.paused && v.t > 0.4)) fail('no clip played after the tap');
      console.log(name, 'bad responses:', badRes.join(' | ') || 'none', '| errors:', errs.slice(0, 5).join(' | ') || 'none'); if (badRes.length || errs.length) bad++;
      await ctx.close(); continue;
    }

    if (!/^hero5-/.test(hero.src) || !hero.on || hero.paused) fail('hero loop is not playing');
    if (wide && !/hero5-h/.test(hero.src)) fail('desktop should get the wide hero'); if (!wide && !/hero5-v/.test(hero.src)) fail('phone should get the tall hero');
    if (reqs.some(r => /^(first-minute|loop-).*\.(mp4|webm)$/.test(r))) fail('a film or clip was fetched before its section was near');

    // the film
    await show('.demo-player'); await p.waitForTimeout(4500);
    let f = (await vids())[0]; const chap = () => p.evaluate(() => [...document.querySelectorAll('#first .chap')].findIndex(c => c.getAttribute('aria-current') === 'true') + 1);
    console.log(name, 'film in view', JSON.stringify(f), 'part', await chap());
    if (f.paused || f.t < 1) fail('film did not start playing in view'); if (f.w !== 720 || f.h !== 1280) fail('film size ' + f.w + 'x' + f.h); if ((await chap()) !== 1) fail('film should start on part 1');
    await p.screenshot({ path: `${pre}-${name}-film.jpg`, type: 'jpeg', quality: 80 });
    const want = await p.evaluate(() => +document.querySelectorAll('#first .chap')[3].dataset.t);
    await p.locator('#first .chap').nth(3).click(); await p.waitForTimeout(3500);
    f = (await vids())[0]; console.log(name, 'part 4 jump', JSON.stringify(f), 'starts at', want, 'part', await chap());
    if (f.paused || f.t < want || f.t > want + 6 || (await chap()) !== 4) fail('part 4 jump');
    if (f.dur && want >= f.dur) fail('part 4 starts after the film ends (stale times? run apply_times.py)');

    // the clips, space by space
    for (const env of ['balcony', 'backyard', 'farm']) {
      await show('#spaces .tabs', 'start'); await p.locator('#tab-' + env).click(); await p.waitForTimeout(300);
      await show(`#panel-${env} .loop-player`, wide ? 'center' : 'center'); await p.waitForTimeout(4500);
      const all = await vids(); const mine = all.filter(v => CLIPS[env].includes(v.id)); const others = all.filter(v => v.id !== 'film' && !CLIPS[env].includes(v.id));
      console.log(name, env, JSON.stringify(mine.map(v => [v.id, v.paused ? 'paused' : 'playing', v.t, v.w + 'x' + v.h])));
      if (mine.length !== 3) fail(env + ' should have three clips'); if (mine.some(v => !v.shown)) fail(env + ' clip hidden');
      if (wide ? mine.some(v => v.paused || v.t < 0.5) : !(mine[0] && !mine[0].paused && mine[0].t > 0.5)) fail(env + (wide ? ': all three clips should play on a wide screen' : ': the clip on screen should play'));
      if (mine.filter(v => !v.paused).some(v => v.w !== 540 || v.h !== 960)) fail(env + ' clip size');
      if (others.some(v => !v.paused)) fail('a clip in a hidden tab is playing: ' + others.filter(v => !v.paused).map(v => v.id));
      if (all[0] && !all[0].paused) fail('the film is still playing off screen');
      await p.screenshot({ path: `${pre}-${name}-${env}.jpg`, type: 'jpeg', quality: 80 });
      if (!wide) { // swipe to the second clip: it takes over
        await p.evaluate((e) => { const r = document.querySelector(`#panel-${e} .loops`); r.scrollTo({ left: r.children[1].offsetLeft - (r.clientWidth - r.children[1].clientWidth) / 2 }); }, env); await p.waitForTimeout(2500);
        const m2 = (await vids()).filter(v => CLIPS[env].includes(v.id)); if (m2[1].paused) fail(env + ': the second clip should play after a swipe'); if (!m2[0].paused) fail(env + ': the first clip should stop after a swipe');
      }
    }
    // one pause for all
    await p.locator('#panel-farm .loop-player:not(.paused) .loop-toggle').first().click(); await p.waitForTimeout(700);
    if ((await vids()).some(v => !v.paused)) fail('pause should stop every clip');
    await show('#spaces .tabs', 'start'); await p.locator('#tab-balcony').click(); await show('#panel-balcony .loop-player'); await p.waitForTimeout(1800);
    const still = (await vids()).filter(v => !v.paused); console.log(name, 'paused, then balcony tab: playing =', still.length); if (still.length) fail('pause should carry over to the next tab');
    await p.locator('#panel-balcony .loop-toggle').first().click(); await p.waitForTimeout(2200);
    if (!(await vids()).some(v => !v.paused)) fail('play after pause');
    // off screen: nothing plays
    await show('#pricing', 'start'); await p.waitForTimeout(1500);
    const off = (await vids()).filter(v => !v.paused); if (off.length) fail('still playing off screen: ' + off.map(v => v.id));
    // hero button
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600); await p.locator('#demoBtn').click(); await p.waitForTimeout(4500);
    f = (await vids())[0]; const vis = await p.evaluate(() => { const r = document.querySelector('.demo-player video').getBoundingClientRect(); return Math.round(100 * Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / r.height); });
    console.log(name, 'hero button', JSON.stringify(f), 'film on screen: ' + vis + '%'); if (f.paused || vis < 45) fail('hero button should bring the film on screen and play it');
    await p.screenshot({ path: `${pre}-${name}-herobtn.jpg`, type: 'jpeg', quality: 80 });
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fail('sideways overflow');
    console.log(name, 'files fetched:', [...new Set(reqs)].length, '| bad responses:', badRes.join(' | ') || 'none', '| errors:', errs.slice(0, 5).join(' | ') || 'none'); if (badRes.length || errs.length) bad++;
    await ctx.close();
  }
  await browser.close(); console.log(bad ? `RESULT: ${bad} problem(s)` : 'RESULT: all checks passed'); process.exit(bad ? 1 : 0);
})();
