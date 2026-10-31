'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const BeyRandom = require('../js/random.js');

const root = path.resolve(__dirname, '..');
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const randomSource = source('js/random.js');
const dataSource = source('js/data.js');
const visualsSource = source('js/visuals.js');
const gameSource = source('js/game.js');
const BeyVisuals = require('../js/visuals.js');

function canvasContext(commands = []) {
  return {
    fillStyle: '', font: '', textAlign: '', textBaseline: '', globalAlpha: 1, imageSmoothingEnabled: false,
    fillRect(...args) { commands.push(['fillRect', this.fillStyle, ...args]); },
    fillText(...args) { commands.push(['fillText', this.fillStyle, ...args]); },
    save() { commands.push(['save']); }, restore() { commands.push(['restore']); },
    translate(...args) { commands.push(['translate', ...args]); }, scale(...args) { commands.push(['scale', ...args]); },
    drawImage(...args) { commands.push(['drawImage', ...args.slice(1)]); },
    measureText(text) { return { width: String(text).length * 8 }; },
  };
}

function makeCanvas() {
  const commands = [];
  const context = canvasContext(commands);
  return {
    width: 320, height: 240, dataset: {}, commands,
    getContext() { return context; },
    addEventListener() {}, focus() {},
  };
}

function loadGame({ seed = 0x12345678, stored = null, testMode = true } = {}) {
  const canvas = makeCanvas();
  const storage = new Map(stored == null ? [] : [['beyfury_rago', stored]]);
  const listeners = {};
  const soundCalls = [];
  const context = vm.createContext({
    console,
    BEY_BATTLE_TEST: testMode,
    BEY_BATTLE_SEED: seed,
    document: {
      getElementById(id) { return id === 'game' ? canvas : null; },
      createElement(tag) { if (tag !== 'canvas') throw new Error(`Element inesperat: ${tag}`); return makeCanvas(); },
    },
    matchMedia() { return { matches: false }; },
    addEventListener(type, handler) { listeners[type] = handler; },
    requestAnimationFrame() { return 1; },
    performance: { now() { return 0; } },
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
    },
    Sound: {
      muted: false,
      init() { soundCalls.push(['init']); },
      music(name) { soundCalls.push(['music', name]); },
      sfx(name, value) { soundCalls.push(['sfx', name, value]); },
      toggleMute() { this.muted = !this.muted; soundCalls.push(['mute']); },
    },
  });
  vm.runInContext(randomSource, context, { filename: 'js/random.js' });
  vm.runInContext(dataSource, context, { filename: 'js/data.js' });
  vm.runInContext(visualsSource, context, { filename: 'js/visuals.js' });
  vm.runInContext(gameSource, context, { filename: 'js/game.js' });
  return { context, api: context.BEY_BATTLE_TEST_API, canvas, storage, listeners, soundCalls };
}

const near = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} ≉ ${expected}`);
const rounded = (value) => Number(value.toFixed(6));

function prepareFight(api, first = 'gingka', second = 'kyoya', options = { human2: true }) {
  api.startMatch(first, second, 'classic', options);
  const match = api.state.match;
  match.phase = 'fight';
  match.time = 0;
  match.hitCd = 0;
  for (const bey of match.beys) bey.spin = bey.maxSpin;
  return match;
}

test('visual catalog defines nine unique explicit 12x12 portraits', () => {
  const ids = ['gingka', 'kyoya', 'ryuga', 'kenta', 'chris', 'king', 'aguma', 'dynamis', 'rago'];
  assert.deepEqual(Object.keys(BeyVisuals.PORTRAITS), ids);
  assert.deepEqual(BeyVisuals.validatePortraits(), []);
  const valid = new Set(Object.keys(BeyVisuals.LEGEND));
  const maps = [];
  for (const id of ids) {
    const portrait = BeyVisuals.PORTRAITS[id];
    assert.equal(portrait.length, 12, `${id} has twelve rows`);
    portrait.forEach((row) => {
      assert.equal(row.length, 12, `${id} rows are twelve pixels wide`);
      for (const pixel of row) assert.ok(valid.has(pixel), `${id} uses known pixel '${pixel}'`);
    });
    for (const required of ['h', 's', 'e', 'm', 'c', 'k']) assert.ok(portrait.join('').includes(required), `${id} has ${BeyVisuals.LEGEND[required]}`);
    maps.push(portrait.join('\n'));
  }
  assert.equal(new Set(maps).size, 9, 'no portrait shares a template');
  assert.equal(BeyVisuals.getPortrait('unknown'), BeyVisuals.getPortrait('another-unknown'), 'unknown IDs use one safe fallback');
});

test('visual catalog defines nine unique Bey profiles and three conceptual parts', () => {
  const expectedShapes = {
    gingka: 'pegasus-wings', kyoya: 'leone-mane', ryuga: 'ldrago-reverse-claws',
    kenta: 'sagittario-arrows', chris: 'orion-orbit', king: 'variares-axes',
    aguma: 'kronos-scythes', dynamis: 'jupiter-orbs', rago: 'nemesis-eight-points',
  };
  assert.deepEqual(Object.keys(BeyVisuals.BEYS), Object.keys(expectedShapes));
  assert.deepEqual(BeyVisuals.validateBeys(), []);
  const profiles = Object.values(BeyVisuals.BEYS);
  assert.equal(new Set(profiles.map((profile) => profile.shape)).size, 9);
  assert.equal(new Set(profiles.map((profile) => profile.signature)).size, 9);
  for (const [id, shape] of Object.entries(expectedShapes)) {
    const profile = BeyVisuals.BEYS[id];
    assert.equal(profile.shape, shape);
    assert.ok(profile.blades >= 2 && [1, -1].includes(profile.twist));
    assert.ok(profile.outer > profile.inner && profile.inner > 0);
    assert.ok(profile.ornaments.length && profile.emblem && profile.rotationFrames === 16);
    assert.deepEqual(Object.keys(profile.parts), ['layer', 'disc', 'driver']);
  }
  assert.equal(BeyVisuals.getBey('unknown'), BeyVisuals.getBey('another-unknown'), 'unknown IDs use one safe fallback');
});

test('gated visual API renders every real portrait and distinct Bey silhouette at gameplay and detail sizes', () => {
  const { api, canvas } = loadGame({ seed: 17 });
  assert.ok(api.visuals && typeof api.visuals.face === 'function' && typeof api.visuals.drawBey === 'function');
  const smallFingerprints = [];
  const detailFingerprints = [];
  for (const ch of api.data.bladers) {
    const portraitCanvas = api.visuals.face(ch);
    assert.deepEqual([portraitCanvas.width, portraitCanvas.height], [12, 12]);
    assert.ok(portraitCanvas.commands.some((command) => command[0] === 'fillRect'), `${ch.id} portrait paints pixels`);
    assert.equal(api.visuals.profile(ch.id).shape, BeyVisuals.BEYS[ch.id].shape);
    for (const [radius, output] of [[8, smallFingerprints], [14, detailFingerprints]]) {
      canvas.commands.length = 0;
      api.visuals.drawBey(ch, 160, 120, 0.73, radius, { glow: ch.color + '55', wob: 0, spinFactor: 0.75 });
      const geometry = canvas.commands.filter((command) => command[0] === 'fillRect').map((command) => command.slice(2));
      assert.ok(geometry.length > 20, `${ch.id} r=${radius} has a layered pixel render`);
      output.push(JSON.stringify(geometry));
    }
  }
  assert.equal(new Set(smallFingerprints).size, 9, 'all r=8 silhouettes have distinct geometry');
  assert.equal(new Set(detailFingerprints).size, 9, 'all r>=14 detailed renders have distinct geometry');
});

test('random.js exposes resettable deterministic independent streams in CommonJS and browser mode', () => {
  const first = BeyRandom.createStreams(12345);
  const expectedGameplay = [first.gameplay(), first.gameplay(), first.gameplay()];
  const expectedAi = [first.ai(), first.ai()];

  const second = BeyRandom.createStreams(12345);
  for (let i = 0; i < 500; i++) second.visual();
  assert.deepEqual([second.gameplay(), second.gameplay(), second.gameplay()], expectedGameplay);
  assert.deepEqual([second.ai(), second.ai()], expectedAi);
  second.gameplay.reset();
  assert.equal(second.gameplay(), expectedGameplay[0]);
  assert.deepEqual(BeyRandom.STREAM_NAMES, ['gameplay', 'ai', 'burst', 'visual', 'tournament']);
});

test('test API is gated and seeded streams remain independent from visual consumption', () => {
  assert.equal(loadGame({ testMode: false }).context.BEY_BATTLE_TEST_API, undefined);
  const { api } = loadGame({ seed: 77 });
  assert.ok(api);
  const before = api.streamStates();
  api.consume('visual', 1000);
  const after = api.streamStates();
  for (const name of ['gameplay', 'ai', 'burst', 'tournament']) assert.equal(after[name], before[name]);
  assert.notEqual(after.visual, before.visual);

  api.resetStreams(77);
  const sequence = api.consume('gameplay', 4);
  api.resetStreams(77);
  api.consume('visual', 47);
  assert.deepEqual(api.consume('gameplay', 4), sequence);

  prepareFight(api);
  api.state.shake = 5;
  const beforeDraw = api.streamStates();
  api.draw();
  const afterDraw = api.streamStates();
  assert.notEqual(afterDraw.visual, beforeDraw.visual);
  for (const name of ['gameplay', 'ai', 'burst', 'tournament']) assert.equal(afterDraw[name], beforeDraw[name]);
});

test('movement preserves acceleration, spin drain and opposite rotation', () => {
  const { api } = loadGame({ seed: 1 });
  const match = prepareFight(api, 'gingka', 'ryuga');
  const [right, left] = match.beys;
  right.x = left.x = 160;
  right.y = left.y = 137;
  api.moveBey(right, left, { x: 1, y: 1, sp: false }, 1 / 60);
  api.moveBey(left, right, { x: 0, y: 0, sp: false }, 1 / 60);

  near(right.ang, 0.7);
  near(left.ang, -0.7);
  assert.ok(right.x > 160 && right.y > 137);
  near(right.vx, right.vy);
  assert.ok(right.spin < left.spin && left.spin < 1000);
  assert.equal(right.trail.length, 1);
});

test('collision preserves recoil, damage, meter and left-spin absorption', () => {
  const { api } = loadGame({ seed: 2 });
  const match = prepareFight(api, 'gingka', 'ryuga');
  const [a, b] = match.beys;
  Object.assign(a, { x: 153, y: 137, vx: 120, vy: 0, spin: 900, meter: 0 });
  Object.assign(b, { x: 167, y: 137, vx: -80, vy: 0, spin: 800, meter: 0 });
  api.collide(a, b);

  assert.equal(match.hitCd, 0.12);
  assert.deepEqual([a.x, b.x], [152, 168]);
  assert.ok(a.vx < 0 && b.vx > 0);
  assert.ok(a.spin < 900);
  assert.ok(b.spin < 800);
  assert.ok(a.meter > 9 && b.meter > 9);
  // Ryuga is the source of damage to a and steals 30% of that damage.
  assert.ok(b.spin > 800 - (b.meter - 9) / 0.06);
});

test('scoring characterizes Ring Out, Spin Finish, ties and timeout precedence', () => {
  const scenarios = [
    { mutate: (m) => { m.beys[0].out = true; }, score: [0, 1], label: 'RING OUT!' },
    { mutate: (m) => { m.beys[1].spin = 0; }, score: [1, 0], label: 'SPIN FINISH!' },
    { mutate: (m) => { m.beys[0].out = true; m.beys[1].out = true; }, score: [0, 0], label: 'DOBLE RING OUT!' },
    { mutate: (m) => { m.beys[0].spin = 0; m.beys[1].spin = 0; }, score: [0, 0], label: 'EMPAT!' },
    { mutate: (m) => { m.time = 60; m.beys[0].spin = 501; m.beys[1].spin = 500; }, score: [1, 0], label: 'TEMPS ESGOTAT!' },
  ];
  for (const scenario of scenarios) {
    const { api } = loadGame({ seed: 3 });
    const match = prepareFight(api);
    scenario.mutate(match);
    api.checkEnd();
    assert.deepEqual(Array.from(match.score), scenario.score);
    assert.equal(match.pt.label, scenario.label);
    assert.equal(match.phase, 'point');
  }
});

test('Burst uses its deterministic stream and keeps the real damage/spin condition', () => {
  const { api } = loadGame({ seed: 4 });
  const match = prepareFight(api, 'gingka', 'kyoya');
  const [a, b] = match.beys;
  Object.assign(a, { x: 153, y: 137, vx: 260, spin: 1000 });
  Object.assign(b, { x: 167, y: 137, vx: -100, spin: 390 });
  api.resetStream('burst', 7); // first Mulberry32 value: 0.011704753153026104 (< 0.15)
  api.collide(a, b);
  assert.ok(b.spin > 0 && b.spin < b.maxSpin * 0.4, 'the damaged bey still satisfies the production Burst condition');
  assert.equal(match.pendingBurst, 1);
  api.checkEnd();
  assert.equal(b.burst, true);
  assert.deepEqual(Array.from(match.score), [2, 0]);
  assert.equal(match.pt.label, 'BURST FINISH!');
});

test('all nine specials preserve their current mechanical effects', () => {
  const cases = {
    gingka: (m) => { assert.equal(m.beys[0].fx.dash, 0.8); near(m.beys[0].vx, 340); },
    kyoya: (m, api) => {
      assert.equal(m.beys[0].fx.wall, 3.2);
      m.phase = 'fight';
      Object.assign(m.beys[0], { x: 153, vx: 120 });
      Object.assign(m.beys[1], { x: 167, vx: -80 });
      api.collide(m.beys[0], m.beys[1]);
      assert.ok(m.beys[0].spin > m.beys[1].spin, 'wall quarters incoming damage and multiplies outgoing damage');
    },
    ryuga: (m, api) => {
      assert.equal(m.beys[0].fx.absorb, 3);
      m.phase = 'fight';
      api.moveBey(m.beys[0], m.beys[1], { x: 0, y: 0, sp: false }, 1 / 60);
      near(m.beys[1].spin, 498.4166666666667);
      assert.ok(m.beys[0].spin > 500, 'absorb returns 90% of drained spin');
    },
    kenta: (m, api) => {
      assert.equal(m.proj.length, 3);
      assert.deepEqual(Array.from(m.proj, (p) => p.life), [2, 2, 2]);
      for (const p of m.proj) near(Math.hypot(p.vx, p.vy), 190);
      m.phase = 'fight';
      Object.assign(m.proj[1], { x: m.beys[1].x - 190 / 60, y: m.beys[1].y, vx: 190, vy: 0 });
      api.stepPhysics(1 / 60);
      assert.ok(m.beys[1].spin < 430, 'fire impact deals 70 spin plus normal frame drain');
      assert.equal(m.proj.length, 2, 'the impacting projectile is removed');
    },
    chris: (m) => assert.equal(m.beys[0].spin, 900),
    king: (m) => { assert.equal(m.beys[1].spin, 430); assert.ok(m.beys[1].vx > 0); },
    aguma: (m) => { assert.equal(m.beys[1].fx.slow, 3.5); assert.equal(m.beys[1].spin, 460); },
    dynamis: (m, api) => {
      assert.equal(m.beys[0].fx.vortex, 2.5);
      m.phase = 'fight';
      api.moveBey(m.beys[1], m.beys[0], { x: 0, y: 0, sp: false }, 1 / 60);
      assert.ok(m.beys[1].vx < -6, 'vortex pulls the opponent toward its owner');
    },
    rago: (m) => { assert.equal(m.beys[0].fx.absorb, 2.5); assert.equal(m.beys[1].spin, 440); assert.ok(m.beys[1].vx > 0); },
  };

  for (const [id, verify] of Object.entries(cases)) {
    const { api } = loadGame({ seed: 5 });
    const match = prepareFight(api, id, 'kyoya');
    const [me, op] = match.beys;
    Object.assign(me, { x: 140, y: 137, spin: 500, meter: 100 });
    Object.assign(op, { x: 180, y: 137, spin: 500 });
    api.triggerSpecial(0);
    assert.equal(match.phase, 'cutin');
    assert.equal(me.meter, 0);
    api.applySpecial(0);
    verify(match, api);
  }
});

test('AI is deterministic by archetype and level changes speed and jitter', () => {
  const ids = ['gingka', 'kyoya', 'kenta', 'dynamis', 'rago'];
  const runAi = (id) => {
    const { api } = loadGame({ seed: 91 });
    const match = prepareFight(api, 'chris', id, { lvl: 0.65 });
    const [op, me] = match.beys;
    Object.assign(me, { x: 160, y: 175, spin: 700 });
    Object.assign(op, { x: 190, y: 137, spin: 650 });
    const before = api.streamStates();
    const input = api.aiInput(me, op, 0.65, 1 / 60);
    const after = api.streamStates();
    assert.notEqual(after.ai, before.ai);
    for (const name of ['gameplay', 'burst', 'visual', 'tournament']) assert.equal(after[name], before[name]);
    return [rounded(input.x), rounded(input.y), input.sp];
  };
  const outputs = Object.fromEntries(ids.map((id) => [id, runAi(id)]));
  const repeated = Object.fromEntries(ids.map((id) => [id, runAi(id)]));
  assert.deepEqual(outputs, repeated);
  assert.deepEqual(outputs, {
    gingka: [0.405068, -0.738733, false],
    kyoya: [0.595723, -0.595752, false],
    kenta: [-0.785429, -0.304806, false],
    dynamis: [0.595723, -0.595752, false],
    rago: [0.405068, -0.738733, false],
  });
  assert.notDeepEqual(outputs.gingka, outputs.kyoya);
  assert.notDeepEqual(outputs.kenta, outputs.dynamis);
  assert.deepEqual(outputs.rago, outputs.gingka); // BOSS follows the attack branch with the same seeded jitter.

  const lowGame = loadGame({ seed: 92 }).api;
  let match = prepareFight(lowGame, 'gingka', 'kyoya', { lvl: 0 });
  match.beys[1].ai.jt = 1;
  const low = lowGame.aiInput(match.beys[1], match.beys[0], 0, 1 / 60);
  const highGame = loadGame({ seed: 92 }).api;
  match = prepareFight(highGame, 'gingka', 'kyoya', { lvl: 1 });
  match.beys[1].ai.jt = 1;
  const high = highGame.aiInput(match.beys[1], match.beys[0], 1, 1 / 60);
  assert.ok(Math.hypot(high.x, high.y) > Math.hypot(low.x, low.y));
  near(Math.hypot(low.x, low.y), 0.55);
  near(Math.hypot(high.x, high.y), 1);
});

test('tournament keeps the seeded draw, three rivals, Rago final, four levels and boss stadium', () => {
  const drawTournament = () => {
    const { api } = loadGame({ seed: 101 });
    api.resetStreams(101);
    const before = api.streamStates();
    api.setupTour('gingka');
    const after = api.streamStates();
    assert.notEqual(after.tournament, before.tournament);
    for (const name of ['gameplay', 'ai', 'burst', 'visual']) assert.equal(after[name], before[name]);
    return { api, tour: api.state.tour, draw: {
      opponents: Array.from(api.state.tour.opps, (ch) => ch.id),
      stadiums: Array.from(api.state.tour.stages, (st) => st.id),
    } };
  };
  const { api, tour, draw } = drawTournament();
  assert.deepEqual(draw, drawTournament().draw);
  assert.deepEqual(draw, {
    opponents: ['kenta', 'ryuga', 'kyoya', 'rago'],
    stadiums: ['classic', 'space', 'ice', 'nemesis'],
  });
  assert.equal(tour.opps.length, 4);
  assert.equal(tour.stages.length, 4);
  assert.equal(tour.opps[3].id, 'rago');
  assert.equal(tour.stages[3].id, 'nemesis');
  assert.equal(new Set(Array.from(tour.opps, (ch) => ch.id)).size, 4);
  assert.equal(new Set(Array.from(tour.stages, (st) => st.id)).size, 4);
  const expectedLevels = [0.45, 0.65, 0.85, 1];
  for (let round = 0; round < 4; round++) {
    tour.round = round;
    api.queueTourMatch();
    assert.equal(api.state.next.opts.lvl, expectedLevels[round]);
    assert.equal(api.state.next.c2, tour.opps[round]);
    assert.equal(api.state.next.st, tour.stages[round]);
  }
});

test('winning the tournament persists Rago and enters the champion scene', () => {
  const { api, storage } = loadGame({ seed: 102 });
  api.setUnlocked(false);
  api.setMode('tour');
  api.setupTour('gingka');
  api.state.tour.round = 3;
  const tour = api.state.tour;
  api.startMatch(tour.ch, tour.opps[3], tour.stages[3], { lvl: 1 });
  api.state.match.score[0] = 3;
  api.endMatch();

  assert.equal(api.state.scene, 'champion');
  assert.equal(api.state.newUnlock, true);
  assert.equal(api.unlocked, true);
  assert.equal(storage.get('beyfury_rago'), '1');
  assert.equal(api.state.result.w, 0);
  const visualBefore = api.streamStates().visual;
  api.update(1); // runs the real champion celebration branch
  assert.notEqual(api.streamStates().visual, visualBefore);
});

test('title controls preserve tournament and local PvP mode navigation', () => {
  const tourGame = loadGame({ seed: 103 }).api;
  tourGame.press('Enter');
  tourGame.step();
  tourGame.release('Enter');
  assert.equal(tourGame.state.mode, 'tour');
  assert.equal(tourGame.state.scene, 'select');

  const pvpGame = loadGame({ seed: 103 }).api;
  pvpGame.press('ArrowDown');
  pvpGame.step();
  pvpGame.release('ArrowDown');
  pvpGame.press('Enter');
  pvpGame.step();
  pvpGame.release('Enter');
  assert.equal(pvpGame.state.mode, 'pvp');
  assert.equal(pvpGame.state.scene, 'select');

  pvpGame.state.picks = [pvpGame.findBlader('gingka'), pvpGame.findBlader('kyoya')];
  pvpGame.go('stage');
  pvpGame.press('Enter');
  pvpGame.step();
  assert.equal(pvpGame.state.scene, 'vs');
  assert.equal(pvpGame.state.next.opts.human2, true);
});
