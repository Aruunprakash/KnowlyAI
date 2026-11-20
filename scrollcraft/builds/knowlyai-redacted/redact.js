/* ===========================================================================
   KnowlyAI · landing page logic
   ---------------------------------------------------------------------------
   The engine is untouched. This file owns two things:

   1. THE REDACTION (signature move). An answer written with no documents
      behind it, checked sentence by sentence as the act scrolls. A sentence
      with no passage behind it gets a black bar drawn across every line of
      it; a sentence with one gets an orange highlight and its page tag. The
      tally in the header is counted from the array below, never typed in.
      Then the stamp. Any struck sentence can be lifted with a tap, a click or
      the keyboard, and the footnote says why it was struck.

   2. The live line in the close, shown only when a live index answers.
   ======================================================================== */

(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var $ = function (id) { return document.getElementById(id); };

  /* Sources point at the console's labelled sample index. A null source is a
     claim no passage supports, and `why` says what is wrong with it. */
  var ANSWER = [
    { t: 'A model can fit its training data exactly, noise included, and then fail on data it has not seen. That is overfitting.',
      src: 'machine_learning.pdf p.41' },
    { t: 'It affects roughly 40% of models in production.',
      src: null, why: 'No passage gives this figure. It was made up.' },
    { t: 'Performance has to be judged on examples the model has never seen.',
      src: 'machine_learning.pdf p.07' },
    { t: 'The fix everyone uses is dropout at 0.5 with early stopping after three epochs.',
      src: null, why: 'Your documents never recommend this. It is advice from nowhere.' },
    { t: 'Constraining the hypothesis space trades a little training error for a smaller gap on test data.',
      src: 'machine_learning.pdf p.19' },
    { t: 'Most practitioners agree it is the biggest cause of failed deployments.',
      src: null, why: 'Unattributable. Nobody is quoted, nothing is measured.' },
    { t: 'Google solved it in 2019 with a method called deep validation.',
      src: null, why: 'No passage mentions this, and the method does not exist.' },
    { t: 'Hyperparameters are chosen on validation data, never on the test set.',
      src: 'ML-new.pdf p.31' }
  ];

  var P0 = 0.12;   /* before this the answer is shown whole: read it first */
  var P1 = 0.70;   /* every sentence has been checked by here */
  var S0 = 0.74, S1 = 0.80;   /* the stamp slams in this window, then holds */
  var M0 = 0.86, M1 = 0.94;   /* then files itself in the corner and holds */

  var nodes = [];

  /* Where the corner is, in px from the stamp's centred position. Measured
     once with the stamp untransformed scale, re-measured on resize. */
  function measureStamp(stamp) {
    var doc = stamp.parentNode;
    var dw = doc.clientWidth, dh = doc.clientHeight;
    var sw = stamp.offsetWidth * 0.38, sh = stamp.offsetHeight * 0.38;
    var cx = stamp.offsetLeft, cy = stamp.offsetTop;   /* the centred anchor */
    stamp.style.setProperty('--mx', Math.round(dw - sw / 2 - 14 - cx) + 'px');
    stamp.style.setProperty('--my', Math.round(dh - sh / 2 + 18 - cy) + 'px');
    stamp.dataset.measured = '1';
  }
  window.addEventListener('resize', function () {
    var stamp = $('rx-stamp');
    if (stamp) delete stamp.dataset.measured;
  });

  function pageOf(src) { return src.replace(/^.*\s/, ''); }

  function render() {
    var doc = $('rx-doc');
    if (!doc) return;

    ANSWER.forEach(function (s, i) {
      var span = document.createElement('span');
      span.className = 'rx-s ' + (s.src ? 'rx-s--ok' : 'rx-s--x');
      span.textContent = s.t;

      if (!s.src) {
        span.setAttribute('role', 'button');
        span.setAttribute('tabindex', '-1');
        span.setAttribute('aria-pressed', 'false');
      }
      doc.appendChild(span);

      var tag = null;
      if (s.src) {
        tag = document.createElement('span');
        tag.className = 'rx-tag';
        tag.textContent = pageOf(s.src);
        tag.title = s.src;
        doc.appendChild(tag);
      }
      if (i < ANSWER.length - 1) doc.appendChild(document.createTextNode(' '));
      nodes.push({ s: s, el: span, tag: tag, done: false });
    });

    var struck = ANSWER.filter(function (s) { return !s.src; }).length;
    $('rx-n-struck').textContent = String(struck);
    $('rx-n-cited').textContent = String(ANSWER.length - struck);
  }

  /* -------------------------------------------------- scroll performs it -- */

  var lastState = '';

  function apply(p) {
    var step = (P1 - P0) / ANSWER.length;
    var struck = 0, cited = 0;

    nodes.forEach(function (n, i) {
      var k = clamp((p - (P0 + i * step)) / (step * 0.85), 0, 1);
      n.el.style.setProperty('--k', k.toFixed(3));
      if (n.tag) n.tag.style.setProperty('--t', clamp((k - 0.55) / 0.4, 0, 1).toFixed(3));

      var done = k >= 0.98;
      if (done !== n.done) {
        n.done = done;
        if (!n.s.src) {
          n.el.setAttribute('tabindex', done ? '0' : '-1');
          n.el.setAttribute('aria-label', done
            ? 'Struck: ' + n.s.t + ' ' + n.s.why
            : n.s.t);
          if (!done) unlift(n);
        }
      }
      if (done) { if (n.s.src) cited += 1; else struck += 1; }
    });

    $('rx-struck').textContent = String(struck);
    $('rx-cited').textContent = String(cited);

    var s = clamp((p - S0) / (S1 - S0), 0, 1);
    var eased = 1 - Math.pow(1 - s, 3);
    var stamp = $('rx-stamp');
    stamp.style.setProperty('--s', eased.toFixed(3));

    /* after a beat at full size, the stamp files itself in the bottom-right
       corner of the document so the surviving sentences can be read */
    var m = clamp((p - M0) / (M1 - M0), 0, 1);
    m = m * m * (3 - 2 * m);
    if (m > 0 && !stamp.dataset.measured) measureStamp(stamp);
    stamp.style.setProperty('--m', m.toFixed(3));

    /* the footnote narrates the three states of the act */
    var state = p < P0 ? 'read' : (s < 1 ? 'check' : 'stamped');
    if (state !== lastState && !lifted) {
      lastState = state;
      var foot = $('rx-foot');
      foot.textContent = '';
      if (state === 'read') {
        foot.textContent = 'An answer written with no documents behind it. Keep going and KnowlyAI checks every sentence against the sample index.';
      } else if (state === 'check') {
        foot.textContent = 'Checking each sentence for a passage it rests on. No passage, black bar.';
      } else {
        var b = document.createElement('b');
        b.textContent = struck + ' of ' + ANSWER.length + ' sentences struck.';
        foot.appendChild(b);
        foot.appendChild(document.createTextNode(
          ' What is left is what you can check. Tap a black bar to see why it went.'));
      }
    }
  }

  /* ------------------------------------------- the hand can lift a bar -- */

  var lifted = null, liftTimer = 0;

  function unlift(n) {
    if (!n || lifted !== n) return;
    n.el.classList.remove('is-lifted');
    n.el.setAttribute('aria-pressed', 'false');
    lifted = null;
    lastState = '';
  }

  function lift(n) {
    if (lifted && lifted !== n) unlift(lifted);
    clearTimeout(liftTimer);

    if (lifted === n) { unlift(n); applyNow(); return; }

    lifted = n;
    n.el.classList.add('is-lifted');
    n.el.setAttribute('aria-pressed', 'true');

    var foot = $('rx-foot');
    foot.textContent = '';
    var b = document.createElement('b');
    b.textContent = 'Struck.';
    foot.appendChild(b);
    foot.appendChild(document.createTextNode(' ' + n.s.why));

    liftTimer = setTimeout(function () { unlift(n); applyNow(); }, 4200);
  }

  function wireLift() {
    nodes.forEach(function (n) {
      if (n.s.src) return;
      var go = function () { if (n.done) lift(n); };
      n.el.addEventListener('click', go);
      n.el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
        if (e.key === 'Escape') { unlift(n); applyNow(); }
      });
    });
  }

  /* --------------------------------------------- one loop, only on screen -- */

  var act = null;
  function progress() {
    if (reduce) return 1;
    return parseFloat(act.style.getPropertyValue('--sc-p')) || 0;
  }
  function applyNow() { if (act) apply(progress()); }

  function watch() {
    act = $('redaction');
    if (!act) return;
    var live = false, raf = 0;
    var loop = function () { applyNow(); if (live) raf = requestAnimationFrame(loop); };

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !live) { live = true; raf = requestAnimationFrame(loop); }
        else if (!e.isIntersecting && live) { live = false; cancelAnimationFrame(raf); applyNow(); }
      });
    }, { rootMargin: '10% 0px' }).observe(act);

    applyNow();
  }

  /* ------------------------------------------------ the live line, close -- */

  function liveLine() {
    var line = $('live-line');
    if (!line) return;

    var base = '';
    try {
      var q = new URLSearchParams(location.search).get('api');
      var meta = document.querySelector('meta[name="knowly-api"]');
      base = (q != null ? q : (meta ? meta.getAttribute('content') : '')).trim().replace(/\/+$/, '');
    } catch (e) { /* defaults stand */ }

    var get = function (path) {
      var ctl = new AbortController();
      var t = setTimeout(function () { ctl.abort(); }, 15000);
      return fetch(base + path, { signal: ctl.signal, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .finally(function () { clearTimeout(t); });
    };

    /* Only a live index is worth a line. Anything else stays silent: the
       console falls back to its sample on its own. */
    get('/api/health').then(function (h) {
      if (h.status !== 'ok') return;
      return get('/api/documents').then(function (d) {
        var docs = (d.documents || []).filter(function (x) { return x.status === 'ready'; });
        if (!docs.length) return;
        line.classList.add('is-live');
        line.textContent = 'Live: ' + docs.length + (docs.length === 1 ? ' document, ' : ' documents, ') +
          (h.chunks || 0).toLocaleString() + ' passages indexed.';
        line.hidden = false;
      });
    }).catch(function () { /* silent: no index, no line */ });
  }

  /* ------------------------------------------------- the continuous ground --
     One ground for the whole page, never a section edge. Every act names its
     colour in data-ground; the colour under the middle of the viewport is
     that act's, and across each seam it blends over BLEND viewport-heights
     either side, so the page flows paper, wine, paper, berry, plum without a
     cut. Text that sits on the ground follows --x-fg, which flips to
     whichever of plum or paper reads better on the blended colour. The
     engine's own drift is left unused: it is built for pinned acts and snaps
     between consecutive flow acts. */

  var PAPER = [240, 240, 236], PLUM = [86, 21, 48];
  var BLEND = 0.42;

  function hex(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function lum(c) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function contrast(a, b) {
    var x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function mix(a, b, t) {
    return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); });
  }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  function wireGround() {
    var root = document.documentElement;
    var acts = Array.prototype.map.call(document.querySelectorAll('[data-ground]'), function (el) {
      return { el: el, rgb: hex(el.getAttribute('data-ground')) };
    });
    if (!acts.length) return;

    var last = '', queued = false;

    var tick = function () {
      queued = false;
      var vh = innerHeight, mid = vh * 0.5, zone = BLEND * vh;
      var rects = acts.map(function (a) { return a.el.getBoundingClientRect(); });

      var i = 0;
      for (var k = 0; k < rects.length; k++) if (rects[k].top <= mid) i = k;

      var out = acts[i].rgb;
      if (i + 1 < acts.length) {
        var below = rects[i + 1].top - mid;          /* next seam, under the middle */
        if (below < zone) out = mix(acts[i].rgb, acts[i + 1].rgb, ease(0.5 - below / (2 * zone)));
      }
      if (i > 0) {
        var above = mid - rects[i].top;              /* this act's seam, over the middle */
        if (above < zone) out = mix(acts[i - 1].rgb, acts[i].rgb, ease(0.5 + above / (2 * zone)));
      }

      var key = out.join(',');
      if (key === last) return;
      last = key;
      root.style.setProperty('--sc-canvas', 'rgb(' + key + ')');
      root.style.setProperty('--x-fg',
        contrast(out, PLUM) >= contrast(out, PAPER) ? 'rgb(' + PLUM.join(',') + ')' : 'rgb(' + PAPER.join(',') + ')');
    };

    var schedule = function () { if (!queued) { queued = true; requestAnimationFrame(tick); } };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    tick();
  }

  /* --------------------------------------------------------------- boot -- */

  function boot() {
    wireGround();
    render();
    wireLift();
    ScrollCraft.mount(document.body);
    watch();
    liveLine();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
