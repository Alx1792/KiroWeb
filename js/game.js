'use strict';
/* BEY BATTLE: METAL FURY - retro pixel PvP spinning-top game. */
(() => {
  const W = 320, H = 240, CX = 160, CY = 137, R = 88;
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const FONT = '"Press Start 2P", monospace';
  let G = ctx; // current draw target (swapped when caching layers)

  /* ---------------- helpers ---------------- */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const angDiff = (a, b) => {
    let d = (a - b) % TAU;
    if (d < -Math.PI) d += TAU;
    if (d > Math.PI) d -= TAU;
    return Math.abs(d);
  };
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
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
  const blink = (rate = 3) => Math.floor(S.t * rate) % 2 === 0;

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
  };
  let ragoUnlocked = false;
  try { ragoUnlocked = localStorage.getItem('beyfury_rago') === '1'; } catch (e) { /* private mode */ }
  const roster = () => BLADERS.filter((b) => !b.boss || ragoUnlocked);
  const stageList = () => STADIUMS.filter((s) => !s.boss || ragoUnlocked);

  const MUSIC = { title: 'menu', controls: 'menu', select: 'menu', stage: 'menu', bracket: 'menu', vs: null, result: null, champion: null };
  function go(scene) {
    S.scene = scene; S.t = 0; S.menu = 0;
    if (scene in MUSIC) Sound.music(MUSIC[scene]);
  }

  /* ---------------- effects ---------------- */
  function spark(x, y, n, cols, sp = 80, big = false) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), v = rnd(sp * 0.3, sp);
      S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.2, 0.7), c: pick(cols), s: big && Math.random() < 0.5 ? 2 : 1 });
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
  const FACES = {
    spiky: [
      '.h.h..h.h.h.', 'hhhhhhhhhhhh', 'hhhhhhhhhhhh', 'hhsssssssshh',
      'hsseessseesh', '.ssssssssss.', '.sssssmssss.', '..ssmmmmss..',
      '...ssssss...', '..cccccccc..', '.cccckkcccc.', 'cccccccccccc',
    ],
    long: [
      '...hhhhhh...', '..hhhhhhhh..', '.hhhhhhhhhh.', 'hhhsssssshhh',
      'hhseessseesh', 'hhsssssssshh', 'hhsssssmsshh', 'hh.smmmms.hh',
      'hh.ssssss.hh', 'hhcccccccchh', 'h.cccckkccc.', 'cccccccccccc',
    ],
  };
  const faceCache = {};
  function face(ch) {
    if (faceCache[ch.id]) return faceCache[ch.id];
    const c = document.createElement('canvas'); c.width = 12; c.height = 12;
    const g = c.getContext('2d');
    const map = { h: ch.hair, s: ch.skin, e: ch.eye || '#141428', m: '#8a3a3a', c: ch.cloth, k: ch.clothK };
    FACES[ch.style].forEach((row, y) => {
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
  function drawBey(ch, x, y, ang, r, o = {}) {
    if (o.wob) { x += Math.cos(S.t * 14) * o.wob; y += Math.sin(S.t * 11) * o.wob; }
    if (o.glow) disc(x, y, r + 3, o.glow);
    disc(x, y, r, '#0a0a14');
    disc(x, y, r - 1, ch.color);
    const n = r > 14 ? 10 : 6, s = r > 14 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const a = ang + (i * TAU) / n;
      rect(x + Math.cos(a) * (r - 2) - s / 2, y + Math.sin(a) * (r - 2) - s / 2, s, s, ch.accent);
    }
    disc(x, y, Math.max(1, Math.round(r * 0.55)), ch.color2);
    const bw = r > 14 ? 2 : 1;
    for (let i = 0; i < 3; i++) {
      const a = ang * 0.7 + (i * TAU) / 3;
      for (let t = r * 0.18; t < r * 0.55; t += 1) rect(x + Math.cos(a) * t, y + Math.sin(a) * t, bw, bw, ch.color);
    }
    disc(x, y, Math.max(1, Math.round(r * 0.18)), '#ffffff');
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
    if (st.hazard === 'lava') {
      for (let i = 0; i < 8; i++) {
        const a = S.t * 0.25 + i * 0.785, rr = R - 8 + Math.sin(S.t * 3 + i) * 5;
        rect(CX + Math.cos(a) * rr, CY + Math.sin(a) * rr, 2, 2, blink(6 + i) ? '#ffd400' : '#ff7a1a');
      }
    } else if (st.hazard === 'hole') {
      circ(CX, CY, 15 + ((S.t * 12) % 8), '#ff2a6b');
    } else if (st.hazard === 'ice') {
      const rng = mulberry(Math.floor(S.t * 4));
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
    m.launch = { ph: [rnd(0, TAU), rnd(0, TAU)], val: [0, 0], lock: [null, null],
      cpuTarget: clamp(rnd(0.5, 0.75) + m.lvl * 0.2, 0, 0.97), said: -1 };
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
    if (ai.jt <= 0) { ai.jt = rnd(0.2, 0.6); ai.jx = rnd(-1, 1) * (1 - lvl) * 0.9; ai.jy = rnd(-1, 1) * (1 - lvl) * 0.9; }
    tx += ai.jx; ty += ai.jy;
    const l = Math.hypot(tx, ty) || 1, mag = 0.55 + 0.45 * lvl;
    out.x = (tx / l) * mag; out.y = (ty / l) * mag;
    if (!opAlive) { out.x = (cx / dc) * 0.5; out.y = (cy / dc) * 0.5; }
    if (me.meter >= 100 && opAlive && Math.random() < 0.02 + lvl * 0.04) {
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
      if (Math.random() < 0.3) spark(me.x, me.y, 1, ['#18c2a0', '#fff'], 30);
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
      if (Math.random() < 0.5) {
        const k = Math.random();
        S.parts.push({ x: op.x + (me.x - op.x) * k, y: op.y + (me.y - op.y) * k, vx: 0, vy: 0, life: 0.25, c: me.ch.color2, s: 1 });
      }
    }
    const d = Math.hypot(me.x - CX, me.y - CY);
    if (alive && st.hazard === 'lava' && d > R - 16) {
      me.spin -= 75 * dt;
      if (Math.random() < 0.25) spark(me.x, me.y, 1, ['#ff7a1a', '#ffd400'], 40);
    }
    if (alive && st.hazard === 'hole' && d < 15) {
      me.spin -= 150 * dt;
      if (Math.random() < 0.3) spark(me.x, me.y, 1, ['#ff2a6b', '#8a1aa0'], 40);
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
      (att.fx.dash > 0 ? 2.3 : 1) * (att.fx.wall > 0 ? 1.6 : 1) * (def.fx.wall > 0 ? 0.25 : 1) * rnd(0.85, 1.15);
    const dB = dmg(a, b), dA = dmg(b, a);
    hurt(b, dB, a); hurt(a, dA, b);
    a.meter = Math.min(100, a.meter + 9); b.meter = Math.min(100, b.meter + 9);
    const px = a.x + nx * a.r, py = a.y + ny * a.r;
    spark(px, py, 6 + Math.min(14, (impact / 12) | 0), ['#fff', '#ffd400', a.ch.color, b.ch.color], 120);
    S.shake = Math.max(S.shake, Math.min(5, impact / 40));
    Sound.sfx('hit', clamp(impact / 180, 0.3, 1));
    if (impact > 150) floatText('CLASH!', px, py - 12, '#fff', 0.6);
    for (const [v, dd] of [[b, dB], [a, dA]]) {
      if (m.pendingBurst == null && v.spin > 0 && dd > 75 && v.spin < v.maxSpin * 0.4 && Math.random() < 0.15) {
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
      if (Math.random() < 0.6) S.parts.push({ x: p.x, y: p.y, vx: rnd(-10, 10), vy: rnd(-10, 10), life: 0.3, c: pick(['#ff7a1a', '#ffd400']), s: 1 });
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
    const others = shuffle(BLADERS.filter((b) => !b.boss && b.id !== ch.id && b.id !== boss.id)).slice(0, 3);
    const stages = shuffle(STADIUMS.filter((s) => !s.boss)).slice(0, 3).concat([STADIUMS.find((s) => s.boss)]);
    S.tour = { ch, opps: [...others, boss], stages, round: 0 };
  }
  function queueTourMatch() {
    const T = S.tour;
    S.next = { c1: T.ch, c2: T.opps[T.round], st: T.stages[T.round], opts: { lvl: [0.45, 0.65, 0.85, 1][T.round] } };
    go('vs');
    Sound.sfx('vs');
  }

  /* ---------------- scenes ---------------- */
  const STARS = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 0.8 + 0.2 }));
  function menuBG(c1 = '#0b0b24') {
    rect(0, 0, W, H, c1);
    for (const s of STARS) {
      let x = (s.x - S.t * 25 * s.s) % W; if (x < 0) x += W;
      rect(x, s.y, s.s > 0.7 ? 2 : 1, 1, s.s > 0.7 ? '#ffffff' : '#4a4a8a');
    }
    for (let i = 0; i < 6; i++) {
      const y = 200 + i * i * 1.4 + ((S.t * 10) % 6);
      rect(0, y, W, 1, '#2a1a5a');
    }
  }
  function logo(y) {
    const bob = Math.round(Math.sin(S.t * 3) * 2);
    txt('BEY BATTLE', CX, y + bob, '#ffd400', 24, 'center', '#a0280a');
    txt('METAL FURY', CX, y + 30, '#ff3b3b', 16, 'center', '#300');
  }
  function menuList(items, y, sel, gap = 16) {
    items.forEach((it, i) => {
      const on = i === sel;
      txt((on ? '> ' : '  ') + it, CX, y + i * gap, on ? (blink(4) ? '#ffd400' : '#fff') : '#8a8acc', 8, 'center');
    });
  }
  function menuNav(n) {
    if (UP()) { S.menu = (S.menu - 1 + n) % n; Sound.sfx('move'); }
    if (DOWN()) { S.menu = (S.menu + 1) % n; Sound.sfx('move'); }
  }
  function statBar(label, v, x, y, col) {
    txt(label, x, y, '#aab', 8);
    rect(x + 34, y, 82, 7, '#000');
    rect(x + 35, y + 1, Math.round(80 * clamp((v - 0.6) / 0.9, 0.05, 1)), 5, col);
  }

  const scenes = {};

  scenes.title = {
    update() {
      menuNav(3);
      if (OK()) {
        Sound.sfx('select');
        if (S.menu === 0) { S.mode = 'tour'; S.picks = []; go('select'); }
        else if (S.menu === 1) { S.mode = 'pvp'; S.picks = []; go('select'); }
        else go('controls');
      }
    },
    draw() {
      menuBG();
      logo(18);
      const peg = BLADERS[0], dra = BLADERS[2];
      const oa = S.t * 1.4;
      drawBey(dra, CX + Math.cos(oa) * 54, 112 + Math.sin(oa) * 14, -S.t * 20, 9);
      drawBey(peg, CX, 112, S.t * 18, 22);
      menuList(['1 JUGADOR - TORNEIG', '2 JUGADORS - PVP', 'CONTROLS'], 152, S.menu);
      if (blink(2)) txt('PREM ENTER', CX, 204, '#fff', 8, 'center');
      txt('M: MUSICA ' + (Sound.muted ? 'OFF' : 'ON'), CX, 222, '#6a6aaa', 8, 'center');
    },
  };

  scenes.controls = {
    update() { if (OK() || BACK()) { Sound.sfx('back'); go('title'); } },
    draw() {
      menuBG();
      txt('COM ES JUGA', CX, 12, '#ffd400', 16, 'center');
      const L = [
        ['#6f9bff', 'J1: WASD MOURE, ESPAI PODER'],
        ['#ff7a7a', 'J2: FLETXES, ENTER PODER'],
        ['#fff', 'LLANCAMENT: PREM QUAN LA'],
        ['#fff', 'BARRA ESTIGUI A DALT!'],
        ['#ffd400', 'RING OUT ........ 1 PUNT'],
        ['#ffd400', 'SPIN FINISH ..... 1 PUNT'],
        ['#ffd400', 'BURST FINISH .... 2 PUNTS'],
        ['#19d3ff', 'COPEJA PER CARREGAR EL'],
        ['#19d3ff', 'PODER ESPECIAL (BARRA BLAVA)'],
        ['#fff', 'GUANYA QUI ARRIBA A 3 PUNTS'],
        ['#aab', 'ESC: PAUSA   M: MUSICA'],
      ];
      L.forEach(([c, s], i) => txt(s, 18, 42 + i * 16, c));
      if (blink(2)) txt('ENTER: TORNAR', CX, 222, '#fff', 8, 'center');
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
      txt('TRIA ' + who, CX, 8, S.picks.length && S.mode === 'pvp' ? '#ff7a7a' : '#ffd400', 8, 'center');
      list.forEach((ch, i) => {
        const x = 12 + (i % 3) * 44, y = 30 + Math.floor(i / 3) * 44;
        const on = i === S.cursor;
        const border = on ? (blink(5) ? '#ffd400' : '#fff') : '#3a3a7a';
        framedFace(ch, x, y, 3, false, border);
        if (S.picks[0] === ch && S.mode === 'pvp') txt('J1', x + 1, y + 1, '#6f9bff', 8, 'left');
      });
      const ch = list[S.cursor];
      const px = 150;
      rect(px - 4, 26, W - px, 204, '#0a0a20');
      rect(px - 4, 26, 1, 204, '#3a3a7a');
      txt(ch.name, px, 32, '#fff', 16);
      txt(ch.bey, px, 52, ch.color === '#4a4a6a' || ch.color === '#4a1a6b' ? ch.color2 : ch.color, 8);
      txt('TIPUS: ' + ch.type, px, 64, '#aab', 8);
      statBar('ATK', ch.atk, px, 80, '#ff3b3b');
      statBar('DEF', ch.def, px, 92, '#3ddc6a');
      statBar('RES', ch.sta, px, 104, '#19d3ff');
      statBar('VEL', ch.spd, px, 116, '#ffd400');
      txt('PODER:', px, 132, '#19d3ff', 8);
      wrapTxt(ch.special.name, px, 144, 160, '#fff', 8, 11);
      if (ch.left) txt('GIR ESQUERRE!', px, 168, '#ffb000', 8);
      drawBey(ch, 268, 196, S.t * 16 * (ch.left ? -1 : 1), 20);
      txt('ENTER: TRIAR  ESC: ENRERE', CX, 228, '#6a6aaa', 8, 'center');
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
      const st = stageList()[S.stIdx];
      menuBG('#100a2a');
      txt('TRIA ESTADI', CX, 8, '#ffd400', 8, 'center');
      const layer = stadiumLayer(st);
      const sz = 2 * (R + 12);
      G.drawImage(layer, CX - R - 12, CY - R - 12, sz, sz, CX - 75, 26, 150, 150);
      txt('<', 50, 96, blink(3) ? '#fff' : '#ffd400', 16, 'center');
      txt('>', 270, 96, blink(3) ? '#fff' : '#ffd400', 16, 'center');
      txt(st.name, CX, 184, '#fff', 8, 'center');
      txt(st.desc, CX, 198, st.rim, 8, 'center');
      txt('ENTER: LLUITAR  ESC: ENRERE', CX, 226, '#6a6aaa', 8, 'center');
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
      txt('TORNEIG METAL FURY', CX, 8, '#ffd400', 8, 'center');
      T.opps.forEach((op, i) => {
        const y = 26 + i * 46;
        const done = i < T.round, cur = i === T.round;
        rect(14, y, W - 28, 42, cur ? '#2a1a5a' : '#120a2a');
        rect(14, y, 3, 42, cur ? '#ffd400' : done ? '#3ddc6a' : '#3a3a7a');
        framedFace(op, 24, y + 3, 3, true, cur ? '#ffd400' : '#3a3a7a');
        txt(TOUR_LABELS[i], 68, y + 5, cur ? '#ffd400' : '#8a8acc');
        txt(op.name + ' - ' + op.bey, 68, y + 17, '#fff');
        txt(T.stages[i].name, 68, y + 29, T.stages[i].rim);
        if (done) txt('OK!', W - 22, y + 16, '#3ddc6a', 8, 'right');
        else if (cur && blink(3)) txt('ARA', W - 22, y + 16, '#ffd400', 8, 'right');
      });
      txt('ENTER: LLUITAR', CX, 216, blink(2) ? '#fff' : '#ffd400', 8, 'center');
      txt('JUGUES AMB ' + T.ch.name, CX, 228, '#6a6aaa', 8, 'center');
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
      rect(0, 0, W, H, '#000');
      const slide = Math.min(1, S.t * 3);
      for (let y = 0; y < H; y++) {
        const x = CX + (y - H / 2) * 0.35;
        rect(0, y, x, 1, c1.color === '#4a4a6a' ? '#2a2a4a' : c1.color);
        rect(x, y, W - x, 1, c2.color);
      }
      for (let i = 0; i < 18; i++) {
        const y = (i * 37 + S.t * 400) % H;
        rect(0, y, W, 1, '#ffffff22');
      }
      const s = 6, fx = -90 + 110 * slide;
      framedFace(c1, fx, 46, s, false, '#fff');
      framedFace(c2, W - fx - 12 * s, 46, s, true, '#fff');
      txt(c1.name, 22, 132, '#fff', 16);
      txt(c1.bey, 22, 152, '#fff', 8);
      txt(c2.name, W - 22, 170, '#fff', 16, 'right');
      txt(c2.bey, W - 22, 190, '#fff', 8, 'right');
      const pulse = 24 + (blink(6) ? 8 : 0);
      txt('VS', CX, 96 - pulse / 4, '#ffd400', pulse, 'center', '#a0280a');
      rect(0, 212, W, 28, '#000000aa');
      txt(st.name, CX, 222, st.rim, 8, 'center');
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

  function drawBeyState(b) {
    if (b.burst) return;
    const sf = clamp(b.spin / b.maxSpin, 0, 1);
    if (b.out) {
      const s = Math.max(0, 1 - b.fall * 1.4);
      if (s <= 0) return;
      G.globalAlpha = s;
      drawBey(b.ch, b.x, b.y, b.ang, Math.max(2, b.r * s));
      G.globalAlpha = 1;
      return;
    }
    if (S.match.phase !== 'launch' && b.spin <= 0) {
      G.save(); G.translate(Math.round(b.x), Math.round(b.y)); G.scale(1, 0.55);
      drawBey(b.ch, 0, 0, b.ang, b.r);
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
    disc(b.x + 1, b.y + 3, b.r, '#00000066');
    const wob = sf < 0.25 && S.match.phase !== 'launch' ? (0.25 - sf) * 10 : 0;
    drawBey(b.ch, b.x, b.y, b.ang, b.r, { glow, wob });
  }

  function drawHUD() {
    const m = S.match;
    rect(0, 0, W, 32, '#05050f');
    rect(0, 32, W, 1, '#3a3a6a');
    for (let i = 0; i < 2; i++) {
      const b = m.beys[i], ch = m.chars[i], L = i === 0;
      const fx = L ? 4 : W - 4 - 24;
      framedFace(ch, fx, 4, 2, !L, ch.color);
      const bx = L ? 32 : W - 32 - 108;
      const who = m.human2 ? (L ? 'J1 ' : 'J2 ') : L ? 'TU ' : 'CPU ';
      txt(who + ch.name, L ? bx : bx + 108, 3, L ? '#6f9bff' : '#ff7a7a', 8, L ? 'left' : 'right');
      const sf = clamp(b.spin / b.maxSpin, 0, 1);
      rect(bx, 13, 108, 7, '#222');
      const sw = Math.round(106 * sf);
      rect(L ? bx + 1 : bx + 107 - sw, 14, sw, 5, sf > 0.5 ? '#3ddc6a' : sf > 0.25 ? '#ffd400' : '#ff3b3b');
      rect(bx, 22, 108, 6, '#222');
      const mw = Math.round(106 * b.meter / 100), full = b.meter >= 100;
      rect(L ? bx + 1 : bx + 107 - mw, 23, mw, 4, full ? (blink(8) ? '#fff' : '#19d3ff') : '#1979d3');
    }
    txt(m.score[0] + '-' + m.score[1], CX, 4, '#ffd400', 8, 'center');
    const left = Math.max(0, Math.ceil(60 - m.time));
    txt(String(left), CX, 14, left <= 10 ? '#ff3b3b' : '#fff', 8, 'center');
    txt('R' + m.round, CX, 24, '#6a6aaa', 8, 'center');
  }

  function drawBattle() {
    const m = S.match;
    G.save();
    if (S.shake > 0) G.translate(Math.round(rnd(-S.shake, S.shake)), Math.round(rnd(-S.shake, S.shake)));
    G.drawImage(m.layer, 0, 0);
    stadiumOverlay(m.st);
    for (const b of m.beys) {
      if (b.burst || b.out) continue;
      b.trail.forEach((p, i) => { if (i % 2 === 0) rect(p[0], p[1], 1, 1, b.ch.color2); });
    }
    for (const p of m.proj) { disc(p.x, p.y, 3, '#ff7a1a'); disc(p.x, p.y, 1, '#ffe08a'); }
    m.beys.forEach(drawBeyState);
    drawFx();
    G.restore();
    drawHUD();
    txt(m.st.name, CX, 230, '#ffffff55', 8, 'center', null);

    if (m.phase === 'launch') {
      const L = m.launch;
      for (let i = 0; i < 2; i++) {
        const x = i === 0 ? 10 : W - 18, y = 64, h = 120;
        const v = L.lock[i] ?? L.val[i];
        rect(x - 1, y - 1, 10, h + 2, '#000');
        rect(x, y, 8, h, '#222');
        rect(x, y + h - Math.round(h * v), 8, Math.round(h * v), v > 0.85 ? '#3ddc6a' : v > 0.5 ? '#ffd400' : '#ff3b3b');
        rect(x - 2, y + h - Math.round(h * v) - 1, 12, 2, '#fff');
        const lab = m.human2 ? (i === 0 ? 'J1' : 'J2') : i === 0 ? 'TU' : 'CPU';
        txt(lab, x + 4, y - 12, i === 0 ? '#6f9bff' : '#ff7a7a', 8, 'center');
        if (L.lock[i] != null) txt('OK', x + 4, y + h + 4, '#3ddc6a', 8, 'center');
      }
      const n = 3 - Math.floor(m.t);
      txt(String(n), CX, CY - 40, '#ffd400', 24, 'center', '#a0280a');
      if (blink(3)) {
        txt(m.human2 ? 'ESPAI / ENTER:' : 'ESPAI:', CX, CY + 26, '#fff', 8, 'center');
        txt('LLANCA AMB FORCA!', CX, CY + 38, '#fff', 8, 'center');
      }
    } else if (m.phase === 'fight' && m.time < 1.1) {
      txt('LET IT RIP!', CX, CY - 12, blink(8) ? '#ffd400' : '#fff', 16, 'center', '#a0280a');
    }

    if (m.phase === 'cutin') {
      const c = m.cut, ch = m.chars[c.side], k = Math.min(1, c.t * 5);
      const y0 = 78, h = 84;
      rect(0, y0, W, h, '#000000cc');
      for (let i = 0; i < 14; i++) {
        const y = y0 + ((i * 13) % h), x = (i * 53 + c.t * 900) % (W + 60) - 60;
        rect(c.side === 0 ? x : W - x, y, 40, 1, ch.color2);
      }
      rect(0, y0, W, 2, ch.color); rect(0, y0 + h - 2, W, 2, ch.color);
      const fx = c.side === 0 ? -80 + 96 * k : W + 80 - 96 * k - 72;
      framedFace(ch, fx, y0 + 6, 6, c.side === 1, ch.color);
      const tx = c.side === 0 ? 100 : W - 100;
      txt(ch.name + ':', tx, y0 + 16, '#fff', 8, c.side === 0 ? 'left' : 'right');
      G.font = '8px ' + FONT;
      const name = ch.special.name;
      if (c.side === 0) wrapTxt(name, tx, y0 + 32, 210, blink(8) ? '#ffd400' : '#fff', 8, 12);
      else {
        const words = name.split(' ');
        const lines = [];
        let line = '';
        for (const w of words) {
          const t = line ? line + ' ' + w : w;
          if (G.measureText(t).width > 210 && line) { lines.push(line); line = w; } else line = t;
        }
        lines.push(line);
        lines.forEach((l, i) => txt(l, tx, y0 + 32 + i * 12, blink(8) ? '#ffd400' : '#fff', 8, 'right'));
      }
    }

    if (m.phase === 'point') {
      const p = m.pt;
      const col = p.pts >= 2 ? '#ff2a6b' : p.w < 0 ? '#aab' : '#ffd400';
      rect(0, CY - 28, W, 48, '#000000aa');
      txt(p.label, CX, CY - 22, col, 16, 'center', '#300');
      if (p.w >= 0) txt(m.chars[p.w].name + ' +' + p.pts, CX, CY + 2, '#fff', 8, 'center');
      else txt('CAP PUNT', CX, CY + 2, '#fff', 8, 'center');
    }

    if (S.paused) {
      rect(0, 0, W, H, '#000000bb');
      txt('PAUSA', CX, 80, '#ffd400', 16, 'center');
      menuList(['CONTINUAR', 'SORTIR AL MENU'], 116, S.pauseIdx);
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
      const r = S.result, ch = r.chars[r.w];
      menuBG(r.w === 0 || S.mode === 'pvp' ? '#0a1a10' : '#1a0a0a');
      const playerLost = S.mode === 'tour' && r.w === 1;
      txt(playerLost ? 'HAS PERDUT...' : 'VICTORIA!', CX, 16, playerLost ? '#ff3b3b' : '#ffd400', 16, 'center');
      framedFace(ch, CX - 36, 46, 6, false, '#ffd400');
      drawBey(ch, CX + 60, 82, S.t * 16, 14);
      txt('GUANYA ' + ch.name, CX, 130, '#fff', 8, 'center');
      txt(ch.bey, CX, 142, ch.color2, 8, 'center');
      txt(r.score[0] + ' - ' + r.score[1], CX, 160, '#ffd400', 16, 'center');
      let a = 'ENTER: CONTINUAR';
      if (S.mode === 'pvp') a = 'ENTER: REVENJA';
      else if (playerLost) a = 'ENTER: REINTENTAR';
      if (S.t > 0.8 && blink(2)) txt(a, CX, 196, '#fff', 8, 'center');
      txt('ESC: MENU', CX, 212, '#6a6aaa', 8, 'center');
    },
  };

  scenes.champion = {
    update(dt) {
      if (Math.random() < dt * 5) spark(rnd(30, W - 30), rnd(30, 140), 30, ['#ffd400', '#ff3b3b', '#19d3ff', '#3ddc6a', '#fff'], 90, true);
      if (S.t > 1 && (OK() || BACK())) { Sound.sfx('select'); go('title'); }
    },
    draw() {
      menuBG('#1a1400');
      drawFx();
      txt('CAMPIO!', CX, 14, '#ffd400', 24, 'center', '#a0280a');
      const ch = S.tour.ch;
      framedFace(ch, CX - 36, 54, 6, false, '#ffd400');
      txt(ch.name + ' ES EL MILLOR', CX, 140, '#fff', 8, 'center');
      txt('BLADER DEL MON!', CX, 152, '#fff', 8, 'center');
      if (S.newUnlock) txt('NOU BLADER: RAGO!', CX, 172, blink(4) ? '#ff2a6b' : '#fff', 8, 'center');
      if (S.newUnlock) txt('NOU ESTADI: TEMPLE NEMESI', CX, 184, '#ff2a6b', 8, 'center');
      if (S.t > 1 && blink(2)) txt('ENTER: MENU', CX, 214, '#fff', 8, 'center');
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
    scenes[S.scene].draw();
    if (S.flash > 0) rect(0, 0, W, H, `rgba(255,255,255,${Math.min(0.8, S.flash * 3)})`);
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

  go('title');
  cv.focus();
  const begin = () => requestAnimationFrame((t) => { last = t; frame(t); });
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1500))]).then(begin, begin);
  } else begin();
})();
