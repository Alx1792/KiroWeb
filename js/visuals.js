'use strict';
/* Original 12x12 portraits and declarative Bey silhouettes. No external sprite assets. */
(function initBeyVisuals(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BeyVisuals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const IDS = Object.freeze(['gingka', 'kyoya', 'ryuga', 'kenta', 'chris', 'king', 'aguma', 'dynamis', 'rago']);

  const LEGEND = Object.freeze({
    h: 'hair', s: 'skin', e: 'eye', m: 'mouth', c: 'cloth', k: 'clothK',
    a: 'accent', d: 'dark', w: 'white', '.': 'transparent',
  });

  // Every portrait is authored independently at the source resolution used by the game.
  const PORTRAITS = Object.freeze({
    gingka: Object.freeze([
      'h..h.h..h.h.', '.hhhhhhhhhh.', 'hhhhaahhhhhh', 'hhsssssssshh',
      'hsseessseesh', '.ssssssssss.', '..sssmmsss..', '...ssmmss...',
      '..wssssssw..', '.wwccccccww.', 'wwcckkkkccww', '.wccccccccw.',
    ]),
    kyoya: Object.freeze([
      '..h.hhhh.h..', '.hhhhhhhhhh.', 'hhhhdhhhdhhh', 'hhsssssssshh',
      'hsdessssedsh', '.ssssssssss.', '..sssmssss..', '..ssmmmmss..',
      '.c.ssssss.c.', 'ccckcccckccc', 'cckkcddckkcc', '.cccccccccc.',
    ]),
    ryuga: Object.freeze([
      '...hhhhhh...', '..hhhhhhhh..', '.hhahhhhhah.', 'hhhsssssshhh',
      'hhseessseesh', 'hhsssssssshh', 'hhsssdmssdhh', '.hssmmmmssh.',
      '.hhsssssshh.', '..wwccccww..', '.wwckkkkcww.', 'wwccccccccww',
    ]),
    kenta: Object.freeze([
      'h.h.hh.hh.h.', '.hhhhhhhhhh.', 'hhahhhhhahhh', '.hhsssssshh.',
      '.sseesssess.', '..ssssssss..', '..sssmmsss..', '...ssmmss...',
      '...ssssss...', '..ccaaaacc..', '.ccckkkkccc.', 'ccccwccwcccc',
    ]),
    chris: Object.freeze([
      '....hhhh....', '..hhhhhhhh..', '.hhwwhhwwhh.', '.hhsssssshh.',
      'hhseessseesh', 'hhsssssssshh', '.hsssmsssh..', '.hssmmmmssh.',
      '..hssssssh..', '..cccccccc..', '.cckkaakkcc.', 'cccckkkkcccc',
    ]),
    king: Object.freeze([
      '.h..hhhh..h.', 'hhhhhhhhhhhh', 'hhhahhhahhhh', '.hhsssssshh.',
      '.sdesseesds.', '..ssssssss..', '..ssmmmmss..', '...ssmmss...',
      '...ssssss...', 'aacccccccaa.', 'aacckkkkccaa', '.ccccddcccc.',
    ]),
    aguma: Object.freeze([
      '..hhhhhhhh..', '.hhhhhhhhhh.', 'hhhddddddhhh', 'hhsssssssshh',
      'hhseessseesh', 'hssssssssssh', 'hssssdmssssh', 'h.ssmmmmss.h',
      'h..ssssss..h', '.hcccccccch.', '..cckkkkcc..', '.cccddddccc.',
    ]),
    dynamis: Object.freeze([
      '...hhwwhh...', '..hhhhhhhh..', '.hhaahhaahh.', 'hhhsssssshhh',
      'hhseessseesh', 'hssssssssssh', '..sssdmsss..', '..ssmmmmss..',
      '...ssssss...', '..wccccccw..', '.wcckaaaccw.', 'wwcckkkkccww',
    ]),
    rago: Object.freeze([
      'h.hhhhhhhh.h', 'hhhhddddhhhh', 'hhahhhhhahhh', 'hhhsssssshhh',
      'hhseessseesh', 'hhssdsssdssh', 'hhsssdmdsshh', '.hssmmmmssh.',
      '.hhsssssshh.', '.ddccccccdd.', 'ddcckaaaccdd', 'ddddkkkkdddd',
    ]),
  });

  const BEYS = Object.freeze({
    gingka: Object.freeze({
      signature: 'pegasus-three-wing-star', shape: 'pegasus-wings', blades: 3, twist: 1,
      outer: 1, inner: 0.53, ornaments: Object.freeze(['wing-tip', 'flight-feather']), emblem: 'star-cross', rotationFrames: 16,
      parts: Object.freeze({ layer: 'three swept Pegasus wings', disc: 'tri-spoke metal wheel', driver: 'flat star tip' }),
    }),
    kyoya: Object.freeze({
      signature: 'leone-five-claw-mane', shape: 'leone-mane', blades: 5, twist: 1,
      outer: 0.98, inner: 0.56, ornaments: Object.freeze(['lion-claw', 'mane-notch']), emblem: 'lion-eye', rotationFrames: 16,
      parts: Object.freeze({ layer: 'five-claw lion mane', disc: 'fortress metal ring', driver: 'defence ball tip' }),
    }),
    ryuga: Object.freeze({
      signature: 'ldrago-reverse-dragon-claw', shape: 'ldrago-reverse-claws', blades: 3, twist: -1,
      outer: 1, inner: 0.5, ornaments: Object.freeze(['reverse-claw', 'dragon-scale']), emblem: 'dragon-fang', rotationFrames: 16,
      parts: Object.freeze({ layer: 'three reverse dragon claws', disc: 'left-spin scale wheel', driver: 'absorb rubber tip' }),
    }),
    kenta: Object.freeze({
      signature: 'sagittario-arrow-flame', shape: 'sagittario-arrows', blades: 4, twist: 1,
      outer: 1, inner: 0.48, ornaments: Object.freeze(['arrowhead', 'flame-tail']), emblem: 'bow-flame', rotationFrames: 16,
      parts: Object.freeze({ layer: 'four flaming arrowheads', disc: 'bow-spoke metal disc', driver: 'sharp stamina tip' }),
    }),
    chris: Object.freeze({
      signature: 'orion-orbit-bearing-ring', shape: 'orion-orbit', blades: 2, twist: -1,
      outer: 0.96, inner: 0.6, ornaments: Object.freeze(['orbital-ring', 'bearing-pair']), emblem: 'orion-belt', rotationFrames: 16,
      parts: Object.freeze({ layer: 'free orbital ring', disc: 'bearing metal wheel', driver: 'eternal bearing tip' }),
    }),
    king: Object.freeze({
      signature: 'variares-six-battle-axes', shape: 'variares-axes', blades: 6, twist: 1,
      outer: 1, inner: 0.49, ornaments: Object.freeze(['axe-head', 'shield-rivet']), emblem: 'mars-helm', rotationFrames: 16,
      parts: Object.freeze({ layer: 'six alternating axe heads', disc: 'armour shield disc', driver: 'changeable attack tip' }),
    }),
    aguma: Object.freeze({
      signature: 'kronos-four-time-scythes', shape: 'kronos-scythes', blades: 4, twist: -1,
      outer: 1, inner: 0.54, ornaments: Object.freeze(['scythe-hook', 'clock-tick']), emblem: 'hourglass', rotationFrames: 16,
      parts: Object.freeze({ layer: 'four hooked time scythes', disc: 'clockwork metal disc', driver: 'stamina cone tip' }),
    }),
    dynamis: Object.freeze({
      signature: 'jupiter-five-guardian-orbs', shape: 'jupiter-orbs', blades: 5, twist: 1,
      outer: 0.97, inner: 0.5, ornaments: Object.freeze(['guardian-orb', 'storm-band']), emblem: 'jupiter-eye', rotationFrames: 16,
      parts: Object.freeze({ layer: 'five guardian orbs', disc: 'storm band metal disc', driver: 'balance ball tip' }),
    }),
    rago: Object.freeze({
      signature: 'nemesis-four-blade-eight-point', shape: 'nemesis-eight-points', blades: 4, twist: -1,
      outer: 1, inner: 0.46, ornaments: Object.freeze(['doom-blade', 'eight-point-spike']), emblem: 'eclipse-core', rotationFrames: 16,
      parts: Object.freeze({ layer: 'four doom blades and eight points', disc: 'eclipse metal disc', driver: 'ultimate balance tip' }),
    }),
  });

  const FALLBACK_PORTRAIT = Object.freeze([
    '....dddd....', '...dddddd...', '..dddddddd..', '..dssssssd..',
    '..sseessss..', '..ssssssss..', '..sssmssss..', '...ssmmss...',
    '...ssssss...', '..cccccccc..', '..cckkkkcc..', '..cccccccc..',
  ]);
  const FALLBACK_BEY = Object.freeze({
    signature: 'fallback-safe-roundel', shape: 'safe-roundel', blades: 4, twist: 1, outer: 1, inner: 0.55,
    ornaments: Object.freeze(['neutral-tab']), emblem: 'neutral-dot', rotationFrames: 16,
    parts: Object.freeze({ layer: 'neutral four-tab layer', disc: 'neutral metal disc', driver: 'neutral tip' }),
  });

  function validatePortraits(portraits = PORTRAITS) {
    const errors = [];
    const keys = Object.keys(portraits);
    if (keys.length !== IDS.length || IDS.some((id) => !keys.includes(id))) errors.push('PORTRAITS must contain exactly the nine roster IDs');
    for (const id of keys) {
      const rows = portraits[id];
      if (!Array.isArray(rows) || rows.length !== 12) { errors.push(`${id}: portrait must have 12 rows`); continue; }
      rows.forEach((row, y) => {
        if (typeof row !== 'string' || row.length !== 12) errors.push(`${id}:${y}: row must contain 12 characters`);
        for (const pixel of String(row)) if (!(pixel in LEGEND)) errors.push(`${id}:${y}: invalid pixel '${pixel}'`);
      });
    }
    if (new Set(keys.map((id) => portraits[id].join('\n'))).size !== keys.length) errors.push('Portrait maps must be unique');
    return Object.freeze(errors);
  }

  function validateBeys(beys = BEYS) {
    const errors = [];
    const keys = Object.keys(beys);
    if (keys.length !== IDS.length || IDS.some((id) => !keys.includes(id))) errors.push('BEYS must contain exactly the nine roster IDs');
    const shapes = new Set(), signatures = new Set();
    for (const id of keys) {
      const profile = beys[id] || {};
      if (!profile.shape || shapes.has(profile.shape)) errors.push(`${id}: shape must be present and unique`);
      if (!profile.signature || signatures.has(profile.signature)) errors.push(`${id}: signature must be present and unique`);
      shapes.add(profile.shape); signatures.add(profile.signature);
      if (!Number.isInteger(profile.blades) || profile.blades < 2) errors.push(`${id}: blades must be an integer >= 2`);
      if (![1, -1].includes(profile.twist)) errors.push(`${id}: twist must be 1 or -1`);
      if (!(profile.outer > profile.inner && profile.inner > 0)) errors.push(`${id}: outer/inner proportions are invalid`);
      if (!Array.isArray(profile.ornaments) || !profile.ornaments.length || !profile.emblem || !Number.isInteger(profile.rotationFrames)) errors.push(`${id}: ornaments, emblem and rotationFrames are required`);
      if (!profile.parts || !profile.parts.layer || !profile.parts.disc || !profile.parts.driver) errors.push(`${id}: layer, disc and driver concepts are required`);
    }
    return Object.freeze(errors);
  }

  function getPortrait(id) { return PORTRAITS[id] || FALLBACK_PORTRAIT; }
  function getBey(id) { return BEYS[id] || FALLBACK_BEY; }

  const portraitErrors = validatePortraits();
  const beyErrors = validateBeys();
  if (portraitErrors.length || beyErrors.length) throw new Error(`Invalid Bey visuals: ${portraitErrors.concat(beyErrors).join('; ')}`);

  return Object.freeze({ IDS, LEGEND, PORTRAITS, BEYS, getPortrait, getBey, validatePortraits, validateBeys });
});
