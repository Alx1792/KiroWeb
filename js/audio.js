'use strict';
/* Chiptune music + SFX with the Web Audio API (no audio files needed). */
const Sound = (() => {
  let ac = null, master, mus, sfxG, noiseBuf;
  let muted = false, song = null, step = 0, nextT = 0;

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(n);
    if (!m) return 0;
    const semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const midi = (Number(m[3]) + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  // Each token = one 16th note. "-" holds the previous note, "." is a rest.
  function parse(str) {
    const t = str.trim().split(/\s+/);
    const out = [];
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '-' || t[i] === '.') { out.push(null); continue; }
      let d = 1;
      while (t[i + d] === '-') d++;
      out.push({ f: freq(t[i]), d });
    }
    return out;
  }

  const SONGS = {
    menu: {
      bpm: 120, lead: 'square', drums: 'menu',
      mel: 'C5 - - - G4 - C5 - E5 - - - D5 - C5 - ' +
           'D5 - - - G4 - D5 - F5 - - - E5 - D5 - ' +
           'E5 - - - C5 - E5 - G5 - - - A5 - G5 - ' +
           'F5 - E5 - D5 - C5 - D5 - - - - - . .',
      bass: 'C3 - - - G2 - - - C3 - - - G2 - - - ' +
            'G2 - - - D3 - - - G2 - - - B2 - - - ' +
            'A2 - - - E3 - - - A2 - - - E3 - - - ' +
            'F2 - - - C3 - - - G2 - - - G2 - - -',
    },
    battle: {
      bpm: 160, lead: 'square', drums: 'rock',
      mel: 'A4 - A4 C5 E5 - A5 - G5 - E5 - D5 E5 C5 - ' +
           'A4 - A4 C5 E5 - A5 - B5 - C6 - B5 - G5 - ' +
           'F4 - F4 A4 C5 - F5 - E5 - C5 - A4 C5 D5 - ' +
           'E5 - E5 - G5 - B5 - E6 - D6 - B5 - G#5 -',
      bass: 'A2 - A3 - A2 - A3 - A2 - A3 - G2 - G3 - ' +
            'A2 - A3 - A2 - A3 - C3 - C4 - B2 - B3 - ' +
            'F2 - F3 - F2 - F3 - F2 - F3 - F2 - F3 - ' +
            'E2 - E3 - E2 - E3 - E2 - E3 - E2 - E3 -',
    },
    boss: {
      bpm: 168, lead: 'sawtooth', drums: 'boss',
      mel: 'E4 E4 F4 E4 - - B4 - A4 - G4 - F4 - E4 - ' +
           'E4 E4 F4 E4 - - C5 - B4 - A4 - G4 - F4 - ' +
           'E5 - D5 - C5 - B4 - C5 - B4 - A4 - G4 - ' +
           'F4 - G4 - A4 - B4 - C5 - B4 - F5 - E5 -',
      bass: 'E2 E2 E3 E2 E2 E3 E2 F2 E2 E2 E3 E2 E2 E3 F2 E2 ' +
            'E2 E2 E3 E2 E2 E3 E2 F2 E2 E2 E3 E2 E2 E3 F2 E2 ' +
            'C2 C2 C3 C2 C2 C3 C2 D2 C2 C2 C3 C2 C2 C3 D2 C2 ' +
            'F2 F2 F3 F2 F2 F3 F2 G2 F2 F2 F3 F2 B1 B2 B1 B2',
    },
  };
  for (const k in SONGS) { SONGS[k].m = parse(SONGS[k].mel); SONGS[k].b = parse(SONGS[k].bass); }

  function init() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
      mus = ac.createGain(); mus.gain.value = 0.28; mus.connect(master);
      sfxG = ac.createGain(); sfxG.gain.value = 0.55; sfxG.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      setInterval(tick, 25);
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function tone(f, t, dur, type, vol, dest, slideTo) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(t, dur, vol, dest, filterType = 'highpass', fq = 1000) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = filterType; f.frequency.value = fq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function drums(i, t) {
    const kind = song.drums;
    const kick = () => tone(150, t, 0.12, 'sine', 0.55, mus, 40);
    const snare = () => noise(t, 0.12, 0.28, mus, 'highpass', 1200);
    const hat = (v = 0.07) => noise(t, 0.03, v, mus, 'highpass', 7000);
    if (kind === 'rock') {
      if (i % 8 === 0 || i % 16 === 10) kick();
      if (i % 8 === 4) snare();
      if (i % 2 === 0) hat();
    } else if (kind === 'menu') {
      if (i % 16 === 0 || i % 16 === 10) kick();
      if (i % 8 === 4) snare();
      if (i % 4 === 2) hat();
    } else {
      if (i % 4 === 0) kick();
      if (i % 8 === 4) snare();
      hat(0.04);
    }
  }

  function tick() {
    if (!ac || !song || ac.state !== 'running') return;
    const spb = 60 / song.bpm / 4;
    if (nextT < ac.currentTime - 0.2) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.12) {
      const i = step % song.m.length;
      const n = song.m[i];
      if (n && n.f) tone(n.f, nextT, n.d * spb * 0.9, song.lead, song.lead === 'sawtooth' ? 0.07 : 0.1, mus);
      const b = song.b[step % song.b.length];
      if (b && b.f) tone(b.f, nextT, b.d * spb * 0.9, 'triangle', 0.25, mus);
      drums(i, nextT);
      step++;
      nextT += spb;
    }
  }

  function music(name) {
    const s = name ? SONGS[name] : null;
    if (s === song) return;
    song = s; step = 0; nextT = 0;
  }

  function seq(notes, gap, type = 'square', vol = 0.15) {
    const t0 = ac.currentTime;
    notes.forEach((n, i) => { if (n) tone(freq(n), t0 + i * gap, gap * 1.6, type, vol, sfxG); });
  }

  function sfx(name, k = 1) {
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime;
    switch (name) {
      case 'hit':
        noise(t, 0.08, 0.35 * k, sfxG, 'highpass', 900);
        tone(260 + 200 * k, t, 0.09, 'square', 0.12 * k, sfxG, 70);
        break;
      case 'wall': tone(140, t, 0.06, 'square', 0.08, sfxG, 60); break;
      case 'launch':
      case 'go':
        tone(220, t, 0.45, 'sawtooth', 0.14, sfxG, 1400);
        noise(t, 0.4, 0.15, sfxG, 'bandpass', 2500);
        break;
      case 'count': tone(440, t, 0.12, 'square', 0.14, sfxG); break;
      case 'lock': tone(990, t, 0.06, 'square', 0.12, sfxG); break;
      case 'move': tone(440, t, 0.03, 'square', 0.06, sfxG); break;
      case 'select': tone(660, t, 0.05, 'square', 0.1, sfxG); tone(990, t + 0.05, 0.06, 'square', 0.1, sfxG); break;
      case 'back': tone(330, t, 0.08, 'square', 0.1, sfxG, 200); break;
      case 'special': seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.05); break;
      case 'shock': noise(t, 0.4, 0.4, sfxG, 'lowpass', 600); tone(200, t, 0.4, 'square', 0.15, sfxG, 40); break;
      case 'fire': noise(t, 0.3, 0.25, sfxG, 'lowpass', 1500); break;
      case 'point': tone(880, t, 0.1, 'square', 0.14, sfxG); tone(1175, t + 0.1, 0.25, 'square', 0.14, sfxG); break;
      case 'ringout': tone(700, t, 0.6, 'square', 0.14, sfxG, 70); break;
      case 'burst':
        noise(t, 0.6, 0.5, sfxG, 'lowpass', 900);
        tone(320, t, 0.6, 'sawtooth', 0.16, sfxG, 30);
        break;
      case 'win': seq(['C5', 'E5', 'G5', 'C6', null, 'G5', 'C6', null, null], 0.12); break;
      case 'lose': seq(['G4', 'F#4', 'F4', 'E4', null, 'C4'], 0.18, 'triangle', 0.25); break;
      case 'vs': noise(t, 0.5, 0.3, sfxG, 'bandpass', 800); tone(110, t, 0.6, 'sawtooth', 0.18, sfxG, 55); break;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  return { init, music, sfx, toggleMute, get muted() { return muted; } };
})();
