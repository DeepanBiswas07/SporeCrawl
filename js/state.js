(function (global) {
  'use strict';
  const D = global.DATA, C = D.CONF;

  const SAVE_KEY = 'sporecrawl-save-v1';
  const LEGACY_KEYS = ['dungeon-ecosystem-save-v1'];

  (function migrate() {
    try {
      if (global.Store.getItem(SAVE_KEY)) return;
      for (const old of LEGACY_KEYS) {
        const raw = global.Store.getItem(old);
        if (raw) { global.Store.setItem(SAVE_KEY, raw); break; }
      }
    } catch (e) { }
  })();

  function freshState() {
    return {
      ver: 1,
      res: { bio: 30, ess: 0, gold: 0, dna: 0, cell: 0 },
      colonies: [],
      rooms: {},
      muts: {},
      ach: {},
      discovered: { fam: {}, stage: {}, hero: {}, legend: {} },
      adapt: { phys: 0, pois: 0, fire: 0, frost: 0, arc: 0, shad: 0 },
      dmgDealt: { phys: 0, pois: 0, fire: 0, frost: 0, arc: 0, shad: 0 },
      dmgShare: { phys: 0, pois: 0, fire: 0, frost: 0, arc: 0, shad: 0 },
      depth: 1,
      wave: 1,
      maxDepth: 1,
      bestInBiome: {},
      autoRaid: true,
      abil: {},
      buffs: {},
      stats: {
        kills: 0, legendKills: 0, evolutions: 0, bestWave: 0, bestBiome: 1,
        collapses: 0, rebirths: 0, mutLevels: 0, starved: 0, streak: 0,
        abilityUses: 0, playTime: 0, offlineTime: 0, raidsWon: 0, raidsLost: 0,
        totalBio: 0, totalEss: 0, totalGold: 0, bestWaveRun: 0
      },
      settings: { speed: 1, muted: false, particles: true, dmgNumbers: true, ambience: true, sfx: true },
      eco: {
        stability: 0, pop: 0, supply: 0, demand: 0, prod: 0, mult: 1, starving: 0,
        byRole: { producer: 0, decomposer: 0, consumer: 0, construct: 0, predator: 0, apex: 0 },
        families: 0, bioRate: 0, essRate: 0
      },
      mult: {},
      lastTick: Date.now(),
      startedAt: Date.now(),
      unlockSeen: {},
      doctrine: null,
      revealed: {},
      objDone: {}
    };
  }

  const G = freshState();
  global.G = G;

  const roomLvl = id => G.rooms[id] || 0;
  const mutLvl = id => G.muts[id] || 0;
  function mutVal(id) {
    const m = D.MUT_BY_ID[id]; const l = mutLvl(id);
    return m.f(l);
  }
  function globalWave(depth, wave) {
    depth = depth || G.depth; wave = wave || G.wave;
    const b = D.BIOMES[depth - 1];
    return b.startWave + wave - 1;
  }
  function biome() { return D.BIOMES[G.depth - 1]; }

  function roomCost(room, lvl) {
    lvl = lvl == null ? roomLvl(room.id) : lvl;
    return room.cost * Math.pow(room.growth, lvl) * mutVal('sprawl');
  }
  function mutCost(m, lvl, n) {
    lvl = lvl == null ? mutLvl(m.id) : lvl;
    if (!n || n === 1) return Math.ceil(m.cost * Math.pow(m.g, lvl));
    return Math.ceil(U.geoSum(m.cost, m.g, lvl, n));
  }
  function mutMaxBuy(m) {
    const lvl = mutLvl(m.id);
    return Math.min(m.max - lvl, U.geoMaxBuy(m.cost, m.g, lvl, G.res.dna));
  }

  function popCost(col, n) {
    const f = D.FAM_BY_ID[col.fam];
    n = n || 1;
    const base = f.popBase * Math.pow(1.55, col.stage) * G.mult.popCost;
    return U.geoSum(base, C.popCostGrowth, col.pop, n);
  }
  function geneCost(col, n) {
    const f = D.FAM_BY_ID[col.fam];
    n = n || 1;
    const base = f.geneBase * Math.pow(1.7, col.stage) * G.mult.geneCost;
    return U.geoSum(base, C.geneCostGrowth, col.gene, n);
  }
  function evoCost(col) {
    const f = D.FAM_BY_ID[col.fam];
    return f.evoBase * Math.pow(9.5, col.stage) * G.mult.evoCost;
  }
  function foundCost(fam) {
    return fam.foundCost * G.mult.popCost;
  }

  function achMult() {
    let m = 1;
    for (const a of D.ACHIEVEMENTS) if (G.ach[a.id]) m *= a.rew;
    return m;
  }

  function recalc() {
    const m = G.mult;
    const rebirth = Math.pow(1.9, G.res.cell) * (1 + G.stats.rebirths * 0.25);

    const gaia = mutVal('gaia');
    const primal = mutVal('primal');
    const bloom = mutVal('bloom');
    const extinct = mutVal('extinct');

    m.ach = achMult();
    m.global = m.ach * gaia * primal * rebirth;

    m.atk = m.global
      * mutVal('fang')
      * extinct
      * (1 + roomLvl('drums') * 0.08);
    m.hp = m.global
      * mutVal('camo')
      * (1 + roomLvl('carapace') * 0.08);
    m.atkSpd = mutVal('instinct');
    m.crit = Math.min(0.75, mutVal('overwhelm'));
    m.rend = mutVal('rend');
    m.apexBonus = mutVal('apex');
    m.frenzyPerKill = mutVal('frenzy') / 100;
    m.spiralPerKill = mutVal('spiral') / 100;
    m.mutualPerFam = mutVal('mutual') / 100;
    m.convergent = mutVal('converge') / 100;
    m.counterBonus = mutVal('counter') / 100;

    const gainBase = m.global * bloom;
    m.bio = gainBase * mutVal('division') * (1 + roomLvl('sluice') * 0.11);
    m.ess = gainBase * mutVal('digest') * (1 + roomLvl('still') * 0.10);
    m.gold = gainBase * mutVal('plunder') * (1 + roomLvl('vault') * 0.12);
    m.passive = mutVal('metab') * (1 + roomLvl('garden') * 0.0);

    m.popCost = mutVal('fertile') * Math.pow(0.978, roomLvl('vats'));
    m.geneCost = mutVal('cheapmeat') * Math.pow(0.980, roomLvl('forge'));
    m.evoCost = Math.pow(0.972, roomLvl('chamber'));

    m.prodOut = mutVal('cycle') * (1 + roomLvl('garden') * 0.14);
    m.decompOut = mutVal('cycle') * (1 + roomLvl('bonepit') * 0.15);
    m.foodSupply = 1 + roomLvl('troughs') * 0.09;
    m.foodDemand = mutVal('cascade');
    m.stabBonus = mutVal('web');
    m.stabCap = 2 + mutVal('keystone');
    m.balancePerfect = mutVal('balance');
    m.starveRelief = mutVal('ironeco');
    m.popExp = C.popExp + mutVal('hyper');
    m.capacity = Math.floor((30 + roomLvl('warren') * 12 + mutVal('brood')) * 1);

    m.slots = 3 + roomLvl('pool') + mutVal('deeper');
    m.battleSlots = C.battleSlots + mutVal('warlord');
    m.coreHP = C.coreHP + roomLvl('core') + mutVal('heart');
    m.terror = mutVal('terror');
    m.legendBonus = mutVal('grudge');
    m.raidSize = 1 + roomLvl('lure') * 0.04;

    m.adaptGain = mutVal('shift');
    m.adaptDecay = mutVal('immune');
    m.adaptCap = Math.min(mutVal('antigen'), mutVal('unknow')) / 100;
    m.adaptBite = U.clamp((G.stats.bestWave - 12) / 30, 0, 1);

    m.trapOpen = Math.min(0.40, roomLvl('spikes') * 0.0028);
    m.trapDot = roomLvl('vents') * 0.015;
    m.crushChance = Math.min(0.25, roomLvl('ceiling') * 0.004);

    const settling = U.clamp(3.0 - G.stats.bestWave / 18, 1, 3);
    m.raidGap = C.raidGapBase * settling * Math.max(0.08, 1 - roomLvl('sonar') * 0.034) / mutVal('echo');
    m.abilityCd = Math.max(0.35, mutVal('rift'));
    m.mimic = mutVal('mimic') / 100;
    m.speed = mutVal('sing');
    m.regen = roomLvl('hatch') * 0.005;
    m.offlineCap = C.offlineCapBase + (mutVal('slumber') + roomLvl('crypt')) * 3600;
    m.offlineEff = mutVal('memory');
    m.hungerLeak = mutVal('hunger') / 100;
    m.rootsEss = mutVal('roots') / 100;
    return m;
  }

  function serialize() {
    const s = {
      ver: G.ver, res: G.res, colonies: G.colonies.map(c => ({ f: c.fam, s: c.stage, p: c.pop, g: c.gene, a: c.auto ? 1 : 0 })),
      rooms: G.rooms, muts: G.muts, ach: G.ach, discovered: G.discovered,
      adapt: G.adapt, dmgShare: G.dmgShare, depth: G.depth, wave: G.wave, maxDepth: G.maxDepth,
      bestInBiome: G.bestInBiome, autoRaid: G.autoRaid, stats: G.stats,
      settings: G.settings, startedAt: G.startedAt, lastTick: Date.now(),
      unlockSeen: G.unlockSeen, revealed: G.revealed, objDone: G.objDone
    };
    return s;
  }
  function save() {
    try {
      return global.Store.setItem(SAVE_KEY, JSON.stringify(serialize()));
    } catch (e) { global.Guard.report(e, 'save'); return false; }
  }
  function hasSave() { return !!global.Store.getItem(SAVE_KEY); }
  function wipe() { global.Store.removeItem(SAVE_KEY); }

  function applySave(s) {
    if (!s) return false;
    Object.assign(G.res, s.res || {});
    G.colonies = (s.colonies || []).filter(c => D.FAM_BY_ID[c.f]).map(c => { const col = makeColony(c.f, c.s, c.p, c.g); col.auto = !!c.a; return col; });
    G.rooms = s.rooms || {};
    G.muts = s.muts || {};
    G.ach = s.ach || {};
    G.discovered = Object.assign({ fam: {}, stage: {}, hero: {}, legend: {} }, s.discovered || {});
    Object.assign(G.adapt, s.adapt || {});
    Object.assign(G.dmgShare, s.dmgShare || {});
    G.depth = s.depth || 1; G.wave = s.wave || 1; G.maxDepth = s.maxDepth || 1;
    G.bestInBiome = s.bestInBiome || {};
    G.autoRaid = s.autoRaid !== false;
    Object.assign(G.stats, s.stats || {});
    Object.assign(G.settings, s.settings || {});
    G.startedAt = s.startedAt || Date.now();
    G.lastTick = s.lastTick || Date.now();
    G.unlockSeen = s.unlockSeen || {};
    G.revealed = s.revealed || {};
    G.objDone = s.objDone || {};
    return true;
  }
  function load() {
    try {
      const raw = global.Store.getItem(SAVE_KEY);
      if (!raw) return false;
      return applySave(JSON.parse(raw));
    } catch (e) {
      global.Guard.report(e, 'load');
      try { global.Store.setItem(SAVE_KEY + '-corrupt', global.Store.getItem(SAVE_KEY) || ''); } catch (e2) { }
      global.Store.removeItem(SAVE_KEY);
      global.Guard.notify('Save could not be read',
        'Your save file was damaged and has been set aside. Starting a fresh dungeon. ' +
        'The unreadable copy is kept under a backup key in case it can be recovered.');
      return false;
    }
  }

  function exportSave() {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(serialize())))); }
    catch (e) { return ''; }
  }
  function importSave(txt) {
    try {
      const s = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
      applySave(s); save(); return true;
    } catch (e) { return false; }
  }

  function makeColony(famId, stage, pop, gene) {
    return {
      fam: famId, stage: stage || 0, pop: pop || 1, gene: gene || 0,
      hp: 1, maxHp: 1, alive: true, atkT: 0, buff: 0,
      shield: 0, freezeGlow: 0, flash: 0, x: 0, y: 0, hitT: 0,
      strikes: 0, id: famId + '_' + (Math.random() * 1e9 | 0)
    };
  }

  function dnaGain() {
    const best = G.stats.bestWaveRun || 0;
    if (best < C.dnaMinWave) return 0;
    const ratio = D.rewardUnit(best) / D.rewardUnit(C.dnaMinWave);
    return Math.floor(C.dnaBase * Math.pow(ratio, C.dnaPow) * mutVal('sovereign'));
  }
  function canCollapse() { return dnaGain() >= 1; }

  function cellTarget() {
    const best = G.stats.bestWave || 0;
    if (best < C.cellStart) return 0;
    return Math.floor(Math.pow((best - C.cellStart) / C.cellDiv, C.cellExp));
  }
  function cellGain() { return Math.max(0, cellTarget() - G.res.cell); }
  function canRebirth() { return cellGain() >= 1; }

  global.S = {
    SAVE_KEY, G, freshState, roomLvl, mutLvl, mutVal, globalWave, biome,
    roomCost, mutCost, mutMaxBuy, popCost, geneCost, evoCost, foundCost, achMult, recalc,
    save, load, hasSave, wipe, exportSave, importSave, makeColony, serialize, applySave,
    dnaGain, canCollapse, cellGain, canRebirth
  };
})(this);
