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
    return { unlock, toggle, setEnabled, paintBtn, ding, buzz, twang, levelUp, startMusic, stopMusic, setLevel };
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
        r: Math.max(22, Math.min(34, W * 0.055)),
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

  function startLevel(level) {
    if (!attempt || !attempt.active) { alert('Start an attempt first.'); return; }
    Sound.setLevel(level);
    if (level > 1) Sound.levelUp();
    const questions = IRQuestions.generateLevel(level, ITEMS);
    run = {
      level: level,
      questions: questions,
      qIndex: 0,
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
  }

  function updateHud() {
    if (!run) return;
    $('hud-attempt').textContent = MAX_ATTEMPTS === 1 ? '1 try only' : ('Attempt ' + (attempt ? attempt.num : '?') + ' of ' + MAX_ATTEMPTS);
    $('hud-level').textContent = 'L' + run.level;
    $('hud-q').textContent = (run.qIndex + 1) + '/' + ITEMS;
    $('hud-score').textContent = String((attempt ? attempt.score : 0) + run.score);
    $('hud-lives').textContent = '❤'.repeat(run.lives) + '♡'.repeat(Math.max(0, LIVES - run.lives));
    const q = run.questions[run.qIndex];
    $('hud-prompt').textContent = q ? q.prompt : '';
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
      run.flash = { kind: 'ok', t: 0.55, gained: gained };
      burstAt(target.x, target.y, true);
      Sound.ding();
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

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#4fc3f7');
    g.addColorStop(0.45, '#81d4fa');
    g.addColorStop(0.7, '#a5d6a7');
    g.addColorStop(1, '#66bb6a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // sun
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,236,160,.9)';
    ctx.arc(W * 0.82, H * 0.12, Math.min(36, W * 0.08), 0, Math.PI * 2);
    ctx.fill();
    // hills
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72);
    ctx.quadraticCurveTo(W * 0.25, H * 0.62, W * 0.5, H * 0.7);
    ctx.quadraticCurveTo(W * 0.75, H * 0.78, W, H * 0.68);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.82);
    ctx.quadraticCurveTo(W * 0.4, H * 0.74, W, H * 0.8);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }

  function drawArcher(a, pulling, pullX, pullY) {
    ctx.save();
    ctx.translate(a.x, a.y);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.ellipse(0, 8, 28, 8, 0, 0, Math.PI * 2); ctx.fill();
    // legs
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-12, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(10, 22); ctx.stroke();
    // body
    ctx.fillStyle = '#1565c0';
    ctx.beginPath();
    ctx.moveTo(-6, -36); ctx.lineTo(6, -36); ctx.quadraticCurveTo(14, -36, 14, -28);
    ctx.lineTo(14, -4); ctx.quadraticCurveTo(14, 4, 6, 4); ctx.lineTo(-6, 4);
    ctx.quadraticCurveTo(-14, 4, -14, -4); ctx.lineTo(-14, -28); ctx.quadraticCurveTo(-14, -36, -6, -36);
    ctx.closePath(); ctx.fill();
    // head
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath(); ctx.arc(0, -48, 12, 0, Math.PI * 2); ctx.fill();
    // hood / hat
    ctx.fillStyle = '#0d47a1';
    ctx.beginPath(); ctx.moveTo(-14, -50); ctx.lineTo(0, -68); ctx.lineTo(14, -50); ctx.closePath(); ctx.fill();
    // bow
    const handX = pulling ? (pullX - a.x) : 22;
    const handY = pulling ? (pullY - a.y) : -20;
    ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(18, -24, 26, -1.1, 1.1);
    ctx.stroke();
    // string
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, -24 - 26);
    if (pulling) ctx.lineTo(handX, handY);
    else ctx.lineTo(18, -24);
    ctx.lineTo(18, -24 + 26);
    ctx.stroke();
    // quiver
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(-20, -28, 8, 22);
    ctx.restore();
  }

  function drawTrajectory(sx, sy, vx, vy) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    let x = sx, y = sy, pvx = vx, pvy = vy;
    const g = 520;
    const dt = 0.04;
    ctx.moveTo(x, y);
    for (let i = 0; i < 28; i++) {
      pvy += g * dt;
      x += pvx * dt;
      y += pvy * dt;
      ctx.lineTo(x, y);
      if (y > H || x < -20 || x > W + 20) break;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawTarget(t) {
    if (t.hit && t.burst <= 0) return;
    const alpha = t.hit ? Math.max(0, t.burst * 2) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(t.x, t.y);
    // balloon string / board back
    const r = t.r;
    // outer ring
    ctx.beginPath();
    ctx.fillStyle = '#fff8e1';
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3;
    ctx.stroke();
    // rings
    [[0.75, '#e53935'], [0.5, '#fff'], [0.28, '#e53935'], [0.12, '#f5c518']].forEach(function (ring) {
      ctx.beginPath();
      ctx.fillStyle = ring[1];
      ctx.arc(0, 0, r * ring[0], 0, Math.PI * 2);
      ctx.fill();
    });
    // number
    ctx.fillStyle = '#0b1e33';
    ctx.font = 'bold ' + Math.floor(r * 0.72) + 'px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = String(t.value);
    // slight outline
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.strokeText(label, 0, 1);
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }

  function drawArrow(ar) {
    if (!ar || !ar.alive) return;
    const ang = Math.atan2(ar.vy, ar.vx);
    ctx.save();
    ctx.translate(ar.x, ar.y);
    ctx.rotate(ang);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-14, -1.5, 22, 3);
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(2, -5); ctx.lineTo(2, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-20, -4); ctx.lineTo(-18, 0); ctx.lineTo(-20, 4); ctx.closePath(); ctx.fill();
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
    const kick = function () {
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
