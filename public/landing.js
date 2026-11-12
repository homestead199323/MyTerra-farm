(function () {
  "use strict";
  // Email links (confirm sign-up, reset password) can come back to the Site URL
  // (this page) instead of /app. Forward the auth hash so the app can finish
  // signing the person in or let them choose a new password.
  if (/(^|[#&])(access_token|error_description|type)=/.test(location.hash)) {
    location.replace("/app" + location.hash);
    return;
  }
  document.documentElement.classList.add("js");

  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var reduceMotion = mm("(prefers-reduced-motion: reduce)").matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var portrait = mm("(max-aspect-ratio: 4/5)");
  var hasIO = "IntersectionObserver" in window;

  // ── Nav: solid once scrolled (it sits on the dark hero at the top) ──
  var nav = document.getElementById("nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── Mobile menu ──
  var menuBtn = document.getElementById("menuBtn");
  var mobileMenu = document.getElementById("mobileMenu");
  function setMenu(open) {
    if (!menuBtn || !mobileMenu) return;
    mobileMenu.classList.toggle("open", open);
    if (nav) nav.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", function () { setMenu(!mobileMenu.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  // ── Hero: real 3D map footage behind the headline (poster only for reduced motion / data saver) ──
  var hero = document.getElementById("heroVideo");
  // MP4 (H.264) first, WebM (VP9) for browsers without H.264
  function setSources(video, v) {
    while (video.firstChild) video.removeChild(video.firstChild);
    [["data-" + v, "video/mp4"], ["data-" + v + "w", "video/webm"]].forEach(function (s) {
      var src = video.getAttribute(s[0]);
      if (!src) return;
      var el = document.createElement("source");
      el.src = src; el.type = s[1];
      video.appendChild(el);
    });
    video.load();
  }
  if (hero && !reduceMotion && !saveData) {
    hero.muted = true;
    hero.addEventListener("playing", function () { hero.classList.add("on"); });
    var heroWanted = true;
    var heroPlay = function () { var p = hero.play(); if (p && p.catch) p.catch(function () { /* autoplay refused: the poster stays */ }); };
    setSources(hero, portrait.matches ? "v" : "h");
    heroPlay();
    if (portrait.addEventListener) portrait.addEventListener("change", function () { hero.classList.remove("on"); setSources(hero, portrait.matches ? "v" : "h"); if (heroWanted) heroPlay(); });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          heroWanted = entry.isIntersecting;
          if (heroWanted) heroPlay(); else hero.pause();
        });
      }, { threshold: 0.05 }).observe(hero.parentNode);
    }
  }

  // ── Demo videos: one portrait film per space. Each loads only when its tab is showing and near the
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

  // ── In-page links: smooth scroll, close the menu ──
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      setMenu(false);
      if (href === "#top") window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      else (href === "#demo" && target.querySelector(".tabs") || target).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (history.replaceState) history.replaceState(null, "", href === "#top" ? location.pathname : href);
    });
  });

  // ── Balcony / Backyard / Farm tabs ──
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    // the demo that just went out of sight stops; the new one starts through its own observer
    demos.forEach(function (d) { if (d.box.offsetParent === null) d.stop(); });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab, false); });
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  // ── Reveal on scroll ──
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !hasIO) {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px 10% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    // safety net for fast flings: anything that has reached the viewport stays revealed
    var sweeping = false;
    var sweep = function () {
      sweeping = false;
      var limit = window.innerHeight * 1.1;
      reveals.forEach(function (el) { if (!el.classList.contains("visible") && el.getBoundingClientRect().top < limit) el.classList.add("visible"); });
    };
    window.addEventListener("scroll", function () { if (!sweeping) { sweeping = true; requestAnimationFrame(sweep); } }, { passive: true });
  }
})();
