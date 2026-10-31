'use strict';
(function initBeyRandom(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BeyRandom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const STREAM_NAMES = Object.freeze(['gameplay', 'ai', 'burst', 'visual', 'tournament']);

  function normalizeSeed(seed) {
    const value = Number(seed);
    return Number.isFinite(value) ? value >>> 0 : 0;
  }

  function mix(seed, salt) {
    let value = (normalizeSeed(seed) ^ salt) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
    return (value ^ (value >>> 15)) >>> 0;
  }

  function createStream(seed) {
    const initialSeed = normalizeSeed(seed);
    let state = initialSeed;
    const stream = function next() {
      state = (state + 0x6d2b79f5) | 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    stream.reset = (nextSeed = initialSeed) => {
      state = normalizeSeed(nextSeed);
      return stream;
    };
    stream.getState = () => state >>> 0;
    stream.initialSeed = initialSeed;
    return stream;
  }

  function systemSeed() {
    const cryptoObject = typeof globalThis !== 'undefined' && globalThis.crypto;
    if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
      const value = new Uint32Array(1);
      cryptoObject.getRandomValues(value);
      return value[0] >>> 0;
    }
    const now = Date.now() >>> 0;
    const highResolution = typeof performance !== 'undefined' && performance.now
      ? Math.floor(performance.now() * 1000) >>> 0
      : 0;
    return mix(now, highResolution ^ 0xa5a5a5a5);
  }

  function createStreams(seed = systemSeed()) {
    const baseSeed = normalizeSeed(seed);
    const streams = { seed: baseSeed };
    STREAM_NAMES.forEach((name, index) => {
      streams[name] = createStream(mix(baseSeed, Math.imul(index + 1, 0x9e3779b9)));
    });
    streams.reset = () => {
      STREAM_NAMES.forEach((name) => streams[name].reset());
      return streams;
    };
    return streams;
  }

  return Object.freeze({ STREAM_NAMES, createStream, createStreams, systemSeed });
});
