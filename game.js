/* Integer Archer — slingshot integer shooter. Mobile-first sample. */
(function () {
  'use strict';

  const API_NS = 'bnhs-iarcher-nov2026';
  const API = 'https://mantledb.sh/v2/' + API_NS;
  const API_EXPORT = 'https://mantledb.sh/v2/export/' + API_NS;
  const ADM_API =
    'https://script.google.com/macros/s/AKfycbwGMSP8NmPT4GYMJZTw4qruizfFd5wzORZHZRM-HOUJOSQyyg3Gx20L5MEWsqT5EFdl-w/exec';

  const LEVELS = 5;
  const ITEMS = 20;
  const LIVES = 3;
  const MAX_LIVES = 5;
  const MAX_ATTEMPTS = 1;
  const BASE_PTS = [0, 10, 20, 30, 40, 50];
  const ITEM_SEC = [0, 8, 7, 6, 6, 7];
  const MAX_PLAUSIBLE = 5000;
  const DEMO =
    /(?:\?|&)(?:demo|test)=1(?:&|$)/.test(location.search || '') ||
    location.hash === '#demo';

  // ---- Web Audio ----
  const Sound = (function () {
    let ctx = null, master = null, musicGain = null, sfxGain = null;
    let unlocked = false;
    let enabled = localStorage.getItem('ia-sound') !== '0';
    let musicTimer = null, humOsc = null, humGain = null, level = 1;

    function ensure() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? 0.7 : 0;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.18;
      musicGain.connect(master);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.55;
      sfxGain.connect(master);
      return ctx;
    }
    function unlock() {
      const c = ensure();
      if (!c) return;
      if (c.state === 'suspended') c.resume().catch(function () {});
      if (!unlocked) {
        unlocked = true;
        const o = c.createOscillator(), g = c.createGain();
        g.gain.value = 0.0001;
        o.connect(g); g.connect(master);
        o.start(); o.stop(c.currentTime + 0.01);
        if (enabled) startMusic(level);
      }
    }
    function setEnabled(on) {
      enabled = !!on;
      localStorage.setItem('ia-sound', enabled ? '1' : '0');
      ensure();
      if (master) master.gain.setTargetAtTime(enabled ? 0.7 : 0, ctx.currentTime, 0.05);
      if (enabled && unlocked) startMusic(level); else stopMusic();
      paintBtn();
    }
    function toggle() { setEnabled(!enabled); }
    function paintBtn() {
      const b = document.getElementById('btn-sound');
      if (!b) return;
      b.textContent = enabled ? '🔊 On' : '🔇 Off';
      b.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }
    function tone(freq, dur, type, gain, when) {
      const c = ensure();
      if (!c || !enabled || !unlocked) return;
      const t0 = when != null ? when : c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.3, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(sfxGain);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    function ding() {
      const c = ensure(); if (!c) return;
      const t = c.currentTime;
      tone(880, 0.12, 'sine', 0.35, t);
      tone(1320, 0.18, 'sine', 0.25, t + 0.06);
    }
    function buzz() {
      const c = ensure(); if (!c) return;
      const t = c.currentTime;
      tone(140, 0.22, 'sawtooth', 0.22, t);
      tone(90, 0.28, 'square', 0.12, t + 0.04);
    }
    function twang() {
      const c = ensure(); if (!c) return;
      const t = c.currentTime;
      tone(420, 0.08, 'triangle', 0.28, t);
      tone(260, 0.14, 'sine', 0.18, t + 0.04);
    }
    function bonusLife() {
      const c = ensure(); if (!c) return;
      const t = c.currentTime;
      [523, 659, 784, 988, 1175].forEach(function (f, i) { tone(f, 0.13, 'sine', 0.28, t + i * 0.07); });
      tone(1568, 0.22, 'triangle', 0.18, t + 0.38);
    }
    function levelUp() {
      const c = ensure(); if (!c) return;
      const t = c.currentTime;
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.12, 'sine', 0.22, t + i * 0.08); });
    }
    function stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      if (humOsc) { try { humOsc.stop(); } catch (e) {} humOsc = null; }
      if (humGain) humGain = null;
    }
    function startMusic(lv) {
      level = lv || level;
      const c = ensure();
      if (!c || !enabled || !unlocked) return;
      stopMusic();
      humOsc = c.createOscillator();
      humGain = c.createGain();
      humOsc.type = 'sine';
      humOsc.frequency.value = 110 + level * 8;
      humGain.gain.value = 0.04;
      humOsc.connect(humGain); humGain.connect(musicGain);
      humOsc.start();
      const roots = [196, 220, 247, 262, 294, 330];
      musicTimer = setInterval(function () {
        if (!enabled || !unlocked) return;
        const f = roots[(Math.random() * roots.length) | 0] * (1 + (level - 1) * 0.03);
        tone(f, 0.35, 'triangle', 0.08, c.currentTime);
        tone(f * 1.5, 0.28, 'sine', 0.05, c.currentTime + 0.1);
      }, 900 - Math.min(300, level * 40));
    }
    function setLevel(lv) {
      level = lv;
      if (humOsc) humOsc.frequency.setTargetAtTime(110 + level * 8, (ctx && ctx.currentTime) || 0, 0.3);
    }
    return { unlock, toggle, setEnabled, paintBtn, ding, buzz, twang, bonusLife, levelUp, startMusic, stopMusic, setLevel };
  })();

  function $(id) { return document.getElementById(id); }
  const screens = {
    start: $('screen-start'),
    game: $('screen-game'),
    summary: $('screen-summary'),
    board: $('screen-board'),
  };
  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('active', k === name);
    });
  }

  let learners = [];
  let player = { name: '', grade: '', section: '' };
  let progress = blankProgress();
  let attempt = null;
  let run = null;
  let raf = 0;
  let shakeT = 0;
  let particles = [];

  function blankProgress() {
    return { attemptsUsed: 0, bestTotal: 0, bestLevel: 0, attemptScores: [] };
  }
  function keyOf(p) {
    return norm(p.name) + '-g' + String(p.grade).replace(/\D/g, '');
  }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 48) || 'anon';
  }
  function gradeNum(g) {
    const m = String(g || '').match(/(\d+)/);
    return m ? m[1] : String(g);
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem('ia-progress-' + keyOf(player));
      if (raw) {
        const p = JSON.parse(raw);
        progress.attemptsUsed = Math.max(0, Number(p.attemptsUsed) || 0);
        progress.bestTotal = Math.max(0, Number(p.bestTotal) || 0);
        progress.bestLevel = Math.max(0, Number(p.bestLevel) || 0);
        progress.attemptScores = Array.isArray(p.attemptScores) ? p.attemptScores : [];
      }
    } catch (e) {}
  }
  function saveLocal() {
    try {
      localStorage.setItem('ia-progress-' + keyOf(player), JSON.stringify(progress));
    } catch (e) {}
  }

  async function fetchRemoteRecord() {
    try {
      const r = await fetch(API + '/scores/' + keyOf(player) + '?t=' + Date.now());
      if (!r.ok) return null;
      const j = await r.json();
      if (j && j.error) return null;
      if (j && j.name) return j;
      return null;
    } catch (e) { return null; }
  }
  function mergeRemote(rec) {
    if (!rec) return;
    progress.attemptsUsed = Math.max(progress.attemptsUsed, Math.max(0, Number(rec.attempts) || 0));
    progress.bestTotal = Math.max(progress.bestTotal, Math.max(0, Number(rec.total) || 0));
    progress.bestLevel = Math.max(progress.bestLevel, Math.max(0, Number(rec.bestLevel) || 0));
    if (Array.isArray(rec.attemptScores) && rec.attemptScores.length) {
      const set = new Set(progress.attemptScores.concat(rec.attemptScores.map(Number)));
      progress.attemptScores = [...set].filter(function (n) { return Number.isFinite(n); });
    }
    saveLocal();
  }
  async function fetchBoard() {
    try {
      const r = await fetch(API_EXPORT + '?t=' + Date.now());
      const j = await r.json();
      const entries = [];
      const bag = (j && j.entries) || {};
      Object.keys(bag).forEach(function (path) {
        if (path.indexOf('scores/') === 0 && bag[path] && bag[path].name) entries.push(bag[path]);
      });
      return entries.filter(function (e) { return Number(e.total) <= MAX_PLAUSIBLE; });
    } catch (e) {
      try { return JSON.parse(localStorage.getItem('ia-local-board') || '[]'); }
      catch (e2) { return []; }
    }
  }
  async function submitRecord(entry) {
    const local = JSON.parse(localStorage.getItem('ia-local-board') || '[]');
    const idx = local.findIndex(function (e) {
      return norm(e.name) === norm(entry.name) && String(e.grade) === String(entry.grade);
    });
    if (idx >= 0) local[idx] = entry; else local.push(entry);
    localStorage.setItem('ia-local-board', JSON.stringify(local));
    try {
      const path = API + '/scores/' + keyOf(entry);
      let best = Object.assign({}, entry);
      try {
        const prev = await (await fetch(path + '?t=' + Date.now())).json();
        if (prev && prev.name) {
          best.total = Math.max(Number(prev.total) || 0, Number(entry.total) || 0);
          best.bestLevel = Math.max(Number(prev.bestLevel) || 0, Number(entry.bestLevel) || 0);
          best.attempts = Math.min(MAX_ATTEMPTS, Math.max(Number(prev.attempts) || 0, Number(entry.attempts) || 0));
          const scores = []
            .concat(Array.isArray(prev.attemptScores) ? prev.attemptScores : [])
            .concat(Array.isArray(entry.attemptScores) ? entry.attemptScores : [])
            .map(Number).filter(function (n) { return Number.isFinite(n); });
          best.attemptScores = [...new Set(scores)].slice(-4);
          if ((Number(prev.attempts) || 0) >= MAX_ATTEMPTS) {
            best.attempts = MAX_ATTEMPTS;
            if (Array.isArray(prev.attemptScores) && prev.attemptScores.length >= MAX_ATTEMPTS) {
              best.attemptScores = prev.attemptScores.slice(0, MAX_ATTEMPTS);
            }
          }
          if ((Number(prev.total) || 0) > (Number(entry.total) || 0)) {
            best.name = prev.name;
            best.section = prev.section || entry.section;
          }
        }
      } catch (e) {}
      if (Number(best.total) > MAX_PLAUSIBLE) return false;
      best.attempts = Math.min(MAX_ATTEMPTS, Math.max(0, Number(best.attempts) || 0));
      await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(best),
      });
      return true;
    } catch (e) { return false; }
  }

  const MEDALS = ['', '🥇', '🥈', '🥉'];
  function sortBoard(list) {
    return list.slice().sort(function (a, b) {
      const pt = Number(b.total) - Number(a.total);
      if (pt) return pt;
      const lv = Number(b.bestLevel || 0) - Number(a.bestLevel || 0);
      if (lv) return lv;
      const ta = Number(a.ts) || Number.MAX_SAFE_INTEGER;
      const tb = Number(b.ts) || Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function renderBoard(entries, filter) {
    const tb = $('board-body');
    tb.innerHTML = '';
    let list = entries.slice();
    if (filter === '11' || filter === '12') {
      list = list.filter(function (e) { return String(e.grade) === filter; });
    }
    list = sortBoard(list);
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="5" class="muted">No scores yet</td></tr>';
      return;
    }
    list.forEach(function (e, i) {
      const rank = i + 1;
      const tr = document.createElement('tr');
      if (rank <= 3) tr.className = 'rank-' + rank;
      const medal = MEDALS[rank] || '';
      const gs = 'G' + esc(e.grade) + (e.section ? ' · ' + esc(e.section) : '');
      tr.innerHTML =
        '<td class="rank-cell">' + (medal ? medal + ' ' : '') + rank + '</td>' +
        '<td>' + esc(e.name) + '</td>' +
        '<td class="gs">' + gs + '</td>' +
        '<td class="pts">' + Number(e.total) + '</td>' +
        '<td class="lvl">L' + Number(e.bestLevel || 0) + '</td>';
      tb.appendChild(tr);
    });
  }

  // ---- Master list ----
  async function loadLearners() {
    const status = $('load-status');
    try {
      const r = await fetch(ADM_API + '?action=config&t=' + Date.now());
      const j = await r.json();
      learners = Array.isArray(j.learners) ? j.learners.filter(function (x) { return x && x.n && x.g && x.s; }) : [];
      if (!learners.length) {
        status.textContent = 'Class list empty — ask your teacher.';
        return;
      }
      const grades = [...new Set(learners.map(function (x) { return gradeNum(x.g); }))].sort();
      const gSel = $('inp-grade');
      gSel.innerHTML = '<option value="">Select grade</option>';
      grades.forEach(function (g) {
        const o = document.createElement('option');
        o.value = g; o.textContent = 'Grade ' + g;
        gSel.appendChild(o);
      });
      const g11 = learners.filter(function (x) { return gradeNum(x.g) === '11'; }).length;
      const g12 = learners.filter(function (x) { return gradeNum(x.g) === '12'; }).length;
      status.textContent = 'Loaded ' + learners.length + ' learners (G11: ' + g11 + ', G12: ' + g12 + ').';
      $('btn-play').disabled = true;
    } catch (e) {
      status.textContent = 'Could not load class list. Check connection / try again.';
      $('inp-grade').innerHTML = '<option value="">Unavailable</option>';
    }
  }
  function fillSections() {
    const g = $('inp-grade').value;
    const sSel = $('inp-section'), nSel = $('inp-name');
    nSel.innerHTML = '<option value="">Select section first</option>';
    nSel.disabled = true;
    $('btn-play').disabled = true;
    if (!g) {
      sSel.innerHTML = '<option value="">Select grade first</option>';
      sSel.disabled = true;
      return;
    }
    const secs = [...new Set(learners.filter(function (x) { return gradeNum(x.g) === g; }).map(function (x) { return x.s; }))].sort();
    sSel.innerHTML = '<option value="">Select section</option>';
    secs.forEach(function (s) {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      sSel.appendChild(o);
    });
    sSel.disabled = false;
  }
  function fillNames() {
    const g = $('inp-grade').value, s = $('inp-section').value;
    const nSel = $('inp-name');
    $('btn-play').disabled = true;
    if (!g || !s) {
      nSel.innerHTML = '<option value="">Select section first</option>';
      nSel.disabled = true;
      return;
    }
    const names = learners.filter(function (x) { return gradeNum(x.g) === g && x.s === s; })
      .map(function (x) { return x.n; }).sort(function (a, b) { return a.localeCompare(b); });
    nSel.innerHTML = '<option value="">Select your name</option>';
    names.forEach(function (n) {
      const o = document.createElement('option');
      o.value = n; o.textContent = n;
      nSel.appendChild(o);
    });
    nSel.disabled = false;
  }
  $('inp-grade').onchange = fillSections;
  $('inp-section').onchange = fillNames;
  $('inp-name').onchange = function () { $('btn-play').disabled = !$('inp-name').value; };

  // ---- Canvas / archer gameplay ----
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  let W = 360, H = 640, dpr = 1;
  let tapAim = true;
  let recoil = 0;          // post-release string snap / body lean
  let breathT = 0;         // idle breathing phase
  let cloudT = 0;          // drifting clouds
  // Offscreen caches (static layers) — rebuilt on resize
  let bgCache = null;      // sky+mountains+trees+grass+fence (no clouds)
  let bgCacheKey = '';
  let targetRingCache = null; // reusable target face (without number)
  let targetRingR = 0;

  function resize() {
    const wrap = $('game-wrap');
    const rect = wrap.getBoundingClientRect();
    W = Math.max(280, Math.floor(rect.width));
    H = Math.max(240, Math.floor(rect.height));
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bgCache = null;
    bgCacheKey = '';
    targetRingCache = null;
    targetRingR = 0;
  }

  function archerPos() {
    return { x: W * 0.18, y: H * 0.82 };
  }

  function itemDuration(level) { return ITEM_SEC[level] || 7; }

  function spawnTargets(q, level) {
    const opts = (q.options || []).slice(0, 3);
    // L4–L5: optional 4th decoy
    if (level >= 4) {
      let decoy = q.answer + (Math.random() < 0.5 ? 1 : -1) * (1 + ((Math.random() * 5) | 0));
      let guard = 0;
      while (opts.includes(decoy) && guard++ < 20) decoy += (Math.random() < 0.5 ? 1 : -1);
      if (!opts.includes(decoy)) opts.push(decoy);
    }
    const n = opts.length;
    const skyTop = H * 0.12;
    const skyBot = H * 0.52;
    const speed = 28 + level * 18;
    const wob = 0.6 + level * 0.25;
    return opts.map(function (val, i) {
      const lane = (i + 0.5) / n;
      return {
        value: val,
        x: W * (0.15 + lane * 0.7) + (Math.random() - 0.5) * 30,
        y: skyTop + (skyBot - skyTop) * (0.2 + Math.random() * 0.6),
        vx: (Math.random() < 0.5 ? -1 : 1) * (speed * (0.6 + Math.random() * 0.8)),
        vy: (Math.random() - 0.5) * speed * 0.35,
        r: Math.max(32, Math.min(52, W * 0.085)),
        phase: Math.random() * Math.PI * 2,
        wob: wob,
        burst: 0,
        hit: false,
      };
    });
  }

  function resetAimState() {
    if (!run) return;
    run.arrow = null;
    run.aim = { pulling: false, sx: 0, sy: 0, cx: 0, cy: 0 };
    run.phase = 'aim';
    run.resolved = false;
  }

  function startAttempt() {
    return (async function () {
      if (!DEMO) {
        const rec = await fetchRemoteRecord();
        mergeRemote(rec);
        if (progress.attemptsUsed >= MAX_ATTEMPTS) {
          paintLobby();
          return;
        }
      }
      attempt = {
        num: DEMO ? 1 : progress.attemptsUsed + 1,
        score: 0, unlocked: LEVELS, bestLevel: 0, totalCorrect: 0, active: true,
      };
      Sound.unlock();
      Sound.startMusic(1);
      startLevel(1);
    })();
  }


  function pickBonusIndices(n) {
    // Exactly 2 bonus items per level: never item 1 (index 0), never adjacent.
    const pool = [];
    for (let i = 1; i < n; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    const a = pool[0];
    let b = null;
    for (let i = 1; i < pool.length; i++) {
      if (Math.abs(pool[i] - a) > 1) { b = pool[i]; break; }
    }
    if (b == null) b = (a >= n - 2) ? a - 2 : a + 2;
    return a < b ? [a, b] : [b, a];
  }
  function isBonusQ() {
    return !!(run && run.bonusIdx && run.bonusIdx.indexOf(run.qIndex) >= 0);
  }

  function startLevel(level) {
    if (!attempt || !attempt.active) { alert('Start an attempt first.'); return; }
    Sound.setLevel(level);
    if (level > 1) Sound.levelUp();
    const questions = IRQuestions.generateLevel(level, ITEMS);
    const bonusIdx = pickBonusIndices(ITEMS);
    run = {
      level: level,
      questions: questions,
      qIndex: 0,
      bonusIdx: bonusIdx,
      lives: LIVES,
      correct: 0,
      score: 0,
      streak: 0,
      itemT: itemDuration(level),
      itemMax: itemDuration(level),
      flash: null,
      over: false,
      endedByLives: false,
      lastTs: 0,
      targets: [],
      arrow: null,
      aim: { pulling: false, sx: 0, sy: 0, cx: 0, cy: 0 },
      phase: 'aim',
      resolved: false,
      skyT: 0,
    };
    particles = [];
    spawnCurrent();
    updateHud();
    show('game');
    resize();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function spawnCurrent() {
    const q = run.questions[run.qIndex];
    run.targets = spawnTargets(q, run.level);
    resetAimState();
    run.itemT = itemDuration(run.level);
    run.itemMax = run.itemT;
    if (isBonusQ()) {
      try { Sound.bonusLife(); } catch (e) {}
    }
  }

  function updateHud() {
    if (!run) return;
    $('hud-attempt').textContent = MAX_ATTEMPTS === 1 ? '1 try only' : ('Attempt ' + (attempt ? attempt.num : '?') + ' of ' + MAX_ATTEMPTS);
    $('hud-level').textContent = 'L' + run.level;
    $('hud-q').textContent = (run.qIndex + 1) + '/' + ITEMS;
    $('hud-score').textContent = String((attempt ? attempt.score : 0) + run.score);
    const lifeFill = Math.max(0, run.lives);
    $('hud-lives').textContent = '❤'.repeat(lifeFill) + (lifeFill < LIVES ? '♡'.repeat(LIVES - lifeFill) : '');
    const q = run.questions[run.qIndex];
    const bonus = isBonusQ();
    const ban = $('hud-bonus');
    if (ban) {
      ban.textContent = '❤ BONUS LIFE question';
      ban.classList.toggle('show', bonus);
      ban.hidden = !bonus;
    }
    $('hud-prompt').textContent = q ? (q.promptDisplay || q.prompt) : '';
    $('hud-prompt').classList.toggle('bonus', bonus);
    const frac = Math.max(0, Math.min(1, run.itemT / run.itemMax));
    $('timer-bar').style.transform = 'scaleX(' + frac + ')';
    $('timer-label').textContent = run.itemT.toFixed(1) + 's';
  }

  function burstAt(x, y, ok) {
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
      const sp = 40 + Math.random() * 120;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        t: 0.45 + Math.random() * 0.25,
        c: ok ? (Math.random() < 0.5 ? '#ffe566' : '#66bb6a') : '#ef5350',
        r: 2 + Math.random() * 3,
      });
    }
  }

  function resolveHit(target) {
    if (!run || run.resolved || run.over) return;
    run.resolved = true;
    run.phase = 'resolve';
    run.arrow = null;
    const q = run.questions[run.qIndex];
    const ok = target && target.value === q.answer;
    if (target) { target.hit = true; target.burst = 0.5; }
    if (ok) {
      run.correct++;
      run.streak++;
      const gained = BASE_PTS[run.level] + Math.floor(run.streak / 3) * 5;
      run.score += gained;
      let bonusGain = false;
      if (isBonusQ() && run.lives < MAX_LIVES) {
        run.lives++;
        bonusGain = true;
      }
      run.flash = { kind: 'ok', t: 0.7, gained: gained, bonusLife: bonusGain };
      burstAt(target.x, target.y, true);
      Sound.ding();
      if (bonusGain) Sound.bonusLife();
    } else {
      run.streak = 0;
      run.lives--;
      run.flash = { kind: 'bad', t: 0.55 };
      shakeT = 0.4;
      if (target) burstAt(target.x, target.y, false);
      Sound.buzz();
      if (run.lives <= 0) {
        run.endedByLives = true;
        endLevel(false);
        return;
      }
    }
    updateHud();
  }

  function resolveMiss() {
    if (!run || run.resolved || run.over) return;
    run.resolved = true;
    run.phase = 'resolve';
    run.arrow = null;
    run.streak = 0;
    run.lives--;
    run.flash = { kind: 'bad', t: 0.55 };
    shakeT = 0.35;
    Sound.buzz();
    if (run.lives <= 0) {
      run.endedByLives = true;
      endLevel(false);
      return;
    }
    updateHud();
  }

  function advanceQuestion() {
    run.qIndex++;
    if (run.qIndex >= ITEMS) {
      endLevel(true);
      return;
    }
    spawnCurrent();
    updateHud();
  }

  function endLevel(finishedAllItems) {
    if (!run || run.over) return;
    run.over = true;
    cancelAnimationFrame(raf);
    if (attempt) {
      attempt.score += run.score;
      attempt.totalCorrect += run.correct;
      attempt.bestLevel = Math.max(attempt.bestLevel, run.level);
    }
    const isLast = run.level >= LEVELS;
    const died = !!run.endedByLives;
    $('sum-title').textContent = isLast ? 'Run complete!' : (died ? 'Out of lives — next level' : 'Level ' + run.level + ' Clear!');
    $('sum-detail').textContent =
      'Correct: ' + run.correct + '/' + (died ? run.qIndex + 1 : ITEMS) +
      ' · Level points: ' + run.score +
      ' · Attempt total: ' + (attempt ? attempt.score : 0) +
      (died && !isLast ? ' · Fresh 3 lives on next level' : '') +
      (isLast ? ' · All 5 levels done' : '');
    if (isLast) {
      finishAttempt().then(function () { paintSummaryButtons(false); });
    } else {
      $('sum-sync').textContent =
        (MAX_ATTEMPTS === 1 ? '1 try' : ('Attempt ' + attempt.num + ' of ' + MAX_ATTEMPTS)) +
        ' · Level ' + (run.level + 1) + ' next.';
      paintSummaryButtons(true);
    }
    show('summary');
  }

  async function finishAttempt() {
    if (!attempt || !attempt.active) return;
    attempt.active = false;
    Sound.stopMusic();
    const score = attempt.score;
    const bestLevel = attempt.bestLevel;
    if (DEMO) {
      $('sum-sync').textContent = 'Demo mode — score not saved (' + score + ' pts).';
      return;
    }
    progress.attemptsUsed = Math.max(progress.attemptsUsed + 1, attempt.num);
    progress.attemptScores = (progress.attemptScores || []).concat([score]);
    progress.bestTotal = Math.max(progress.bestTotal, score);
    progress.bestLevel = Math.max(progress.bestLevel, bestLevel);
    saveLocal();
    const entry = {
      name: player.name, grade: player.grade, section: player.section || '',
      total: progress.bestTotal, bestLevel: progress.bestLevel,
      attempts: progress.attemptsUsed, attemptScores: progress.attemptScores.slice(-4),
      correct: attempt.totalCorrect, ts: Date.now(),
    };
    $('sum-sync').textContent = 'Saving best score…';
    const ok = await submitRecord(entry);
    $('sum-sync').textContent = ok
      ? 'Saved. Your score: ' + progress.bestTotal + ' · Tries used: ' + progress.attemptsUsed + '/' + MAX_ATTEMPTS
      : 'Saved on this phone. Score: ' + progress.bestTotal + ' · Tries: ' + progress.attemptsUsed + '/' + MAX_ATTEMPTS;
  }

  function paintSummaryButtons(canNext) {
    const left = MAX_ATTEMPTS - progress.attemptsUsed;
    $('btn-next').style.display = canNext ? '' : 'none';
    $('btn-next').textContent = 'Next Level';
    if (!canNext && left > 0) {
      $('btn-retry').style.display = '';
      $('btn-retry').textContent = MAX_ATTEMPTS === 1 ? 'Start Run (1 try)' : ('Start Attempt ' + (progress.attemptsUsed + 1) + ' of ' + MAX_ATTEMPTS);
    } else {
      $('btn-retry').style.display = 'none';
    }
    $('btn-menu').style.display = '';
    $('btn-menu').textContent = 'Back';
  }

  function fireArrow(vx, vy) {
    if (!run || run.phase !== 'aim' || run.resolved) return;
    const a = archerPos();
    run.arrow = { x: a.x + 18, y: a.y - 28, vx: vx, vy: vy, alive: true, age: 0 };
    run.phase = 'flight';
    run.aim.pulling = false;
    recoil = 1;
    Sound.twang();
  }

  function fireAtTarget(t) {
    const a = archerPos();
    const dx = t.x - (a.x + 18);
    const dy = t.y - (a.y - 28);
    // Lead slightly for moving target
    const dist = Math.hypot(dx, dy) || 1;
    const flight = Math.min(1.1, 0.35 + dist / 700);
    const leadX = t.x + t.vx * flight * 0.55;
    const leadY = t.y + t.vy * flight * 0.35;
    const g = 520;
    const tx = leadX - (a.x + 18);
    const ty = leadY - (a.y - 28);
    // Solve approx: x = vx*t, y = vy*t + 0.5*g*t^2
    const tFlight = Math.max(0.28, Math.min(1.2, Math.hypot(tx, ty) / 520));
    const vx = tx / tFlight;
    const vy = (ty - 0.5 * g * tFlight * tFlight) / tFlight;
    fireArrow(vx, vy);
  }

  function pointerPos(ev) {
    const r = canvas.getBoundingClientRect();
    const src = ev.touches && ev.touches[0] ? ev.touches[0] : (ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0] : ev);
    return {
      x: ((src.clientX - r.left) / r.width) * W,
      y: ((src.clientY - r.top) / r.height) * H,
    };
  }

  function targetAt(x, y) {
    if (!run) return null;
    let best = null, bestD = 1e9;
    for (let i = 0; i < run.targets.length; i++) {
      const t = run.targets[i];
      if (t.hit) continue;
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= t.r * 1.35 && d < bestD) { best = t; bestD = d; }
    }
    return best;
  }

  function onPointerDown(ev) {
    if (!run || run.over || run.phase !== 'aim' || run.resolved) return;
    ev.preventDefault();
    Sound.unlock();
    const p = pointerPos(ev);
    if (tapAim) {
      const t = targetAt(p.x, p.y);
      if (t) { fireAtTarget(t); return; }
    }
    const a = archerPos();
    // Allow pull if near archer or lower half
    if (Math.hypot(p.x - a.x, p.y - a.y) < 110 || p.y > H * 0.55) {
      run.aim.pulling = true;
      run.aim.sx = a.x + 18;
      run.aim.sy = a.y - 28;
      run.aim.cx = p.x;
      run.aim.cy = p.y;
    }
  }
  function onPointerMove(ev) {
    if (!run || !run.aim.pulling) return;
    ev.preventDefault();
    const p = pointerPos(ev);
    run.aim.cx = p.x;
    run.aim.cy = p.y;
  }
  function onPointerUp(ev) {
    if (!run || !run.aim.pulling) return;
    ev.preventDefault();
    const p = pointerPos(ev);
    run.aim.cx = p.x;
    run.aim.cy = p.y;
    const dx = run.aim.sx - run.aim.cx;
    const dy = run.aim.sy - run.aim.cy;
    const pull = Math.hypot(dx, dy);
    run.aim.pulling = false;
    if (pull < 18) return; // cancel
    const power = Math.min(1.35, pull / 90);
    fireArrow(dx * 5.2 * power, dy * 5.2 * power);
  }

  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  canvas.addEventListener('touchend', onPointerUp, { passive: false });
  canvas.addEventListener('touchcancel', onPointerUp, { passive: false });

  $('chk-tap').onchange = function (e) {
    tapAim = !!e.target.checked;
    $('ctrl-hint').textContent = tapAim
      ? 'Tap a target to shoot · or drag near archer to aim'
      : 'Drag near the archer to pull & aim · release to shoot';
  };

  // ---- Visual caches & realistic drawing ----
  function makeOffscreen(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(w * dpr));
    c.height = Math.max(1, Math.floor(h * dpr));
    const cctx = c.getContext('2d');
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas: c, ctx: cctx, w: w, h: h };
  }

  function paintStaticBackground(cctx, w, h) {
    // Warm late-afternoon archery range
    const sky = cctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3a6ea5');
    sky.addColorStop(0.22, '#6aa6d8');
    sky.addColorStop(0.48, '#b7d7ef');
    sky.addColorStop(0.62, '#e8cda0');
    sky.addColorStop(0.78, '#8fbc6a');
    sky.addColorStop(1, '#5a9a45');
    cctx.fillStyle = sky;
    cctx.fillRect(0, 0, w, h);

    // Soft sun glow (static)
    const sunX = w * 0.78, sunY = h * 0.14, sunR = Math.min(42, w * 0.09);
    let g = cctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3.2);
    g.addColorStop(0, 'rgba(255,236,170,.55)');
    g.addColorStop(0.35, 'rgba(255,200,120,.18)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, w, h * 0.55);
    cctx.beginPath();
    g = cctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
    g.addColorStop(0, '#fff8e1');
    g.addColorStop(0.55, '#ffe082');
    g.addColorStop(1, 'rgba(255,183,77,.15)');
    cctx.fillStyle = g;
    cctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    cctx.fill();

    // Distant mountains — atmospheric haze layers
    function mountain(baseY, amp, color, seed) {
      cctx.fillStyle = color;
      cctx.beginPath();
      cctx.moveTo(0, h);
      cctx.lineTo(0, baseY);
      let x = 0;
      while (x <= w) {
        const n = Math.sin(x * 0.011 + seed) * amp + Math.sin(x * 0.027 + seed * 1.7) * amp * 0.45;
        cctx.lineTo(x, baseY - Math.max(8, n));
        x += 18;
      }
      cctx.lineTo(w, h);
      cctx.closePath();
      cctx.fill();
    }
    mountain(h * 0.52, h * 0.11, '#7a92a8', 1.2);
    // haze veil
    cctx.fillStyle = 'rgba(200,220,235,.28)';
    cctx.fillRect(0, h * 0.42, w, h * 0.18);
    mountain(h * 0.56, h * 0.09, '#6b8a6e', 2.8);
    cctx.fillStyle = 'rgba(180,210,190,.22)';
    cctx.fillRect(0, h * 0.48, w, h * 0.14);
    mountain(h * 0.60, h * 0.07, '#4f7a52', 4.1);

    // Tree line — layered silhouettes with a few detailed trunks
    function tree(x, groundY, scale, deep) {
      const trunkH = 28 * scale, trunkW = 5 * scale;
      cctx.fillStyle = deep ? '#3e2723' : '#5d4037';
      cctx.fillRect(x - trunkW * 0.5, groundY - trunkH, trunkW, trunkH);
      const foliage = deep ? '#1b5e20' : '#2e7d32';
      const hi = deep ? '#244a28' : '#43a047';
      [[0.55, 22], [0.78, 17], [1.0, 12]].forEach(function (pair, i) {
        const yy = groundY - trunkH * pair[0] - 6 * scale;
        const rr = pair[1] * scale;
        cctx.beginPath();
        cctx.fillStyle = i % 2 ? hi : foliage;
        cctx.moveTo(x, yy - rr * 1.6);
        cctx.lineTo(x + rr, yy + rr * 0.35);
        cctx.lineTo(x - rr, yy + rr * 0.35);
        cctx.closePath();
        cctx.fill();
      });
    }
    const treeY1 = h * 0.62;
    for (let i = 0; i < 14; i++) {
      tree(w * (0.02 + i * 0.075) + ((i * 17) % 11), treeY1, 0.55 + (i % 3) * 0.12, true);
    }
    const treeY2 = h * 0.66;
    for (let i = 0; i < 10; i++) {
      tree(w * (0.05 + i * 0.1) + ((i * 13) % 9), treeY2, 0.85 + (i % 2) * 0.2, false);
    }

    // Field / grass with texture bands
    const fieldTop = h * 0.68;
    g = cctx.createLinearGradient(0, fieldTop, 0, h);
    g.addColorStop(0, '#7cb342');
    g.addColorStop(0.35, '#66bb6a');
    g.addColorStop(0.7, '#558b2f');
    g.addColorStop(1, '#33691e');
    cctx.fillStyle = g;
    cctx.fillRect(0, fieldTop, w, h - fieldTop);

    // Grass blade texture (cheap hashed strokes)
    cctx.strokeStyle = 'rgba(46,125,50,.35)';
    cctx.lineWidth = 1;
    for (let i = 0; i < 160; i++) {
      const gx = ((i * 97) % w);
      const gy = fieldTop + 8 + ((i * 53) % Math.floor(h - fieldTop - 10));
      const gh = 4 + (i % 5);
      cctx.beginPath();
      cctx.moveTo(gx, gy);
      cctx.lineTo(gx + ((i % 3) - 1) * 2, gy - gh);
      cctx.stroke();
    }
    // Light streaks
    cctx.fillStyle = 'rgba(255,255,200,.06)';
    for (let i = 0; i < 8; i++) {
      cctx.fillRect(0, fieldTop + i * ((h - fieldTop) / 8), w, 3);
    }

    // Wooden range fence / rail
    const fenceY = h * 0.72;
    cctx.strokeStyle = '#6d4c41';
    cctx.lineWidth = 3;
    cctx.beginPath();
    cctx.moveTo(0, fenceY);
    cctx.lineTo(w, fenceY);
    cctx.stroke();
    cctx.lineWidth = 2.2;
    cctx.beginPath();
    cctx.moveTo(0, fenceY + 14);
    cctx.lineTo(w, fenceY + 14);
    cctx.stroke();
    for (let x = 18; x < w; x += 42) {
      cctx.fillStyle = '#5d4037';
      cctx.fillRect(x - 3, fenceY - 6, 6, 28);
      // post highlight
      cctx.fillStyle = 'rgba(255,224,178,.25)';
      cctx.fillRect(x - 2, fenceY - 5, 2, 26);
    }

    // Distant target stands (decorative, far right)
    function stand(sx, sy, sc) {
      cctx.fillStyle = '#4e342e';
      cctx.fillRect(sx - 3 * sc, sy, 6 * sc, 36 * sc);
      cctx.fillRect(sx - 18 * sc, sy + 34 * sc, 36 * sc, 5 * sc);
      // small face
      cctx.beginPath();
      cctx.fillStyle = '#efebe9';
      cctx.arc(sx, sy, 14 * sc, 0, Math.PI * 2);
      cctx.fill();
      cctx.beginPath();
      cctx.fillStyle = '#e53935';
      cctx.arc(sx, sy, 9 * sc, 0, Math.PI * 2);
      cctx.fill();
      cctx.beginPath();
      cctx.fillStyle = '#ffeb3b';
      cctx.arc(sx, sy, 3.5 * sc, 0, Math.PI * 2);
      cctx.fill();
    }
    stand(w * 0.88, h * 0.58, 0.55);
    stand(w * 0.95, h * 0.60, 0.4);

    // Warm ground shadow near archer lane
    g = cctx.createRadialGradient(w * 0.2, h * 0.86, 10, w * 0.2, h * 0.86, w * 0.35);
    g.addColorStop(0, 'rgba(0,0,0,.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cctx.fillStyle = g;
    cctx.fillRect(0, h * 0.7, w * 0.55, h * 0.3);
  }

  function ensureBgCache() {
    const key = W + 'x' + H + '@' + dpr;
    if (bgCache && bgCacheKey === key) return bgCache;
    const off = makeOffscreen(W, H);
    paintStaticBackground(off.ctx, W, H);
    bgCache = off;
    bgCacheKey = key;
    return bgCache;
  }

  function drawClouds() {
    // Soft drifting clouds (animated, cheap)
    const clouds = [
      { x: 0.12, y: 0.08, s: 1.0, sp: 6 },
      { x: 0.45, y: 0.14, s: 1.35, sp: 4.5 },
      { x: 0.72, y: 0.07, s: 0.9, sp: 5.2 },
      { x: 0.28, y: 0.20, s: 0.7, sp: 3.8 },
    ];
    ctx.save();
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      const cx = ((c.x * W + cloudT * c.sp) % (W + 120)) - 60;
      const cy = c.y * H;
      const s = c.s * Math.min(28, W * 0.06);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 1.8, s * 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - s * 0.9, cy + 2, s * 1.1, s * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + s * 1.0, cy + 1, s * 1.2, s * 0.6, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + s * 0.2, cy - s * 0.35, s * 0.9, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSky() {
    const bg = ensureBgCache();
    ctx.drawImage(bg.canvas, 0, 0, W, H);
    drawClouds();
  }

  function ensureTargetRing(r) {
    const rr = Math.ceil(r);
    if (targetRingCache && targetRingR === rr) return targetRingCache;
    const size = rr * 2 + 8;
    const off = makeOffscreen(size, size);
    const c = off.ctx;
    const cx = size / 2, cy = size / 2;
    // Straw boss rim
    c.beginPath();
    c.fillStyle = '#c4a574';
    c.arc(cx, cy, rr + 2, 0, Math.PI * 2);
    c.fill();
    // Twine texture
    c.strokeStyle = 'rgba(93,64,55,.25)';
    c.lineWidth = 1;
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      c.beginPath();
      c.arc(cx, cy, rr + 1, a, a + 0.15);
      c.stroke();
    }
    // Colored rings (FITA-ish: white, black, blue, red, gold)
    const rings = [
      [1.00, '#fafafa'],
      [0.80, '#212121'],
      [0.60, '#1565c0'],
      [0.40, '#c62828'],
      [0.20, '#f9a825'],
    ];
    for (let i = 0; i < rings.length; i++) {
      c.beginPath();
      c.fillStyle = rings[i][1];
      c.arc(cx, cy, rr * rings[i][0], 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,.18)';
      c.lineWidth = 1;
      c.stroke();
    }
    // Soft inner highlight
    const hg = c.createRadialGradient(cx - rr * 0.25, cy - rr * 0.3, 2, cx, cy, rr);
    hg.addColorStop(0, 'rgba(255,255,255,.18)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hg;
    c.beginPath();
    c.arc(cx, cy, rr, 0, Math.PI * 2);
    c.fill();
    targetRingCache = off;
    targetRingR = rr;
    return targetRingCache;
  }

  function drawTarget(t) {
    if (t.hit && t.burst <= 0) return;
    const alpha = t.hit ? Math.max(0, t.burst * 2) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(t.x, t.y);
    const r = t.r;
    if (isBonusQ() && !t.hit) {
      const pulse = 0.35 + 0.2 * Math.sin((run.skyT || 0) * 6);
      ctx.fillStyle = 'rgba(255,213,79,' + pulse + ')';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,235,59,.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Soft drop shadow
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(3, r * 0.85, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wooden stand / stake
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-3, r * 0.55, 6, r * 0.95);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(-14, r * 1.35, 28, 5);
    // Target face from cache
    const ring = ensureTargetRing(r);
    ctx.drawImage(ring.canvas, -r - 4, -r - 4, r * 2 + 8, r * 2 + 8);
    // Number banner below center for phone readability
    const label = String(t.value);
    const fontPx = Math.max(16, Math.floor(r * 0.78));
    ctx.font = 'bold ' + fontPx + 'px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = Math.max(r * 1.15, ctx.measureText(label).width + 14);
    const th = fontPx + 10;
    const by = r * 0.15;
    // Banner plate
    ctx.fillStyle = 'rgba(255,253,245,.94)';
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    const bx = -tw / 2, bTop = by - th / 2;
    ctx.beginPath();
    ctx.moveTo(bx + 6, bTop);
    ctx.lineTo(bx + tw - 6, bTop);
    ctx.quadraticCurveTo(bx + tw, bTop, bx + tw, bTop + 6);
    ctx.lineTo(bx + tw, bTop + th - 6);
    ctx.quadraticCurveTo(bx + tw, bTop + th, bx + tw - 6, bTop + th);
    ctx.lineTo(bx + 6, bTop + th);
    ctx.quadraticCurveTo(bx, bTop + th, bx, bTop + th - 6);
    ctx.lineTo(bx, bTop + 6);
    ctx.quadraticCurveTo(bx, bTop, bx + 6, bTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Number with strong contrast
    ctx.lineWidth = Math.max(3, fontPx * 0.12);
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.fillStyle = '#0b1e33';
    ctx.strokeText(label, 0, by + 1);
    ctx.fillText(label, 0, by + 1);
    ctx.restore();
  }

  function drawRealisticArrow(c, len, ang) {
    // Drawn in local space pointing +X, tip at +len/2
    c.save();
    if (ang != null) c.rotate(ang);
    const half = len * 0.5;
    // Shaft
    const shaft = c.createLinearGradient(-half, 0, half, 0);
    shaft.addColorStop(0, '#6d4c41');
    shaft.addColorStop(0.5, '#a1887f');
    shaft.addColorStop(1, '#8d6e63');
    c.strokeStyle = shaft;
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-half + 4, 0);
    c.lineTo(half - 6, 0);
    c.stroke();
    // Metal tip
    c.fillStyle = '#90a4ae';
    c.beginPath();
    c.moveTo(half, 0);
    c.lineTo(half - 9, -3.5);
    c.lineTo(half - 9, 3.5);
    c.closePath();
    c.fill();
    c.fillStyle = '#cfd8dc';
    c.beginPath();
    c.moveTo(half, 0);
    c.lineTo(half - 9, -1.5);
    c.lineTo(half - 5, 0);
    c.closePath();
    c.fill();
    // Fletching (3 feathers)
    function feather(sign, color) {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(-half + 6, 0);
      c.quadraticCurveTo(-half + 14, sign * 7, -half + 22, sign * 1);
      c.quadraticCurveTo(-half + 14, sign * 3, -half + 8, 0);
      c.closePath();
      c.fill();
    }
    feather(1, '#c62828');
    feather(-1, '#ef6c00');
    feather(0.15, '#fff8e1');
    // Nock
    c.strokeStyle = '#37474f';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(-half + 2, -2.5);
    c.lineTo(-half, 0);
    c.lineTo(-half + 2, 2.5);
    c.stroke();
    c.restore();
  }

  function drawArrow(ar) {
    if (!ar || !ar.alive) return;
    const ang = Math.atan2(ar.vy, ar.vx);
    ctx.save();
    ctx.translate(ar.x, ar.y);
    drawRealisticArrow(ctx, 36, ang);
    ctx.restore();
  }

  function drawArcher(a, pulling, pullX, pullY) {
    const breath = Math.sin(breathT * 2.2) * 1.2;
    // Draw strength 0..1 from pull distance
    let drawAmt = 0;
    let handLX = 22, handLY = -26;
    let aimAng = -0.15;
    if (pulling) {
      const dx = a.x + 18 - pullX;
      const dy = a.y - 28 - pullY;
      drawAmt = Math.min(1, Math.hypot(dx, dy) / 100);
      handLX = pullX - a.x;
      handLY = pullY - a.y;
      aimAng = Math.atan2((a.y - 28) - pullY, (a.x + 18) - pullX);
    } else if (recoil > 0) {
      drawAmt = recoil * 0.15;
      handLX = 20 - recoil * 6;
      handLY = -24 - recoil * 2;
    }

    ctx.save();
    ctx.translate(a.x, a.y);
    // Recoil lean
    ctx.rotate(-recoil * 0.06);
    ctx.translate(0, breath);

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(2, 10, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    const skin = '#e0a878';
    const skinShadow = '#c68642';
    const skinHi = '#f0c9a0';
    const hair = '#3e2723';
    const tunic = '#1e5f8a';
    const tunicDark = '#0d3a5c';
    const tunicHi = '#2e7db5';
    const pants = '#37474f';
    const boot = '#4e342e';

    // --- Legs / boots (side-ish three-quarter facing right) ---
    // Back leg
    ctx.strokeStyle = pants;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 2);
    ctx.quadraticCurveTo(-10, 14, -14, 26);
    ctx.stroke();
    // Front leg
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.quadraticCurveTo(10, 12, 12, 26);
    ctx.stroke();
    // Boots
    ctx.fillStyle = boot;
    ctx.beginPath();
    ctx.ellipse(-14, 28, 9, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, 28, 10, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-20, 26, 10, 3);
    ctx.fillRect(8, 26, 12, 3);

    // --- Torso (tunic) ---
    const torsoG = ctx.createLinearGradient(-16, -40, 16, 6);
    torsoG.addColorStop(0, tunicHi);
    torsoG.addColorStop(0.45, tunic);
    torsoG.addColorStop(1, tunicDark);
    ctx.fillStyle = torsoG;
    ctx.beginPath();
    ctx.moveTo(-11, -38);
    ctx.quadraticCurveTo(-16, -20, -14, 2);
    ctx.quadraticCurveTo(-4, 8, 6, 4);
    ctx.quadraticCurveTo(15, -8, 13, -36);
    ctx.quadraticCurveTo(4, -44, -11, -38);
    ctx.closePath();
    ctx.fill();
    // Belt
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-13, -2, 26, 5);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-2, -1, 5, 4);

    // --- Quiver on back ---
    ctx.save();
    ctx.translate(-16, -30);
    ctx.rotate(-0.35);
    const qg = ctx.createLinearGradient(0, 0, 14, 0);
    qg.addColorStop(0, '#5d4037');
    qg.addColorStop(0.5, '#8d6e63');
    qg.addColorStop(1, '#4e342e');
    ctx.fillStyle = qg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 2);
    ctx.lineTo(10, 34);
    ctx.lineTo(2, 32);
    ctx.closePath();
    ctx.fill();
    // Strap
    ctx.strokeStyle = '#6d4c41';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(22, -18);
    ctx.stroke();
    // Arrows in quiver
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = '#a1887f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(3 + i * 3, 2);
      ctx.lineTo(4 + i * 3, -12 - i);
      ctx.stroke();
      ctx.fillStyle = i === 1 ? '#c62828' : '#ef6c00';
      ctx.beginPath();
      ctx.moveTo(4 + i * 3, -12 - i);
      ctx.lineTo(1 + i * 3, -8 - i);
      ctx.lineTo(7 + i * 3, -8 - i);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // --- Head ---
    ctx.save();
    ctx.translate(2, -50 + breath * 0.3);
    // Neck
    ctx.fillStyle = skinShadow;
    ctx.fillRect(-4, 8, 8, 10);
    // Face
    const headG = ctx.createRadialGradient(-2, -2, 2, 0, 2, 14);
    headG.addColorStop(0, skinHi);
    headG.addColorStop(0.7, skin);
    headG.addColorStop(1, skinShadow);
    ctx.fillStyle = headG;
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair / short crop
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(0, -4, 12, 8, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-8, 0, 5, 0, Math.PI * 2);
    ctx.arc(8, -1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Ear
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(-11, 2, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye (looking right toward targets)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(4, 0, 3.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(5, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();
    // Brow / nose / mouth subtle
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(1, -4);
    ctx.lineTo(7, -3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(8, 5);
    ctx.stroke();
    ctx.strokeStyle = '#a1887f';
    ctx.beginPath();
    ctx.moveTo(3, 9);
    ctx.quadraticCurveTo(6, 11, 9, 9);
    ctx.stroke();
    ctx.restore();

    // --- Bow (recurve) with bending limbs ---
    // Grip at ~ (20, -28); limbs arc more as drawAmt increases
    const gripX = 20, gripY = -28;
    const bend = 10 + drawAmt * 16; // extra limb curve when drawn
    const tipSpread = 30 + drawAmt * 4;
    // Upper limb tip / lower limb tip in local space
    const tipUX = gripX - bend * 0.15;
    const tipUY = gripY - tipSpread;
    const tipLX = gripX - bend * 0.15;
    const tipLY = gripY + tipSpread;

    // Bow limbs path (recurve S-curve)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Wood thickness via dual stroke
    function strokeLimb(width, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(tipUX, tipUY);
      ctx.bezierCurveTo(
        gripX + 18 + bend * 0.4, gripY - 16,
        gripX + 18 + bend * 0.4, gripY + 16,
        tipLX, tipLY
      );
      ctx.stroke();
    }
    strokeLimb(7, '#4e342e');
    strokeLimb(4.5, '#8d6e63');
    strokeLimb(2, '#d7ccc8');
    // Grip wrap
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(gripX - 3, gripY - 8, 7, 16);
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(gripX - 2, gripY - 6, 2, 12);

    // String — pulled back to drawing hand
    const strX = pulling || recoil > 0.05 ? handLX : gripX;
    const strY = pulling || recoil > 0.05 ? handLY : gripY;
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tipUX, tipUY);
    ctx.lineTo(strX, strY);
    ctx.lineTo(tipLX, tipLY);
    ctx.stroke();
    // String snap highlight on release
    if (recoil > 0.4) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (recoil * 0.5) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tipUX, tipUY);
      ctx.lineTo(gripX - 2, gripY);
      ctx.lineTo(tipLX, tipLY);
      ctx.stroke();
    }

    // Nocked arrow on string while aiming
    if (run && run.phase === 'aim') {
      const arrowLen = 34 + drawAmt * 4;
      let ang = -0.12;
      if (pulling) ang = Math.atan2((a.y - 28) - pullY, (a.x + 18) - pullX);
      ctx.save();
      ctx.translate(strX, strY);
      ctx.rotate(ang);
      ctx.translate(arrowLen * 0.35, 0);
      drawRealisticArrow(ctx, arrowLen, 0);
      ctx.restore();
    }
    ctx.restore(); // bow stroke state

    // --- Arms ---
    // Bow arm (front, extended toward grip)
    ctx.strokeStyle = skin;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6, -32);
    ctx.quadraticCurveTo(12, -30, gripX - 2, gripY);
    ctx.stroke();
    // Arm guard
    ctx.fillStyle = '#6d4c41';
    ctx.save();
    ctx.translate(gripX - 8, gripY - 2);
    ctx.rotate(0.2);
    ctx.fillRect(0, -4, 14, 8);
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(1, -3, 3, 6);
    ctx.restore();
    // Bow hand
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(gripX, gripY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Drawing arm (pulls back)
    ctx.strokeStyle = skin;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(2, -34);
    ctx.quadraticCurveTo(
      (2 + handLX) * 0.45 - 6,
      ( -34 + handLY) * 0.5,
      handLX, handLY
    );
    ctx.stroke();
    // Glove
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(handLX, handLY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skinHi;
    ctx.beginPath();
    ctx.arc(handLX + 2, handLY - 1, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // archer root
  }

  function drawTrajectory(sx, sy, vx, vy) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    let x = sx, y = sy, pvx = vx, pvy = vy;
    const g = 520;
    const dt = 0.045;
    for (let i = 0; i < 26; i++) {
      pvy += g * dt;
      x += pvx * dt;
      y += pvy * dt;
      const r = Math.max(1.2, 3.2 - i * 0.08);
      ctx.globalAlpha = Math.max(0.15, 0.75 - i * 0.025);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (y > H || x < -20 || x > W + 20) break;
    }
    ctx.restore();
  }

  function draw() {
    if (!run) return;
    ctx.save();
    if (shakeT > 0) {
      ctx.translate((Math.random() - 0.5) * 8 * shakeT, (Math.random() - 0.5) * 8 * shakeT);
    }
    drawSky();
    // targets
    for (let i = 0; i < run.targets.length; i++) drawTarget(run.targets[i]);
    // particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = Math.max(0, p.t * 2);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const a = archerPos();
    if (run.aim.pulling) {
      const dx = run.aim.sx - run.aim.cx;
      const dy = run.aim.sy - run.aim.cy;
      const pull = Math.hypot(dx, dy);
      const power = Math.min(1.35, pull / 90);
      drawTrajectory(run.aim.sx, run.aim.sy, dx * 5.2 * power, dy * 5.2 * power);
      drawArcher(a, true, run.aim.cx, run.aim.cy);
    } else {
      drawArcher(a, false, 0, 0);
    }
    drawArrow(run.arrow);
    if (run.flash) {
      ctx.fillStyle = run.flash.kind === 'ok'
        ? 'rgba(76,175,80,' + Math.min(0.35, run.flash.t) + ')'
        : 'rgba(244,67,54,' + Math.min(0.35, run.flash.t) + ')';
      ctx.fillRect(0, 0, W, H);
      if (run.flash.kind === 'ok' && run.flash.gained) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('+' + run.flash.gained, W / 2, H * 0.4);
        if (run.flash.bonusLife) {
          ctx.fillStyle = '#ffd54f';
          ctx.font = 'bold 26px system-ui';
          ctx.fillText('+1 ❤', W / 2, H * 0.4 + 34);
        }
      }
    }
    ctx.restore();
  }

  function loop(ts) {
    if (!run || run.over) return;
    if (!run.lastTs) run.lastTs = ts;
    let dt = Math.min(0.05, (ts - run.lastTs) / 1000);
    run.lastTs = ts;
    run.skyT += dt;
    breathT += dt;
    cloudT += dt;
    if (recoil > 0) recoil = Math.max(0, recoil - dt * 3.2);
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);

    // move targets
    const err = 0.35 + run.level * 0.12;
    for (let i = 0; i < run.targets.length; i++) {
      const t = run.targets[i];
      if (t.hit) {
        t.burst -= dt;
        continue;
      }
      t.phase += dt * t.wob;
      t.x += t.vx * dt;
      t.y += t.vy * dt + Math.sin(t.phase) * 18 * dt;
      // bounce in sky box
      const minX = t.r + 8, maxX = W - t.r - 8;
      const minY = H * 0.1 + t.r, maxY = H * 0.55;
      if (t.x < minX) { t.x = minX; t.vx = Math.abs(t.vx); }
      if (t.x > maxX) { t.x = maxX; t.vx = -Math.abs(t.vx); }
      if (t.y < minY) { t.y = minY; t.vy = Math.abs(t.vy); }
      if (t.y > maxY) { t.y = maxY; t.vy = -Math.abs(t.vy); }
      // erratic nudge
      if (Math.random() < err * dt) {
        t.vx += (Math.random() - 0.5) * 60;
        t.vy += (Math.random() - 0.5) * 40;
        const sp = Math.hypot(t.vx, t.vy);
        const maxSp = 40 + run.level * 28;
        if (sp > maxSp) { t.vx *= maxSp / sp; t.vy *= maxSp / sp; }
      }
    }

    // arrow physics
    if (run.arrow && run.arrow.alive && run.phase === 'flight') {
      const ar = run.arrow;
      ar.vy += 520 * dt;
      ar.x += ar.vx * dt;
      ar.y += ar.vy * dt;
      ar.age += dt;
      // collide with targets — hit the target the arrow actually touches
      let hit = null;
      for (let i = 0; i < run.targets.length; i++) {
        const t = run.targets[i];
        if (t.hit) continue;
        if (Math.hypot(ar.x - t.x, ar.y - t.y) <= t.r * 0.92) {
          hit = t;
          break;
        }
      }
      if (hit) {
        ar.alive = false;
        resolveHit(hit);
      } else if (ar.y > H + 40 || ar.x < -60 || ar.x > W + 60 || ar.age > 2.8) {
        ar.alive = false;
        resolveMiss();
      }
    }

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      if (p.t <= 0) particles.splice(i, 1);
    }

    if (run.flash) {
      run.flash.t -= dt;
      if (run.flash.t <= 0) {
        run.flash = null;
        if (run.resolved && !run.over) advanceQuestion();
      }
    } else if (!run.resolved && run.phase === 'aim') {
      run.itemT -= dt;
      if (run.itemT <= 0) {
        run.itemT = 0;
        resolveMiss(); // time up — no answer reveal
      }
      updateHud();
    }

    draw();
    raf = requestAnimationFrame(loop);
  }

  function paintLobby() {
    $('levels-wrap').style.display = '';
    const left = MAX_ATTEMPTS - progress.attemptsUsed;
    $('player-label').textContent =
      player.name + ' · G' + player.grade +
      (player.section ? ' · ' + player.section : '') +
      ' · Best: ' + progress.bestTotal;
    const box = $('level-btns');
    box.innerHTML = '';
    if (left <= 0) {
      const msg = document.createElement('div');
      msg.className = 'no-tries';
      msg.innerHTML =
        '<strong>No tries left</strong><br>Your score: <b>' + progress.bestTotal + '</b>' +
        (progress.bestLevel ? ' (reached L' + progress.bestLevel + ')' : '') +
        '<br><span class="note" style="opacity:1;color:#b71c1c">That score is on the leaderboard.</span>';
      box.appendChild(msg);
      return;
    }
    const b = document.createElement('button');
    b.className = 'lvl';
    b.textContent = MAX_ATTEMPTS === 1 ? 'Start Run (1 try)' : ('Start Attempt ' + (progress.attemptsUsed + 1) + ' of ' + MAX_ATTEMPTS);
    b.onclick = function () { startAttempt(); };
    box.appendChild(b);
    const hint = document.createElement('p');
    hint.className = 'note';
    hint.textContent = '1 try only · Levels 1→5 (fresh lives each level) · Leaderboard saves your best.';
    box.appendChild(hint);
  }

  $('btn-play').onclick = async function () {
    const name = $('inp-name').value.trim();
    const grade = $('inp-grade').value;
    const section = $('inp-section').value.trim();
    if (!name || !grade || !section) {
      alert('Select Grade, Section, and your Name from the list.');
      return;
    }
    const ok = learners.some(function (x) {
      return x.n === name && gradeNum(x.g) === grade && x.s === section;
    });
    if (!ok) { alert('Name not on the class list.'); return; }
    player = { name: name, grade: grade, section: section };
    localStorage.setItem('ia-name', name);
    localStorage.setItem('ia-grade', grade);
    localStorage.setItem('ia-section', section);
    progress = blankProgress();
    loadLocal();
    $('btn-play').disabled = true;
    $('btn-play').textContent = 'Checking tries…';
    const rec = await fetchRemoteRecord();
    mergeRemote(rec);
    $('btn-play').disabled = false;
    $('btn-play').textContent = 'Continue';
    paintLobby();
  };

  $('btn-go-board').onclick = async function () {
    show('board');
    $('board-body').innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    renderBoard(await fetchBoard(), $('board-filter').value);
  };
  $('board-filter').onchange = async function () {
    renderBoard(await fetchBoard(), $('board-filter').value);
  };
  $('btn-board-back').onclick = function () { show('start'); };
  $('btn-next').onclick = function () {
    if (attempt && attempt.active && run) startLevel(run.level + 1);
  };
  $('btn-retry').onclick = function () { startAttempt(); };
  $('btn-menu').onclick = function () {
    if (run && !run.over && attempt && attempt.active) {
      run.over = true;
      cancelAnimationFrame(raf);
      attempt.score += run.score;
      finishAttempt().then(function () { show('start'); paintLobby(); });
      return;
    }
    show('start');
    paintLobby();
  };

  window.__IA_TEST__ = {
    DEMO: DEMO,
    ITEM_SEC: ITEM_SEC,
    MAX_ATTEMPTS: MAX_ATTEMPTS,
    LEVELS: LEVELS,
    ITEMS: ITEMS,
    getRun: function () { return run; },
    getAttempt: function () { return attempt; },
    getProgress: function () { return progress; },
    archerPos: archerPos,
    fireAtTarget: fireAtTarget,
    fireArrow: fireArrow,
    targetAt: targetAt,
    resolveHit: resolveHit,
    pickBonusIndices: pickBonusIndices,
    isBonusQ: isBonusQ,
    MAX_LIVES: MAX_LIVES,
    spawnTargets: spawnTargets,
    forceDemoStart: function (level) {
      player = player.name ? player : { name: 'Demo Archer', grade: '11', section: 'TEST' };
      attempt = { num: 1, score: 0, unlocked: LEVELS, bestLevel: 0, totalCorrect: 0, active: true };
      Sound.unlock();
      startLevel(level || 1);
    },
  };

  if (DEMO) {
    $('load-status').textContent = 'Demo mode — scores not saved.';
    let kicked = false;
    const kick = function () {
      if (kicked) return;
      kicked = true;
      try { window.__IA_TEST__.forceDemoStart(1); } catch (e) {}
    };
    const waitLearners = setInterval(function () {
      if (learners && learners.length) { clearInterval(waitLearners); kick(); }
    }, 200);
    setTimeout(function () { clearInterval(waitLearners); kick(); }, 4000);
  }

  loadLearners();
  Sound.paintBtn();
  const btnSound = $('btn-sound');
  if (btnSound) btnSound.onclick = function () { Sound.toggle(); };
  function onViewportChange() {
    if (screens.game.classList.contains('active')) resize();
  }
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('orientationchange', function () { setTimeout(onViewportChange, 120); });
  show('start');
})();
