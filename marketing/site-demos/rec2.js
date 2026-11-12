// Frame-stepped recorder for the real MyTerra app (website demo videos).
// The page clock is frozen: every frame advances it exactly 1/FPS s, steps CSS
// animations/transitions by the same amount, then takes a screenshot. Motion is
// therefore smooth at FPS however slowly the machine renders the 3D map.
const { chromium, devices } = require('playwright');
const fs = require('fs');

const STEP_ANIMS = (dt) => {
  const w = window; w.__va = w.__va || new WeakMap();
  for (const a of document.getAnimations()) {
    try {
      let t = w.__va.get(a);
      if (t === undefined) {
        // first sight. One that already ran its course (and only holds its end state) is left alone;
        // one that is running was started by the last tap, so it plays from its start, frame by frame.
        if (a.playState === 'finished' || a.playState === 'idle') { w.__va.set(a, -1); continue; }
        t = 0; a.pause();
      }
      if (t < 0) continue;
      t += dt * (a.playbackRate || 1);
      w.__va.set(a, t);
      const end = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().endTime : Infinity;
      if (Number.isFinite(end) && t >= end) a.finish(); else a.currentTime = t;
    } catch (e) { /* animation went away */ }
  }
};

class Rec {
  static async open({ out, fps = 30, time = '2027-05-15T09:30:00+01:00', url = 'http://127.0.0.1:5179/index.html', storage = null, viewport = { width: 390, height: 660 }, dpr = 2, mobile = true, quality = 92, weather = null, rehearse = false, hasTouch = undefined }) {
    const r = new Rec(); Object.assign(r, { out, fps, n: 0, events: [], marks: {}, cuts: [], recording: false, quality, viewport, dpr, rehearse, shotN: 0 });
    fs.mkdirSync(out, { recursive: true });
    r.browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', env: { ...process.env, LANG: 'en_GB.UTF-8', LANGUAGE: 'en_GB:en', LC_ALL: 'en_GB.UTF-8' }, args: ['--lang=en-GB', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
    const base = mobile ? devices['iPhone 14'] : {};
    r.ctx = await r.browser.newContext({ ...base, viewport, deviceScaleFactor: dpr, ...(hasTouch === undefined ? {} : { hasTouch }), timezoneId: 'Europe/London', locale: 'en-GB', reducedMotion: 'no-preference' });
    // Weather: a fixed, mild, dry spring week so no recording depends on today's forecast.
    await r.ctx.route(/open-meteo\.com/, (route) => {
      const u = route.request().url();
      const body = /geocoding/.test(u) ? { results: [{ id: 1, name: 'Bristol', latitude: 51.4552, longitude: -2.5966, country: 'United Kingdom', country_code: 'GB', admin1: 'England' }] } : Rec.weather(time, weather);
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    });
    await r.ctx.route(/umami|analytics/, (route) => route.abort());
    if (storage) await r.ctx.addInitScript((kv) => { try { if (!localStorage.getItem('__seeded')) { for (const k in kv) localStorage.setItem(k, kv[k]); localStorage.setItem('__seeded', '1'); } } catch (e) {} }, storage);
    await r.ctx.clock.install({ time: new Date(time) });
    r.p = await r.ctx.newPage();
    r.p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 300)));
    r.p.on('console', m => { if (m.type() === 'error' && !/SUPABASE|Failed to load resource/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)); });
    await r.p.goto(url, { waitUntil: 'networkidle' });
    await r.p.waitForTimeout(1500);
    await r.p.clock.pauseAt(new Date(new Date(time).getTime() + 60000));
    return r;
  }
  // A fixed, mild week: sunny today, one wet day midweek. Same shape as Open-Meteo's answer.
  static weather(time, variant) {
    const d0 = new Date(time); const days = [], hours = [], pp = [], rh = [];
    for (let i = 0; i < 7; i++) { const d = new Date(d0.getTime() + i * 864e5).toISOString().slice(0, 10); days.push(d); for (let h = 0; h < 24; h++) { hours.push(d + 'T' + String(h).padStart(2, '0') + ':00'); pp.push(i === 3 ? 70 : 5); rh.push(i === 3 ? 82 : 60); } }
    return {
      latitude: 51.46, longitude: -2.6, timezone: 'Europe/London', utc_offset_seconds: 3600,
      current_weather: { temperature: 21, weathercode: 1, windspeed: 9, winddirection: 230, is_day: 1, time: days[0] + 'T09:00' },
      hourly: { time: hours, precipitation_probability: pp, relative_humidity_2m: rh },
      daily: { time: days, weather_code: [1, 2, 1, 61, 3, 2, 1], temperature_2m_max: variant === 'heat' ? [24, 27, 31, 29, 23, 22, 24] : [23, 24, 22, 18, 20, 22, 24], temperature_2m_min: [12, 13, 12, 11, 11, 12, 13], precipitation_sum: [0, 0, 0, 6.5, 0.3, 0, 0], precipitation_probability_max: [5, 5, 10, 85, 30, 10, 5], wind_gusts_10m_max: [18, 20, 22, 34, 26, 20, 16] },
    };
  }
  get t() { return this.n / this.fps; }
  async tick() { const dt = 1000 / this.fps; await this.p.clock.runFor(dt); await this.p.evaluate(STEP_ANIMS, dt); }
  async frame() {
    await this.tick();
    if (!this.recording) return;
    await this.p.screenshot({ type: 'jpeg', quality: this.quality, path: `${this.out}/${String(this.n).padStart(5, '0')}.jpg`, timeout: 240000 });
    this.n++;
  }
  async hold(sec) {
    if (!this.recording) return this.jump(sec);
    const k = Math.round(sec * this.fps); for (let i = 0; i < k; i++) await this.frame();
  }
  // off camera: move the clock on in coarse steps (a few 3D frames instead of 30 a second) and finish CSS animations
  async jump(sec) {
    const steps = Math.max(1, Math.round(sec / 0.25));
    for (let i = 0; i < steps; i++) { await this.p.clock.fastForward(Math.round(sec * 1000 / steps)); await this.p.clock.runFor(34); }
    await this.p.evaluate(() => { for (const a of document.getAnimations()) { try { const e = a.effect && a.effect.getComputedTiming().endTime; if (Number.isFinite(e)) a.finish(); } catch (x) {} } });
  }
  async skip(sec) { const was = this.recording; this.recording = false; await this.jump(sec); this.recording = was; }
  // let real time pass too (network, lazy chunks, 3D world build), then settle virtual time
  async settle(realMs = 1500, sec = 1.0) { await this.skip(0.3); await this.p.waitForTimeout(realMs); await this.skip(sec); }
  // wait (real time) for the 3D map to be built and the app to answer taps
  async ready(extraMs = 2500) {
    for (let i = 0; i < 60; i++) { if (await this.p.evaluate(() => document.querySelectorAll('canvas').length > 0)) break; await this.p.waitForTimeout(500); await this.jump(0.25); }
    await this.jump(1.0); await this.p.waitForTimeout(extraMs); await this.jump(2.0); await this.p.waitForTimeout(800); await this.jump(0.5);
    for (let i = 0; i < 6; i++) { const b = this.p.getByText('Tap anywhere to continue'); if (!(await b.count())) break; await this.p.mouse.click(195, 120); await this.jump(0.6); await this.p.waitForTimeout(300); }
  }
  // bottom tab (Today, Tasks, Farm, Calendar, More): tap until the tab is the current one
  async nav(name, opts) {
    await this.tap(this.el(name, 'last'), opts);
  }
  // any tappable thing (button, tab, link) by its visible text or label
  el(text, nth = 0) {
    const re = text instanceof RegExp ? text : new RegExp('^\\s*' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$');
    const byText = this.p.locator('button:visible,[role=button]:visible,[role=tab]:visible,a:visible').filter({ hasText: re });
    const byLabel = this.p.getByLabel(re).locator('visible=true');
    const l = byText.or(byLabel);
    return nth === 'last' ? l.last() : l.nth(nth);
  }
  mark(name) { this.marks[name] = this.n; }
  // camera on/off. Turning it on after a pause is a cut in the film.
  async cam(on, label) {
    if (on) { if (this.n > 0) this.cuts.push(this.n); this.recording = !this.rehearse; if (this.rehearse) await this.peek(label || 'cam-on'); }
    else { if (this.rehearse) await this.peek(label || 'cam-off'); this.recording = false; }
  }
  // rehearsal: keep a numbered still of what the camera would see
  async peek(label) { if (!this.rehearse) return; await this.jump(0.3); await this.p.screenshot({ type: 'jpeg', quality: 70, path: `${this.out}/r${String(this.shotN++).padStart(2, '0')}-${String(label).replace(/[^a-z0-9]+/gi, '_').slice(0, 24)}.jpg` }); }
  // native <select>: the finger taps the field, the value changes (the system picker itself is not part of the page)
  async pick(selectLoc, label, { pre = 0.6, post = 0.9 } = {}) {
    const b = await selectLoc.boundingBox(); const pt = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    if (this.recording) this.events.push({ type: 'tap', f: this.n + Math.round(pre * this.fps), x: pt.x, y: pt.y });
    await this.hold(pre); await selectLoc.selectOption({ label }); await this.hold(post);
    await this.peek('pick-' + label);
  }
  loc(sel) { return typeof sel === 'string' ? this.p.getByRole('button', { name: sel, exact: false }).first() : sel; }
  async point(sel) {
    const l = this.loc(sel);
    try { await l.scrollIntoViewIfNeeded({ timeout: 1500 }); } catch (e) { /* moving 3D badge */ }
    const b = await l.boundingBox(); if (!b) throw new Error('no box for ' + sel);
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
  // tap = finger travels (pre), presses, result settles (post)
  // offCamera: the finger reaches the button on the last frame of the shot; the press itself is not filmed
  // (used where the next screen would only flash by before a cut)
  async tap(sel, { pre = 0.6, post = 0.8, at = null, offCamera = false } = {}) {
    let pt = at || await this.point(sel);
    const ev = { type: 'tap', f: this.n + Math.round(pre * this.fps) - (offCamera ? 1 : 0), x: pt.x, y: pt.y };
    if (this.recording) this.events.push(ev);
    await this.hold(pre);
    if (offCamera) { if (this.rehearse) await this.peek('offcam'); this.recording = false; post = 0.3; }
    if (!at) { // the layout may have moved while the finger travelled: press where the target is now
      try { const b = await this.loc(sel).boundingBox({ timeout: 2000 }); if (b) { pt = { x: b.x + b.width / 2, y: b.y + b.height / 2 }; ev.x = pt.x; ev.y = pt.y; } } catch (e) { /* keep the first reading */ }
    }
    await this.p.mouse.click(pt.x, pt.y);
    await this.hold(post);
    await this.peek(typeof sel === 'string' ? sel : 'tap');
  }
  async type(locator, text, { perChar = 0.14 } = {}) {
    await this.tap(locator, { post: 0.25 });
    for (const ch of text) { await this.p.keyboard.type(ch); await this.hold(perChar); }
  }
  async scroll(dy, sec = 1.2, at = { x: 195, y: 420 }) {
    const k = this.recording ? Math.max(2, Math.round(sec * this.fps)) : 3; let done = 0;
    await this.p.mouse.move(at.x, at.y);
    if (this.recording) this.events.push({ type: 'swipe', f0: this.n, f1: this.n + k, x0: at.x, y0: at.y + Math.sign(dy) * 70, x1: at.x, y1: at.y - Math.sign(dy) * 70 });
    for (let i = 1; i <= k; i++) {
      const e = 0.5 - 0.5 * Math.cos(Math.PI * i / k); const step = Math.round(dy * e) - done; done += step;
      if (step) await this.p.mouse.wheel(0, step);
      if (this.recording) await this.frame(); else await this.jump(0.1);
    }
  }
  async drag(a, b, sec = 1.4) {
    const k = this.recording ? Math.max(2, Math.round(sec * this.fps)) : 6;
    if (this.recording) this.events.push({ type: 'drag', f0: this.n, f1: this.n + k, x0: a.x, y0: a.y, x1: b.x, y1: b.y });
    await this.p.mouse.move(a.x, a.y); await this.p.mouse.down();
    for (let i = 1; i <= k; i++) { const e = 0.5 - 0.5 * Math.cos(Math.PI * i / k); await this.p.mouse.move(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e); if (this.recording) await this.frame(); else await this.jump(0.05); }
    await this.p.mouse.up();
  }
  async shot(name) { await this.p.screenshot({ type: 'jpeg', quality: 80, path: `${this.out}/${name}.jpg` }); }
  async dumpState(file) {
    const kv = await this.p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
    delete kv.__seeded; fs.writeFileSync(file, JSON.stringify(kv)); return kv;
  }
  async buttons() { return this.p.evaluate(() => [...document.querySelectorAll('button,[role=button],[role=tab],a')].filter(b => b.offsetParent).map(b => (b.getAttribute('aria-label') || b.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60)).filter(Boolean)); }
  async save() {
    fs.writeFileSync(`${this.out}/events.json`, JSON.stringify({ fps: this.fps, frames: this.n, viewport: this.viewport, dpr: this.dpr, events: this.events, marks: this.marks, cuts: this.cuts }, null, 1));
    await this.browser.close();
  }
}
module.exports = Rec;
