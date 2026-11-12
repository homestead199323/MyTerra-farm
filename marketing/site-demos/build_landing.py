#!/usr/bin/env python3
"""Rewrite the homepage for the three demo videos. Starts from landing.html / landing.js as they were at
commit 46dbacc (before the demos), so later edits to the page are NOT carried over: after a re-record, either
port those edits or just update the data-t chapter times in public/landing.html by hand.
usage: build_landing.py [chapters_dir] [base_commit]"""
import json, os, subprocess, sys, html
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(HERE, "..", "..")); CH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out")
BASE = sys.argv[2] if len(sys.argv) > 2 else "46dbacc"   # the page as it was before the demos; edits made to the page since then are not carried over
def show(p): return subprocess.check_output(["git", "-C", REPO, "show", f"{BASE}:{p}"]).decode()
h = show("public/landing.html"); js = show("public/landing.js")
def rep(s, old, new, n=1):
    c = s.count(old); assert c == n, f"expected {n} of {old[:70]!r}, found {c}"
    return s.replace(old, new)
def cut(s, start, end, new, keep_end=True):
    a = s.index(start); b = s.index(end, a); assert s.count(start) == 1, start[:50]
    return s[:a] + new + (s[b:] if keep_end else s[b + len(end):])
E = html.escape
demos = [json.load(open(f"{CH}/{e}-chapters.json")) for e in ("balcony", "backyard", "farm")]
EMO = {"balcony": "🏙️", "backyard": "🏡", "farm": "🌾"}
CTA = {"balcony": "Try it on your balcony", "backyard": "Try it in your garden", "farm": "Try it on your farm"}
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
PAUSE = '<svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.2"/><rect x="14" y="4" width="4" height="16" rx="1.2"/></svg>'
PLAY = '<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5.2a1.6 1.6 0 0 1 2.4-1.4l10 6.2a1.6 1.6 0 0 1 0 2.8l-10 6.2A1.6 1.6 0 0 1 7 17.6z"/></svg>'

def secs(t): return f"{int(round(t))} seconds"
def panel(d, first):
    e = d["env"]; low = d["label"].lower()
    items = "\n".join(
        f'                        <li><button type="button" class="chap" data-t="{c["t"]:.2f}"{" aria-current=\"true\"" if i == 0 else ""} data-umami-event="demo-chapter" data-umami-event-env="{e}" data-umami-event-chapter="{c["id"]}"><span class="n" aria-hidden="true">{i + 1}</span><span class="tx"><b>{E(c["title"])}</b><small>{E(c["sub"])}</small></span></button></li>'
        for i, c in enumerate(d["chapters"]))
    transcript = f'A {int(round(d["duration"]))}-second demo of MyTerra for a {low}, recorded from the app, in {len(d["chapters"])} parts. ' + " ".join(f'{i + 1}. {c["title"]}: {c["sub"]}' for i, c in enumerate(d["chapters"])) + " Everyone can be a farmer. Try the app at myterra.farm, no sign-up and no card."
    return f'''        <div class="panel" id="panel-{e}" role="tabpanel" aria-labelledby="tab-{e}"{"" if first else " hidden"}>
            <div class="demo-grid">
                <div class="demo-player paused" data-demo="{e}">
                    <video muted loop playsinline preload="none" width="720" height="1280" data-mp4="/landing/demo-{e}.mp4" data-webm="/landing/demo-{e}.webm" data-poster="/landing/demo-{e}-poster.webp" aria-describedby="demoText-{e}"></video>
                    <button type="button" class="demo-toggle" aria-label="Play the {low} demo" data-label="{low}">
                        {PAUSE}
                        {PLAY}
                    </button>
                </div>
                <div class="demo-copy">
                    <h3>{E(d["label"])}</h3>
                    <span class="size">{E(d["tagline"])} · {secs(d["duration"])}</span>
                    <ol class="chapters" aria-label="Parts of the {low} demo">
{items}
                    </ol>
                    <a href="/app" class="btn btn-amber" data-umami-event="cta-demo" data-umami-event-env="{e}">{CTA[e]} {ARROW}</a>
                </div>
            </div>
            <p class="sr-only" id="demoText-{e}">{E(transcript)}</p>
        </div>'''

def tab(d, first):
    e = d["env"]
    return f'            <button type="button" class="tab" role="tab" id="tab-{e}" aria-selected="{"true" if first else "false"}" aria-controls="panel-{e}"{"" if first else " tabindex=\"-1\""} data-umami-event="env-tab" data-umami-event-env="{e}"><span class="em" aria-hidden="true">{EMO[e]}</span>{E(d["label"])}</button>'

section = f'''<!-- DEMOS -->
<section class="demo dark" id="demo" aria-labelledby="demoTitle">
    <span id="spaces" aria-hidden="true"></span><span id="tour" aria-hidden="true"></span>
    <div class="container">
        <div class="sec-head reveal">
            <span class="eyebrow">See it in action</span>
            <h2 id="demoTitle">Balcony, backyard or farm. Watch yours.</h2>
            <p>Three short demos, recorded straight from the app. Pick your space and see what MyTerra does for it.</p>
        </div>
        <div class="tabs reveal" role="tablist" aria-label="Choose a demo">
{chr(10).join(tab(d, i == 0) for i, d in enumerate(demos))}
        </div>
{chr(10).join(panel(d, i == 0) for i, d in enumerate(demos))}
        <p class="note">Real app footage. Demo gardens, not customer data.</p>
    </div>
</section>

'''
# ── HTML: one demo section replaces the still-picture tabs and the 15-second tour ──
h = cut(h, "<!-- SPACES -->", "<!-- HOW IT WORKS -->", section)
h = rep(h, '''                <a href="#tour" class="btn btn-glass" id="tourBtn" data-umami-event="tour-play">''', '''                <a href="#demo" class="btn btn-glass" id="demoBtn" data-umami-event="demo-play">''')
h = rep(h, "                    Watch the 15-second tour\n", "                    Watch the demo\n")
h = rep(h, '<a href="#spaces">Your space</a>', '<a href="#demo">Demos</a>', 2)
# head: link previews, preloads, no-script poster
d0 = demos[0]
h = rep(h, '<meta property="og:video" content="https://www.myterra.farm/landing/tour3-h.mp4">', '<meta property="og:video" content="https://www.myterra.farm/landing/demo-balcony.mp4">')
h = rep(h, '<meta property="og:video:width" content="1280">', '<meta property="og:video:width" content="720">')
h = rep(h, '<meta property="og:video:height" content="720">', '<meta property="og:video:height" content="1280">')
h = rep(h, "/landing/hero3-h.webp", "/landing/hero4-h.webp", 2)
h = rep(h, "/landing/hero3-v.webp", "/landing/hero4-v.webp", 2)
h = rep(h, 'data-h="/landing/hero3-h.mp4" data-hw="/landing/hero3-h.webm" data-v="/landing/hero3-v.mp4" data-vw="/landing/hero3-v.webm"', 'data-h="/landing/hero4-h.mp4" data-hw="/landing/hero4-h.webm" data-v="/landing/hero4-v.mp4" data-vw="/landing/hero4-v.webm"')
a = h.index("    <noscript><style>.tour-frame{"); b = h.index("</noscript>", a) + len("</noscript>")
h = h[:a] + '    <noscript><style>.demo-player{background-image:url(/landing/demo-balcony-poster.webp)}.demo-player[data-demo="backyard"]{background-image:url(/landing/demo-backyard-poster.webp)}.demo-player[data-demo="farm"]{background-image:url(/landing/demo-farm-poster.webp)}.demo-toggle{display:none}.panel[hidden]{display:block;margin-top:56px}</style></noscript>' + h[b:]
# ── CSS ──
a = h.index("        .tour { background:"); b = h.index("        .tour-points li {"); b = h.index("\n", b) + 1
demo_css = '''        .demo { position: relative; background: linear-gradient(180deg, var(--forest) 0%, var(--forest-2) 100%); color: #fff; padding: 88px 0 96px; overflow: hidden; }
        .demo::before { content: ""; position: absolute; inset: auto -20% -40% -20%; height: 70%; background: radial-gradient(closest-side, rgba(31,163,92,.28), transparent); pointer-events: none; }
        .demo .container { position: relative; }
        .demo .tabs { background: rgba(255,255,255,.08); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); margin-bottom: 44px; scroll-margin-top: calc(var(--nav-h) + 18px); }
        .demo .tab { color: rgba(255,255,255,.84); }
        .demo .tab[aria-selected="true"] { background: #fff; color: var(--ink); box-shadow: 0 8px 20px rgba(0,0,0,.28); }
        .demo-grid { display: grid; grid-template-columns: minmax(0, 372px) minmax(0, 470px); gap: 64px; justify-content: center; align-items: center; }
        .demo-player { position: relative; width: 100%; aspect-ratio: 9 / 16; border-radius: 30px; overflow: hidden; background: #0a2a1c center / cover no-repeat; box-shadow: 0 40px 90px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08); }
        .demo-player video { display: block; width: 100%; height: 100%; object-fit: cover; }
        .demo-toggle { position: absolute; right: 14px; bottom: 14px; width: 48px; height: 48px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center; background: rgba(6,35,26,.78); color: #fff; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.3), 0 6px 16px rgba(0,0,0,.3); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .demo-toggle svg { width: 20px; height: 20px; }
        .demo-toggle .i-play, .demo-player.paused .demo-toggle .i-pause { display: none; }
        .demo-player.paused .demo-toggle .i-play { display: block; }
        .demo-copy h3 { font-size: 34px; }
        .demo-copy .size { display: inline-block; margin-top: 10px; font-size: 14px; font-weight: 700; color: var(--amber); background: rgba(255,255,255,.09); padding: 5px 12px; border-radius: 999px; }
        .chapters { list-style: none; margin: 20px -12px 26px; display: grid; gap: 2px; }
        .chap { display: flex; align-items: flex-start; gap: 14px; width: 100%; padding: 10px 12px; border: 0; border-radius: 16px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background .25s ease; }
        .chap:hover { background: rgba(255,255,255,.06); }
        .chap .n { flex: 0 0 28px; height: 28px; margin-top: 1px; border-radius: 9px; display: grid; place-items: center; font-size: 13.5px; font-weight: 800; background: rgba(255,255,255,.1); color: rgba(255,255,255,.82); transition: background .25s ease, color .25s ease; }
        .chap b { display: block; font-size: 16.5px; font-weight: 700; line-height: 1.3; color: rgba(255,255,255,.9); }
        .chap small { display: block; margin-top: 3px; font-size: 14.5px; line-height: 1.45; color: rgba(255,255,255,.62); }
        .chap[aria-current="true"] { background: rgba(255,255,255,.1); box-shadow: inset 0 0 0 1px rgba(255,255,255,.16); }
        .chap[aria-current="true"] .n { background: var(--amber); color: var(--amber-ink); }
        .chap[aria-current="true"] b { color: #fff; }
        .chap[aria-current="true"] small { color: rgba(255,255,255,.82); }
'''
h = h[:a] + demo_css + h[b:]
a = h.index("        .spaces { background: var(--paper); }\n"); b = h.index("        .ticks { list-style: none;")
tabs_css = '''        .tabs { display: flex; justify-content: center; gap: 8px; margin: -20px auto 34px; padding: 6px; background: var(--bg); border-radius: 18px; width: max-content; max-width: 100%; box-shadow: inset 0 0 0 1px var(--line); }
        .tab { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 22px; border-radius: 13px; border: 0; background: transparent; font-weight: 700; font-size: 15.5px; color: var(--ink-2); cursor: pointer; }
        .tab[aria-selected="true"] { background: var(--paper); color: var(--ink); box-shadow: var(--sh-1), 0 2px 0 var(--line); }
        .tab .em { font-size: 18px; }
'''
old_block = h[a:b]
for must in (".tabs { display: flex;", ".tab { display: inline-flex;", '.tab[aria-selected="true"] {', ".tab .em {", ".space-grid {", ".space-shot {", ".space-shot img {", ".space-copy h3 {", ".space-copy .size {"): assert must in old_block, must
h = h[:a] + tabs_css + h[b:]
h = rep(h, "            .space-grid { grid-template-columns: 1fr; gap: 26px; }\n            .space-copy { text-align: left; }\n", "            .demo-grid { grid-template-columns: minmax(0, 1fr); gap: 30px; }\n            .demo-player { max-width: min(100%, 372px, calc(78svh * 9 / 16)); margin: 0 auto; }\n            .demo-copy { max-width: 520px; margin: 0 auto; width: 100%; }\n")
h = rep(h, "            .tour-frame { aspect-ratio: 9 / 16; max-width: min(100%, calc(76svh * 9 / 16)); border-radius: 26px; }\n", "")
h = rep(h, "            .tour { padding: 64px 0 76px; }\n            .tour-points { display: none; }\n", "            .demo { padding: 64px 0 72px; }\n            .demo .tabs { margin-bottom: 30px; }\n            .demo-player { border-radius: 26px; }\n            .chapters { margin-top: 16px; margin-bottom: 22px; }\n            .chap { padding: 9px 12px; align-items: center; }\n            .chap b { font-size: 16px; }\n            .chap small { display: none; }\n            .demo-copy .btn { width: 100%; }\n")
h = rep(h, "            .space-copy h3 { font-size: 25px; }\n", "            .demo-copy h3 { font-size: 27px; }\n")
for gone in ("tour3", "hero3", "d3-", "space-shot", "space-grid", "tourFrame", "tourVideo", "tour-frame", "15-second", 'href="#tour"', 'href="#spaces"'): assert gone not in h, "left over: " + gone
open(f"{REPO}/public/landing.html", "w").write(h)

# ── JS: the tour player becomes one player per demo, with chapters that follow the video ──
a = js.index("  // ── Tour video: vertical on portrait screens"); b = js.index("  // ── In-page links: smooth scroll, close the menu ──")
player_js = r'''  // ── Demo videos: one portrait film per space. Each loads only when its tab is showing and near the
  //    screen, plays while in view, and marks the chapter it is on. ──
  var players = Array.prototype.slice.call(document.querySelectorAll(".demo-player"));
  var demoPaused = reduceMotion || saveData; // one choice for all three: pausing one keeps the others still
  function setupPlayer(box) {
    var video = box.querySelector("video");
    var toggle = box.querySelector(".demo-toggle");
    var panel = box.parentNode.parentNode;
    var chaps = Array.prototype.slice.call(panel.querySelectorAll(".chap"));
    var times = chaps.map(function (c) { return parseFloat(c.getAttribute("data-t")) || 0; });
    var loaded = false, inView = false, current = 0, pendingSeek = null;
    if (!video) return null;
    video.muted = true;
    function sync() {
      box.classList.toggle("paused", video.paused);
      if (toggle) toggle.setAttribute("aria-label", (video.paused ? "Play the " : "Pause the ") + toggle.getAttribute("data-label") + " demo");
    }
    function poster() {
      var src = video.getAttribute("data-poster");
      if (src && video.getAttribute("poster") !== src) video.setAttribute("poster", src);
    }
    function load() {
      poster();
      if (loaded) return;
      loaded = true;
      [["data-mp4", "video/mp4"], ["data-webm", "video/webm"]].forEach(function (s) {
        var src = video.getAttribute(s[0]);
        if (!src) return;
        var el = document.createElement("source");
        el.src = src; el.type = s[1];
        video.appendChild(el);
      });
      video.load();
    }
    function play() { load(); var p = video.play(); if (p && p.catch) p.catch(function () { sync(); }); }
    function mark(i) {
      if (i === current) return;
      current = i;
      chaps.forEach(function (c, k) { if (k === i) c.setAttribute("aria-current", "true"); else c.removeAttribute("aria-current"); });
    }
    function seek(t) {
      if (video.readyState >= 1) { try { video.currentTime = t; } catch (e) { /* not seekable yet */ } }
      else pendingSeek = t;
    }
    video.addEventListener("loadedmetadata", function () { if (pendingSeek != null) { try { video.currentTime = pendingSeek; } catch (e) { /* ignore */ } pendingSeek = null; } });
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("timeupdate", function () {
      var t = video.currentTime + 0.05, i = 0;
      for (var k = 0; k < times.length; k++) if (t >= times[k]) i = k;
      mark(i);
    });
    if (toggle) toggle.addEventListener("click", function () {
      if (video.paused) { demoPaused = false; play(); } else { demoPaused = true; video.pause(); }
    });
    chaps.forEach(function (c, i) {
      c.addEventListener("click", function () {
        demoPaused = false; load(); seek(times[i]); mark(i);
        // on a phone the list sits under the film: bring the film back on screen, where it plays
        var r = box.getBoundingClientRect(), h = window.innerHeight || document.documentElement.clientHeight;
        var seen = (Math.min(r.bottom, h) - Math.max(r.top, 0)) / (r.height || 1);
        if (seen >= 0.5) play(); else box.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      });
    });
    sync();
    if (hasIO) {
      // a hidden tab never intersects, so only the demo on screen is fetched and played
      // the still picture a little ahead of time, the film itself only when it is about to be seen
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) poster(); });
      }, { rootMargin: "700px 0px" }).observe(box);
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) load(); });
      }, { rootMargin: "200px 0px" }).observe(box);
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
          if (inView) { if (!demoPaused && video.paused) play(); }
          else if (!video.paused) video.pause();
        });
      }, { threshold: 0.45 }).observe(box);
    } else { poster(); }
    return {
      box: box,
      restart: function () { demoPaused = false; load(); seek(0); mark(0); play(); },
      stop: function () { if (!video.paused) video.pause(); }
    };
  }
  var demos = players.map(setupPlayer).filter(Boolean);
  function activeDemo() {
    for (var i = 0; i < demos.length; i++) if (demos[i].box.offsetParent !== null) return demos[i];
    return demos[0] || null;
  }
  var demoBtn = document.getElementById("demoBtn");
  if (demoBtn) demoBtn.addEventListener("click", function () { var d = activeDemo(); if (d) d.restart(); });

'''
js = js[:a] + player_js + js[b:]
js = rep(js, '      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: href === "#tour" ? "center" : "start" });',
         '      else (href === "#demo" && target.querySelector(".tabs") || target).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });')
js = rep(js, '''      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();''', '''      if (panel) panel.hidden = !on;
    });
    // the demo that just went out of sight stops; the new one starts through its own observer
    demos.forEach(function (d) { if (d.box.offsetParent === null) d.stop(); });
    if (focus) tab.focus();''')
for gone in ("tourVideo", "tourFrame", "tourBtn", "tourToggle"): assert gone not in js, gone
open(f"{REPO}/public/landing.js", "w").write(js)
print("landing.html", len(h), "bytes; landing.js", len(js), "bytes;", ", ".join(f'{d["env"]} {d["duration"]}s' for d in demos))
