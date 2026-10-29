const KEY = 'bey_battle_ultimate_3d';
const LEGACY_RAGO = 'beyfury_rago';
const DEFAULTS = {
  version: 2, ragoUnlocked: false, completed: { metal: 0, burst: 0 },
  records: { wins: 0, losses: 0, bursts: 0, ringOuts: 0, survival: 0 },
  options: { music: 0.55, sfx: 0.7, quality: 'high', shake: true },
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const merge = (base, value) => {
  const output = { ...base, ...(value || {}) };
  for (const key of ['completed','records','options']) output[key] = { ...base[key], ...(value?.[key] || {}) };
  return output;
};
export class GameStorage {
  constructor(storage = globalThis.localStorage) { this.storage = storage; this.data = this.load(); }
  load() {
    try {
      const parsed = JSON.parse(this.storage?.getItem(KEY) || 'null');
      const data = merge(clone(DEFAULTS), parsed);
      if (this.storage?.getItem(LEGACY_RAGO) === '1') data.ragoUnlocked = true;
      return data;
    } catch { return clone(DEFAULTS); }
  }
  save() { try { this.storage?.setItem(KEY, JSON.stringify(this.data)); if (this.data.ragoUnlocked) this.storage?.setItem(LEGACY_RAGO, '1'); return true; } catch { return false; } }
  update(mutator) { mutator(this.data); return this.save(); }
}
export { KEY as STORAGE_KEY, DEFAULTS as STORAGE_DEFAULTS };
