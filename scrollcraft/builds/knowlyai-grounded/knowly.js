/* ===========================================================================
   KnowlyAI · page logic
   ---------------------------------------------------------------------------
   The scrollcraft engine is untouched. Everything bespoke on this page lives
   here and is driven either by pointer input or by --sc-p, which the engine
   publishes on every act element.

   Two sources of truth, and the page always says which one it is showing:

   LIVE    the KnowlyAI API (api/main.py). The console in act 1, the status
           bar and the closing field read the real index: /api/health,
           /api/documents, and /api/chat streamed as server-sent events.
           PDFs can be added from the close with POST /api/documents.

   SAMPLE  the arrays below. Acts 3 to 5 are a scripted demonstration over a
           labelled sample and stay that way: the API has no endpoint that
           lists passages, and the gate needs sentences bound to passages.
           When the API is not reachable, or has no key, the whole page falls
           back to the sample and the log, the bar and the close say so.

   Every number on screen is derived at runtime from one of the two. Nothing
   is written into the markup as a marketing figure.
   ======================================================================== */

(function () {
  'use strict';

  /* Where the React app runs (web/, `npm run dev`). */
  var APP_URL = 'http://localhost:5173';

  /* Where the API runs. Order: ?api= in the URL, then the knowly-api meta
     tag, then same origin. An empty value means same origin. */
  var API_BASE = (function () {
    var fromQuery = null;
    try { fromQuery = new URLSearchParams(location.search).get('api'); } catch (e) { /* old browser */ }
    if (fromQuery != null) return fromQuery.replace(/\/+$/, '');
    var meta = document.querySelector('meta[name="knowly-api"]');
    return meta ? meta.getAttribute('content').trim().replace(/\/+$/, '') : '';
  })();
  var API_LABEL = API_BASE ? API_BASE.replace(/^https?:\/\//, '') : location.host;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };

  /* ---------------------------------------------------------------- data --
     Nine passages sampled from the project's own machine_learning.pdf, with
     the page they came off. Scores are this sample's similarity against the
     question in the console. */

  var CORPUS = [
    { id: 'p41', doc: 'machine_learning.pdf', page: 41, score: 0.871,
      text: 'A model with sufficient capacity can interpolate its training set exactly while failing on held-out data. This is the canonical symptom of overfitting.' },
    { id: 'p07', doc: 'machine_learning.pdf', page: 7, score: 0.824,
      text: 'The goal of a learning algorithm is to produce a hypothesis that performs well on previously unseen examples drawn from the same distribution as the training data.' },
    { id: 'p19', doc: 'machine_learning.pdf', page: 19, score: 0.768,
      text: 'Regularisation constrains the hypothesis space, trading a small increase in training error for a larger decrease in the gap between training and test error.' },
    { id: 'p58', doc: 'ML-new.pdf', page: 58, score: 0.713,
      text: 'The bias-variance decomposition splits expected error into three parts: squared bias, variance, and irreducible noise in the data itself.' },
    { id: 'p12', doc: 'machine_learning.pdf', page: 12, score: 0.661,
      text: 'Empirical risk minimisation selects the hypothesis with the lowest average loss over the training sample. Generalisation bounds relate that quantity to the expected risk.' },
    { id: 'p31', doc: 'ML-new.pdf', page: 31, score: 0.604,
      text: 'A validation set held out from training is used to select hyperparameters. Reusing the test set for that purpose invalidates it as an estimate of generalisation.' },
    { id: 'p23', doc: 'machine_learning.pdf', page: 23, score: 0.552,
      text: 'Cross-validation partitions the sample into folds so that every observation is used once for evaluation, which gives a less optimistic estimate than a single split.' },
    { id: 'p66', doc: 'ML-new.pdf', page: 66, score: 0.317,
      text: 'Gradient descent updates parameters in the direction of steepest decrease of the loss, scaled by a learning rate.' },
    { id: 'p04', doc: 'machine_learning.pdf', page: 4, score: 0.286,
      text: 'Supervised learning assumes access to labelled input and output pairs. Unsupervised learning has only the inputs and must recover structure from them.' }
  ];

  /* Each sentence of the answer is bound to the passage it rests on. Remove
     the passage and the sentence has nothing to stand on, so it goes. */
  var SENTENCES = [
    { needs: 'p41', text: 'A model with enough capacity can fit its training set exactly, noise included, which is the canonical symptom of overfitting.' },
    { needs: 'p07', text: 'Performance is therefore judged on examples the model has never seen, drawn from the same distribution as the training data.' },
    { needs: 'p19', text: 'Constraining the hypothesis space trades a little training error for a much smaller gap between training and test error.' },
    { needs: 'p58', text: 'Whatever remains splits into squared bias, variance, and noise that no model can remove.' },
    { needs: 'p12', text: 'Formally, the training objective minimises average loss over the sample, which is only a proxy for the risk you actually care about.' },
    { needs: 'p31', text: 'Hyperparameters are chosen on a held-out validation set, never on the test set.' },
    { needs: 'p23', text: 'Cross-validation gives a less optimistic estimate of that gap than a single split does.' }
  ];

  var TOP_K = 4;
  var FLOOR = 0.65;     /* below this a passage is weak evidence, and the page says so */
  var T_MIN = 0.25, T_MAX = 0.95, T_START = 0.70;

  var ranked = CORPUS.slice().sort(function (a, b) { return b.score - a.score; });
  var byId = {};
  ranked.forEach(function (c) { byId[c.id] = c; });

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ------------------------------------------------------------ backend --
     LIVE.state is one of:
       'live'     API up, key set, at least one document indexed
       'empty'    API up, key set, nothing indexed yet
       'nokey'    API up but GOOGLE_API_KEY is missing, so it cannot answer
       'offline'  nothing answered at API_BASE
       'pending'  not asked yet */

  var LIVE = { state: 'pending', health: null, docs: [] };

  function apiUrl(path) { return API_BASE + path; }

  function readError(res) {
    return res.json().catch(function () { return {}; }).then(function (body) {
      var detail = body && body.detail;
      if (Array.isArray(detail)) detail = detail.map(function (d) { return d.msg; }).join('; ');
      var err = new Error(detail || ('The API answered ' + res.status + '.'));
      err.status = res.status;
      throw err;
    });
  }

  function getJSON(path, ms) {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, ms);
    return fetch(apiUrl(path), { signal: ctl.signal, headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : readError(res); })
      .finally(function () { clearTimeout(timer); });
  }

  /* The first health call after the API starts loads LangChain and opens
     Chroma, which can take several seconds, so the timeout is generous. The
     page does not wait for it: see boot(). */
  function connect() {
    return getJSON('/api/health', 15000)
      .then(function (health) {
        LIVE.health = health;
        return getJSON('/api/documents', 8000);
      })
      .then(function (list) {
        LIVE.docs = (list.documents || []).filter(function (d) { return d.status === 'ready'; });
        if (LIVE.health.status !== 'ok') LIVE.state = 'nokey';
        else LIVE.state = LIVE.docs.length ? 'live' : 'empty';
      })
      .catch(function () {
        LIVE.state = 'offline';
        LIVE.health = null;
        LIVE.docs = [];
      });
  }

  function reachable() { return LIVE.state === 'live' || LIVE.state === 'empty' || LIVE.state === 'nokey'; }
  function canAnswer() { return LIVE.state === 'live' || LIVE.state === 'empty'; }

  function fmtBytes(n) {
    if (!n) return '0 KB';
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /* What act 1 shows, from whichever source is in charge. */
  function heroView() {
    /* A keyless API with nothing indexed has no state worth showing, and it
       cannot accept an upload either, so the sample keeps the hero. */
    if (canAnswer() || (LIVE.state === 'nokey' && LIVE.docs.length)) {
      var pages = 0, chunks = 0;
      LIVE.docs.forEach(function (d) { pages += d.pages; chunks += d.chunks; });
      var passages = (LIVE.health && LIVE.health.chunks) || chunks;

      var log = [['ok', 'api', 'connected', API_LABEL]];
      LIVE.docs.forEach(function (d) {
        log.push(['ok', d.name, 'indexed ' + d.chunks + ' passages', d.pages + ' pages']);
      });
      if (LIVE.state === 'nokey') log.push(['idle', 'model', 'GOOGLE_API_KEY not set', 'cannot answer']);
      else if (!LIVE.docs.length) log.push(['idle', 'index', 'empty', 'add a PDF below']);
      else log.push(['ok', 'model', LIVE.health.chatModel, 'ready']);
      log.push(['idle', 'query', 'waiting', 'top-k ' + TOP_K]);

      return {
        source: 'live',
        docs: LIVE.docs.map(function (d) {
          return {
            name: d.name,
            meta: d.chunks + ' passages · ' + d.pages + ' pp · ' + fmtBytes(d.sizeBytes)
          };
        }),
        tele: { documents: LIVE.docs.length, passages: passages, third: pages, topk: TOP_K },
        thirdLabel: 'Pages',
        log: log
      };
    }

    var docs = {};
    var chars = 0;
    CORPUS.forEach(function (c) {
      if (!docs[c.doc]) docs[c.doc] = { n: 0, chars: 0, lo: c.page, hi: c.page };
      var d = docs[c.doc];
      d.n += 1;
      d.chars += c.text.length;
      chars += c.text.length;
      if (c.page < d.lo) d.lo = c.page;
      if (c.page > d.hi) d.hi = c.page;
    });
    var names = Object.keys(docs);

    var sampleLog = names.map(function (name) {
      var d = docs[name];
      return ['ok', name, 'split into ' + d.n + ' passages', 'p.' + d.lo + ' to p.' + d.hi];
    });
    sampleLog.push(['ok', 'index', 'built from ' + CORPUS.length + ' passages', names.length + ' documents']);
    if (LIVE.state === 'offline') sampleLog.push(['idle', 'api', 'not reachable', 'sample index']);
    if (LIVE.state === 'nokey') sampleLog.push(['idle', 'api', 'no GOOGLE_API_KEY', 'sample index']);
    sampleLog.push(['idle', 'query', 'waiting', 'top-k ' + TOP_K]);

    return {
      source: 'sample',
      docs: names.map(function (name) {
        var d = docs[name];
        return { name: name, meta: d.n + ' passages · to p.' + d.hi + ' · ' + d.chars.toLocaleString() + ' ch' };
      }),
      tele: { documents: names.length, passages: CORPUS.length, third: chars, topk: TOP_K },
      thirdLabel: 'Characters',
      log: sampleLog
    };
  }

  /* ---------------------------------------------------------- act 1 · index */

  var DOC_ICON = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M4 1.5h5L12.5 5v9.5h-8.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<path d="M9 1.5V5h3.5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';

  function renderSources(view) {
    var list = $('src-list');
    if (!list) return;
    list.textContent = '';

    if (!view.docs.length) {
      list.appendChild(el('p', 'src__empty',
        'Nothing indexed yet. Add a PDF at the bottom of this page and it appears here.'));
    }

    view.docs.forEach(function (d) {
      var row = el('div', 'src__row');
      var ico = el('span', 'src__ico');
      ico.innerHTML = DOC_ICON;
      var body = el('div');
      body.appendChild(el('p', 'src__name', d.name));
      body.appendChild(el('p', 'src__meta', d.meta));
      row.appendChild(ico);
      row.appendChild(body);
      list.appendChild(row);
    });

    $('src-count').textContent = view.docs.length + ' indexed';
  }

  /* Counters tick toward whatever the current view says. The target is read
     on every frame, so a view that arrives mid-count is simply counted to. */
  var TELE = {};
  var teleDone = {};

  function renderTelemetry(view) {
    TELE = view.tele;

    var third = document.querySelector('[data-k-count="third"]');
    if (third && third.previousElementSibling) third.previousElementSibling.textContent = view.thirdLabel;

    Array.prototype.forEach.call(document.querySelectorAll('[data-k-count]'), function (node) {
      var key = node.getAttribute('data-k-count');
      if (reduce || teleDone[key]) node.textContent = (TELE[key] || 0).toLocaleString();
    });

    var rd = $('rd-chunks');
    if (rd) rd.textContent = String(view.tele.passages);
  }

  function animateTelemetry() {
    if (reduce) return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-k-count]'), function (node) {
      var key = node.getAttribute('data-k-count');
      var started = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting || started) return;
          started = true;
          io.disconnect();
          var t0 = performance.now(), dur = 1300;
          (function step(now) {
            var k = clamp((now - t0) / dur, 0, 1);
            var e3 = 1 - Math.pow(1 - k, 3);
            node.textContent = Math.round((TELE[key] || 0) * e3).toLocaleString();
            if (k < 1) requestAnimationFrame(step);
            else teleDone[key] = true;
          })(t0);
        });
      }, { threshold: 0.5 });
      io.observe(node);
    });
  }

  /* The console's activity log. Cues are authored here rather than in markup
     because the rows are generated, and the act needs them to arrive in
     sequence: that staggered arrival is act one's only motion. Rows written
     after the engine has mounted carry no cue and simply appear. */
  var mounted = false;

  function renderLog(view) {
    var host = $('log');
    if (!host) return;
    host.textContent = '';

    var src = $('log-src');
    if (src) src.textContent = view.source === 'live' ? 'live · ' + API_LABEL : 'sample';

    view.log.forEach(function (line, i) {
      var row = el('div', 'log__row');
      if (!mounted) row.setAttribute('data-sc-cue', (0.04 + i * 0.09).toFixed(2) + ' 1 0.1 0.03');
      row.appendChild(el('span', line[0] === 'ok' ? 'log__ok' : 'log__idle',
        line[0] === 'ok' ? '[ok]' : '[--]'));
      row.appendChild(el('span', 'log__msg', line[1] + '  ' + line[2]));
      row.appendChild(el('span', 'log__val', line[3]));
      host.appendChild(row);
    });
  }

  function renderStatus() {
    var rd = $('rd-api');
    if (!rd) return;
    var word = {
      live: 'live', empty: 'live', nokey: 'no key', offline: 'sample', pending: '...'
    }[LIVE.state];
    rd.textContent = word;
    rd.classList.toggle('is-warn', LIVE.state === 'nokey');
    rd.parentNode.classList.toggle('is-live', canAnswer());
    rd.parentNode.title = {
      live: 'Connected to the KnowlyAI API at ' + API_LABEL,
      empty: 'Connected to the KnowlyAI API at ' + API_LABEL + '. Nothing indexed yet.',
      nokey: 'The API at ' + API_LABEL + ' is running without GOOGLE_API_KEY',
      offline: 'No API at ' + API_LABEL + '. Showing the sample index.',
      pending: 'Checking ' + API_LABEL
    }[LIVE.state];
  }

  /* Everything that depends on which source is in charge, in one place. */
  function applySource() {
    var view = heroView();
    renderSources(view);
    renderTelemetry(view);
    renderLog(view);
    renderStatus();
    renderAskMode();
  }

  /* ------------------------------------------------------- act 3 · strip -- */

  function renderStrip() {
    var strip = $('strip');
    if (!strip) return;
    var note = strip.querySelector('.strip__note');

    ranked.forEach(function (c, i) {
      var card = el('article', 'chunk');
      card.dataset.i = String(i);

      var hd = el('div', 'chunk__hd');
      hd.appendChild(el('span', 'chunk__pg', 'p.' + String(c.page).padStart(2, '0')));
      hd.appendChild(el('span', 'chunk__id', c.score.toFixed(3)));

      var ft = el('div', 'chunk__ft',
        c.doc.replace(/\.pdf$/, '') + ' · ' + c.text.length + ' ch');

      card.appendChild(hd);
      card.appendChild(el('p', 'chunk__t', c.text));
      card.appendChild(ft);
      strip.insertBefore(card, note);
    });
  }

  /* Staggered settle across the pan, driven from act progress. Exempts the
     lead card, floors the opacity so an unsettled card reads as arriving
     rather than as failing to load, and stays off under reduced motion. */
  function panStagger() {
    if (reduce) return;
    var act = document.getElementById('passages');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.chunk'));
    if (!act || !cards.length) return;

    var tick = function () {
      var p = parseFloat(act.style.getPropertyValue('--sc-p')) || 0;
      cards.forEach(function (card, i) {
        var start = (i / cards.length) * 0.55;
        var k = clamp((p - start) / 0.18, 0, 1);
        card.style.setProperty('--k-settle', (0.55 + 0.45 * k).toFixed(3));
      });
    };

    watch(act, tick);
  }

  /* ---------------------------------------- act 5 · the confidence gate --
     The signature move. A draggable similarity threshold that recomputes the
     ranking, the answer, the citation numbering and the status chrome.

     Scroll performs the move on its own until the visitor takes it, so the
     peak still lands on touch, on a keyboard, and under reduced motion. */

  var gate = {
    t: T_START,
    touched: false,
    waiting: true
  };

  function renderRail() {
    var rows = $('rail-rows');
    if (!rows) return;
    var line = $('gate-line');

    ranked.forEach(function (c) {
      var row = el('div', 'row');
      row.dataset.id = c.id;

      row.appendChild(el('span', 'row__pg', 'p.' + String(c.page).padStart(2, '0')));

      var bar = el('div', 'row__bar');
      var fill = el('span', 'row__fill');
      fill.style.setProperty('--k-w', c.score.toFixed(3));
      bar.appendChild(fill);
      row.appendChild(bar);

      row.appendChild(el('span', 'row__sc', c.score.toFixed(3)));
      rows.insertBefore(row, line);
    });
  }

  function passing(t) {
    return ranked.filter(function (c) { return c.score >= t; });
  }

  function recompute() {
    var stage = $('gate-stage');
    var kept = passing(gate.t);
    var n = kept.length;

    /* the line snaps to the boundary between kept and cut: the instrument
       reads correctly even though the scores are not evenly spaced */
    var lineEl = $('gate-line');
    if (lineEl) {
      lineEl.style.setProperty('--k-y', (n / ranked.length).toFixed(4));
      lineEl.setAttribute('aria-valuenow', gate.t.toFixed(3));
      lineEl.setAttribute('aria-valuetext',
        gate.t.toFixed(3) + ', ' + n + (n === 1 ? ' passage' : ' passages') + ' above the line');
    }

    var val = $('gate-val');
    if (val) val.textContent = gate.t.toFixed(3);

    var pc = $('pass-count');
    if (pc) pc.textContent = String(n);

    /* rows */
    Array.prototype.forEach.call(document.querySelectorAll('.row'), function (row) {
      var c = byId[row.dataset.id];
      row.classList.toggle('is-cut', !c || c.score < gate.t);
    });

    /* chrome readouts */
    var theta = $('rd-theta'); if (theta) theta.textContent = gate.t.toFixed(3);
    var rk = $('rd-kept');
    if (rk) {
      rk.textContent = String(n);
      rk.classList.toggle('is-warn', n === 0);
    }

    /* the answer, recomposed from whatever survived */
    stage.classList.toggle('is-refusing', n === 0);

    var state = $('ans-state');
    var dot = $('ans-dot');
    if (state) state.textContent = n === 0 ? 'refused' : (n > TOP_K ? 'grounded, broad' : 'grounded');
    if (dot) dot.classList.toggle('k-dot--idle', n === 0);

    if (n === 0) return;

    var order = {};
    kept.forEach(function (c, i) { order[c.id] = i + 1; });

    var host = $('ans-sentences');
    if (host) {
      host.textContent = '';
      SENTENCES.forEach(function (s) {
        if (!order[s.needs]) return;
        var p = el('p', 'ans__s');
        p.appendChild(document.createTextNode(s.text));
        var cite = el('span', 'ans__cite', String(order[s.needs]));
        cite.setAttribute('title', byId[s.needs].doc + ', page ' + byId[s.needs].page);
        p.appendChild(cite);
        host.appendChild(p);
      });
    }

    var weak = kept.filter(function (c) { return c.score < FLOOR; }).length;
    var note = $('ans-note');
    if (note) {
      note.textContent = '';
      note.appendChild(document.createTextNode(
        n + ' of ' + ranked.length + ' passages above θ ' + gate.t.toFixed(3) + '. '));
      if (weak > 0) {
        var b = el('b', null, weak + (weak === 1 ? ' passage is' : ' passages are') +
          ' below the recommended floor of ' + FLOOR.toFixed(2) + '.');
        note.appendChild(b);
        note.appendChild(document.createTextNode(' The answer widens and the wording gets looser.'));
      } else {
        note.appendChild(document.createTextNode('Every sentence above is traceable to one of them.'));
      }
    }
  }

  function setT(next, fromUser) {
    gate.t = clamp(next, T_MIN, T_MAX);
    if (fromUser && !gate.touched) {
      gate.touched = true;
      var hint = $('gate-hint');
      if (hint) hint.classList.add('is-done');
    }
    recompute();
  }

  function wireGate() {
    var line = $('gate-line');
    var rows = $('rail-rows');
    if (!line || !rows) return;

    var yToT = function (clientY) {
      var box = rows.getBoundingClientRect();
      var k = clamp((clientY - box.top) / Math.max(box.height, 1), 0, 1);
      return T_MAX - k * (T_MAX - T_MIN);
    };

    var dragging = false;

    line.addEventListener('pointerdown', function (e) {
      dragging = true;
      line.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    line.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      setT(yToT(e.clientY), true);
    });

    var end = function (e) {
      if (!dragging) return;
      dragging = false;
      try { line.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    };
    line.addEventListener('pointerup', end);
    line.addEventListener('pointercancel', end);

    /* Clicking anywhere in the rail moves the line there. */
    rows.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.gate-line')) return;
      setT(yToT(e.clientY), true);
    });

    line.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 0.05 : 0.01;
      var k = e.key;
      if (k === 'ArrowUp' || k === 'ArrowRight') setT(gate.t + step, true);
      else if (k === 'ArrowDown' || k === 'ArrowLeft') setT(gate.t - step, true);
      else if (k === 'PageUp') setT(gate.t + 0.08, true);
      else if (k === 'PageDown') setT(gate.t - 0.08, true);
      else if (k === 'Home') setT(T_MAX, true);
      else if (k === 'End') setT(T_MIN, true);
      else return;
      e.preventDefault();
    });
  }

  /* Scroll drives the gate until a hand takes it. The sweep reaches refusal
     at p = 0.72 and holds it, so the peak has somewhere to land and time to
     be read. Before p = 0.14 the act is intentionally quiet. */
  function gateSweep() {
    var act = document.getElementById('threshold');
    var stage = $('gate-stage');
    if (!act || !stage) return;

    var tick = function () {
      var p = parseFloat(act.style.getPropertyValue('--sc-p')) || 0;

      var waiting = p < 0.14;
      if (waiting !== gate.waiting) {
        gate.waiting = waiting;
        stage.classList.toggle('is-waiting', waiting);
      }

      if (gate.touched) return;
      var k = clamp((p - 0.14) / (0.72 - 0.14), 0, 1);
      var eased = k * k * (3 - 2 * k);
      setT(0.62 + eased * (0.90 - 0.62), false);
    };

    watch(act, tick);
  }

  /* One rAF loop per watched act, running only while it is on screen. */
  function watch(act, tick) {
    var live = false, raf = 0;

    var loop = function () {
      tick();
      if (live) raf = requestAnimationFrame(loop);
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !live) {
          live = true;
          raf = requestAnimationFrame(loop);
        } else if (!e.isIntersecting && live) {
          live = false;
          cancelAnimationFrame(raf);
          tick();
        }
      });
    }, { rootMargin: '10% 0px' });

    io.observe(act);
    tick();
  }

  /* ------------------------------------------------------- act 6 · ask -- */

  var STOP = ' the a an of to in on for and or is are was were be been it its this that '
    + ' with as by from at how what why when which does do did can could should ';

  function tokens(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
      .filter(function (w) { return w.length > 2 && STOP.indexOf(' ' + w + ' ') === -1; })
      .map(function (w) { return w.replace(/(ing|ed|es|s)$/, ''); });
  }

  var INDEX = ranked.map(function (c) {
    var set = {};
    tokens(c.text).forEach(function (w) { set[w] = (set[w] || 0) + 1; });
    return { c: c, set: set, len: Object.keys(set).length };
  });

  function search(query) {
    var qs = tokens(query);
    if (!qs.length) return [];

    return INDEX.map(function (entry) {
      var hit = 0;
      qs.forEach(function (w) { if (entry.set[w]) hit += 1; });
      /* overlap normalised by query length and passage breadth */
      var score = hit === 0 ? 0 : Math.min(1, hit / Math.sqrt(qs.length * Math.sqrt(entry.len)));
      return { c: entry.c, score: score };
    })
      .filter(function (r) { return r.score > 0.18; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3);
  }

  function refusal(title, body) {
    var none = el('div', 'res__none');
    none.appendChild(el('strong', null, title));
    none.appendChild(el('span', null, body));
    return none;
  }

  /* -- sample mode: an in-browser keyword search over the corpus array -- */

  function renderSampleResults(out, results, asked) {
    out.textContent = '';
    if (!asked) return;

    if (!results.length) {
      out.appendChild(refusal('Not in these documents.',
        'Nothing in the sample index is close enough to answer that. The product '
        + 'says the same thing about your own files rather than inventing something.'));
      return;
    }

    results.forEach(function (r) {
      var row = el('div', 'res__row');
      row.appendChild(el('span', 'res__pg', 'p.' + String(r.c.page).padStart(2, '0')));
      row.appendChild(el('p', 'res__t', r.c.text));
      row.appendChild(el('span', 'res__sc', r.score.toFixed(3)));
      out.appendChild(row);
    });
  }

  /* -- live mode: POST /api/chat, read the event stream ------------------
     The server sends, in order: citations, delta*, done. `error` can replace
     the tail at any point. fetch + a stream reader rather than EventSource,
     because EventSource cannot POST. */

  function streamChat(question, signal, on) {
    return fetch(apiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ question: question, topK: TOP_K }),
      signal: signal
    }).then(function (res) {
      if (!res.ok) return readError(res);
      if (!res.body || !res.body.getReader) throw new Error('This browser cannot read a streamed answer.');

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';

      var dispatch = function (block) {
        var name = 'message', data = [];
        block.split(/\r?\n/).forEach(function (line) {
          if (line.indexOf('event:') === 0) name = line.slice(6).trim();
          else if (line.indexOf('data:') === 0) data.push(line.slice(5).replace(/^ /, ''));
        });
        if (!data.length) return;
        var payload;
        try { payload = JSON.parse(data.join('\n')); } catch (e) { return; }
        on(name, payload);
      };

      var pump = function () {
        return reader.read().then(function (chunk) {
          if (chunk.done) {
            if (buffer.trim()) dispatch(buffer);
            return;
          }
          buffer += decoder.decode(chunk.value, { stream: true });
          var blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop();
          blocks.forEach(dispatch);
          return pump();
        });
      };
      return pump();
    });
  }

  function pdfUrl(c) {
    if (!c.documentId) return null;
    return apiUrl('/api/documents/' + encodeURIComponent(c.documentId) + '/file') +
      (c.page ? '#page=' + c.page : '');
  }

  /* Inline markdown, safely: **bold** and [n] / [n, m] citation markers. All
     text goes in through textContent; nothing from the model becomes HTML. */
  function inline(parent, text, cites) {
    var re = /(\*\*[^*\n]+\*\*|\[\d+(?:\s*,\s*\d+)*\])/g;
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var tok = m[0];
      if (tok.charAt(0) === '*') {
        parent.appendChild(el('strong', null, tok.slice(2, -2)));
      } else {
        tok.slice(1, -1).split(',').forEach(function (n) {
          n = parseInt(n, 10);
          var c = cites[n];
          var href = c && pdfUrl(c);
          var chip = el(href ? 'a' : 'span', 'ans__cite', String(n));
          if (c) {
            chip.title = c.source + (c.page ? ', page ' + c.page : '');
            chip.setAttribute('data-cite', String(n));
          }
          if (href) { chip.href = href; chip.target = '_blank'; chip.rel = 'noopener'; }
          parent.appendChild(chip);
        });
      }
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  /* Paragraphs, bullet and numbered lists, and headings flattened to bold. */
  function renderMarkdown(host, text, cites) {
    host.textContent = '';
    text.split(/\n{2,}/).forEach(function (block) {
      var lines = block.split('\n').filter(function (l) { return l.trim(); });
      if (!lines.length) return;

      var bullet = /^\s*(?:[-*•]|\d+[.)])\s+/;
      if (lines.every(function (l) { return bullet.test(l); })) {
        var list = el(/^\s*\d/.test(lines[0]) ? 'ol' : 'ul');
        lines.forEach(function (l) {
          var li = el('li');
          inline(li, l.replace(bullet, ''), cites);
          list.appendChild(li);
        });
        host.appendChild(list);
        return;
      }

      var p = el('p');
      var joined = lines.join(' ');
      if (/^#{1,6}\s/.test(joined)) {
        var b = el('strong');
        inline(b, joined.replace(/^#{1,6}\s+/, ''), cites);
        p.appendChild(b);
      } else {
        inline(p, joined, cites);
      }
      host.appendChild(p);
    });
  }

  function citationRow(c) {
    var row = el('div', 'res__row res__row--cite');
    row.setAttribute('data-cite', String(c.index));
    row.appendChild(el('span', 'res__n', String(c.index)));

    var href = pdfUrl(c);
    var pg = el(href ? 'a' : 'span', 'res__pg', c.page ? 'p.' + String(c.page).padStart(2, '0') : 'p.?');
    if (href) {
      pg.href = href; pg.target = '_blank'; pg.rel = 'noopener';
      pg.title = 'Open ' + c.source + (c.page ? ' at page ' + c.page : '');
    }
    row.appendChild(pg);

    var body = el('div');
    body.appendChild(el('p', 'res__doc', c.source));
    var snip = c.snippet.replace(/\s+/g, ' ').trim();
    body.appendChild(el('p', 'res__t', snip.length > 260 ? snip.slice(0, 257) + '...' : snip));
    row.appendChild(body);

    row.appendChild(el('span', 'res__sc', c.score == null ? '' : c.score.toFixed(3)));
    return row;
  }

  function setStatus(text, busy) {
    var s = $('ask-status');
    if (!s) return;
    s.textContent = text || '';
    s.classList.toggle('is-busy', !!busy);
  }

  var inflight = null;

  function askLive(question, out) {
    if (inflight) inflight.abort();
    var ctl = new AbortController();
    inflight = ctl;

    out.textContent = '';
    var panel = el('div', 'live');
    var answer = el('div', 'live__ans is-streaming');
    var sources = el('div', 'live__src');
    panel.appendChild(answer);
    panel.appendChild(sources);

    var cites = {};
    var text = '';
    var queued = false;
    var started = performance.now();

    var paint = function () {
      queued = false;
      renderMarkdown(answer, text, cites);
    };

    setStatus('Retrieving passages from ' + LIVE.docs.length +
      (LIVE.docs.length === 1 ? ' document' : ' documents') + '...', true);

    var setFormBusy = function (busy) {
      var go = $('ask-go');
      if (go) go.textContent = busy ? 'Stop' : 'Ask';
      $('ask-form').classList.toggle('is-busy', busy);
    };
    setFormBusy(true);

    var fail = function (title, body) {
      out.textContent = '';
      if (text) { answer.classList.remove('is-streaming'); out.appendChild(panel); }
      out.appendChild(refusal(title, body));
    };

    streamChat(question, ctl.signal, function (name, data) {
      if (ctl.signal.aborted) return;

      if (name === 'citations') {
        (data.citations || []).forEach(function (c) {
          cites[c.index] = c;
          sources.appendChild(citationRow(c));
        });
        out.appendChild(panel);
        setStatus('Writing from ' + data.citations.length + ' passages...', true);
      } else if (name === 'delta') {
        text += data.text || '';
        if (!queued) { queued = true; requestAnimationFrame(paint); }
      } else if (name === 'done') {
        paint();
        answer.classList.remove('is-streaming');
        var secs = ((data.elapsedMs || (performance.now() - started)) / 1000).toFixed(1);
        var used = {};
        (text.match(/\[\d+(?:\s*,\s*\d+)*\]/g) || []).forEach(function (t) {
          t.slice(1, -1).split(',').forEach(function (n) { used[parseInt(n, 10)] = 1; });
        });
        var nUsed = Object.keys(used).filter(function (n) { return cites[n]; }).length;
        setStatus('Answered in ' + secs + 's · ' + nUsed + ' of ' + Object.keys(cites).length +
          ' passages cited · click a number to open the page', false);
      } else if (name === 'error') {
        if (data.code === 'no_match') {
          fail('Not in these documents.', data.message +
            ' KnowlyAI says so rather than inventing something.');
        } else {
          fail('The answer stopped.', data.message || 'The API reported an error.');
        }
        setStatus('', false);
      }
    }).then(function () {
      if (ctl.signal.aborted) return;
      answer.classList.remove('is-streaming');
      var s = $('ask-status');
      if (s && s.classList.contains('is-busy')) setStatus('The stream ended early.', false);
    }).catch(function (err) {
      if (ctl.signal.aborted) return;
      if (err.status === 409) {
        LIVE.state = 'empty';
        LIVE.docs = [];
        applySource();
        fail('Nothing is indexed yet.', 'Add a PDF below, then ask again.');
      } else if (err.status) {
        fail('The API refused that.', err.message);
      } else {
        fail('Lost the API.', 'Nothing answered at ' + API_LABEL +
          '. Start it with `uvicorn api.main:app` and reload this page.');
      }
      setStatus('', false);
    }).finally(function () {
      if (inflight === ctl) inflight = null;
      setFormBusy(false);
    });
  }

  /* Hovering a citation number lights the passage it points at. */
  function wireCiteHover(out) {
    var hot = function (n, on) {
      Array.prototype.forEach.call(out.querySelectorAll('.res__row[data-cite="' + n + '"]'), function (r) {
        r.classList.toggle('is-hot', on);
      });
    };
    out.addEventListener('pointerover', function (e) {
      var c = e.target.closest && e.target.closest('.ans__cite[data-cite]');
      if (c) hot(c.getAttribute('data-cite'), true);
    });
    out.addEventListener('pointerout', function (e) {
      var c = e.target.closest && e.target.closest('.ans__cite[data-cite]');
      if (c) hot(c.getAttribute('data-cite'), false);
    });
  }

  /* -- upload: POST /api/documents, then re-read the index ---------------- */

  function wireUpload() {
    var input = $('ask-file');
    if (!input) return;

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      input.value = '';
      if (!file) return;

      var label = $('ask-up');
      label.classList.add('is-busy');
      setStatus('Indexing ' + file.name + '. Long PDFs take a while to embed...', true);

      var form = new FormData();
      form.append('file', file);

      fetch(apiUrl('/api/documents'), { method: 'POST', body: form })
        .then(function (res) { return res.ok ? res.json() : readError(res); })
        .then(function (body) {
          var d = body.document;
          setStatus('Indexed ' + d.name + ': ' + d.pages + ' pages, ' + d.chunks + ' passages. Ask it something.', false);
          return connect().then(applySource);
        })
        .catch(function (err) {
          setStatus('Could not index ' + file.name + ': ' +
            (err.status ? err.message : 'the API did not answer.'), false);
        })
        .finally(function () { label.classList.remove('is-busy'); });
    });
  }

  /* -- the close, in whichever mode the source allows --------------------- */

  function renderAskMode() {
    var live = canAnswer();
    var head = $('ask-head'), lab = $('ask-label'), go = $('ask-go');
    var small = $('ask-small'), up = $('ask-up'), input = $('ask-input');
    if (!head) return;

    if (up) up.hidden = !live;
    if (input) input.maxLength = live ? 2000 : 160;
    if (go && !inflight) go.textContent = live ? 'Ask' : 'Search';

    var n = LIVE.docs.length;
    var docs = n + (n === 1 ? ' document' : ' documents');

    if (LIVE.state === 'live') {
      head.textContent = 'Ask your own documents something. Then ask them something they cannot know.';
      lab.textContent = 'Ask your indexed documents a question';
      small.textContent = 'This field asks the KnowlyAI API at ' + API_LABEL + ', over the ' +
        docs + ' you indexed. Each answer streams in with the passages behind it.';
    } else if (LIVE.state === 'empty') {
      head.textContent = 'The API is up and the index is empty. Add a PDF, then ask it something.';
      lab.textContent = 'Ask your indexed documents a question';
      small.textContent = 'Connected to ' + API_LABEL + '. Nothing is indexed yet, so there is nothing to answer from.';
    } else {
      head.textContent = 'Ask the sample index something. Then ask it something it cannot know.';
      lab.textContent = 'Ask the sample index a question';
      small.textContent = LIVE.state === 'nokey'
        ? 'The API at ' + API_LABEL + ' is running without GOOGLE_API_KEY, so it cannot answer. ' +
          'This field searches the sample index in your browser until it has one.'
        : LIVE.state === 'pending'
          ? 'Looking for the KnowlyAI API at ' + API_LABEL + '...'
          : 'No KnowlyAI API answered at ' + API_LABEL + ', so this field searches the sample ' +
            'index in your browser. Start the API to ask your own files.';
    }
  }

  function wireAsk() {
    var form = $('ask-form');
    var input = $('ask-input');
    var out = $('ask-results');
    if (!form || !input || !out) return;

    wireCiteHover(out);
    wireUpload();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (inflight) {
        inflight.abort();
        setStatus('Stopped.', false);
        return;
      }
      var q = input.value.trim();
      if (canAnswer()) {
        if (q) askLive(q, out);
        return;
      }
      renderSampleResults(out, search(q), q.length > 0);
    });

    /* Typing searches as you go only in sample mode: a live question costs a
       model call, so it waits for Enter. */
    input.addEventListener('input', function () {
      if (canAnswer()) return;
      renderSampleResults(out, search(input.value), input.value.trim().length > 0);
    });
  }

  /* ------------------------------------------------------------ chrome -- */

  function wireChrome() {
    var cta = $('cta');
    if (cta) {
      cta.href = APP_URL;
      cta.rel = 'noopener';
    }

    var segs = Array.prototype.slice.call(document.querySelectorAll('.bar__seg'));
    var sections = segs
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);
    if (!sections.length) return;

    var mark = function () {
      var mid = window.scrollY + window.innerHeight * 0.45;
      var active = 0;
      sections.forEach(function (s, i) { if (s.offsetTop <= mid) active = i; });
      segs.forEach(function (a, i) {
        if (i === active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };

    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; mark(); });
    }, { passive: true });

    mark();
  }

  /* ------------------------------------------------------------- boot -- */

  /* The engine reads cues once, at mount, so the hero is rendered before it
     mounts. A running local API answers in milliseconds and the first paint
     shows the real index. If it has not answered within WAIT_MS the page
     mounts on the sample and swaps in the live index when it arrives. */
  var WAIT_MS = 900;

  function boot() {
    renderStrip();
    renderRail();
    recompute();
    wireGate();
    gateSweep();
    panStagger();
    wireAsk();
    wireChrome();

    var settled = false;
    var start = function () {
      if (settled) return;
      settled = true;
      applySource();
      animateTelemetry();
      ScrollCraft.mount(document.body);
      mounted = true;
    };

    connect().then(function () {
      if (!settled) start();
      else applySource();
    });
    setTimeout(start, WAIT_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
