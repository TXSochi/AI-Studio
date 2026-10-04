/* ==========================================================================
   Latent — page choreography
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Clocks run even if the animation libraries fail to load.
  function startClocks() {
    var els = $$('[data-clock]');
    function update() {
      els.forEach(function (el) {
        try {
          el.textContent = new Intl.DateTimeFormat('en-GB', {
            timeZone: el.getAttribute('data-clock'), hour: '2-digit', minute: '2-digit'
          }).format(new Date());
        } catch (e) { /* ignore */ }
      });
    }
    update();
    setInterval(update, 20000);
  }
  startClocks();

  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('intro');
    root.classList.add('no-gl');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // ------------------------------------------------------------ smooth scroll
  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  $$('[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id && id.length > 1 ? $(id) : null;
      if (!el && id !== '#top') return;
      e.preventDefault();
      var dest = id === '#top' ? 0 : el;
      if (lenis) lenis.scrollTo(dest, { duration: 1.6 });
      else window.scrollTo({ top: dest === 0 ? 0 : el.getBoundingClientRect().top + window.scrollY, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  // ------------------------------------------------------------ nav behaviour
  var nav = $('.nav');
  var lastY = 0;
  function onScrollNav() {
    var y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    if (y > lastY + 4 && y > 240) nav.classList.add('is-hidden');
    else if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });

  // ------------------------------------------------------------ statement words
  var statement = $('[data-words]');
  if (statement) {
    var words = statement.textContent.trim().split(/\s+/);
    statement.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      statement.appendChild(s);
      if (i < words.length - 1) statement.appendChild(document.createTextNode(' '));
    });
    gsap.fromTo($$('.w', statement), { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.06,
      scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 42%', scrub: reduced ? false : 0.6 }
    });
  }

  // ------------------------------------------------------------ work: horizontal on desktop
  var workST = null;
  var mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', function () {
    var track = $('.work-track');
    var bar = $('.work-progress i');
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tween = gsap.to(track, {
      x: function () { return -dist(); },
      ease: 'none',
      scrollTrigger: {
        id: 'work',
        trigger: '.work',
        start: 'top top',
        end: function () { return '+=' + dist(); },
        pin: true,
        scrub: reduced ? true : 0.8,
        invalidateOnRefresh: true,
        onUpdate: function (self) { if (bar) bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; }
      }
    });
    workST = tween.scrollTrigger;
    return function () { workST = null; };
  });

  // ------------------------------------------------------------ process steps
  $$('.step').forEach(function (step) {
    ScrollTrigger.create({
      trigger: step, start: 'top 58%', end: 'bottom 42%',
      toggleClass: { targets: step, className: 'is-active' }
    });
  });

  // ------------------------------------------------------------ contact turns Klein
  var cta = $('.cta');
  gsap.fromTo('.backdrop', { opacity: 0 }, {
    opacity: 1, ease: 'none',
    scrollTrigger: { trigger: cta, start: 'top 92%', end: 'top 38%', scrub: true }
  });
  ScrollTrigger.create({
    trigger: cta, start: 'top 60%', end: 'bottom top',
    onToggle: function (self) { document.body.classList.toggle('on-klein', self.isActive); }
  });

  // ------------------------------------------------------------ particles
  var canvas = $('#gl');
  var scene = null;
  var keys = [];

  var P0 = 0.85; // noise at the first process step = 100%
  function stateSet() {
    var m = window.innerWidth < 760;
    var t = window.innerWidth < 1100;
    // visible world width at z = 0 (camera: fov 35, z 9 => visible height 5.67)
    var visW = 5.675 * (window.innerWidth / window.innerHeight);
    var fitAmp = Math.min(0.7, (visW * 0.8) / 3.5);
    var fitRing = Math.min(0.55, (visW * 0.86) / 4.1);
    var proc = function (n) {
      return m ? { shape: 2, noise: n * 0.8, x: 0, y: 0.24, scale: 0.55, opacity: 0.3, white: 0, spin: 1 }
               : { shape: 2, noise: n, x: 0.245, y: 0.02, scale: t ? 0.85 : 1, opacity: 1, white: 0, spin: 1 };
    };
    return {
      hero: m ? { shape: 0, noise: 0, x: 0, y: 0.15, scale: fitAmp, opacity: 1, white: 0, spin: 0 }
              : { shape: 0, noise: 0, x: t ? 0.215 : 0.235, y: 0.11, scale: t ? 0.84 : 0.95, opacity: 1, white: 0, spin: 0 },
      studio: m ? { shape: 1, noise: 0, x: 0, y: -0.36, scale: 0.55, opacity: 0.42, white: 0, spin: 0 }
                : { shape: 1, noise: 0, x: 0, y: -0.33, scale: 1, opacity: 0.7, white: 0, spin: 0 },
      make: { shape: 1, noise: 0.25, x: 0, y: -0.62, scale: 1, opacity: 0.16, white: 0, spin: 0 },
      work: { shape: 2, noise: 1.4, x: 0, y: 0, scale: m ? 0.7 : 1.35, opacity: 0.16, white: 0, spin: 1 },
      p: [proc(P0), proc(0.42), proc(0.16), proc(0)],
      cta: m ? { shape: 3, noise: 0, x: 0, y: 0.385, scale: fitRing, opacity: 1, white: 1, spin: 1 }
             : { shape: 3, noise: 0, x: 0.265, y: 0.16, scale: t ? 0.78 : 0.92, opacity: 1, white: 1, spin: 1 }
    };
  }

  function docY(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function centerY(el) { return docY(el) + el.offsetHeight / 2 - window.innerHeight / 2; }

  function buildKeys() {
    var S = stateSet();
    var max = ScrollTrigger.maxScroll(window);
    var work = $('.work');
    var list = [{ y: 0, s: S.hero }];
    list.push({ y: centerY($('.statement-text')), s: S.studio });
    list.push({ y: centerY($('.make')), s: S.make });
    if (workST) {
      list.push({ y: workST.start, s: S.work });
      list.push({ y: workST.end, s: S.work });
    } else {
      list.push({ y: docY(work), s: S.work });
      list.push({ y: docY(work) + work.offsetHeight - window.innerHeight, s: S.work });
    }
    $$('.step').forEach(function (el, i) { list.push({ y: centerY(el), s: S.p[i] }); });
    var ctaY = Math.min(docY(cta), max);
    list.push({ y: ctaY, s: S.cta });
    // past this point the halo travels with the content instead of staying fixed
    if (max - ctaY > 2) {
      var end = Object.assign({}, S.cta, { y: S.cta.y + (max - ctaY) / window.innerHeight });
      list.push({ y: max, s: end, lin: true });
    }
    // keep keys strictly increasing
    keys = [];
    list.forEach(function (k) {
      var y = Math.max(0, Math.min(k.y, max));
      if (!keys.length || y > keys[keys.length - 1].y + 1) keys.push({ y: y, s: k.s, lin: !!k.lin });
      else keys[keys.length - 1].s = k.s;
    });
  }

  function smooth(t) { t = Math.min(1, Math.max(0, (t - 0.18) / 0.64)); return t * t * (3 - 2 * t); }

  function sample(y) {
    if (!keys.length) return null;
    if (y <= keys[0].y) return keys[0].s;
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (y < b.y) {
        var r = (y - a.y) / (b.y - a.y);
        var t = b.lin ? r : smooth(r);
        var o = {};
        for (var k in a.s) o[k] = a.s[k] + (b.s[k] - a.s[k]) * t;
        return o;
      }
    }
    return keys[keys.length - 1].s;
  }

  function readTheme() {
    var cs = getComputedStyle(root);
    return {
      ink: cs.getPropertyValue('--particle-ink').trim() || '#17181B',
      accent: cs.getPropertyValue('--particle-accent').trim() || '#1E3FE0',
      blend: cs.getPropertyValue('--particle-blend').trim() || 'normal'
    };
  }

  var stepNum = $('#step-num');
  var stepBar = $('#step-bar');
  var noiseVal = $('#noise-val');
  var lastNoiseText = '';

  function setStep(progress) {
    var n = Math.round(progress * 50);
    if (stepNum) stepNum.textContent = n;
    if (stepBar) stepBar.style.transform = 'scaleX(' + progress.toFixed(3) + ')';
  }

  function runIntro() {
    var lines = $$('.hero-line > span');
    var fades = $$('.hero-fade');
    var START = 2.4;

    if (reduced || !scene) {
      root.classList.remove('intro');
      if (scene) scene.setLoadNoise(0);
      setStep(1);
      return;
    }

    gsap.set(lines, { yPercent: 108 });
    gsap.set(fades, { opacity: 0 });
    root.classList.remove('intro');

    var load = { n: START };
    scene.setLoadNoise(START);
    var tl = gsap.timeline({ delay: 0.15 });
    tl.to(load, {
      n: 0, duration: 3.1, ease: 'power3.inOut',
      onUpdate: function () { scene.setLoadNoise(load.n); setStep(1 - load.n / START); }
    }, 0);
    tl.to(lines, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.11 }, 1.35);
    tl.to(fades, { opacity: 1, duration: 1, ease: 'power2.out', stagger: 0.12 }, 2.0);
  }

  function initScene() {
    var small = window.innerWidth < 760;
    scene = window.LatentScene ? window.LatentScene.create(canvas, {
      count: small ? 9000 : 17000,
      family: '"Bodoni Moda", "Bodoni 72", Didot, "Bodoni MT", Georgia, serif',
      reduced: reduced
    }) : null;

    if (!scene) {
      canvas.style.display = 'none';
      root.classList.add('no-gl');
      return;
    }

    scene.setTheme(readTheme());
    var applyTheme = function () { scene.setTheme(readTheme()); };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    buildKeys();
    var first = sample(window.scrollY) || stateSet().hero;
    scene.jump(Object.assign({}, first, { opacity: 0 }));
    scene.setTarget(first);

    scene.onFrame(function () {
      var s = sample(window.scrollY);
      if (s) scene.setTarget(s);
      if (noiseVal) {
        var txt = String(Math.round(Math.min(1, Math.max(0, scene.current.noise / P0)) * 100));
        if (txt !== lastNoiseText) { noiseVal.textContent = txt; lastNoiseText = txt; }
      }
    });

    ScrollTrigger.addEventListener('refresh', buildKeys);
  }

  // Wait (briefly) for Bodoni so the ampersand is sampled from the real glyph.
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var timeout = new Promise(function (r) { setTimeout(r, 2200); });
    var load = document.fonts.load('italic 400 200px "Bodoni Moda"').then(function () { return document.fonts.ready; });
    return Promise.race([load, timeout]);
  }

  fontsReady().then(function () {
    initScene();
    ScrollTrigger.refresh();
    runIntro();
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
