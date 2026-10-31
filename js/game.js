'use strict';
/* BEY BATTLE: METAL FURY - retro pixel PvP spinning-top game. */
(() => {
  const W = 320, H = 240, CX = 160, CY = 137, R = 88;
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const FONT = '"Press Start 2P", monospace';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const THEME = Object.freeze(forcedColors.matches ? {
    ink: '#000000', panel: '#000000', panel2: '#101010', edge: '#ffffff', hi: '#ffffff',
    text: '#ffffff', muted: '#d8d8d8', gold: '#ffff00', cyan: '#00ffff', red: '#ff4060',
    green: '#66ff66', p1: '#80c0ff', p2: '#ff9090', shade: '#000000', glass: '#000000ee',
  } : {
    ink: '#05050f', panel: '#10102c', panel2: '#1a1740', edge: '#494680', hi: '#7772b8',
    text: '#f5f3ff', muted: '#8f8db5', gold: '#ffd400', cyan: '#19d3ff', red: '#ff3b3b',
    green: '#3ddc6a', p1: '#6f9bff', p2: '#ff7a7a', shade: '#080818', glass: '#09091ddd',
  });
  let G = ctx; // current draw target (swapped when caching layers)

  /* ---------------- helpers ---------------- */
  const testMode = globalThis.BEY_BATTLE_TEST === true;
  const requestedSeed = testMode && Number.isFinite(Number(globalThis.BEY_BATTLE_SEED))
    ? Number(globalThis.BEY_BATTLE_SEED) >>> 0
    : BeyRandom.systemSeed();
  let randomStreams = BeyRandom.createStreams(requestedSeed);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (stream, a, b) => a + stream() * (b - a);
  const pick = (stream, a) => a[Math.floor(stream() * a.length)];
  const angDiff = (a, b) => {
    let d = (a - b) % TAU;
    if (d < -Math.PI) d += TAU;
    if (d > Math.PI) d -= TAU;
    return Math.abs(d);
  };
  const shuffle = (stream, arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(stream() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  function mulberry(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rect(x, y, w, h, c) { G.fillStyle = c; G.fillRect(Math.round(x), Math.round(y), w, h); }
  function disc(x, y, r, c) {
    G.fillStyle = c; x = Math.round(x); y = Math.round(y); r = Math.round(r);
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy + r * 0.6)));
      G.fillRect(x - w, y + dy, w * 2 + 1, 1);
    }
  }
  function circ(x, y, r, c) {
    G.fillStyle = c;
    const n = Math.max(16, Math.floor(r * 6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      G.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
    }
  }
  function txt(s, x, y, col = '#fff', size = 8, align = 'left', sh = '#000') {
    G.font = size + 'px ' + FONT; G.textAlign = align; G.textBaseline = 'top';
    if (sh) {
      G.fillStyle = sh;
      const o = size >= 16 ? 2 : 1;
      G.fillText(s, x + o, y + o);
      if (size >= 16) { G.fillText(s, x - 1, y); G.fillText(s, x + 1, y - 1); }
    }
    G.fillStyle = col; G.fillText(s, x, y);
  }
  function wrapTxt(s, x, y, maxW, col, size = 8, lh = 10) {
    G.font = size + 'px ' + FONT;
    let line = '', yy = y;
    for (const w of s.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (G.measureText(t).width > maxW && line) { txt(line, x, yy, col, size); line = w; yy += lh; }
      else line = t;
    }
    if (line) txt(line, x, yy, col, size);
    return yy + lh;
  }
  const blink = (rate = 3) => reducedMotion.matches || Math.floor(S.t * rate) % 2 === 0;
  const motionOK = () => !reducedMotion.matches;
  const effectsHigh = () => S.visual.effects === 'ALT';

  function bevelPanel(x, y, w, h, o = {}) {
    const edge = o.edge || THEME.edge, fill = o.fill || THEME.panel;
    rect(x, y, w, h, THEME.ink);
    rect(x + 1, y + 1, w - 2, h - 2, edge);
    rect(x + 2, y + 2, w - 4, h - 4, fill);
    rect(x + 2, y + 2, w - 4, 1, o.hi || THEME.hi);
    rect(x + 2, y + h - 3, w - 4, 1, o.low || THEME.shade);
    if (o.accent) rect(x + 2, y + 2, 3, h - 4, o.accent);
  }
  function screenHeader(title, sub = '', col = THEME.gold) {
    rect(0, 0, W, 25, THEME.glass);
    rect(0, 24, W, 1, col);
    txt(title, 10, 7, col, 8);
    if (sub) txt(sub, W - 10, 8, THEME.muted, 7, 'right');
  }
  function actionFooter(primary, secondary = '') {
    rect(0, H - 19, W, 19, THEME.glass);
    rect(0, H - 19, W, 1, THEME.edge);
    txt(primary, 9, H - 12, blink(2) ? THEME.text : THEME.gold, 7);
    if (secondary) txt(secondary, W - 9, H - 12, THEME.muted, 7, 'right');
  }
  function badge(label, x, y, col = THEME.cyan, align = 'left') {
    G.font = '7px ' + FONT;
    const w = Math.ceil(G.measureText(label).width) + 10;
    const bx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    rect(bx, y, w, 12, THEME.ink); rect(bx + 1, y + 1, w - 2, 10, col);
    rect(bx + 2, y + 2, w - 4, 8, THEME.shade);
    txt(label, bx + w / 2, y + 3, col, 7, 'center', null);
    return w;
  }
  function segmentedMeter(x, y, w, h, value, col, segments = 10, reverse = false) {
    const gap = 1, segW = (w - gap * (segments - 1)) / segments;
    rect(x - 1, y - 1, w + 2, h + 2, THEME.ink);
    for (let i = 0; i < segments; i++) {
      const lit = (i + 1) / segments <= clamp(value, 0, 1) + 0.001;
      const sx = reverse ? x + w - segW - i * (segW + gap) : x + i * (segW + gap);
      rect(sx, y, Math.ceil(segW), h, lit ? col : '#252544');
      if (lit && h > 3) rect(sx, y, Math.ceil(segW), 1, '#ffffff66');
    }
  }
  function cursorSelect(x, y, w, h, col = THEME.gold) {
    const d = motionOK() && !blink(5) ? 1 : 0;
    rect(x - d, y - d, 7, 2, col); rect(x - d, y - d, 2, 7, col);
    rect(x + w - 7 + d, y - d, 7, 2, col); rect(x + w - 2 + d, y - d, 2, 7, col);
    rect(x - d, y + h - 2 + d, 7, 2, col); rect(x - d, y + h - 7 + d, 2, 7, col);
    rect(x + w - 7 + d, y + h - 2 + d, 7, 2, col); rect(x + w - 2 + d, y + h - 7 + d, 2, 7, col);
  }
  function separator(y, col = THEME.edge) { rect(10, y, W - 20, 1, col); rect(CX - 2, y - 1, 4, 3, col); }
  function markRune(x, y, seed, col) {
    const flip = seed % 2 ? -1 : 1;
    rect(x - 1, y - 3, 2, 7, col);
    rect(x + (flip < 0 ? -3 : 0), y - 2, 4, 1, col);
    rect(x + (flip < 0 ? -2 : 0), y, 3, 1, col);
  }

  /* ---------------- input ---------------- */
  const keys = {}, pressed = {};
  const BLOCK = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter'];
  addEventListener('keydown', (e) => {
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
    Sound.init();
    if (BLOCK.includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  cv.addEventListener('pointerdown', () => { Sound.init(); cv.focus(); });
  const any = (...c) => c.some((k) => pressed[k]);
  const held = (...c) => c.some((k) => keys[k]);
  const UP = () => any('ArrowUp', 'KeyW');
  const DOWN = () => any('ArrowDown', 'KeyS');
  const LEFT = () => any('ArrowLeft', 'KeyA');
  const RIGHT = () => any('ArrowRight', 'KeyD');
  const OK = () => any('Enter', 'Space', 'NumpadEnter');
  const BACK = () => any('Escape', 'Backspace');

  /* ---------------- state ---------------- */
  const S = {
    scene: 'title', t: 0, menu: 0, mode: 'tour', picks: [], cursor: 0, stIdx: 0,
    match: null, tour: null, next: null, result: null,
    parts: [], floats: [], rings: [], shake: 0, flash: 0, paused: false, pauseIdx: 0, newUnlock: false,
    visual: { effects: 'ALT', shake: true },
  };
  let ragoUnlocked = false;
  try { ragoUnlocked = localStorage.getItem('beyfury_rago') === '1'; } catch (e) { /* private mode */ }
  const roster = () => BLADERS.filter((b) => !b.boss || ragoUnlocked);
  const stageList = () => STADIUMS.filter((s) => !s.boss || ragoUnlocked);

  const MUSIC = { title: 'menu', options: 'menu', controls: 'menu', select: 'menu', stage: 'menu', bracket: 'menu', vs: null, result: null, champion: null };
  function go(scene) {
    S.scene = scene; S.t = 0; S.menu = 0;
    if (scene in MUSIC) Sound.music(MUSIC[scene]);
  }

  /* ---------------- effects ---------------- */
  function spark(x, y, n, cols, sp = 80, big = false) {
    const visual = randomStreams.visual;
    for (let i = 0; i < n; i++) {
      const a = rnd(visual, 0, TAU), v = rnd(visual, sp * 0.3, sp);
      S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(visual, 0.2, 0.7), c: pick(visual, cols), s: big && visual() < 0.5 ? 2 : 1 });
    }
  }
  function floatText(text, x, y, c = '#fff', life = 0.8) { S.floats.push({ text, x, y, c, life, t: 0 }); }
  function updFx(dt) {
    for (const p of S.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; }
    S.parts = S.parts.filter((p) => p.life > 0);
    for (const f of S.floats) { f.t += dt; f.y -= 18 * dt; }
    S.floats = S.floats.filter((f) => f.t < f.life);
    for (const r of S.rings) { r.r += 220 * dt; }
    S.rings = S.rings.filter((r) => r.r < 140);
    S.shake = Math.max(0, S.shake - dt * 12);
    S.flash = Math.max(0, S.flash - dt);
  }
  function drawFx() {
    for (const r of S.rings) circ(r.x, r.y, r.r, r.c);
    for (const p of S.parts) rect(p.x, p.y, p.s, p.s, p.c);
    for (const f of S.floats) txt(f.text, f.x, f.y, f.c, 8, 'center');
  }

  /* ---------------- pixel portraits ---------------- */
  const faceCache = {};
  function face(ch) {
    if (faceCache[ch.id]) return faceCache[ch.id];
    const c = document.createElement('canvas'); c.width = 12; c.height = 12;
    const g = c.getContext('2d');
    const map = {
      h: ch.hair, s: ch.skin, e: ch.eye || '#141428', m: '#8a3a3a',
      c: ch.cloth, k: ch.clothK, a: ch.accent, d: '#141428', w: '#ffffff',
    };
    BeyVisuals.getPortrait(ch.id).forEach((row, y) => {
      [...row].forEach((p, x) => { if (map[p]) { g.fillStyle = map[p]; g.fillRect(x, y, 1, 1); } });
    });
    faceCache[ch.id] = c;
    return c;
  }
  function drawFace(ch, x, y, s, flip = false) {
    const f = face(ch);
    G.save();
    if (flip) { G.translate(Math.round(x) + 12 * s, Math.round(y)); G.scale(-1, 1); G.drawImage(f, 0, 0, 12 * s, 12 * s); }
    else G.drawImage(f, Math.round(x), Math.round(y), 12 * s, 12 * s);
    G.restore();
  }
  function framedFace(ch, x, y, s, flip, border = ch.color) {
    rect(x - 2, y - 2, 12 * s + 4, 12 * s + 4, '#000');
    rect(x - 1, y - 1, 12 * s + 2, 12 * s + 2, border);
    rect(x, y, 12 * s, 12 * s, '#1a1a3a');
    drawFace(ch, x, y, s, flip);
  }

  /* ---------------- bey sprite ---------------- */
  function beyDot(x, y, a, rr, size, color) {
    rect(x + Math.cos(a) * rr - size / 2, y + Math.sin(a) * rr - size / 2, size, size, color);
  }
  function beyArm(x, y, a, from, to, width, color, curve = 0) {
    for (let rr = from; rr <= to; rr += 1) {
      const bend = curve * (rr - from) / Math.max(1, to - from);
      beyDot(x, y, a + bend, rr, width, color);
    }
  }
  function paintBeyLayer(profile, x, y, angle, r, color, accent, detailed) {
    const inner = r * profile.inner;
    const blade = Math.max(1, detailed ? 3 : 2);
    disc(x, y, Math.max(2, inner), color);
    if (profile.shape === 'pegasus-wings') {
      for (let i = 0; i < 3; i++) {
        const a = angle + i * TAU / 3;
        beyArm(x, y, a, inner * 0.75, r * 0.88, blade, color, 0.34);
        beyArm(x, y, a + 0.3, r * 0.56, r * 0.78, Math.max(1, blade - 1), accent, 0.18);
        beyDot(x, y, a + 0.35, r * 0.9, blade, color);
      }
    } else if (profile.shape === 'leone-mane') {
      for (let i = 0; i < 5; i++) {
        const a = angle + i * TAU / 5;
        disc(x + Math.cos(a) * r * 0.68, y + Math.sin(a) * r * 0.68, r * 0.29, color);
        beyDot(x, y, a - 0.16, r * 0.92, blade, accent);
        beyDot(x, y, a + 0.16, r * 0.83, Math.max(1, blade - 1), color);
      }
    } else if (profile.shape === 'ldrago-reverse-claws') {
      for (let i = 0; i < 3; i++) {
        const a = angle - i * TAU / 3;
        beyArm(x, y, a, inner * 0.7, r * 0.84, blade, color, -0.48);
        beyArm(x, y, a - 0.42, r * 0.64, r * 0.96, Math.max(1, blade - 1), accent, -0.18);
        beyDot(x, y, a - 0.58, r * 0.93, blade, color);
      }
    } else if (profile.shape === 'sagittario-arrows') {
      for (let i = 0; i < 4; i++) {
        const a = angle + i * TAU / 4;
        beyArm(x, y, a, inner * 0.7, r * 0.82, Math.max(1, blade - 1), color);
        beyDot(x, y, a, r * 0.94, blade + 1, color);
        beyDot(x, y, a + 0.2, r * 0.78, blade, accent);
      }
    } else if (profile.shape === 'orion-orbit') {
      disc(x, y, r * 0.96, color);
      disc(x, y, r * 0.72, accent);
      for (let i = 0; i < 2; i++) beyDot(x, y, angle + i * Math.PI, r * 0.83, blade + 1, color);
    } else if (profile.shape === 'variares-axes') {
      for (let i = 0; i < 6; i++) {
        const a = angle + i * TAU / 6;
        beyArm(x, y, a, inner * 0.75, r * 0.73, Math.max(1, blade - 1), color);
        beyDot(x, y, a, r * 0.82, blade + 1, color);
        beyDot(x, y, a + 0.17 * (i % 2 ? -1 : 1), r * 0.92, blade, accent);
      }
    } else if (profile.shape === 'kronos-scythes') {
      for (let i = 0; i < 4; i++) {
        const a = angle - i * TAU / 4;
        beyArm(x, y, a, inner * 0.72, r * 0.8, blade, color, -0.52);
        beyArm(x, y, a - 0.48, r * 0.7, r * 0.96, Math.max(1, blade - 1), accent, -0.28);
      }
    } else if (profile.shape === 'jupiter-orbs') {
      for (let i = 0; i < 5; i++) {
        const a = angle + i * TAU / 5;
        beyArm(x, y, a, inner * 0.7, r * 0.67, Math.max(1, blade - 1), color);
        disc(x + Math.cos(a) * r * 0.77, y + Math.sin(a) * r * 0.77, r * 0.23, color);
        beyDot(x, y, a, r * 0.78, Math.max(1, blade - 1), accent);
      }
    } else if (profile.shape === 'nemesis-eight-points') {
      for (let i = 0; i < 8; i++) {
        const a = angle + i * TAU / 8;
        const long = i % 2 === 0;
        beyArm(x, y, a, inner * 0.65, r * (long ? 0.88 : 0.78), long ? blade : Math.max(1, blade - 1), long ? color : accent);
        beyDot(x, y, a, r * (long ? 0.98 : 0.88), long ? blade + 1 : blade, long ? color : accent);
      }
    } else {
      disc(x, y, r, color);
      for (let i = 0; i < 4; i++) beyDot(x, y, angle + i * TAU / 4, r * 0.82, blade, accent);
    }
  }
  function drawBeyEmblem(profile, ch, x, y, angle, r, detailed) {
    const z = Math.max(1, detailed ? 2 : 1);
    if (profile.emblem === 'star-cross') {
      rect(x - z / 2, y - r * 0.3, z, r * 0.6, '#fff'); rect(x - r * 0.3, y - z / 2, r * 0.6, z, '#fff');
    } else if (profile.emblem === 'lion-eye') {
      rect(x - r * 0.27, y - z / 2, r * 0.54, z, ch.accent); beyDot(x, y, angle, r * 0.18, z, '#141428');
    } else if (profile.emblem === 'dragon-fang') {
      beyArm(x, y, angle - 0.35, 0, r * 0.32, z, '#fff', -0.35); beyDot(x, y, angle - 0.72, r * 0.3, z, ch.accent);
    } else if (profile.emblem === 'bow-flame') {
      circ(x, y, r * 0.27, ch.accent); beyDot(x, y, angle, r * 0.28, z + 1, '#fff');
    } else if (profile.emblem === 'orion-belt') {
      for (let i = -1; i <= 1; i++) beyDot(x, y, angle, i * r * 0.2, z, i === 0 ? '#fff' : ch.accent);
    } else if (profile.emblem === 'mars-helm') {
      rect(x - r * 0.26, y - z / 2, r * 0.52, z, '#fff'); rect(x - z / 2, y - r * 0.25, z, r * 0.34, ch.accent);
    } else if (profile.emblem === 'hourglass') {
      beyDot(x, y, angle, r * 0.2, z + 1, '#fff'); beyDot(x, y, angle + Math.PI, r * 0.2, z + 1, '#fff');
    } else if (profile.emblem === 'jupiter-eye') {
      disc(x, y, r * 0.25, ch.accent); rect(x - r * 0.23, y - z / 2, r * 0.46, z, '#fff');
    } else if (profile.emblem === 'eclipse-core') {
      circ(x, y, r * 0.3, ch.accent); beyDot(x, y, angle, r * 0.28, z, '#fff');
    } else disc(x, y, Math.max(1, r * 0.15), '#fff');
  }
  function drawBey(ch, x, y, ang, r, o = {}) {
    const profile = BeyVisuals.getBey(ch && ch.id);
    const frames = profile.rotationFrames || 16;
    const angle = Math.round((ang / TAU) * frames) * TAU / frames;
    const detailed = r >= 14;
    const spinFactor = clamp(o.spinFactor == null ? 1 : o.spinFactor, 0, 1);
    if (o.wob) { x += Math.cos(S.t * 14) * o.wob; y += Math.sin(S.t * 11) * o.wob; }
    if (o.glow) disc(x, y, r + 3, o.glow);

    // Shape-specific dark footprint and colored energy layer establish the readable silhouette.
    paintBeyLayer(profile, x, y, angle, r + 1, '#080812', '#080812', detailed);
    paintBeyLayer(profile, x, y, angle, r * profile.outer, ch.color, ch.accent, detailed);

    // Metal disc: neutral and bright so it never reads as a recolored flat circle.
    const metalR = Math.max(2, r * (profile.inner + 0.04));
    disc(x, y, metalR, '#5d6474');
    circ(x, y, Math.max(1, metalR - 1), detailed ? '#d9e0ed' : '#aeb8c8');
    const spokeCount = detailed ? profile.blades : Math.min(profile.blades, 4);
    for (let i = 0; i < spokeCount; i++) {
      const a = angle * profile.twist + i * TAU / spokeCount;
      beyArm(x, y, a, metalR * 0.35, metalR * 0.78, 1, i % 2 ? ch.color2 : ch.accent);
    }

    // Layer hub and driver/core remain separate at every gameplay radius.
    disc(x, y, Math.max(2, r * 0.34), ch.color2);
    circ(x, y, Math.max(1, r * 0.3), ch.color);
    drawBeyEmblem(profile, ch, x, y, angle + (1 - spinFactor) * TAU / frames, r, detailed);
    disc(x, y, Math.max(1, Math.round(r * 0.13)), spinFactor < 0.2 ? ch.accent : '#ffffff');
    if (detailed) beyDot(x, y, angle, r * 0.43, 1, '#ffffff');
  }

  /* ---------------- stadium layer ---------------- */
  const stCache = {};
  function stadiumLayer(st) {
    if (stCache[st.id]) return stCache[st.id];
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const prev = G; G = c.getContext('2d');
    const rng = mulberry(st.id.length * 977 + st.id.charCodeAt(0));
    rect(0, 0, W, H, st.bg);
    if (st.hazard === 'stars' || st.hazard === 'hole') {
      for (let i = 0; i < 110; i++) rect((rng() * W) | 0, (rng() * H) | 0, 1, 1, rng() < 0.3 ? '#ffffff' : '#6a5aa0');
    } else {
      for (let y = 0; y < H; y += 8) for (let x = ((y / 8) % 2) * 4; x < W; x += 8) rect(x, y, 1, 1, st.rimD);
    }
    disc(CX, CY + 4, R + 10, '#000');
    disc(CX, CY, R + 9, '#000');
    disc(CX, CY, R + 8, st.rimD);
    disc(CX, CY, R + 5, st.rim);
    disc(CX, CY, R + 2, st.rimD);
    let inner = R;
    if (st.hazard === 'lava') {
      disc(CX, CY, R, '#c2410c');
      for (let i = 0; i < 600; i++) {
        const a = rng() * TAU, rr = R - 16 + rng() * 16;
        rect(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 1, 1, rng() < 0.5 ? '#f59f00' : '#7a1a05');
      }
      inner = R - 16;
    }
    disc(CX, CY, inner, st.floor);
    disc(CX, CY, inner - 8, st.floor2);
    disc(CX, CY, inner - 13, st.floor);
    disc(CX, CY, inner - 34, st.floor2);
    disc(CX, CY, inner - 38, st.floor);
    disc(CX, CY, 24, st.floor2);
    disc(CX, CY, 20, st.floor);
    for (let i = 0; i < 300; i++) {
      const a = rng() * TAU, rr = rng() * (inner - 2);
      rect(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 1, 1, st.hazard === 'ice' ? '#ffffff' : st.floor2);
    }
    // Deterministic identity marks are baked into the cached layer; gameplay geometry is unchanged.
    if (st.id === 'classic') {
      circ(CX, CY, 56, '#8c9bd0'); circ(CX, CY, 58, '#24305c');
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; rect(CX + Math.cos(a) * 67 - 3, CY + Math.sin(a) * 67 - 1, 6, 2, '#ffd400'); }
      rect(CX - 20, CY - 1, 40, 2, '#8c9bd0'); rect(CX - 1, CY - 20, 2, 40, '#8c9bd0');
    } else if (st.id === 'ice') {
      for (let i = 0; i < 14; i++) {
        const a = rng() * TAU, rr = 28 + rng() * 48, x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
        rect(x - 1, y - 4, 2, 9, '#d8f6ff'); rect(x - 4, y - 1, 9, 2, '#d8f6ff');
      }
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; circ(CX + Math.cos(a) * 49, CY + Math.sin(a) * 49, 7, '#d8f6ff'); }
    } else if (st.id === 'volcano') {
      for (let i = 0; i < 10; i++) {
        const a = rng() * TAU, rr = 24 + rng() * 42, x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr;
        for (let k = 0; k < 9; k++) rect(x + Math.cos(a + (k % 2 ? 0.35 : -0.3)) * k, y + Math.sin(a + (k % 2 ? 0.35 : -0.3)) * k, 2, 1, k < 5 ? '#f59f00' : '#7a1a05');
      }
      circ(CX, CY, 52, '#7a1a05');
    } else if (st.id === 'space') {
      for (let i = 0; i < 5; i++) {
        const a = rng() * TAU, rr = 30 + rng() * 40, pr = 2 + ((rng() * 3) | 0);
        disc(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, pr, i % 2 ? '#b08cff' : '#6a5aa0');
      }
      G.save(); G.translate(CX, CY); G.scale(1, 0.38); circ(0, 0, 58, '#b08cff'); G.restore();
    } else if (st.id === 'nemesis') {
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12, x = CX + Math.cos(a) * 56, y = CY + Math.sin(a) * 56;
        rect(x - 2, y - 2, 5, 5, '#6b0a2a'); markRune(x, y, i, '#ff2a6b');
      }
      circ(CX, CY, 48, '#6b0a2a'); circ(CX, CY, 51, '#4a1a6b');
    }
    if (st.hazard === 'hole') { disc(CX, CY, 15, '#000'); circ(CX, CY, 15, st.rim); circ(CX, CY, 11, '#6b0a2a'); }
    else disc(CX, CY, 4, st.rim);
    for (const [cDeg, wDeg] of st.exits) {
      const cc = cDeg * D2R, ww = wDeg * D2R;
      G.fillStyle = st.bg;
      for (let a = cc - ww; a <= cc + ww; a += 0.01) {
        for (let rr = R - 1; rr <= R + 10; rr++) G.fillRect(Math.round(CX + Math.cos(a) * rr), Math.round(CY + Math.sin(a) * rr), 2, 2);
      }
      for (const a of [cc - ww, cc + ww]) {
        for (let rr = R - 1; rr <= R + 9; rr++) rect(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 1, 1, '#ffd400');
      }
    }
    G = prev;
    stCache[st.id] = c;
    return c;
  }
  function stadiumOverlay(st) {
    const visualTime = motionOK() ? S.t : 0;
    if (st.hazard === 'lava') {
      for (let i = 0; i < 8; i++) {
        const a = visualTime * 0.25 + i * 0.785, rr = R - 8 + Math.sin(visualTime * 3 + i) * 5;
        rect(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 2, 2, blink(6 + i) ? '#ffd400' : '#ff7a1a');
      }
    } else if (st.hazard === 'hole') {
      circ(CX, CY, 15 + ((visualTime * 12) % 8), '#ff2a6b');
    } else if (st.hazard === 'ice') {
      const rng = mulberry(Math.floor(visualTime * 4));
      for (let i = 0; i < 4; i++) { const a = rng() * TAU, rr = rng() * (R - 4); rect(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 1, 1, '#fff'); }
    }
  }

  /* ---------------- match ---------------- */
  function makeBey(ch, x, y) {
    return { ch, x, y, vx: 0, vy: 0, r: 8, spin: 0, maxSpin: 1000, ang: 0, meter: 0, out: false, burst: false, fall: 0,
      wallCd: 0, fx: { dash: 0, wall: 0, absorb: 0, slow: 0, vortex: 0 }, trail: [], ai: { jx: 0, jy: 0, jt: 0 } };
  }
  function startMatch(c1, c2, st, opts = {}) {
    S.match = { chars: [c1, c2], st, layer: stadiumLayer(st), human2: !!opts.human2, lvl: opts.lvl ?? 0.6,
      score: [0, 0], round: 0, beys: null, phase: 'launch', t: 0, time: 0, proj: [], cut: null, pt: null, hitCd: 0 };
    S.parts = []; S.floats = []; S.rings = []; S.paused = false;
    newRound();
    go('battle');
    Sound.music(st.music);
  }
  function newRound() {
    const m = S.match;
    m.round++;
    m.beys = [makeBey(m.chars[0], CX - 46, CY), makeBey(m.chars[1], CX + 46, CY)];
    m.phase = 'launch'; m.t = 0; m.time = 0; m.proj = []; m.cut = null; m.pt = null; m.pendingBurst = null;
    m.launch = { ph: [rnd(randomStreams.gameplay, 0, TAU), rnd(randomStreams.gameplay, 0, TAU)], val: [0, 0], lock: [null, null],
      cpuTarget: clamp(rnd(randomStreams.ai, 0.5, 0.75) + m.lvl * 0.2, 0, 0.97), said: -1 };
  }

  function playerInput(side) {
    const m = S.match;
    if (side === 0) {
      if (m.human2) return { x: held('KeyD') - held('KeyA'), y: held('KeyS') - held('KeyW'), sp: any('Space') };
      return { x: held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft'), y: held('KeyS', 'ArrowDown') - held('KeyW', 'ArrowUp'), sp: any('Space', 'Enter') };
    }
    return { x: held('ArrowRight') - held('ArrowLeft'), y: held('ArrowDown') - held('ArrowUp'), sp: any('Enter', 'NumpadEnter', 'ShiftRight') };
  }

  function aiInput(me, op, lvl, dt) {
    const st = S.match.st, out = { x: 0, y: 0, sp: false };
    if (me.spin <= 0 || me.out) return out;
    const dx = op.x - me.x, dy = op.y - me.y, d = Math.hypot(dx, dy) || 1;
    const cx = CX - me.x, cy = CY - me.y, dc = Math.hypot(cx, cy) || 1;
    const opAlive = !op.out && !op.burst && op.spin > 0;
    const t = me.ch.type;
    let tx = 0, ty = 0;
    const circle = (rr, dir = 1) => {
      const a = Math.atan2(me.y - CY, me.x - CX) + 0.6 * dir;
      const gx = CX + Math.cos(a) * rr, gy = CY + Math.sin(a) * rr, gd = Math.hypot(gx - me.x, gy - me.y) || 1;
      tx = (gx - me.x) / gd; ty = (gy - me.y) / gd;
    };
    if (t === 'ATAC' || t === 'BOSS' || me.fx.dash > 0) {
      // get between the centre and the opponent, then charge outward
      const ox = op.x - CX, oy = op.y - CY, od = Math.hypot(ox, oy) || 1;
      const px = op.x - (ox / od) * 16, py = op.y - (oy / od) * 16, toP = Math.hypot(px - me.x, py - me.y) || 1;
      if (toP > 18 && d > 22) { tx = (px - me.x) / toP; ty = (py - me.y) / toP; } else { tx = dx / d; ty = dy / d; }
    } else if (t === 'DEFENSA') {
      if (d < 55) { tx = dx / d; ty = dy / d; }
      else { const k = Math.min(1, dc / 20); tx = (cx / dc) * k; ty = (cy / dc) * k; }
    } else if (t === 'RESISTENCIA') {
      circle(38);
      if (d < 30) { tx -= (dx / d) * 0.8; ty -= (dy / d) * 0.8; }
    } else {
      if (me.spin > op.spin) { tx = dx / d; ty = dy / d; } else circle(34, -1);
    }
    const edge = R - 24;
    if (dc > edge) { const k = clamp((dc - edge) / 14, 0, 1) * 1.6; tx += (cx / dc) * k; ty += (cy / dc) * k; }
    if (st.hazard === 'hole' && dc < 28) { tx -= (cx / dc) * 1.3; ty -= (cy / dc) * 1.3; }
    if (st.hazard === 'lava' && dc > R - 28) { tx += cx / dc; ty += cy / dc; }
    const ai = me.ai;
    ai.jt -= dt;
    if (ai.jt <= 0) { ai.jt = rnd(randomStreams.ai, 0.2, 0.6); ai.jx = rnd(randomStreams.ai, -1, 1) * (1 - lvl) * 0.9; ai.jy = rnd(randomStreams.ai, -1, 1) * (1 - lvl) * 0.9; }
    tx += ai.jx; ty += ai.jy;
    const l = Math.hypot(tx, ty) || 1, mag = 0.55 + 0.45 * lvl;
    out.x = (tx / l) * mag; out.y = (ty / l) * mag;
    if (!opAlive) { out.x = (cx / dc) * 0.5; out.y = (cy / dc) * 0.5; }
    if (me.meter >= 100 && opAlive && randomStreams.ai() < 0.02 + lvl * 0.04) {
      const k = me.ch.special.kind;
      if (k === 'heal') out.sp = me.spin < me.maxSpin * 0.55;
      else if (k === 'wall') out.sp = d < 60;
      else if (k === 'absorb') out.sp = true;
      else out.sp = d < 100;
    }
    return out;
  }

  function hurt(v, amt, src) {
    if (v.out || v.burst || v.spin <= 0) return;
    v.spin = Math.max(0, v.spin - amt);
    v.meter = Math.min(100, v.meter + amt * 0.06);
    if (src && src.ch.left) src.spin = Math.min(src.maxSpin, src.spin + amt * 0.3); // left spin steals spin
  }

  function moveBey(me, op, inp, dt) {
    const st = S.match.st;
    if (me.burst) return;
    for (const k in me.fx) me.fx[k] = Math.max(0, me.fx[k] - dt);
    me.wallCd = Math.max(0, me.wallCd - dt);
    if (me.out) { me.fall += dt; me.x += me.vx * dt; me.y += me.vy * dt; me.ang += 0.3; return; }
    const alive = me.spin > 0;
    const sf = clamp(me.spin / me.maxSpin, 0, 1);
    if (alive) {
      let ix = inp.x, iy = inp.y;
      const il = Math.hypot(ix, iy);
      if (il > 1) { ix /= il; iy /= il; }
      const acc = 260 * me.ch.spd * (me.fx.slow > 0 ? 0.4 : 1) * (0.35 + 0.65 * sf);
      me.vx += ix * acc * dt; me.vy += iy * acc * dt;
      if (il > 0.1) me.spin -= 4 * dt;
    }
    me.vx += (CX - me.x) * st.pull * dt;
    me.vy += (CY - me.y) * st.pull * dt;
    if (op.fx.vortex > 0 && !op.out && !op.burst) {
      const vx = op.x - me.x, vy = op.y - me.y, vd = Math.hypot(vx, vy) || 1;
      me.vx += (vx / vd) * 380 * dt; me.vy += (vy / vd) * 380 * dt;
      if (randomStreams.visual() < 0.3) spark(me.x, me.y, 1, ['#18c2a0', '#fff'], 30);
    }
    const f = Math.max(0, 1 - (alive ? st.fric : 3.5) * dt);
    me.vx *= f; me.vy *= f;
    const sp = Math.hypot(me.vx, me.vy);
    const maxV = (75 + 95 * sf) * me.ch.spd * (me.fx.dash > 0 ? 2.4 : 1) * (me.fx.slow > 0 ? 0.6 : 1) + (alive ? 0 : 30);
    if (sp > maxV) { me.vx *= maxV / sp; me.vy *= maxV / sp; }
    me.x += me.vx * dt; me.y += me.vy * dt;
    if (alive) {
      me.spin -= ((15 + sp * 0.04) / me.ch.sta) * dt;
      me.ang += (0.15 + 0.55 * sf) * (me.ch.left ? -1 : 1);
    }
    if (me.fx.absorb > 0 && alive && !op.out && !op.burst && op.spin > 0) {
      const amt = 95 * dt;
      op.spin = Math.max(0, op.spin - amt);
      me.spin = Math.min(me.maxSpin, me.spin + amt * 0.9);
      if (randomStreams.visual() < 0.5) {
        const k = randomStreams.visual();
        S.parts.push({ x: op.x + (me.x - op.x) * k, y: op.y + (me.y - op.y) * k, vx: 0, vy: 0, life: 0.25, c: me.ch.color2, s: 1 });
      }
    }
    const d = Math.hypot(me.x - CX, me.y - CY);
    if (alive && st.hazard === 'lava' && d > R - 16) {
      me.spin -= 75 * dt;
      if (randomStreams.visual() < 0.25) spark(me.x, me.y, 1, ['#ff7a1a', '#ffd400'], 40);
    }
    if (alive && st.hazard === 'hole' && d < 15) {
      me.spin -= 150 * dt;
      if (randomStreams.visual() < 0.3) spark(me.x, me.y, 1, ['#ff2a6b', '#8a1aa0'], 40);
    }
    if (d > R - me.r) {
      const a = Math.atan2(me.y - CY, me.x - CX);
      const inExit = st.exits.some(([c, w]) => angDiff(a, c * D2R) < w * D2R);
      const nx = (me.x - CX) / d, ny = (me.y - CY) / d;
      if (inExit) {
        if (d > R + 6) { me.out = true; me.fall = 0; Sound.sfx('ringout'); S.shake = 4; }
      } else {
        const vn = me.vx * nx + me.vy * ny;
        if (vn > 0) {
          me.vx -= 1.75 * vn * nx; me.vy -= 1.75 * vn * ny;
          if (vn > 40) {
            me.spin -= vn * 0.08;
            spark(CX + nx * R, CY + ny * R, 4, ['#fff', st.rim], 60);
            if (me.wallCd <= 0) { Sound.sfx('wall'); me.wallCd = 0.15; }
            S.shake = Math.max(S.shake, 1.5);
          }
        }
        me.x = CX + nx * (R - me.r); me.y = CY + ny * (R - me.r);
      }
    }
    if (me.spin < 0) me.spin = 0;
    me.trail.push([me.x, me.y]);
    if (me.trail.length > 8) me.trail.shift();
  }

  function collide(a, b) {
    const m = S.match;
    const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
    let d = Math.hypot(dx, dy);
    if (d >= min) return;
    if (d < 0.01) d = 0.01;
    const nx = dx / d, ny = dy / d, ov = min - d;
    a.x -= (nx * ov) / 2; a.y -= (ny * ov) / 2; b.x += (nx * ov) / 2; b.y += (ny * ov) / 2;
    const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    const ma = a.ch.def * (a.fx.wall > 0 ? 4 : 1), mb = b.ch.def * (b.fx.wall > 0 ? 4 : 1);
    const sfA = clamp(a.spin / a.maxSpin, 0, 1), sfB = clamp(b.spin / b.maxSpin, 0, 1);
    const clash = a.ch.left !== b.ch.left ? 1.25 : 1; // opposite spins = bigger recoil
    const J = (Math.max(0, rv) * 1.15 + 55 + (70 * (sfA + sfB)) / 2) * clash;
    a.vx -= (nx * J * mb) / (ma + mb); a.vy -= (ny * J * mb) / (ma + mb);
    b.vx += (nx * J * ma) / (ma + mb); b.vy += (ny * J * ma) / (ma + mb);
    if (m.hitCd > 0 || m.phase !== 'fight') return;
    m.hitCd = 0.12;
    const impact = Math.max(0, rv) + 35;
    const dmg = (att, def) => impact * 0.42 * (att.ch.atk / def.ch.def) * (0.5 + 0.8 * clamp(att.spin / att.maxSpin, 0, 1)) *
      (att.fx.dash > 0 ? 2.3 : 1) * (att.fx.wall > 0 ? 1.6 : 1) * (def.fx.wall > 0 ? 0.25 : 1) * rnd(randomStreams.gameplay, 0.85, 1.15);
    const dB = dmg(a, b), dA = dmg(b, a);
    hurt(b, dB, a); hurt(a, dA, b);
    a.meter = Math.min(100, a.meter + 9); b.meter = Math.min(100, b.meter + 9);
    const px = a.x + nx * a.r, py = a.y + ny * a.r;
    spark(px, py, 6 + Math.min(14, (impact / 12) | 0), ['#fff', '#ffd400', a.ch.color, b.ch.color], 120);
    S.shake = Math.max(S.shake, Math.min(5, impact / 40));
    Sound.sfx('hit', clamp(impact / 180, 0.3, 1));
    if (impact > 150) floatText('CLASH!', px, py - 12, '#fff', 0.6);
    for (const [v, dd] of [[b, dB], [a, dA]]) {
      if (m.pendingBurst == null && v.spin > 0 && dd > 75 && v.spin < v.maxSpin * 0.4 && randomStreams.burst() < 0.15) {
        m.pendingBurst = m.beys.indexOf(v);
      }
    }
  }

  function shock(me, op, force, dmg) {
    const dx = op.x - me.x, dy = op.y - me.y, d = Math.hypot(dx, dy) || 1;
    if (d < 140 && !op.out && !op.burst) {
      const f = force * (1 - d / 180);
      op.vx += (dx / d) * f; op.vy += (dy / d) * f;
      hurt(op, dmg, me);
    }
    S.rings.push({ x: me.x, y: me.y, r: 4, c: me.ch.accent });
    S.rings.push({ x: me.x, y: me.y, r: -12, c: me.ch.color2 });
    S.shake = 5;
    Sound.sfx('shock');
  }

  function triggerSpecial(i) {
    const m = S.match;
    m.beys[i].meter = 0;
    m.phase = 'cutin';
    m.cut = { t: 0, side: i };
    S.flash = 0.15;
    Sound.sfx('special');
  }

  function applySpecial(i) {
    const m = S.match, me = m.beys[i], op = m.beys[1 - i];
    const dx = op.x - me.x, dy = op.y - me.y, d = Math.hypot(dx, dy) || 1;
    switch (me.ch.special.kind) {
      case 'dash': me.fx.dash = 0.8; me.vx = (dx / d) * 340; me.vy = (dy / d) * 340; Sound.sfx('go'); break;
      case 'wall': me.fx.wall = 3.2; Sound.sfx('shock'); break;
      case 'absorb': me.fx.absorb = 3; break;
      case 'fire': {
        const base = Math.atan2(dy, dx);
        for (let s = -1; s <= 1; s++) {
          const a = base + s * 0.25;
          m.proj.push({ x: me.x, y: me.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, owner: i, life: 2 });
        }
        Sound.sfx('fire');
        break;
      }
      case 'heal':
        me.spin = Math.min(me.maxSpin, me.spin + me.maxSpin * 0.4);
        spark(me.x, me.y, 24, ['#d8f3ff', '#19a8e0', '#fff'], 70);
        break;
      case 'shock': shock(me, op, 300, 70); break;
      case 'slow': op.fx.slow = 3.5; hurt(op, 40, me); S.rings.push({ x: op.x, y: op.y, r: 2, c: '#9fe3ff' }); break;
      case 'vortex': me.fx.vortex = 2.5; break;
      case 'nemesis': me.fx.absorb = 2.5; shock(me, op, 260, 60); break;
    }
  }

  function stepPhysics(dt) {
    const m = S.match, [a, b] = m.beys;
    if (m.phase === 'fight') {
      const inputs = [playerInput(0), m.human2 ? playerInput(1) : aiInput(b, a, m.lvl, dt)];
      for (let i = 0; i < 2; i++) {
        const me = m.beys[i];
        if (inputs[i].sp && me.meter >= 100 && me.spin > 0 && !me.out && !me.burst) { triggerSpecial(i); return; }
      }
      m.hitCd = Math.max(0, m.hitCd - dt);
      moveBey(a, b, inputs[0], dt);
      moveBey(b, a, inputs[1], dt);
    } else {
      const none = { x: 0, y: 0, sp: false };
      moveBey(a, b, none, dt);
      moveBey(b, a, none, dt);
    }
    if (!a.out && !b.out && !a.burst && !b.burst) collide(a, b);
    for (const p of m.proj) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      const tgt = m.beys[1 - p.owner];
      if (!tgt.out && !tgt.burst && Math.hypot(tgt.x - p.x, tgt.y - p.y) < tgt.r + 4) {
        p.life = 0;
        const pl = Math.hypot(p.vx, p.vy) || 1;
        tgt.vx += (p.vx / pl) * 150; tgt.vy += (p.vy / pl) * 150;
        hurt(tgt, 70, m.beys[p.owner]);
        spark(p.x, p.y, 14, ['#ff7a1a', '#ffd400', '#fff'], 100);
        Sound.sfx('hit', 1);
        S.shake = 3;
      }
      if (randomStreams.visual() < 0.6) S.parts.push({ x: p.x, y: p.y, vx: rnd(randomStreams.visual, -10, 10), vy: rnd(randomStreams.visual, -10, 10), life: 0.3, c: pick(randomStreams.visual, ['#ff7a1a', '#ffd400']), s: 1 });
    }
    m.proj = m.proj.filter((p) => p.life > 0 && Math.hypot(p.x - CX, p.y - CY) < R + 20);
  }

  function award(w, pts, label) {
    const m = S.match;
    m.phase = 'point';
    m.pt = { t: 0, w, pts, label };
    if (w >= 0) m.score[w] += pts;
    Sound.sfx(pts >= 2 ? 'burst' : 'point');
  }

  function checkEnd() {
    const m = S.match, [a, b] = m.beys;
    if (m.pendingBurst != null) {
      const v = m.beys[m.pendingBurst];
      v.burst = true;
      spark(v.x, v.y, 50, [v.ch.color, v.ch.color2, v.ch.accent, '#fff'], 170, true);
      S.shake = 7; S.flash = 0.25;
      return award(1 - m.pendingBurst, 2, 'BURST FINISH!');
    }
    if (a.out && b.out) return award(-1, 0, 'DOBLE RING OUT!');
    if (a.out) return award(1, 1, 'RING OUT!');
    if (b.out) return award(0, 1, 'RING OUT!');
    const da = a.spin <= 0, db = b.spin <= 0;
    if (da && db) return award(-1, 0, 'EMPAT!');
    if (da) return award(1, 1, 'SPIN FINISH!');
    if (db) return award(0, 1, 'SPIN FINISH!');
    if (m.time >= 60) return award(a.spin >= b.spin ? 0 : 1, 1, 'TEMPS ESGOTAT!');
  }

  function endMatch() {
    const m = S.match;
    const w = m.score[0] >= 3 ? 0 : 1;
    S.result = { w, chars: m.chars, score: m.score.slice() };
    if (S.mode === 'tour' && w === 0) {
      S.tour.round++;
      if (S.tour.round >= S.tour.opps.length) {
        S.newUnlock = !ragoUnlocked;
        ragoUnlocked = true;
        try { localStorage.setItem('beyfury_rago', '1'); } catch (e) { /* ignore */ }
        go('champion');
        Sound.sfx('win');
        return;
      }
    }
    go('result');
    Sound.sfx(w === 0 || S.mode === 'pvp' ? 'win' : 'lose');
  }

  function setupTour(ch) {
    const boss = ch.boss ? BLADERS.find((b) => b.id === 'gingka') : BLADERS.find((b) => b.boss);
    const others = shuffle(randomStreams.tournament, BLADERS.filter((b) => !b.boss && b.id !== ch.id && b.id !== boss.id)).slice(0, 3);
    const stages = shuffle(randomStreams.tournament, STADIUMS.filter((s) => !s.boss)).slice(0, 3).concat([STADIUMS.find((s) => s.boss)]);
    S.tour = { ch, opps: [...others, boss], stages, round: 0 };
  }
  function queueTourMatch() {
    const T = S.tour;
    S.next = { c1: T.ch, c2: T.opps[T.round], st: T.stages[T.round], opts: { lvl: [0.45, 0.65, 0.85, 1][T.round] } };
    go('vs');
    Sound.sfx('vs');
  }

  /* ---------------- scenes ---------------- */
  const STARS = Array.from({ length: 70 }, () => ({ x: randomStreams.visual() * W, y: randomStreams.visual() * H, s: randomStreams.visual() * 0.8 + 0.2 }));
  function menuBG(c1 = '#0b0b24') {
    rect(0, 0, W, H, c1);
    const drift = motionOK() ? S.t * 25 : 0;
    for (const s of STARS) {
      let x = (s.x - drift * s.s) % W; if (x < 0) x += W;
      rect(x, s.y, s.s > 0.7 ? 2 : 1, 1, s.s > 0.7 ? '#ffffff' : '#4a4a8a');
    }
    for (let i = 0; i < 6; i++) {
      const y = 200 + i * i * 1.4 + (motionOK() ? (S.t * 10) % 6 : 0);
      rect(0, y, W, 1, '#2a1a5a');
    }
    rect(0, 0, W, 3, '#ffffff10');
  }
  function logo(y) {
    const bob = motionOK() ? Math.round(Math.sin(S.t * 3) * 2) : 0;
    txt('BEY BATTLE', CX, y + bob, THEME.gold, 24, 'center', '#a0280a');
    rect(57, y + 27 + bob, 206, 2, '#fff');
    txt('METAL FURY', CX, y + 32 + bob, '#ff3b3b', 16, 'center', '#300');
  }
  function menuList(items, y, sel, gap = 16, width = 220) {
    items.forEach((it, i) => {
      const on = i === sel, yy = y + i * gap;
      if (on) {
        rect(CX - width / 2, yy - 3, width, 14, '#242052');
        rect(CX - width / 2, yy - 3, 3, 14, THEME.gold);
        cursorSelect(CX - width / 2, yy - 3, width, 14);
      }
      txt(it, CX, yy, on ? (blink(4) ? THEME.gold : THEME.text) : THEME.muted, 8, 'center');
    });
  }
  function menuNav(n) {
    if (UP()) { S.menu = (S.menu - 1 + n) % n; Sound.sfx('move'); }
    if (DOWN()) { S.menu = (S.menu + 1) % n; Sound.sfx('move'); }
  }
  function statBar(label, v, x, y, col) {
    txt(label, x, y, THEME.muted, 7);
    segmentedMeter(x + 31, y, 82, 6, clamp((v - 0.6) / 0.9, 0.05, 1), col, 10);
  }

  const scenes = {};

  scenes.title = {
    update() {
      menuNav(4);
      if (OK()) {
        Sound.sfx('select');
        if (S.menu === 0) { S.mode = 'tour'; S.picks = []; go('select'); }
        else if (S.menu === 1) { S.mode = 'pvp'; S.picks = []; go('select'); }
        else if (S.menu === 2) go('controls');
        else go('options');
      }
    },
    draw() {
      menuBG();
      bevelPanel(7, 7, 306, 218, { fill: '#090920', edge: '#34336b' });
      logo(17);
      txt('PIXEL SPINNING BATTLE', CX, 70, THEME.muted, 7, 'center');
      separator(82, '#5a315d');
      const peg = BLADERS[0], dra = BLADERS[2];
      const oa = motionOK() ? S.t * 1.4 : 0.8;
      drawBey(dra, CX + Math.cos(oa) * 57, 108 + Math.sin(oa) * 11, motionOK() ? -S.t * 20 : -0.7, 9);
      drawBey(peg, CX, 108, motionOK() ? S.t * 18 : 0.5, 20);
      menuList(['1 JUGADOR - TORNEIG', '2 JUGADORS - PVP', 'CONTROLS', 'OPCIONS'], 139, S.menu, 16, 224);
      rect(18, 205, 284, 1, '#34336b');
      txt('ENTER: CONFIRMA', 22, 211, THEME.text, 7);
      txt('M: AUDIO ' + (Sound.muted ? 'OFF' : 'ON'), 298, 211, THEME.muted, 7, 'right');
    },
  };

  scenes.options = {
    update() {
      menuNav(4);
      if (OK()) {
        Sound.sfx('select');
        if (S.menu === 0) S.visual.effects = S.visual.effects === 'ALT' ? 'BAIX' : 'ALT';
        else if (S.menu === 1) S.visual.shake = !S.visual.shake;
        else if (S.menu === 2) Sound.toggleMute();
        else { Sound.sfx('back'); go('title'); }
      }
      if (BACK()) { Sound.sfx('back'); go('title'); }
    },
    draw() {
      menuBG('#0d0b24');
      screenHeader('OPCIONS VISUALS', 'NO AFECTEN EL JOC');
      bevelPanel(30, 43, 260, 142, { fill: '#11102c', accent: THEME.cyan });
      txt('PRESENTACIO', CX, 54, THEME.gold, 8, 'center');
      separator(68, '#34336b');
      const items = ['EFECTES: ' + S.visual.effects, 'TREMOLOR: ' + (S.visual.shake ? 'ON' : 'OFF'), 'AUDIO: ' + (Sound.muted ? 'OFF' : 'ON'), 'TORNAR'];
      menuList(items, 80, S.menu, 22, 208);
      txt('BAIX LIMITA TRAILS I PARTICULES', CX, 168, THEME.muted, 6, 'center');
      if (reducedMotion.matches) txt('MOVIMENT REDUIT DEL SISTEMA: ACTIU', CX, 179, THEME.green, 6, 'center');
      actionFooter('ENTER: CANVIA', 'ESC: TORNAR');
    },
  };

  scenes.controls = {
    update() { if (OK() || BACK()) { Sound.sfx('back'); go('title'); } },
    draw() {
      menuBG();
      screenHeader('COM ES JUGA', 'GUIA RAPIDA');
      bevelPanel(10, 34, 146, 73, { fill: '#111634', accent: THEME.p1 });
      badge('JUGADOR 1', 19, 42, THEME.p1);
      txt('WASD · MOURE', 20, 62, THEME.text, 6);
      txt('ESPAI · LLANCAR/PODER', 20, 81, THEME.muted, 6);
      bevelPanel(164, 34, 146, 73, { fill: '#301326', accent: THEME.p2 });
      badge('JUGADOR 2', 173, 42, THEME.p2);
      txt('FLETXES · MOURE', 174, 62, THEME.text, 6);
      txt('ENTER · LLANCAR/PODER', 174, 81, THEME.muted, 6);
      bevelPanel(10, 115, 300, 88, { fill: '#15132e', accent: THEME.gold });
      txt('COM GUANYAR', 22, 125, THEME.gold, 8);
      txt('RING OUT', 22, 144, THEME.text, 6); badge('1 PUNT', 112, 140, THEME.green);
      txt('SPIN FINISH', 22, 161, THEME.text, 6); badge('1 PUNT', 112, 157, THEME.green);
      txt('BURST FINISH', 22, 178, THEME.text, 6); badge('2 PUNTS', 112, 174, '#ff2a6b');
      txt('PODER: COLPEJA EL RIVAL', 294, 127, THEME.cyan, 6, 'right');
      txt('OBJECTIU: 3 PUNTS', 294, 145, THEME.gold, 6, 'right');
      txt('ESC/P: PAUSA', 294, 163, THEME.muted, 6, 'right');
      txt('M: AUDIO ON/OFF', 294, 181, THEME.muted, 6, 'right');
      actionFooter('ENTER: TORNAR');
    },
  };

  scenes.select = {
    update() {
      const list = roster(), n = list.length;
      if (LEFT()) { S.cursor = (S.cursor - 1 + n) % n; Sound.sfx('move'); }
      if (RIGHT()) { S.cursor = (S.cursor + 1) % n; Sound.sfx('move'); }
      if (UP()) { S.cursor = (S.cursor - 3 + n * 3) % n; Sound.sfx('move'); }
      if (DOWN()) { S.cursor = (S.cursor + 3) % n; Sound.sfx('move'); }
      if (S.cursor >= n) S.cursor = 0;
      if (OK()) {
        Sound.sfx('select');
        S.picks.push(list[S.cursor]);
        if (S.mode === 'pvp' && S.picks.length < 2) return;
        if (S.mode === 'tour') { setupTour(S.picks[0]); go('bracket'); }
        else { S.stIdx = 0; go('stage'); }
      }
      if (BACK()) {
        Sound.sfx('back');
        if (S.picks.length) S.picks.pop(); else go('title');
      }
    },
    draw() {
      menuBG('#100a2a');
      const list = roster();
      const who = S.mode === 'pvp' ? (S.picks.length === 0 ? 'JUGADOR 1' : 'JUGADOR 2') : 'EL TEU BLADER';
      const sideCol = S.picks.length && S.mode === 'pvp' ? THEME.p2 : THEME.gold;
      screenHeader('TRIA ' + who, (S.cursor + 1) + ' / ' + list.length, sideCol);
      bevelPanel(6, 30, 136, 189, { fill: '#0c0b26', edge: '#39366f' });
      list.forEach((ch, i) => {
        const x = 11 + (i % 3) * 43, y = 35 + Math.floor(i / 3) * 56;
        const on = i === S.cursor;
        bevelPanel(x, y, 39, 49, { fill: on ? '#242052' : '#12112d', edge: on ? ch.color : '#343266' });
        framedFace(ch, x + 2, y + 3, 3, false, on ? THEME.text : '#45457a');
        txt(ch.name.slice(0, 5), x + 19, y + 42, on ? THEME.text : THEME.muted, 6, 'center');
        if (on) cursorSelect(x, y, 39, 49, THEME.gold);
        if (S.picks[0] === ch && S.mode === 'pvp') badge('J1', x + 3, y + 3, THEME.p1);
      });
      const ch = list[S.cursor], px = 147;
      bevelPanel(px, 30, 167, 189, { fill: '#0b0b20', edge: ch.color, accent: ch.color });
      framedFace(ch, px + 10, 40, 4, false, ch.color);
      txt(ch.name, px + 66, 41, THEME.text, 12);
      txt(ch.bey, px + 66, 59, ch.color === '#4a4a6a' || ch.color === '#4a1a6b' ? ch.color2 : ch.color, 6);
      badge(ch.type, px + 66, 73, ch.color2);
      statBar('ATK', ch.atk, px + 11, 94, THEME.red);
      statBar('DEF', ch.def, px + 11, 107, THEME.green);
      statBar('RES', ch.sta, px + 11, 120, THEME.cyan);
      statBar('VEL', ch.spd, px + 11, 133, THEME.gold);
      rect(px + 10, 146, 147, 1, '#34336b');
      txt('ESPECIAL', px + 11, 153, THEME.cyan, 7);
      wrapTxt(ch.special.name, px + 11, 165, 96, THEME.text, 7, 10);
      if (ch.left) badge('GIR ESQ.', px + 11, 194, '#ffb000');
      drawBey(ch, 281, 186, S.t * 16 * (ch.left ? -1 : 1), 20);
      txt(ch.id === 'gingka' ? '3 ALES' : ch.id === 'kyoya' ? '5 URPES' : 'METAL', 281, 207, THEME.muted, 6, 'center');
      actionFooter('ENTER: TRIAR', 'ESC: ENRERE');
    },
  };

  scenes.stage = {
    update() {
      const list = stageList(), n = list.length;
      if (LEFT() || UP()) { S.stIdx = (S.stIdx - 1 + n) % n; Sound.sfx('move'); }
      if (RIGHT() || DOWN()) { S.stIdx = (S.stIdx + 1) % n; Sound.sfx('move'); }
      if (OK()) {
        Sound.sfx('select');
        S.next = { c1: S.picks[0], c2: S.picks[1], st: list[S.stIdx], opts: { human2: true } };
        go('vs'); Sound.sfx('vs');
      }
      if (BACK()) { Sound.sfx('back'); S.picks.pop(); go('select'); }
    },
    draw() {
      const list = stageList(), st = list[S.stIdx];
      menuBG('#100a2a');
      screenHeader('TRIA ESTADI', (S.stIdx + 1) + ' / ' + list.length);
      bevelPanel(44, 33, 232, 164, { fill: '#08081c', edge: st.rim, accent: st.rim });
      const layer = stadiumLayer(st), sz = 2 * (R + 12);
      G.drawImage(layer, CX - R - 12, CY - R - 12, sz, sz, CX - 69, 39, 138, 138);
      rect(91, 173, 138, 2, st.rim);
      bevelPanel(58, 181, 204, 35, { fill: '#11102b', edge: st.rimD });
      txt(st.name, CX, 187, THEME.text, 8, 'center');
      txt(st.desc, CX, 201, st.rim, 7, 'center');
      badge(st.exits.length + ' SORTIDES', 51, 42, THEME.gold);
      badge(st.hazard ? st.hazard.toUpperCase() : 'COMPETICIO', 269, 42, st.rim, 'right');
      const arrowCol = motionOK() && !blink(3) ? THEME.gold : THEME.text;
      bevelPanel(8, 92, 28, 38, { fill: '#171536', edge: THEME.edge });
      bevelPanel(284, 92, 28, 38, { fill: '#171536', edge: THEME.edge });
      txt('<', 22, 101, arrowCol, 16, 'center'); txt('>', 298, 101, arrowCol, 16, 'center');
      actionFooter('ENTER: LLUITAR', 'ESC: ENRERE');
    },
  };

  const TOUR_LABELS = ['QUARTS', 'SEMIFINAL', 'FINAL', 'REPTE NEMESI'];
  scenes.bracket = {
    update() {
      if (OK()) { Sound.sfx('select'); queueTourMatch(); }
      if (BACK()) { Sound.sfx('back'); go('title'); }
    },
    draw() {
      menuBG('#140a24');
      const T = S.tour;
      screenHeader('TORNEIG', 'METAL FURY · ' + (T.round + 1) + '/4');
      rect(28, 43, 2, 151, '#34336b');
      T.opps.forEach((op, i) => {
        const y = 31 + i * 47, done = i < T.round, cur = i === T.round;
        const stateCol = done ? THEME.green : cur ? THEME.gold : '#4a486b';
        disc(29, y + 21, 5, stateCol);
        if (done) txt('V', 29, y + 18, '#07120a', 6, 'center', null);
        bevelPanel(41, y, 267, 42, { fill: cur ? '#21183f' : done ? '#10271e' : '#0d0c22', edge: stateCol, accent: stateCol });
        framedFace(op, 50, y + 4, 3, true, stateCol);
        txt(TOUR_LABELS[i], 93, y + 5, stateCol, 7);
        badge(done ? 'FET' : cur ? 'ARA' : 'BLOC', 300, y + 4, stateCol, 'right');
        txt(op.name, 93, y + 17, cur || done ? THEME.text : THEME.muted, 7);
        txt(op.bey, 93, y + 29, cur ? op.color2 : THEME.muted, 6);
        txt(T.stages[i].name.replace('ESTADI ', ''), 299, y + 30, cur ? T.stages[i].rim : THEME.muted, 5, 'right');
      });
      actionFooter('ENTER: LLUITAR', 'BLADER: ' + T.ch.name);
    },
  };

  scenes.vs = {
    update() {
      if ((S.t > 0.6 && OK()) || S.t > 3.2) {
        const n = S.next;
        startMatch(n.c1, n.c2, n.st, n.opts);
        Sound.sfx('go');
      }
    },
    draw() {
      const { c1, c2, st } = S.next;
      rect(0, 0, W, H, THEME.ink);
      const slide = motionOK() ? Math.min(1, S.t * 3) : 1;
      for (let y = 0; y < H; y++) {
        const x = CX + (y - H / 2) * 0.35;
        rect(0, y, x, 1, c1.color === '#4a4a6a' ? '#2a2a4a' : c1.color);
        rect(x, y, W - x, 1, c2.color);
      }
      if (motionOK()) for (let i = 0; i < 14; i++) {
        const y = (i * 37 + S.t * 400) % H;
        rect(0, y, W, 1, '#ffffff22');
      }
      rect(CX - 3, 0, 6, H, '#05050f'); rect(CX - 1, 0, 2, H, THEME.gold);
      const s = 6, fx = -90 + 110 * slide;
      bevelPanel(10, 34, 92, 100, { fill: '#09091dcc', edge: '#fff' });
      bevelPanel(218, 106, 92, 100, { fill: '#09091dcc', edge: '#fff' });
      framedFace(c1, fx, 42, s, false, '#fff');
      framedFace(c2, W - fx - 12 * s, 114, s, true, '#fff');
      badge(c1.type, 19, 21, '#fff'); badge(c2.type, W - 19, 93, '#fff', 'right');
      txt(c1.name, 18, 143, THEME.text, 12); txt(c1.bey, 18, 159, THEME.text, 6);
      txt(c2.name, W - 18, 57, THEME.text, 12, 'right'); txt(c2.bey, W - 18, 73, THEME.text, 6, 'right');
      drawBey(c1, 62, 190, S.t * 18, 14); drawBey(c2, 258, 42, -S.t * 18, 14);
      const pulse = motionOK() && blink(6) ? 30 : 24;
      disc(CX, 111, 27, '#080818'); circ(CX, 111, 28, THEME.gold);
      txt('VS', CX, 99 - (pulse - 24) / 4, THEME.gold, pulse, 'center', '#a0280a');
      rect(0, 214, W, 26, '#000000dd'); rect(0, 214, W, 2, st.rim);
      txt(st.name, CX, 221, st.rim, 8, 'center');
    },
  };

  scenes.battle = {
    update(dt) {
      const m = S.match;
      if (S.paused) {
        if (UP() || DOWN()) { S.pauseIdx ^= 1; Sound.sfx('move'); }
        if (BACK()) S.paused = false;
        else if (OK()) {
          Sound.sfx('select');
          S.paused = false;
          if (S.pauseIdx === 1) go('title');
        }
        return;
      }
      if (BACK() || any('KeyP')) { S.paused = true; S.pauseIdx = 0; Sound.sfx('back'); return; }
      m.t += dt;
      if (m.phase === 'launch') return updLaunch();
      if (m.phase === 'cutin') {
        m.cut.t += dt;
        if (m.cut.t >= 1.0) { applySpecial(m.cut.side); m.phase = 'fight'; }
        return;
      }
      if (m.phase === 'fight') m.time += dt;
      stepPhysics(dt);
      if (m.phase === 'fight') checkEnd();
      else if (m.phase === 'point') {
        m.pt.t += dt;
        if (m.pt.t > 2.8 || (m.pt.t > 1.3 && any('Enter'))) {
          if (m.score[0] >= 3 || m.score[1] >= 3) endMatch(); else newRound();
        }
      }
    },
    draw() { drawBattle(); },
  };

  function updLaunch() {
    const m = S.match, L = m.launch;
    for (let i = 0; i < 2; i++) if (L.lock[i] == null) L.val[i] = (Math.sin(m.t * 4.2 + L.ph[i]) + 1) / 2;
    const p1 = m.human2 ? any('Space') : any('Space', 'Enter');
    if (p1 && L.lock[0] == null) { L.lock[0] = L.val[0]; Sound.sfx('lock'); }
    if (m.human2) {
      if (any('Enter', 'NumpadEnter', 'ShiftRight') && L.lock[1] == null) { L.lock[1] = L.val[1]; Sound.sfx('lock'); }
    } else if (L.lock[1] == null && m.t > 0.9 && L.val[1] >= L.cpuTarget) {
      L.lock[1] = L.val[1];
    }
    const sec = Math.floor(m.t);
    if (sec !== L.said && sec < 3) { L.said = sec; Sound.sfx('count'); }
    if (m.t >= 3) {
      Sound.sfx('go');
      m.beys.forEach((b, i) => {
        const p = L.lock[i] ?? 0.4;
        b.spin = b.maxSpin * (0.6 + 0.4 * p);
        b.vx = 0;
        b.vy = (i === 0 ? -1 : 1) * (50 + 70 * p);
        spark(b.x, b.y, 12, ['#fff', b.ch.color, b.ch.color2], 90);
      });
      m.phase = 'fight';
      S.shake = 3;
    }
  }

  function drawSpecialMotif(kind, x, y, ch, t, flip = false) {
    const dir = flip ? -1 : 1;
    const pulse = motionOK() ? Math.floor(t * 12) % 3 : 1;
    G.save();
    G.translate(Math.round(x), Math.round(y));
    G.scale(dir, 1);
    if (kind === 'dash') {
      for (let i = 0; i < 3; i++) {
        const xx = i * 9 - pulse * 2;
        rect(xx - 4, -12 + i * 8, 15, 3, ch.accent); rect(xx + 7, -15 + i * 8, 3, 9, '#fff');
      }
    } else if (kind === 'wall') {
      for (let yy = -18; yy < 18; yy += 9) for (let xx = -18; xx < 18; xx += 12) rect(xx + ((yy / 9) % 2) * 5, yy, 10, 7, (xx + yy) % 3 ? ch.color2 : ch.accent);
      rect(-20, -20, 3, 41, '#fff'); rect(18, -20, 3, 41, '#fff');
    } else if (kind === 'absorb') {
      for (let i = 0; i < 3; i++) circ(0, 0, 8 + i * 7 + pulse, i === 1 ? ch.accent : ch.color2);
      rect(-2, -14, 4, 12, '#fff'); rect(-7, -5, 14, 4, '#fff');
    } else if (kind === 'fire') {
      for (let i = 0; i < 5; i++) {
        const xx = -18 + i * 9, hh = 16 + ((i + pulse) % 3) * 6;
        rect(xx, 17 - hh, 6, hh, i % 2 ? ch.accent : '#ff7a1a'); rect(xx + 1, 10 - hh, 4, 8, '#fff');
      }
    } else if (kind === 'heal') {
      circ(0, 0, 20 + pulse, ch.color2); circ(0, 0, 16, ch.accent);
      rect(-5, -17, 10, 34, '#fff'); rect(-17, -5, 34, 10, '#fff');
    } else if (kind === 'shock') {
      rect(-4, -21, 9, 13, '#fff'); rect(-10, -9, 13, 8, ch.accent);
      rect(-2, -2, 9, 8, '#fff'); rect(-8, 5, 13, 8, ch.accent); rect(-3, 12, 7, 10, '#fff');
    } else if (kind === 'slow') {
      circ(0, 0, 21, ch.color2); circ(0, 0, 17, ch.accent);
      rect(-2, -13, 4, 15, '#fff'); rect(0, -1, 12, 4, '#fff'); disc(0, 0, 3, ch.color);
      for (let i = 0; i < 4; i++) rect(-2 + Math.cos(i * TAU / 4) * 21, -2 + Math.sin(i * TAU / 4) * 21, 4, 4, '#fff');
    } else if (kind === 'vortex') {
      for (let i = 0; i < 4; i++) {
        const a = (motionOK() ? t * 7 : 0.7) + i * TAU / 4, rr = 7 + i * 5;
        rect(Math.cos(a) * rr - 3, Math.sin(a) * rr - 3, 7, 7, i % 2 ? ch.accent : ch.color2);
      }
      circ(0, 0, 23, '#fff'); disc(0, 0, 5, THEME.ink);
    } else if (kind === 'nemesis') {
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8, rr = 16 + pulse * 2;
        rect(Math.cos(a) * rr - 2, Math.sin(a) * rr - 2, 5, 5, i % 2 ? ch.accent : '#ff2a6b');
      }
      rect(-22, -2, 44, 5, ch.color2); disc(0, 0, 11, '#ff2a6b'); disc(0, 0, 5, '#fff'); disc(0, 0, 2, THEME.ink);
    }
    G.restore();
  }

  function drawBattleFx() {
    S.rings.forEach((r) => circ(r.x, r.y, r.r, r.c));
    const stride = effectsHigh() ? 1 : 3;
    S.parts.forEach((p, i) => { if (i % stride === 0) rect(p.x, p.y, p.s, p.s, p.c); });
    S.floats.forEach((f) => txt(f.text, f.x, f.y, f.c, 8, 'center'));
  }

  function drawBeyState(b) {
    if (b.burst) return;
    const sf = clamp(b.spin / b.maxSpin, 0, 1);
    G.save();
    if (b.out) {
      const s = Math.max(0, 1 - b.fall * 1.4);
      if (s > 0) {
        G.globalAlpha = s;
        drawBey(b.ch, b.x, b.y, b.ang, Math.max(2, b.r * s), { spinFactor: sf });
      }
      G.restore();
      return;
    }
    if (S.match.phase !== 'launch' && b.spin <= 0) {
      G.translate(Math.round(b.x), Math.round(b.y)); G.scale(1, 0.55);
      disc(1, 4, b.r, '#00000066');
      drawBey(b.ch, 0, 0, b.ang, b.r, { spinFactor: sf });
      G.restore();
      return;
    }
    if (b.fx.wall > 0) {
      for (let k = 0; k < 3; k++) circ(b.x, b.y, b.r + 4 + k * 3 + ((S.t * 30 + k) % 3), k % 2 ? b.ch.color2 : '#fff');
    }
    let glow = null;
    if (b.fx.dash > 0) glow = '#ffffff66';
    else if (b.fx.absorb > 0) glow = '#ff2a6b66';
    else if (b.fx.vortex > 0) glow = '#18c2a066';
    else if (b.fx.slow > 0) glow = '#9fe3ff66';
    if (effectsHigh() && sf > 0.65 && motionOK()) {
      const a = b.ang + Math.PI;
      rect(b.x + Math.cos(a) * 11, b.y + Math.sin(a) * 11, 3, 1, b.ch.color2);
    }
    disc(b.x + 1, b.y + 3, b.r, '#00000066');
    const wob = sf < 0.25 && S.match.phase !== 'launch' ? (0.25 - sf) * 10 : 0;
    drawBey(b.ch, b.x, b.y, b.ang, b.r, { glow, wob, spinFactor: sf });
    if (sf <= 0.2 && S.match.phase === 'fight' && blink(6)) circ(b.x, b.y, b.r + 3, THEME.red);
    G.restore();
  }

  function drawHUD() {
    const m = S.match;
    rect(0, 0, W, 37, THEME.ink);
    rect(0, 1, W, 34, THEME.glass);
    rect(0, 35, W, 2, THEME.edge);
    rect(CX - 27, 2, 54, 33, THEME.shade);
    rect(CX - 26, 3, 52, 31, THEME.panel2);
    for (let i = 0; i < 2; i++) {
      const b = m.beys[i], ch = m.chars[i], leftSide = i === 0;
      const fx = leftSide ? 4 : W - 28;
      const panelX = leftSide ? 2 : 190;
      const meterX = leftSide ? 65 : 191;
      const align = leftSide ? 'left' : 'right';
      const anchor = leftSide ? 35 : 285;
      const labelX = leftSide ? 35 : 285;
      const sideCol = leftSide ? THEME.p1 : THEME.p2;
      bevelPanel(panelX, 2, 128, 33, { fill: '#0c0c23', edge: ch.color, accent: sideCol });
      framedFace(ch, fx, 6, 2, !leftSide, ch.color);
      const who = m.human2 ? (leftSide ? 'J1' : 'J2') : leftSide ? 'TU' : 'CPU';
      txt(who + '  ' + ch.name, anchor, 5, sideCol, 7, align);
      const sf = clamp(b.spin / b.maxSpin, 0, 1);
      const spinCol = sf > 0.5 ? THEME.green : sf > 0.25 ? THEME.gold : THEME.red;
      txt('SPIN', labelX, 16, sf <= 0.25 && blink(6) ? THEME.red : THEME.muted, 6, align);
      segmentedMeter(meterX, 15, 64, 5, sf, spinCol, 8, !leftSide);
      const ready = b.meter >= 100;
      txt(ready ? 'PODER!' : 'PODER', labelX, 26, ready && blink(7) ? '#fff' : ready ? THEME.cyan : THEME.muted, 6, align);
      segmentedMeter(meterX, 25, 64, 5, b.meter / 100, ready ? THEME.cyan : '#1979d3', 8, !leftSide);
    }
    const left = Math.max(0, Math.ceil(60 - m.time));
    txt(m.score[0] + '-' + m.score[1], CX, 5, THEME.gold, 10, 'center');
    txt(left < 10 ? '0' + left : String(left), CX, 18, left <= 10 && blink(4) ? THEME.red : THEME.text, 8, 'center');
    txt('R' + m.round, CX, 28, THEME.muted, 6, 'center');
  }

  function drawLaunchOverlay(m) {
    const L = m.launch;
    rect(37, 53, W - 74, 130, '#05050fcc');
    bevelPanel(42, 57, W - 84, 122, { fill: '#0d0d25', edge: THEME.edge, accent: THEME.gold });
    txt('POTENCIA DE LLANCAMENT', CX, 65, THEME.gold, 8, 'center');
    separator(77, THEME.edge);
    for (let i = 0; i < 2; i++) {
      const leftSide = i === 0, x = leftSide ? 58 : 184, v = L.lock[i] ?? L.val[i];
      const col = v > 0.84 ? THEME.green : v > 0.5 ? THEME.gold : THEME.red;
      const lab = m.human2 ? (leftSide ? 'J1' : 'J2') : leftSide ? 'TU' : 'CPU';
      txt(lab, leftSide ? x : x + 78, 88, leftSide ? THEME.p1 : THEME.p2, 8, leftSide ? 'left' : 'right');
      segmentedMeter(x, 101, 78, 10, v, col, 10, !leftSide);
      txt(L.lock[i] == null ? Math.round(v * 100) + '%' : 'OK ' + Math.round(v * 100) + '%', leftSide ? x : x + 78, 116, L.lock[i] == null ? THEME.text : THEME.green, 7, leftSide ? 'left' : 'right');
    }
    const n = Math.max(1, 3 - Math.floor(m.t));
    badge(String(n), CX, 86, THEME.gold, 'center');
    rect(52, 136, W - 104, 1, THEME.edge);
    txt(m.human2 ? 'J1: ESPAI   J2: ENTER' : 'ESPAI / ENTER PER FIXAR', CX, 145, THEME.text, 7, 'center');
    txt('ATURA LA BARRA PROP DEL MAXIM', CX, 158, blink(3) ? THEME.gold : THEME.muted, 6, 'center');
  }

  function drawCutin(m) {
    const c = m.cut, ch = m.chars[c.side], enter = Math.min(1, c.t / 0.16);
    const y0 = 73, h = 94, leftSide = c.side === 0;
    rect(0, y0, W, h, '#03030eee');
    rect(0, y0 + 3, W, h - 6, ch.color + '44');
    if (motionOK()) {
      for (let i = 0; i < 16; i++) {
        const yy = y0 + 8 + ((i * 17) % (h - 16));
        const xx = ((i * 47 + c.t * 760) % (W + 70)) - 70;
        rect(leftSide ? xx : W - xx - 44, yy, 44, i % 3 === 0 ? 2 : 1, i % 2 ? ch.color2 : ch.accent);
      }
    }
    rect(0, y0, W, 3, ch.color); rect(0, y0 + h - 3, W, 3, ch.accent);
    const faceX = leftSide ? -78 + 88 * enter : W + 78 - 88 * enter - 72;
    framedFace(ch, faceX, y0 + 10, 6, !leftSide, ch.color);
    const textX = leftSide ? 93 : W - 93, align = leftSide ? 'left' : 'right';
    txt(ch.name, textX, y0 + 13, '#fff', 10, align);
    txt('PODER ESPECIAL', textX, y0 + 29, ch.accent, 6, align);
    G.font = '8px ' + FONT;
    const words = ch.special.name.split(' '), lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (G.measureText(next).width > 136 && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    lines.forEach((item, i) => txt(item, textX, y0 + 43 + i * 12, blink(9) ? THEME.gold : '#fff', 8, align));
    drawSpecialMotif(ch.special.kind, leftSide ? 272 : 48, y0 + 48, ch, c.t, !leftSide);
    segmentedMeter(101, y0 + h - 11, 118, 3, clamp(c.t, 0, 1), ch.accent, 12, !leftSide);
  }

  function drawPointOverlay(m) {
    const p = m.pt, burst = p.pts >= 2;
    const col = burst ? '#ff2a6b' : p.w < 0 ? THEME.muted : THEME.gold;
    rect(0, CY - 38, W, 70, '#03030edd');
    bevelPanel(28, CY - 34, W - 56, 62, { fill: '#111027', edge: col, accent: col });
    if (burst) {
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8, rr = motionOK() ? 23 + Math.min(9, p.t * 20) : 27;
        rect(CX + Math.cos(a) * rr - 2, CY - 4 + Math.sin(a) * rr - 2, 5, 5, col);
      }
    }
    txt(p.label, CX, CY - 27, col, burst ? 16 : 13, 'center', burst ? '#4a001d' : THEME.ink);
    if (p.w >= 0) {
      const ch = m.chars[p.w];
      txt(ch.name + '  +' + p.pts, CX, CY - 3, THEME.text, 8, 'center');
      segmentedMeter(CX - 38, CY + 10, 76, 4, m.score[p.w] / 3, ch.color, 3);
    } else txt('CAP PUNT', CX, CY + 1, THEME.text, 8, 'center');
  }

  function drawBattle() {
    const m = S.match;
    G.save();
    if (S.visual.shake && motionOK() && S.shake > 0) G.translate(Math.round(rnd(randomStreams.visual, -S.shake, S.shake)), Math.round(rnd(randomStreams.visual, -S.shake, S.shake)));
    G.drawImage(m.layer, 0, 0);
    stadiumOverlay(m.st);
    const trailStride = effectsHigh() ? 1 : 3;
    for (const b of m.beys) {
      if (b.burst || b.out) continue;
      b.trail.forEach((p, i) => { if (i % trailStride === 0) rect(p[0], p[1], effectsHigh() ? 2 : 1, 1, b.ch.color2); });
    }
    for (const p of m.proj) { disc(p.x, p.y, 3, '#ff7a1a'); disc(p.x, p.y, 1, '#ffe08a'); }
    m.beys.forEach(drawBeyState);
    drawBattleFx();
    rect(0, 37, 4, H - 37, '#05050f88'); rect(W - 4, 37, 4, H - 37, '#05050f88');
    rect(0, H - 9, W, 9, '#05050f88');
    G.restore();
    drawHUD();
    rect(0, 37, W, 1, THEME.hi);
    bevelPanel(CX - 55, H - 15, 110, 12, { fill: '#08081ccc', edge: THEME.edge });
    txt(m.st.name, CX, H - 12, THEME.muted, 6, 'center', null);

    if (m.phase === 'launch') drawLaunchOverlay(m);
    else if (m.phase === 'fight' && m.time < 1.1) {
      bevelPanel(CX - 78, CY - 25, 156, 35, { fill: '#09091ddd', edge: THEME.gold, accent: THEME.red });
      txt('LET IT RIP!', CX, CY - 17, blink(8) ? THEME.gold : THEME.text, 16, 'center', '#a0280a');
    }

    if (m.phase === 'cutin') drawCutin(m);
    if (m.phase === 'point') drawPointOverlay(m);

    if (S.paused) {
      rect(0, 0, W, H, '#03030ed9');
      bevelPanel(45, 55, 230, 130, { fill: THEME.panel, edge: THEME.edge, accent: THEME.gold });
      badge('JOC ATURAT', CX, 67, THEME.red, 'center');
      txt('PAUSA', CX, 85, THEME.gold, 16, 'center');
      separator(108, THEME.edge);
      menuList(['CONTINUAR', 'SORTIR AL MENU'], 126, S.pauseIdx, 22, 184);
      txt('ENTER: CONFIRMA  ESC: TORNA', CX, 169, THEME.muted, 6, 'center');
    }
  }

  scenes.result = {
    update() {
      const r = S.result;
      if (S.t < 0.8) return;
      if (OK()) {
        Sound.sfx('select');
        if (S.mode === 'tour') {
          if (r.w === 0) go('bracket'); else queueTourMatch();
        } else {
          const m = S.match;
          S.next = { c1: m.chars[0], c2: m.chars[1], st: m.st, opts: { human2: true } };
          go('vs'); Sound.sfx('vs');
        }
      }
      if (BACK()) { Sound.sfx('back'); go('title'); }
    },
    draw() {
      const r = S.result, winner = r.chars[r.w];
      const playerLost = S.mode === 'tour' && r.w === 1;
      const stateCol = playerLost ? THEME.red : THEME.gold;
      menuBG(playerLost ? '#19090f' : '#091a16');
      rect(0, 0, W, 4, stateCol);
      screenHeader(playerLost ? 'DERROTA' : 'VICTORIA', S.mode === 'pvp' ? 'DUEL PVP' : 'RESULTAT FINAL', stateCol);
      bevelPanel(22, 38, 276, 151, { fill: '#0d0d25', edge: stateCol, accent: winner.color });
      badge(playerLost ? 'FI DEL COMBAT' : 'GUANYADOR', CX, 46, stateCol, 'center');
      framedFace(winner, 44, 67, 7, false, stateCol);
      rect(143, 66, 1, 74, THEME.edge);
      drawBey(winner, 218, 96, motionOK() ? S.t * 16 : 0.7, 22, { glow: winner.color + '55' });
      txt(winner.name, 158, 126, THEME.text, 10);
      txt(winner.bey, 158, 141, winner.color2, 7);
      txt('MARCADOR', CX, 158, THEME.muted, 6, 'center');
      bevelPanel(CX - 48, 167, 96, 25, { fill: THEME.shade, edge: THEME.edge });
      txt(r.score[0] + ' - ' + r.score[1], CX, 172, stateCol, 16, 'center');
      const action = S.mode === 'pvp' ? 'ENTER: REVENJA' : playerLost ? 'ENTER: REINTENTAR' : 'ENTER: CONTINUAR';
      actionFooter(S.t > 0.8 && blink(2) ? action : '', 'ESC: MENU');
    },
  };

  scenes.champion = {
    update(dt) {
      if (motionOK() && randomStreams.visual() < dt * 5) spark(rnd(randomStreams.visual, 30, W - 30), rnd(randomStreams.visual, 30, 140), 30, ['#ffd400', '#ff3b3b', '#19d3ff', '#3ddc6a', '#fff'], 90, true);
      if (S.t > 1 && (OK() || BACK())) { Sound.sfx('select'); go('title'); }
    },
    draw() {
      menuBG('#171100');
      drawFx();
      const ch = S.tour.ch;
      rect(0, 0, W, 4, THEME.gold);
      screenHeader('CAMPIONAT MUNDIAL', 'TORNEIG COMPLET', THEME.gold);
      bevelPanel(24, 35, 272, 179, { fill: '#111027', edge: THEME.gold, accent: ch.color });
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + i * Math.PI / 6;
        rect(CX + Math.cos(a) * 89 - 2, 106 + Math.sin(a) * 64 - 2, 5, 5, i % 2 ? ch.accent : THEME.gold);
      }
      badge('NOU CAMPIO', CX, 43, THEME.gold, 'center');
      framedFace(ch, CX - 42, 58, 7, false, THEME.gold);
      drawBey(ch, CX + 65, 96, motionOK() ? S.t * 18 : 0.6, 17, { glow: ch.color + '55' });
      txt('CAMPIO!', CX, 145, THEME.gold, 20, 'center', '#6d2600');
      txt(ch.name + ' · ' + ch.bey, CX, 169, THEME.text, 7, 'center');
      txt('FINAL  ' + S.result.score[0] + ' - ' + S.result.score[1], CX, 181, THEME.muted, 6, 'center');
      if (S.newUnlock) {
        bevelPanel(38, 190, 244, 22, { fill: '#240d2b', edge: '#ff2a6b', accent: '#ff2a6b' });
        txt('DESBLOQUEJAT: RAGO + TEMPLE NEMESI', CX, 197, blink(4) ? '#ff7ac3' : THEME.text, 6, 'center');
      }
      actionFooter(S.t > 1 && blink(2) ? 'ENTER: MENU' : '', 'LLEGENDA COMPLETADA');
    },
  };

  /* ---------------- main loop ---------------- */
  function update(dt) {
    S.t += dt;
    if (any('KeyM')) Sound.toggleMute();
    scenes[S.scene].update(dt);
    if (!(S.scene === 'battle' && S.paused)) updFx(dt);
  }
  function draw() {
    G = ctx;
    G.imageSmoothingEnabled = false;
    cv.dataset.scene = S.scene;
    scenes[S.scene].draw();
    if (S.flash > 0 && motionOK()) {
      const strength = effectsHigh() ? 0.8 : 0.22;
      rect(0, 0, W, H, `rgba(255,255,255,${Math.min(strength, S.flash * (effectsHigh() ? 3 : 1.2))})`);
    }
    if (S.t < 0.16 && motionOK()) {
      const alpha = clamp(1 - S.t / 0.16, 0, 1);
      rect(0, 0, W, H, `rgba(5,5,15,${alpha})`);
      const reveal = Math.round((1 - alpha) * CX);
      rect(0, 0, CX - reveal, H, THEME.ink);
      rect(CX + reveal, 0, CX - reveal, H, THEME.ink);
    }
  }

  const STEP = 1 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
      for (const k in pressed) delete pressed[k];
    }
    draw();
    requestAnimationFrame(frame);
  }

  if (testMode) {
    const findBlader = (id) => BLADERS.find((ch) => ch.id === id);
    const findStadium = (id) => STADIUMS.find((st) => st.id === id);
    const clearInput = () => {
      for (const key in keys) delete keys[key];
      for (const key in pressed) delete pressed[key];
    };
    const testApi = {
      constants: Object.freeze({ W, H, CX, CY, R, STEP }),
      data: Object.freeze({ bladers: BLADERS, stadiums: STADIUMS }),
      visuals: Object.freeze({ face, drawBey, profile: BeyVisuals.getBey }),
      state: S,
      get unlocked() { return ragoUnlocked; },
      findBlader,
      findStadium,
      streamStates: () => Object.fromEntries(BeyRandom.STREAM_NAMES.map((name) => [name, randomStreams[name].getState()])),
      resetStreams(seed) { randomStreams = BeyRandom.createStreams(seed); return testApi.streamStates(); },
      resetStream(name, seed) {
        if (!BeyRandom.STREAM_NAMES.includes(name)) throw new Error(`Stream desconegut: ${name}`);
        randomStreams[name].reset(seed);
        return randomStreams[name].getState();
      },
      consume(name, count = 1) {
        if (!BeyRandom.STREAM_NAMES.includes(name)) throw new Error(`Stream desconegut: ${name}`);
        const values = [];
        for (let i = 0; i < count; i++) values.push(randomStreams[name]());
        return values;
      },
      setUnlocked(value, persist = false) {
        ragoUnlocked = !!value;
        if (persist) {
          try { localStorage.setItem('beyfury_rago', ragoUnlocked ? '1' : '0'); } catch (e) { /* test storage may reject */ }
        }
      },
      setMode(mode) { S.mode = mode; },
      startMatch(c1, c2, st, opts) {
        return startMatch(typeof c1 === 'string' ? findBlader(c1) : c1, typeof c2 === 'string' ? findBlader(c2) : c2,
          typeof st === 'string' ? findStadium(st) : st, opts);
      },
      makeBey(ch, x, y) { return makeBey(typeof ch === 'string' ? findBlader(ch) : ch, x, y); },
      newRound, playerInput, aiInput, hurt, moveBey, collide, shock, triggerSpecial, applySpecial, stepPhysics,
      award, checkEnd, endMatch, setupTour(ch) { return setupTour(typeof ch === 'string' ? findBlader(ch) : ch); },
      queueTourMatch, updLaunch, update, draw, go,
      press(code) { pressed[code] = true; keys[code] = true; },
      hold(code) { keys[code] = true; },
      release(code) { keys[code] = false; },
      clearInput,
      step(frames = 1) {
        for (let i = 0; i < frames; i++) {
          update(STEP);
          for (const key in pressed) delete pressed[key];
        }
      },
    };
    Object.defineProperty(globalThis, 'BEY_BATTLE_TEST_API', { value: testApi, configurable: true });
  }

  go('title');
  cv.focus();
  const begin = () => requestAnimationFrame((t) => { last = t; frame(t); });
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1500))]).then(begin, begin);
  } else begin();
})();
