/* ==========================================================================
   Latent v2 — page choreography
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var loader = $('.loader');

  // ------------------------------------------------------------ clocks
  (function clocks() {
    var els = $$('[data-clock]');
    function update() {
      els.forEach(function (el) {
        try {
          el.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: el.getAttribute('data-clock'), hour: '2-digit', minute: '2-digit' }).format(new Date());
        } catch (e) { /* ignore */ }
      });
    }
    update();
    setInterval(update, 20000);
  })();

  // ------------------------------------------------------------ word splitting
  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var wr = document.createElement('span'); wr.className = 'wr';
      var wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = w;
      wi.style.transitionDelay = (i * 0.045).toFixed(3) + 's';
      wr.appendChild(wi); el.appendChild(wr);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  $$('[data-reveal]').forEach(splitWords);

  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('intro');
    root.classList.remove('loading');
    root.classList.add('no-gl');
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    if (loader) loader.remove();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // ------------------------------------------------------------ smooth scroll
  var lenis = null;
  var scene = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ duration: 1.25, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  $$('[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id && id.length > 1 ? $(id) : null;
      if (!el && id !== '#top') return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : el, { duration: 1.8 });
      else window.scrollTo({ top: id === '#top' ? 0 : el.getBoundingClientRect().top + window.scrollY, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  // ------------------------------------------------------------ nav
  var nav = $('.nav');
  var lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    if (y > lastY + 4 && y > 260) nav.classList.add('is-hidden');
    else if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  // ------------------------------------------------------------ cursor
  var cursor = $('.cursor');
  var pointerY = -1;
  if (cursor && !reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.classList.add('has-cursor');
    var dot = $('.cursor-dot'), ring = $('.cursor-ring');
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY; pointerY = my;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    }, { passive: true });
    document.addEventListener('mouseover', function (e) {
      cursor.classList.toggle('is-link', !!(e.target.closest && e.target.closest('a, button')));
    });
    gsap.ticker.add(function () {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    });
  }

  // ------------------------------------------------------------ reveals
  $$('[data-reveal]').forEach(function (el) {
    if (el.getAttribute('data-reveal') === 'intro') return;
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { el.classList.add('is-in'); } });
  });

  var statement = $('[data-words]');
  if (statement) {
    var words = statement.textContent.trim().split(/\s+/);
    statement.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'w'; s.textContent = w;
      statement.appendChild(s);
      if (i < words.length - 1) statement.appendChild(document.createTextNode(' '));
    });
    gsap.fromTo($$('.w', statement), { opacity: 0.12, color: '#39FF14' }, {
      opacity: 1, color: '#EAFFE4', ease: 'none', stagger: 0.06,
      scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: reduced ? false : 0.8 }
    });
  }

  // ------------------------------------------------------------ work (horizontal on desktop)
  var workST = null;
  gsap.matchMedia().add('(min-width: 900px)', function () {
    var track = $('.work-track');
    var bar = $('.work-progress i');
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var tw = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        id: 'work', trigger: '.work', start: 'top top', end: function () { return '+=' + dist(); },
        pin: true, scrub: reduced ? true : 1, invalidateOnRefresh: true,
        onUpdate: function (self) { if (bar) bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; }
      }
    });
    workST = tw.scrollTrigger;
    return function () { workST = null; };
  });

  // ------------------------------------------------------------ process steps
  var stageNum = $('#stage-num'), stageBar = $('#stage-bar');
  $$('.step').forEach(function (step, i) {
    ScrollTrigger.create({
      trigger: step, start: 'top 58%', end: 'bottom 42%',
      onToggle: function (self) {
        step.classList.toggle('is-active', self.isActive);
        if (self.isActive) {
          if (stageNum) stageNum.textContent = '0' + (i + 1);
          if (stageBar) stageBar.style.transform = 'scaleX(' + ((i + 1) / 4) + ')';
        }
      }
    });
  });

  // ------------------------------------------------------------ scene states
  var cta = $('.cta');
  var canvas = $('#gl');
  var keys = [];

  function stateSet() {
    var m = window.innerWidth < 760;
    var t = window.innerWidth < 1100;
    var S = function (o) { return Object.assign({ shape: 0, amp: 0.05, x: 0, y: 0, scale: 1, visible: 1, bg: 1, tilt: 0.2, spin: 1 }, o); };
    var px = m ? 0 : 0.245, py = m ? 0.24 : 0.07, ps = m ? 0.48 : (t ? 0.82 : 0.95), pv = m ? 0.55 : 1;
    return {
      hero: m ? S({ shape: 0, amp: 0.34, y: 0.17, scale: 0.6 }) : S({ shape: 0, amp: 0.34, x: t ? 0.2 : 0.215, y: 0.06, scale: t ? 0.88 : 1.02 }),
      studio: m ? S({ shape: 1, amp: 0.06, y: -0.27, scale: 0.46, visible: 1, bg: 0.7, tilt: 0.35 })
                : S({ shape: 1, amp: 0.06, x: 0.26, y: 0.0, scale: t ? 0.8 : 0.92, bg: 0.75, tilt: 0.35 }),
      make: S({ shape: 2, amp: 0.05, x: m ? 0 : 0.32, y: m ? 0.3 : 0.1, scale: m ? 0.45 : 0.7, visible: 0, bg: 0.4, tilt: 0.9, spin: 0.6 }),
      work: S({ shape: 0, amp: 0.2, scale: 0.8, visible: 0, bg: 0.75, tilt: 0.2, spin: 0.6 }),
      p: [
        S({ shape: 0, amp: 0.62, x: px, y: py, scale: ps, visible: pv, bg: 0.55, tilt: 0.2 }),
        S({ shape: 1, amp: 0.1, x: px, y: py, scale: ps, visible: pv, bg: 0.55, tilt: 0.35 }),
        S({ shape: 2, amp: 0.05, x: px, y: py, scale: ps, visible: pv, bg: 0.55, tilt: 0.5 }),
        S({ shape: 3, amp: 0.0, x: px, y: py, scale: ps * 1.05, visible: pv, bg: 0.55, tilt: 0.55 })
      ],
      cta: m ? S({ shape: 2, amp: 0.04, y: 0.3, scale: 0.42, bg: 0.3, tilt: 0.55, spin: 0.8 })
             : S({ shape: 2, amp: 0.04, x: 0.33, y: 0.17, scale: t ? 0.66 : 0.74, bg: 0.3, tilt: 0.55, spin: 0.8 })
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
    if (workST) { list.push({ y: workST.start, s: S.work }); list.push({ y: workST.end, s: S.work }); }
    else { list.push({ y: docY(work), s: S.work }); list.push({ y: docY(work) + work.offsetHeight - window.innerHeight, s: S.work }); }
    $$('.step').forEach(function (el, i) { list.push({ y: centerY(el), s: S.p[i] }); });
    var ctaY = Math.min(docY(cta), max);
    list.push({ y: ctaY, s: S.cta });
    if (max - ctaY > 2) list.push({ y: max, s: Object.assign({}, S.cta, { y: S.cta.y + (max - ctaY) / window.innerHeight }), lin: true });
    keys = [];
    list.forEach(function (k) {
      var y = Math.max(0, Math.min(k.y, max));
      if (!keys.length || y > keys[keys.length - 1].y + 1) keys.push({ y: y, s: k.s, lin: !!k.lin });
      else keys[keys.length - 1].s = k.s;
    });
  }

  function ease(t) { t = Math.min(1, Math.max(0, (t - 0.15) / 0.7)); return t * t * (3 - 2 * t); }
  function sample(y) {
    if (!keys.length) return null;
    if (y <= keys[0].y) return keys[0].s;
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (y < b.y) {
        var r = (y - a.y) / (b.y - a.y);
        var t = b.lin ? r : ease(r);
        var o = {};
        for (var k in a.s) o[k] = a.s[k] + (b.s[k] - a.s[k]) * t;
        return o;
      }
    }
    return keys[keys.length - 1].s;
  }

  // ------------------------------------------------------------ init scene
  var prevY = window.scrollY;
  function initScene() {
    scene = window.LatentScene ? window.LatentScene.create(canvas, { reduced: reduced }) : null;
    if (!scene) { canvas.style.display = 'none'; root.classList.add('no-gl'); return; }

    buildKeys();
    scene.jump(sample(window.scrollY) || stateSet().hero);
    scene.setIntroFill(reduced ? -0.2 : 1.25);
    scene.setIntroScale(reduced ? 1 : 0.001);

    scene.onFrame(function (dt) {
      var y = window.scrollY;
      // scroll speed in px/s (clamped so programmatic jumps don't explode the liquid)
      if (dt > 0) scene.setVelocity(Math.max(-6000, Math.min(6000, (y - prevY) / dt)));
      prevY = y;
      var s = sample(y);
      if (s) scene.setTarget(s);
      scene.setShift(-(y / window.innerHeight) * 0.42);
      var top = cta.getBoundingClientRect().top;
      scene.setCtaFill(1 - top / window.innerHeight);
      document.body.classList.toggle('on-neon', top < 64);
      if (cursor) cursor.classList.toggle('is-dark', pointerY > top + 6);
    });
    ScrollTrigger.addEventListener('refresh', buildKeys);
  }

  // ------------------------------------------------------------ loader → liquid drain → hero
  var loadNum = $('#load-num');
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var timeout = new Promise(function (r) { setTimeout(r, 2500); });
    return Promise.race([Promise.all([document.fonts.load('500 64px "Unbounded"'), document.fonts.load('400 16px "Geist"')]).then(function () { return document.fonts.ready; }), timeout]);
  }
  var counter = { v: 0 };
  var counting = new Promise(function (resolve) {
    gsap.to(counter, {
      v: 100, duration: reduced ? 0.01 : 1.3, ease: 'power2.inOut',
      onUpdate: function () { if (loadNum) loadNum.textContent = String(Math.round(counter.v)).padStart(3, '0'); },
      onComplete: resolve
    });
  });

  function revealHero() {
    root.classList.remove('intro');
    root.classList.remove('loading');
    var h = $('[data-reveal="intro"]');
    if (h) h.classList.add('is-in');
  }

  function finishIntro() {
    if (loader) loader.remove();
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
  }

  function runIntro() {
    var fades = $$('.hero-fade');
    if (reduced || !scene) {
      revealHero();
      gsap.set(fades, { opacity: 1 });
      finishIntro();
      return;
    }
    gsap.set(fades, { opacity: 0 });
    // let the canvas paint the full neon frame before the loader goes transparent
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        loader.classList.add('is-clear');
        var st = { fill: 1.25, scale: 0.001 };
        var tl = gsap.timeline({ onComplete: finishIntro });
        tl.to('.loader-inner', { opacity: 0, y: -16, duration: 0.45, ease: 'power2.in' }, 0)
          .to(st, { fill: -0.2, duration: 1.9, ease: 'power3.inOut', onUpdate: function () { scene.setIntroFill(st.fill); } }, 0.15)
          .to(st, { scale: 1, duration: 2.0, ease: 'expo.out', onUpdate: function () { scene.setIntroScale(st.scale); } }, 0.7)
          .add(revealHero, 1.05)
          .to(fades, { opacity: 1, duration: 1.1, ease: 'power2.out', stagger: 0.1 }, 1.45);
        root.classList.remove('intro');
        gsap.set(fades, { opacity: 0 });
      });
    });
  }

  Promise.all([fontsReady(), counting]).then(function () {
    initScene();
    ScrollTrigger.refresh();
    runIntro();
  });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
