'use strict';
/* Chiptune music + SFX with the Web Audio API (no audio files needed). */
const Sound = (() => {
  let ac = null, master, mus, sfxG, noiseBuf;
  let muted = false, song = null, step = 0, nextT = 0, schedulerId = null;
  const activeVoices = new Set();
  const lastSfx = Object.create(null);
  const VOICE_LIMIT = { music: 24, sfx: 32 };
  const THROTTLE = { hit: 0.045, wall: 0.08, move: 0.035 };

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

  function disconnect(nodes) {
    for (const node of nodes) {
      try { node.disconnect(); } catch (e) { /* already disconnected */ }
    }
  }

  function releaseVoice(voice) {
    if (!voice || voice.released) return;
    voice.released = true;
    activeVoices.delete(voice);
    disconnect(voice.nodes);
  }

  function stopVoice(voice) {
    if (!voice || voice.released) return;
    try { voice.source.stop(); } catch (e) { /* source may already be stopped */ }
    releaseVoice(voice);
  }

  function claimVoice(kind, priority) {
    const voices = [...activeVoices].filter((voice) => voice.kind === kind);
    if (voices.length < VOICE_LIMIT[kind]) return true;
    voices.sort((a, b) => a.priority - b.priority || a.startedAt - b.startedAt);
    if (voices[0].priority > priority) return false;
    stopVoice(voices[0]);
    return true;
  }

  function trackVoice(source, nodes, kind, priority, startedAt) {
    const voice = { source, nodes, kind, priority, startedAt, released: false };
    source.onended = () => releaseVoice(voice);
    activeVoices.add(voice);
    return voice;
  }

  function clearAudioGraph() {
    for (const voice of [...activeVoices]) stopVoice(voice);
    disconnect([mus, sfxG, master].filter(Boolean));
    ac = null; master = null; mus = null; sfxG = null; noiseBuf = null;
    nextT = 0;
  }

  function ensureScheduler() {
    if (schedulerId == null && typeof setInterval === 'function') schedulerId = setInterval(tick, 25);
  }

  function init() {
    if (ac && ac.state === 'closed') clearAudioGraph();
    if (!ac) {
      const root = typeof window !== 'undefined' ? window : globalThis;
      const AC = root && (root.AudioContext || root.webkitAudioContext);
      if (!AC) return;
      let ctx, nextMaster, nextMus, nextSfx, nextNoise;
      try {
        ctx = new AC();
        nextMaster = ctx.createGain(); nextMaster.gain.value = muted ? 0 : 0.5; nextMaster.connect(ctx.destination);
        nextMus = ctx.createGain(); nextMus.gain.value = 0.28; nextMus.connect(nextMaster);
        nextSfx = ctx.createGain(); nextSfx.gain.value = 0.55; nextSfx.connect(nextMaster);
        nextNoise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.6), ctx.sampleRate);
        const d = nextNoise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) {
        disconnect([nextMus, nextSfx, nextMaster].filter(Boolean));
        if (ctx && ctx.state !== 'closed' && typeof ctx.close === 'function') {
          try {
            const closing = ctx.close();
            if (closing && typeof closing.catch === 'function') closing.catch(() => {});
          } catch (closeError) { /* unusable context */ }
        }
        return;
      }
      ac = ctx; master = nextMaster; mus = nextMus; sfxG = nextSfx; noiseBuf = nextNoise;
      ensureScheduler();
    }
    if (ac.state !== 'running' && ac.state !== 'closed' && typeof ac.resume === 'function') {
      try {
        const resuming = ac.resume();
        if (resuming && typeof resuming.catch === 'function') resuming.catch(() => {});
      } catch (e) { /* later gestures can retry */ }
    }
  }

  function tone(f, t, dur, type, vol, dest, slideTo, priority = 1) {
    if (!ac || !dest || !Number.isFinite(f) || f <= 0 || !Number.isFinite(dur) || dur <= 0) return;
    const kind = dest === sfxG ? 'sfx' : 'music';
    if (!claimVoice(kind, priority)) return;
    let o, g, voice;
    try {
      o = ac.createOscillator(); g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      if (slideTo && slideTo > 0) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(Math.max(0.0001, vol), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest);
      voice = trackVoice(o, [o, g], kind, priority, t);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {
      if (voice) stopVoice(voice);
      else disconnect([o, g].filter(Boolean));
    }
  }

  function noise(t, dur, vol, dest, filterType = 'highpass', fq = 1000, priority = 1) {
    if (!ac || !dest || !noiseBuf || !Number.isFinite(dur) || dur <= 0) return;
    const kind = dest === sfxG ? 'sfx' : 'music';
    if (!claimVoice(kind, priority)) return;
    let s, f, g, voice;
    try {
      s = ac.createBufferSource(); f = ac.createBiquadFilter(); g = ac.createGain();
      s.buffer = noiseBuf;
      f.type = filterType; f.frequency.setValueAtTime(fq, t);
      g.gain.setValueAtTime(Math.max(0.0001, vol), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(dest);
      voice = trackVoice(s, [s, f, g], kind, priority, t);
      s.start(t); s.stop(t + dur + 0.02);
    } catch (e) {
      if (voice) stopVoice(voice);
      else disconnect([s, f, g].filter(Boolean));
    }
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

  function seq(notes, gap, type = 'square', vol = 0.15, priority = 2) {
    const t0 = ac.currentTime;
    notes.forEach((n, i) => {
      if (n) tone(freq(n), t0 + i * gap, gap * 1.6, type, vol, sfxG, null, priority);
    });
  }

  function sfx(name, k = 1) {
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime;
    if (THROTTLE[name] && lastSfx[name] != null && t - lastSfx[name] < THROTTLE[name]) return;
    if (THROTTLE[name]) lastSfx[name] = t;
    const strength = Math.min(1, Math.max(0.3, Number.isFinite(Number(k)) ? Number(k) : 1));
    switch (name) {
      case 'hit': {
        const hard = strength > 0.72;
        noise(t, 0.045 + 0.035 * strength, 0.22 + 0.13 * strength, sfxG, 'highpass', 700 + 1000 * strength, 0);
        tone(180 + 300 * strength, t, 0.065 + 0.025 * strength, hard ? 'sawtooth' : 'square', 0.07 + 0.05 * strength, sfxG, 55 + 20 * strength, 0);
        if (hard) tone(900 + 500 * strength, t, 0.035, 'square', 0.045, sfxG, 420, 0);
        break;
      }
      case 'wall':
        tone(175, t, 0.075, 'square', 0.075, sfxG, 62, 0);
        noise(t, 0.035, 0.085, sfxG, 'bandpass', 1350, 0);
        break;
      case 'launch':
        tone(165, t, 0.34, 'sawtooth', 0.11, sfxG, 1100, 3);
        tone(330, t + 0.06, 0.24, 'square', 0.055, sfxG, 880, 3);
        noise(t, 0.24, 0.11, sfxG, 'bandpass', 2100, 3);
        break;
      case 'go':
        tone(220, t, 0.38, 'sawtooth', 0.13, sfxG, 1500, 3);
        noise(t, 0.26, 0.13, sfxG, 'bandpass', 2600, 3);
        tone(880, t + 0.08, 0.11, 'square', 0.065, sfxG, 1760, 3);
        break;
      case 'count': tone(440, t, 0.12, 'square', 0.14, sfxG, null, 2); break;
      case 'lock': tone(990, t, 0.06, 'square', 0.12, sfxG, null, 2); break;
      case 'move': tone(440, t, 0.03, 'square', 0.06, sfxG, 520, 0); break;
      case 'select': tone(660, t, 0.05, 'square', 0.1, sfxG, null, 2); tone(990, t + 0.05, 0.06, 'square', 0.1, sfxG, null, 2); break;
      case 'back': tone(330, t, 0.08, 'square', 0.1, sfxG, 200, 2); break;
      case 'special':
        seq(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], 0.05, 'square', 0.14, 4);
        tone(180, t, 0.34, 'sawtooth', 0.055, sfxG, 900, 4);
        break;
      case 'shock':
        noise(t, 0.34, 0.36, sfxG, 'lowpass', 650, 3);
        tone(210, t, 0.36, 'square', 0.14, sfxG, 42, 3);
        tone(1250, t, 0.055, 'square', 0.06, sfxG, 380, 3);
        break;
      case 'fire':
        noise(t, 0.24, 0.25, sfxG, 'lowpass', 1650, 3);
        tone(170, t, 0.22, 'sawtooth', 0.085, sfxG, 65, 3);
        tone(680, t, 0.12, 'square', 0.055, sfxG, 230, 3);
        break;
      case 'point':
        tone(880, t, 0.08, 'square', 0.13, sfxG, null, 4);
        tone(1175, t + 0.085, 0.12, 'square', 0.14, sfxG, null, 4);
        tone(1568, t + 0.2, 0.18, 'square', 0.11, sfxG, null, 4);
        break;
      case 'ringout':
        tone(720, t, 0.52, 'square', 0.14, sfxG, 68, 4);
        tone(1080, t + 0.04, 0.16, 'triangle', 0.075, sfxG, 260, 4);
        break;
      case 'burst':
        noise(t, 0.52, 0.44, sfxG, 'lowpass', 950, 4);
        tone(340, t, 0.54, 'sawtooth', 0.15, sfxG, 32, 4);
        tone(760, t, 0.18, 'square', 0.075, sfxG, 95, 4);
        break;
      case 'win':
        seq(['C5', 'E5', 'G5', 'C6', null, 'G5', 'C6', null, null], 0.12, 'square', 0.15, 4);
        tone(freq('C4'), t, 0.72, 'triangle', 0.09, sfxG, freq('C5'), 4);
        break;
      case 'lose':
        seq(['G4', 'F#4', 'F4', 'E4', null, 'C4'], 0.18, 'triangle', 0.24, 4);
        tone(freq('C3'), t + 0.72, 0.26, 'square', 0.075, sfxG, freq('C2'), 4);
        break;
      case 'vs':
        noise(t, 0.46, 0.3, sfxG, 'bandpass', 820, 4);
        tone(115, t, 0.56, 'sawtooth', 0.17, sfxG, 55, 4);
        tone(440, t + 0.08, 0.08, 'square', 0.07, sfxG, 880, 4);
        tone(660, t + 0.2, 0.08, 'square', 0.07, sfxG, 1320, 4);
        break;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  return { init, music, sfx, toggleMute, get muted() { return muted; } };
})();
