/* ============================================================
   data.js — all static game content & tuning constants
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------- tuning ---------------- */
  const CONF = {
    waveScale: 1.105,      // hero power growth per global wave
    biomeStep: 1.55,       // extra power multiplier per biome entered
    rewardScale: 1.092,    // reward growth per global wave
    baseHeroHP: 26,
    baseHeroATK: 3.2,
    baseReward: 12,

    popCostGrowth: 1.135,  // biomass cost growth per population point
    geneCostGrowth: 1.17,  // essence cost growth per gene level
    geneMult: 1.09,        // stat multiplier per gene level
    popExp: 0.82,          // population -> power exponent (diminishing)

    stageMult: [1, 6.5, 46, 340, 2900],       // combat stat multiplier per stage
    stageProdMult: [1, 5.5, 34, 230, 1800],   // ecosystem output per stage
    stageFood: [1, 3.2, 11, 38, 130],         // food demand per stage

    battleSlots: 8,        // colonies that can fight at once
    raidGapBase: 3.2,      // seconds between raids
    coreHP: 5,             // seconds of grace once the battle line breaks (nothing revives now)

    adaptGain: 0.075,      // adaptation gained per raid at total concentration
    adaptConc: 1.7,        // ^ applied to each type's damage SHARE, so spreading
                           //   your damage teaches them far less than focusing it
    adaptDecay: 0.030,     // decay per raid for types you stop using
    adaptResist: 0.72,     // max damage reduction at 100% adaptation
    doctrineAt: 0.28,      // adaptation above this and the hero roster shifts too

    offlineCapBase: 4 * 3600,
    // Genome scales off the reward curve itself, so it grows exponentially with
    // depth — the only shape that can keep pushing an exponential hero curve.
    dnaPow: 0.125,
    dnaBase: 24,
    dnaMinWave: 55,
    cellStart: 330,        // primordial cells only start accruing this deep
    cellDiv: 55,           // and accrue sub-linearly, or 1.9^cells eats the universe
    cellExp: 0.8
  };

  /* ---------------- damage types ---------------- */
  const TYPES = {
    phys: { id: 'phys', name: 'Physical', color: '#d9d3c4', icon: '⚔' },
    pois: { id: 'pois', name: 'Poison', color: '#8de84f', icon: '☣' },
    fire: { id: 'fire', name: 'Fire', color: '#ff8a4c', icon: '🔥' },
    frost: { id: 'frost', name: 'Frost', color: '#6fd8ff', icon: '❄' },
    arc: { id: 'arc', name: 'Arcane', color: '#c08cff', icon: '✧' },
    shad: { id: 'shad', name: 'Shadow', color: '#b06cff', icon: '☾' }
  };
  const TYPE_LIST = ['phys', 'pois', 'fire', 'frost', 'arc', 'shad'];

  /* ---------------- trophic roles ---------------- */
  const ROLES = {
    producer: { id: 'producer', name: 'Producer', short: 'PROD', color: '#8de84f', ideal: 8, icon: '🌱',
      desc: 'Grows biomass out of nothing but damp and dark. Feeds everything above it.' },
    decomposer: { id: 'decomposer', name: 'Decomposer', short: 'DECOMP', color: '#5ce89a', ideal: 5, icon: '🦠',
      desc: 'Renders corpses back into biomass. Converts every hero you kill into fuel.' },
    consumer: { id: 'consumer', name: 'Consumer', short: 'CONS', color: '#ffcb61', ideal: 4, icon: '🐀',
      desc: 'Eats producers. Cheap, numerous, dies loudly.' },
    construct: { id: 'construct', name: 'Construct', short: 'CONSTR', color: '#b8c4cc', ideal: 2, icon: '🗿',
      desc: 'Eats nothing. Never starves. Never grows on its own either.' },
    predator: { id: 'predator', name: 'Predator', short: 'PRED', color: '#ff8a4c', ideal: 2, icon: '🕷' },
    apex: { id: 'apex', name: 'Apex', short: 'APEX', color: '#ff5f6d', ideal: 1, icon: '🐉',
      desc: 'The top of your food chain. Devastating, and devastatingly hungry.' }
  };
  ROLES.predator.desc = 'Hunts consumers. Strong, hungry, worth it.';

  const ROLE_BASE = {
    producer:   { hp: 9,  atk: 1.3, spd: .85, food: 0, prod: 1.00 },
    decomposer: { hp: 11, atk: 2.2, spd: 1.05, food: 0, prod: 0.34 },
    consumer:   { hp: 13, atk: 3.4, spd: 1.10, food: 1, prod: 0 },
    construct:  { hp: 30, atk: 2.6, spd: 0.70, food: 0, prod: 0 },
    predator:   { hp: 17, atk: 6.2, spd: 1.00, food: 3, prod: 0 },
    apex:       { hp: 33, atk: 13.5, spd: 0.85, food: 9, prod: 0 }
  };

  /* ---------------- monster families ----------------
     [id, name, role, dmg, shape, c1, c2, unlockWave, passiveId, tint...]
  -------------------------------------------------- */
  const PASSIVES = {
    split:     { name: 'Binary Fission', icon: '◐', desc: 'Splits and thickens: +{v}% attack for every colony already routed this raid.' },
    spores:    { name: 'Spore Bloom', icon: '❀', desc: '+{v}% biomass from every source.' },
    swarm:     { name: 'Swarm Logic', icon: '⁘', desc: 'Each strike splashes {v}% damage onto a second hero.' },
    lifesteal: { name: 'Sanguine Feed', icon: '🩸', desc: 'Heals for {v}% of all damage dealt.' },
    web:       { name: 'Ensnare', icon: '🕸', desc: 'Heroes attack {v}% slower while this colony lives.' },
    undying:   { name: 'Undying', icon: '💀', desc: 'Needs no food, and takes {v}% less damage.' },
    mob:       { name: 'Mob Rule', icon: '⚑', desc: '+{v}% attack for every other living colony.' },
    mana:      { name: 'Ley Siphon', icon: '✧', desc: '+{v}% essence from every source.' },
    bulwark:   { name: 'Bulwark', icon: '🛡', desc: 'Absorbs {v}% of damage aimed at other colonies.' },
    devour:    { name: 'Devour', icon: '👄', desc: '+{v}% damage to heroes below half health.' },
    burn:      { name: 'Immolate', icon: '🔥', desc: 'Attacks ignite for {v}% of the hit over 3s.' },
    regrow:    { name: 'Verdant Regrowth', icon: '🌿', desc: 'Heals every colony {v}% of max health per second.' },
    gaze:      { name: 'Unravelling Gaze', icon: '👁', desc: 'Ignores {v}% of hero resistance and adaptation.' },
    phase:     { name: 'Phase', icon: '༄', desc: '{v}% chance to phase through an incoming attack.' },
    breath:    { name: 'Cataclysm Breath', icon: '☄', desc: 'Every 5th strike hits the entire hero party.' },
    freeze:    { name: 'Deep Freeze', icon: '❄', desc: '{v}% chance to freeze a hero solid for 1.4s.' }
  };

  const FAM_RAW = [
    // id, name, role, dmg, shape, colA, colB, unlockWave, passive, passiveVal, names[5], blurb
    ['ooze', 'Ooze', 'decomposer', 'pois', 'blob', '#5ce89a', '#1f7a4d', 1, 'split', 30,
      ['Slime', 'Poison Slime', 'Corrosive Ooze', 'King Slime', 'Acid Ocean'],
      'It was here before you. It will digest whatever is here after.'],
    ['fungus', 'Fungus', 'producer', 'pois', 'mushroom', '#c88bff', '#5c2f8f', 1, 'spores', 6,
      ['Sporeling', 'Spore Cap', 'Myconid', 'Mycelium Hive', 'World Mycelium'],
      'A single organism the size of a mountain, wearing a thousand small hats.'],
    ['vermin', 'Vermin', 'decomposer', 'phys', 'rodent', '#c9a06a', '#5e4126', 4, 'swarm', 35,
      ['Cave Rat', 'Plague Rat', 'Dire Rat', 'Rat King', 'Pestilence Choir'],
      'Nothing is wasted. Nothing is ever, ever wasted.'],
    ['chiro', 'Chiroptera', 'consumer', 'shad', 'bat', '#9c7dff', '#3a2470', 10, 'lifesteal', 14,
      ['Cave Bat', 'Vampire Bat', 'Night Stalker', 'Blood Lord', 'Crimson Eclipse'],
      'The ceiling breathes, and then the ceiling is hungry.'],
    ['bone', 'Ossuary', 'construct', 'shad', 'skeleton', '#e6e2d3', '#6b6455', 18, 'undying', 22,
      ['Skeleton', 'Bone Archer', 'Bone Knight', 'Lich', 'Bone Cathedral'],
      'Every hero you kill leaves behind a volunteer.'],
    ['arach', 'Arachnid', 'predator', 'pois', 'spider', '#7de0d0', '#1d5a55', 28, 'web', 22,
      ['Cave Spider', 'Web Weaver', 'Black Widow', 'Broodmother', 'Web Dominion'],
      'The dungeon has corners. The corners have opinions.'],
    ['gob', 'Goblinoid', 'consumer', 'phys', 'goblinoid', '#8fd14f', '#2f5c1c', 40, 'mob', 9,
      ['Goblin', 'Hobgoblin', 'Bugbear', 'Warchief', 'Goblin Legion'],
      'Individually pathetic. Collectively a national emergency.'],
    ['verd', 'Verdant', 'producer', 'pois', 'treant', '#79c46a', '#2c5c2a', 55, 'regrow', 1.4,
      ['Sapling', 'Thornling', 'Bramble Horror', 'Elder Treant', 'Verdant Apocalypse'],
      'It grew toward the light. It did not find any. It kept growing.'],
    ['wisp', 'Wisp', 'producer', 'arc', 'wisp', '#a9d8ff', '#3b5ea8', 72, 'mana', 12,
      ['Mote', 'Wisp', "Will-o'-Wisp", 'Wraith Star', 'Void Nova'],
      'Light with nothing kind about it.'],
    ['golem', 'Golem', 'construct', 'phys', 'golem', '#a8b4bd', '#454f57', 95, 'bulwark', 25,
      ['Pebble', 'Stone Golem', 'Iron Sentinel', 'Obsidian Colossus', 'Living Mountain'],
      'The dungeon decided to stand up.'],
    ['inf', 'Infernal', 'predator', 'fire', 'imp', '#ff7a4c', '#8f2410', 120, 'burn', 40,
      ['Imp', 'Fiend', 'Hellhound', 'Archfiend', 'Infernal Gate'],
      'Something down here is on fire and has been for a very long time.'],
    ['glac', 'Glacial', 'consumer', 'frost', 'crystal', '#8fe6ff', '#1d5f85', 150, 'freeze', 16,
      ['Frost Sprite', 'Ice Elemental', 'Rime Horror', 'Glacier Titan', 'Absolute Zero'],
      'Heat is a resource. It is being harvested.'],
    ['shade', 'Shade', 'predator', 'shad', 'shade', '#b06cff', '#3d1a66', 185, 'phase', 24,
      ['Shade', 'Phantom', 'Nightmare', 'Dread Sovereign', 'Eternal Night'],
      'It is not that the torches go out. It is that they were never lit.'],
    ['wyrm', 'Wyrm', 'apex', 'phys', 'worm', '#e0a86b', '#7a4418', 225, 'devour', 90,
      ['Grub', 'Burrower', 'Devourer', 'Sand Wyrm', 'World Serpent'],
      'You did not dig these tunnels. You are living inside something.'],
    ['aber', 'Aberration', 'apex', 'arc', 'eye', '#ff8fd0', '#7a1f66', 275, 'gaze', 55,
      ['Gazer', 'Watcher', 'Beholder', 'All-Seeing Tyrant', 'Eye of the Abyss'],
      'It understands your ecosystem better than you do.'],
    ['drac', 'Draconic', 'apex', 'fire', 'dragon', '#ff5f6d', '#7a1020', 330, 'breath', 100,
      ['Whelp', 'Drake', 'Wyvern', 'Elder Dragon', 'Cataclysm Dragon'],
      'The oldest thing in the dark, and it has been waiting to be relevant again.']
  ];

  const FAMS = FAM_RAW.map((r, i) => {
    const [id, name, role, dmg, shape, cA, cB, unlock, passive, pval, names, blurb] = r;
    const b = ROLE_BASE[role];
    const rank = i + 1;
    return {
      id, name, role, dmg, shape, blurb, index: i, rank,
      colors: [cA, cB],
      unlockWave: unlock,
      passive, passiveVal: pval,
      stages: names,
      hp: b.hp * (1 + i * 0.16),
      atk: b.atk * (1 + i * 0.17),
      spd: b.spd,
      food: b.food,
      prod: b.prod * (1 + i * 0.12),
      foundCost: 24 * Math.pow(2.2, i),
      popBase: 12 * Math.pow(2.3, i),
      geneBase: 30 * Math.pow(2.5, i),
      evoBase: 120 * Math.pow(2.9, i)
    };
  });
  const FAM_BY_ID = {}; FAMS.forEach(f => FAM_BY_ID[f.id] = f);

  /* stage gates — you may not evolve past these until the depth is reached */
  const STAGE_GATE = [0, 10, 60, 150, 330];
  const STAGE_LABEL = ['Base', 'Evolved', 'Greater', 'Ascendant', 'Mythic'];

  /* ---------------- heroes ----------------
     [id, name, tier, hpMul, atkMul, spd, dmg, shape, color, ability, bio, ess, gold, resists]
  -------------------------------------------------- */
  const HERO_RAW = [
    ['villager', 'Villager', 1, 0.55, 0.5, 0.9, 'phys', 'peasant', '#b99a6b', null, 1.0, 0.5, 0.6, {}],
    ['militia', 'Militia', 1, 0.9, 0.8, 0.95, 'phys', 'soldier', '#8fa2b5', null, 1.2, 0.7, 0.9, {}],
    ['torch', 'Torchbearer', 1, 0.7, 0.9, 1.0, 'fire', 'mage', '#ff9a52', null, 1.1, 0.9, 0.8, { fire: .3 }],
    ['acolyte', 'Acolyte', 1, 0.75, 0.6, 0.85, 'arc', 'priest', '#e8dfc0', 'heal', 1.3, 1.2, 0.9, { arc: .2 }],

    ['squire', 'Squire', 2, 1.5, 1.15, 0.95, 'phys', 'soldier', '#c0c8d0', null, 1.4, 0.9, 1.3, { phys: .12 }],
    ['ranger', 'Ranger', 2, 1.1, 1.6, 1.25, 'phys', 'archer', '#7fc48a', null, 1.3, 1.0, 1.2, {}],
    ['apprentice', 'Apprentice', 2, 0.95, 1.7, 0.9, 'arc', 'mage', '#9fb8ff', null, 1.3, 1.5, 1.1, { arc: .25 }],
    ['herbalist', 'Herbalist', 2, 1.2, 0.9, 0.9, 'pois', 'priest', '#9fe07a', 'cleanse', 1.5, 1.3, 1.1, { pois: .5 }],

    ['knight', 'Knight', 3, 2.9, 1.5, 0.8, 'phys', 'knight', '#d5dbe2', 'shield', 1.8, 1.2, 2.0, { phys: .3 }],
    ['cleric', 'Cleric', 3, 1.7, 1.1, 0.9, 'arc', 'priest', '#ffe9a8', 'heal', 2.0, 2.0, 1.6, { shad: .3 }],
    ['rogue', 'Rogue', 3, 1.2, 2.4, 1.5, 'phys', 'rogue', '#9b8fb5', 'crit', 1.7, 1.4, 2.2, {}],
    ['pyro', 'Pyromancer', 3, 1.3, 2.6, 1.0, 'fire', 'mage', '#ff7a3c', 'cleave', 1.9, 1.9, 1.5, { fire: .55 }],

    ['paladin', 'Paladin', 4, 4.2, 2.1, 0.8, 'phys', 'knight', '#ffe08a', 'aura', 2.6, 2.0, 3.0, { phys: .3, shad: .35 }],
    ['captain', 'Ranger Captain', 4, 2.1, 3.4, 1.3, 'phys', 'archer', '#8fd6a2', 'volley', 2.3, 1.9, 2.6, {}],
    ['sorcerer', 'Sorcerer', 4, 1.9, 4.0, 1.0, 'arc', 'mage', '#b48cff', 'cleave', 2.5, 3.0, 2.4, { arc: .45 }],
    ['frostmage', 'Frost Mage', 4, 2.0, 3.2, 1.0, 'frost', 'mage', '#7fd8ff', 'slow', 2.4, 2.8, 2.3, { frost: .6 }],

    ['templar', 'Templar', 5, 5.5, 3.0, 0.85, 'phys', 'knight', '#fff0c4', 'purge', 3.4, 3.0, 4.2, { phys: .35, arc: .3 }],
    ['warden', 'Warden', 5, 4.4, 2.8, 0.9, 'pois', 'priest', '#8fe07a', 'ward', 3.3, 3.2, 3.8, { pois: .65 }],
    ['assassin', 'Assassin', 5, 2.2, 5.4, 1.6, 'shad', 'rogue', '#8f7ab5', 'execute', 3.0, 3.4, 4.4, { shad: .45 }],
    ['battlemage', 'Battlemage', 5, 3.4, 4.6, 1.05, 'fire', 'mage', '#ff8f5c', 'cleave', 3.2, 3.6, 3.6, { fire: .5, phys: .2 }],

    ['archmage', 'Archmage', 6, 4.6, 7.5, 1.05, 'arc', 'archmage', '#c9a0ff', 'cleave', 4.6, 6.2, 5.0, { arc: .6 }],
    ['saint', 'Saint', 6, 6.8, 4.0, 0.9, 'arc', 'priest', '#fff6d6', 'revive', 5.0, 6.0, 5.4, { shad: .5, arc: .4 }],
    ['berserker', 'Berserker', 6, 7.4, 6.2, 1.15, 'phys', 'berserk', '#ff7a6d', 'enrage', 4.8, 4.6, 5.2, { phys: .25 }],
    ['dragoon', 'Dragoon', 6, 6.0, 6.8, 1.1, 'fire', 'knight', '#ffb05c', 'leap', 4.9, 5.2, 5.8, { fire: .5, frost: .3 }],

    ['runelord', 'Runelord', 7, 8.5, 9.5, 1.0, 'arc', 'archmage', '#d6b0ff', 'adapt', 7.2, 9.5, 8.0, { arc: .55, pois: .4 }],
    ['grand', 'Grandmaster', 7, 12.0, 8.5, 1.0, 'phys', 'knight', '#f2f6ff', 'aura', 7.6, 8.4, 9.0, { phys: .45, fire: .3 }],
    ['void', 'Voidcaller', 7, 8.0, 11.0, 1.1, 'shad', 'archmage', '#a06cff', 'drain', 7.4, 10.0, 8.4, { shad: .6, arc: .35 }],
    ['godslayer', 'Godslayer', 7, 10.5, 13.0, 1.15, 'phys', 'berserk', '#ffd06d', 'pierce', 8.0, 9.6, 10.5, { phys: .35, pois: .35 }],

    ['seraph', 'Seraph', 8, 16.0, 13.0, 1.05, 'arc', 'seraph', '#fffbe8', 'revive', 12.0, 16.0, 13.0, { arc: .6, shad: .6 }],
    ['chrono', 'Chronomancer', 8, 12.0, 16.0, 1.2, 'frost', 'archmage', '#9fe8ff', 'slow', 11.5, 17.0, 12.5, { frost: .7, arc: .4 }],
    ['worldbreak', 'Worldbreaker', 8, 22.0, 15.0, 0.95, 'phys', 'berserk', '#ff8f6d', 'enrage', 13.0, 15.0, 15.0, { phys: .5, fire: .45 }],
    ['ascend', 'Ascendant', 8, 18.0, 19.0, 1.1, 'shad', 'seraph', '#c98fff', 'adapt', 14.0, 20.0, 16.0, { shad: .5, pois: .45, frost: .35 }]
  ];

  const HEROES = HERO_RAW.map(r => ({
    id: r[0], name: r[1], tier: r[2], hpMul: r[3], atkMul: r[4], spd: r[5],
    dmg: r[6], shape: r[7], color: r[8], ability: r[9],
    bio: r[10], ess: r[11], gold: r[12], res: r[13]
  }));
  const HERO_BY_ID = {}; HEROES.forEach(h => HERO_BY_ID[h.id] = h);
  const TIER_WAVE = [0, 1, 12, 30, 58, 95, 145, 205, 285]; // min global wave per hero tier

  /* stagger arrivals inside a tier so a new hero class shows up every few raids */
  {
    const perTier = {};
    HEROES.forEach(h => { (perTier[h.tier] = perTier[h.tier] || []).push(h); });
    for (const tier in perTier) {
      const t = +tier;
      const from = TIER_WAVE[t], to = TIER_WAVE[t + 1] || (from + 80);
      const step = Math.max(1, Math.round((to - from) / 6));
      perTier[tier].forEach((h, i) => { h.minWave = from + i * step; });
    }
  }

  const HERO_ABILITIES = {
    heal: { name: 'Mend', desc: 'Heals the most wounded hero.' },
    cleanse: { name: 'Antitoxin', desc: 'Grants the party poison resistance.' },
    shield: { name: 'Bulwark', desc: 'Absorbs a burst of damage.' },
    crit: { name: 'Backstab', desc: 'Occasional triple-damage strike.' },
    cleave: { name: 'Wide Arc', desc: 'Hits two colonies at once.' },
    aura: { name: 'Rallying Aura', desc: '+25% attack to the whole party.' },
    volley: { name: 'Volley', desc: 'Fires three arrows at once.' },
    slow: { name: 'Rime', desc: 'Slows your colonies by 20%.' },
    purge: { name: 'Purge', desc: 'Strips one of your active surges.' },
    ward: { name: 'Warding Circle', desc: 'Party takes 30% less damage briefly.' },
    execute: { name: 'Execute', desc: 'Massive damage to a routed-low colony.' },
    revive: { name: 'Resurrection', desc: 'Revives one fallen hero, once.' },
    enrage: { name: 'Enrage', desc: 'Gains attack speed as health drops.' },
    leap: { name: 'Dragoon Leap', desc: 'Strikes past the front line.' },
    adapt: { name: 'Counter-Evolution', desc: 'Adaptation rises twice as fast.' },
    drain: { name: 'Void Drain', desc: 'Steals biomass on every hit.' },
    pierce: { name: 'Sunder', desc: 'Ignores 60% of colony armour.' }
  };

  /* ---------------- legends (boss heroes) ---------------- */
  const LEGENDS = [
    ['Sir Aldric the Unbroken', 'knight', '#ffe9a8', 'aura'],
    ['Lyra Dawnblade', 'knight', '#fff2c4', 'crit'],
    ['Grim Halvard', 'berserk', '#ff8a6d', 'enrage'],
    ['Sister Veyra', 'priest', '#e8f0ff', 'revive'],
    ['Kaelen Stormcaller', 'archmage', '#9fd8ff', 'cleave'],
    ['Varr the Beastmaster', 'archer', '#a8d18f', 'volley'],
    ['Archduke Roland', 'knight', '#d6c4ff', 'shield'],
    ['Mother Isolde', 'priest', '#ffd6e8', 'heal'],
    ['Thorne Ironheart', 'knight', '#c4d6e8', 'purge'],
    ['Selene of the Silver Choir', 'seraph', '#eaf4ff', 'ward'],
    ['The Hollow Knight', 'knight', '#8f9aa8', 'pierce'],
    ['Malachai the Unmaker', 'archmage', '#b06cff', 'drain'],
    ['Empress Auria', 'seraph', '#ffe8a8', 'aura'],
    ['Saint Cordelia', 'seraph', '#fff8e8', 'revive'],
    ['Vorn, Wound of the World', 'berserk', '#ff6d6d', 'enrage'],
    ['The Last Hero', 'seraph', '#ffffff', 'adapt']
  ].map(l => ({ name: l[0], shape: l[1], color: l[2], ability: l[3] }));

  const LEGEND_TITLES = ['', 'the Returned', 'the Twice-Slain', 'the Undying', 'the Vengeful',
    'the Eternal', 'Who Will Not Stay Dead', 'the Inevitable', 'the Absolute'];

  /* ---------------- biomes ---------------- */
  const BIOMES = [
    { name: 'The Shallow Warrens', waves: 40, sky: ['#132420', '#0a1512'], rock: '#1d3630', glow: '#5ce89a', loot: 1, blurb: 'Damp. Forgettable. Yours.' },
    { name: 'Fungal Hollows', waves: 50, sky: ['#1d1630', '#0d0a18'], rock: '#2e2246', glow: '#c88bff', loot: 1.5, blurb: 'The air is 40% spore by volume.' },
    { name: 'Drowned Catacombs', waves: 60, sky: ['#0e1f2a', '#060f16'], rock: '#183040', glow: '#6fd8ff', loot: 2.3, blurb: 'Something is buried here. Several somethings.' },
    { name: 'The Screaming Vein', waves: 70, sky: ['#2a1018', '#12060a'], rock: '#3d1a24', glow: '#ff5f6d', loot: 3.5, blurb: 'The rock has a pulse and a grievance.' },
    { name: 'Emberdeep Foundry', waves: 80, sky: ['#2c1808', '#140a03'], rock: '#472612', glow: '#ff8a4c', loot: 5.2, blurb: 'Where the mountain smelts itself.' },
    { name: 'Frostbound Abyss', waves: 90, sky: ['#0c1c2c', '#050c14'], rock: '#16304a', glow: '#8fe6ff', loot: 7.9, blurb: 'Cold enough to freeze a scream mid-air.' },
    { name: 'The Silken Dark', waves: 100, sky: ['#101f1e', '#060e0d'], rock: '#17332f', glow: '#7de0d0', loot: 11.8, blurb: 'Every surface is load-bearing. For something.' },
    { name: 'Cathedral of Bones', waves: 110, sky: ['#1e1c14', '#0c0b07'], rock: '#38342a', glow: '#e6e2d3', loot: 17.8, blurb: 'Built entirely from the confident.' },
    { name: 'The Living Wound', waves: 120, sky: ['#26101f', '#100610'], rock: '#3d1a34', glow: '#ff8fd0', loot: 26.6, blurb: 'The dungeon stopped pretending to be geology.' },
    { name: 'Primordial Core', waves: 999, sky: ['#1a0e28', '#080412'], rock: '#2c1846', glow: '#c98fff', loot: 40, blurb: 'The first dark. It remembers being alone.' }
  ];
  // cumulative wave offsets
  let acc = 0; BIOMES.forEach(b => { b.startWave = acc + 1; acc += b.waves; b.endWave = acc; });

  /* ---------------- dungeon rooms ----------------
     effect kinds are resolved in ecosystem.js / combat.js
  -------------------------------------------------- */
  const ROOMS = [
    { id: 'pool', name: 'Spawning Pool', icon: '🕳', max: 8, cur: 'gold', cost: 60, growth: 4.4, unlock: 0,
      desc: 'Carve out another chamber. +1 colony slot.', eff: v => '+' + v + ' colony slot' },
    { id: 'warren', name: 'Warren Depths', icon: '🏚', max: 40, cur: 'gold', cost: 40, growth: 1.42, unlock: 0,
      desc: 'More room to breed. +12 population capacity.', eff: v => '+' + (v * 12) + ' capacity' },
    { id: 'garden', name: 'Fungal Garden', icon: '🍄', max: 100, cur: 'bio', cost: 120, growth: 1.32, unlock: 2,
      desc: 'Cultivated rot. Producers make more food.', eff: v => '+' + (v * 14) + '% producer output' },
    { id: 'bonepit', name: 'Bone Pit', icon: '🦴', max: 100, cur: 'bio', cost: 200, growth: 1.34, unlock: 4,
      desc: 'Corpses go in. Slurry comes out.', eff: v => '+' + (v * 15) + '% decomposer output' },
    { id: 'sluice', name: 'Gore Sluice', icon: '🩸', max: 200, cur: 'gold', cost: 90, growth: 1.29, unlock: 3,
      desc: 'Channels every drop somewhere useful.', eff: v => '+' + (v * 11) + '% biomass per kill' },
    { id: 'still', name: 'Essence Still', icon: '⚗', max: 200, cur: 'gold', cost: 260, growth: 1.33, unlock: 8,
      desc: 'Distils the last of a hero into something usable.', eff: v => '+' + (v * 10) + '% essence per kill' },
    { id: 'vault', name: 'Mimic Vault', icon: '🧰', max: 200, cur: 'bio', cost: 400, growth: 1.31, unlock: 12,
      desc: 'It eats the chest and keeps the contents.', eff: v => '+' + (v * 12) + '% plunder per kill' },
    { id: 'spikes', name: 'Spike Corridor', icon: '🔻', max: 150, cur: 'gold', cost: 150, growth: 1.30, unlock: 6,
      desc: 'The classics endure. Heroes enter pre-wounded.', eff: v => 'Raid opens at −' + (Math.min(0.40, v * 0.0028) * 100).toFixed(1) + '% hero health' },
    { id: 'vents', name: 'Acid Vents', icon: '☠', max: 150, cur: 'bio', cost: 500, growth: 1.32, unlock: 20,
      desc: 'A gentle continuous dissolving, as strong as your ecosystem is.', eff: v => '+' + (v * 1.5).toFixed(0) + '% of dungeon DPS as poison, always on' },
    { id: 'ceiling', name: 'Collapsing Ceiling', icon: '🪨', max: 100, cur: 'gold', cost: 900, growth: 1.36, unlock: 30,
      desc: 'Occasionally the roof simply votes against them.', eff: v => (Math.min(0.25, v * 0.004) * 100).toFixed(1) + '% chance to crush a hero on entry' },
    { id: 'core', name: 'Warded Core', icon: '💠', max: 30, cur: 'gold', cost: 700, growth: 1.85, unlock: 10,
      desc: 'Your heart, but armoured. Buys seconds after the last colony falls.', eff: v => '+' + v + 's core grace' },
    { id: 'hatch', name: 'Regrowth Vats', icon: '🥚', max: 40, cur: 'bio', cost: 320, growth: 1.38, unlock: 7,
      desc: 'Torn tissue knits back together mid-fight. Colonies never return once routed — keep them alive instead.',
      eff: v => '+' + (v * 0.5).toFixed(1) + '% max health regenerated per second' },
    { id: 'vats', name: 'Breeding Vats', icon: '🧪', max: 120, cur: 'bio', cost: 800, growth: 1.30, unlock: 15,
      desc: 'Industrialised reproduction.', eff: v => '−' + (100 - 100 * Math.pow(0.978, v)).toFixed(0) + '% population cost' },
    { id: 'forge', name: 'Gene Forge', icon: '🧬', max: 120, cur: 'gold', cost: 1400, growth: 1.32, unlock: 22,
      desc: 'Rewrites the small print of a species.', eff: v => '−' + (100 - 100 * Math.pow(0.980, v)).toFixed(0) + '% gene level cost' },
    { id: 'chamber', name: 'Evolution Chamber', icon: '🌀', max: 60, cur: 'gold', cost: 5000, growth: 1.42, unlock: 35,
      desc: 'Accelerates what would take ten thousand years.', eff: v => '−' + (100 - 100 * Math.pow(0.972, v)).toFixed(0) + '% evolution cost' },
    { id: 'troughs', name: 'Feeding Troughs', icon: '🥩', max: 150, cur: 'bio', cost: 1200, growth: 1.31, unlock: 18,
      desc: 'Nothing goes hungry. Nothing calms down either.', eff: v => '+' + (v * 9) + '% food supply' },
    { id: 'drums', name: 'War Drums', icon: '🥁', max: 300, cur: 'gold', cost: 600, growth: 1.28, unlock: 14,
      desc: 'Rhythm makes killing efficient.', eff: v => '+' + (v * 8) + '% colony attack' },
    { id: 'carapace', name: 'Carapace Fields', icon: '🛡', max: 300, cur: 'bio', cost: 700, growth: 1.28, unlock: 16,
      desc: 'Shed chitin, worn by everything.', eff: v => '+' + (v * 8) + '% colony health' },
    { id: 'sonar', name: 'Deep Sonar', icon: '📡', max: 40, cur: 'gold', cost: 2000, growth: 1.40, unlock: 25,
      desc: 'You hear them coming a floor early.', eff: v => '−' + Math.min(92, v * 3.4).toFixed(0) + '% time between raids' },
    { id: 'lure', name: 'Hero Lure', icon: '🏴', max: 100, cur: 'gold', cost: 3000, growth: 1.34, unlock: 40,
      desc: 'Rumours of treasure. Bigger parties arrive.', eff: v => '+' + (v * 4) + '% raid size & loot' },
    { id: 'crypt', name: 'Memory Crypt', icon: '🕯', max: 24, cur: 'bio', cost: 9000, growth: 1.5, unlock: 45,
      desc: 'The dungeon dreams while you are away.', eff: v => '+' + v + 'h offline accumulation' }
  ];

  /* ---------------- mutations (DNA tree) ---------------- */
  const MUT_BRANCHES = [
    { id: 'pred', name: 'Predation', icon: '🦷', color: '#ff5f6d' },
    { id: 'fec', name: 'Fecundity', icon: '🥚', color: '#5ce89a' },
    { id: 'sym', name: 'Symbiosis', icon: '♾', color: '#8de84f' },
    { id: 'adp', name: 'Adaptation', icon: '🧬', color: '#a98bff' },
    { id: 'dom', name: 'Dominion', icon: '👑', color: '#ffcb61' },
    { id: 'void', name: 'Void', icon: '🕳', color: '#69e6ff' }
  ];

  const MUTATIONS = [
    // predation
    { id: 'fang', b: 'pred', name: 'Sharpened Fangs', icon: '🦷', desc: '+{v}% colony attack.', f: v => 1 + v * .24 },
    { id: 'instinct', b: 'pred', name: 'Killer Instinct', icon: '⚡', desc: '+{v}% colony attack speed.', f: v => 1 + v * .075 },
    { id: 'frenzy', b: 'pred', name: 'Blood Frenzy', icon: '🩸', desc: '+{v}% attack per hero already slain this raid.', f: v => v * 1.5 },
    { id: 'apex', b: 'pred', name: 'Apex Predator', icon: '🐉', desc: 'Apex and Predator colonies deal +{v}% damage.', f: v => 1 + v * .47 },
    { id: 'rend', b: 'pred', name: 'Rend', icon: '🗡', desc: 'Ignore {v}% of hero resistance.', f: v => Math.min(.85, v * .047) },
    { id: 'spiral', b: 'pred', name: 'Death Spiral', icon: '🌀', desc: 'Each hero killed grants the whole dungeon +{v}% damage for the raid.', f: v => v * 3.3 },
    { id: 'overwhelm', b: 'pred', name: 'Overwhelm', icon: '💥', desc: 'Critical chance +{v}%, criticals hit for triple.', f: v => v * .045 },
    { id: 'extinct', b: 'pred', name: 'Extinction Event', icon: '☄', desc: 'Colony attack ×{v}.', f: v => Math.pow(2.5, v) },

    // fecundity
    { id: 'fertile', b: 'fec', name: 'Fertile Spawn', icon: '🥚', desc: 'Population cost ×{v}.', f: v => Math.pow(.951, v) },
    { id: 'division', b: 'fec', name: 'Rapid Division', icon: '⧉', desc: '+{v}% biomass gain.', f: v => 1 + v * .28 },
    { id: 'digest', b: 'fec', name: 'Efficient Digestion', icon: '🌀', desc: '+{v}% essence gain.', f: v => 1 + v * .18 },
    { id: 'plunder', b: 'fec', name: 'Glittering Gullet', icon: '◈', desc: '+{v}% plunder gain.', f: v => 1 + v * .21 },
    { id: 'brood', b: 'fec', name: 'Endless Brood', icon: '🐛', desc: '+{v} population capacity.', f: v => v * 42 },
    { id: 'cheapmeat', b: 'fec', name: 'Cheap Meat', icon: '🍖', desc: 'Gene level cost ×{v}.', f: v => Math.pow(.954, v) },
    { id: 'bloom', b: 'fec', name: 'Bloom', icon: '❀', desc: 'All resource gain ×{v}.', f: v => Math.pow(1.75, v) },
    { id: 'hyper', b: 'fec', name: 'Hyperfertility', icon: '∞', desc: 'Population power exponent +{v}.', f: v => v * .015 },

    // symbiosis
    { id: 'web', b: 'sym', name: 'Balanced Web', icon: '🕸', desc: '+{v} flat ecosystem stability.', f: v => v * .032 },
    { id: 'cycle', b: 'sym', name: 'Nutrient Cycling', icon: '♻', desc: '+{v}% producer & decomposer output.', f: v => 1 + v * .24 },
    { id: 'mutual', b: 'sym', name: 'Mutualism', icon: '🤝', desc: 'Each distinct family deployed grants +{v}% global power.', f: v => v * 1.35 },
    { id: 'keystone', b: 'sym', name: 'Keystone Species', icon: '🗝', desc: 'Stability multiplier cap +{v}.', f: v => v * .47 },
    { id: 'cascade', b: 'sym', name: 'Trophic Cascade', icon: '🌊', desc: 'Food demand ×{v}.', f: v => Math.pow(.94, v) },
    { id: 'roots', b: 'sym', name: 'Deep Roots', icon: '🌳', desc: 'Passive biomass also generates {v}% as essence.', f: v => v * 1.1 },
    { id: 'balance', b: 'sym', name: 'Perfect Balance', icon: '☯', desc: 'A perfectly balanced pyramid grants ×{v} to everything.', f: v => 1 + v * .34 },
    { id: 'gaia', b: 'sym', name: 'Gaia', icon: '🜨', desc: 'Global multiplier ×{v}.', f: v => Math.pow(2.6, v) },

    // adaptation
    { id: 'shift', b: 'adp', name: 'Shifting Biology', icon: '🧬', desc: 'Adaptation builds at ×{v} speed.', f: v => Math.pow(.944, v) },
    { id: 'immune', b: 'adp', name: 'Immune Memory', icon: '🛡', desc: 'Adaptation decays {v}% faster between raids.', f: v => 1 + v * .24 },
    { id: 'camo', b: 'adp', name: 'Camouflage', icon: '🍃', desc: '+{v}% colony health.', f: v => 1 + v * .24 },
    { id: 'counter', b: 'adp', name: 'Counter-Evolution', icon: '⟳', desc: 'Your least-used damage type deals +{v}% damage.', f: v => v * 6.7 },
    { id: 'mimic', b: 'adp', name: 'Mimicry', icon: '🎭', desc: '{v}% of all damage is re-dealt as your least-adapted type.', f: v => Math.min(85, v * 5.5) },
    { id: 'antigen', b: 'adp', name: 'Antigen Purge', icon: '💉', desc: 'Adaptation caps at {v}% instead of 100%.', f: v => Math.max(20, 100 - v * 6.7) },
    { id: 'converge', b: 'adp', name: 'Convergent Evolution', icon: '⧗', desc: 'Every colony deals +{v}% damage.', f: v => v * 14 },
    // level 0 must mean "no cap" — this used to sit at 45% before you bought anything
    { id: 'unknow', b: 'adp', name: 'Unknowable', icon: '❓', desc: 'Heroes can never adapt above {v}%.', f: v => v ? Math.max(8, 52 - v * 5.5) : 100 },

    // dominion
    { id: 'deeper', b: 'dom', name: 'Deeper Warrens', icon: '🕳', desc: '+{v} colony slots.', f: v => v },
    { id: 'heart', b: 'dom', name: 'Second Heart', icon: '💠', desc: '+{v}s of core grace.', f: v => v * 2.7 },
    { id: 'ironeco', b: 'dom', name: 'Iron Ecology', icon: '⛓', desc: 'Starvation penalty reduced by {v}%.', f: v => Math.min(.95, v * .083) },
    { id: 'terror', b: 'dom', name: 'Terror Aura', icon: '😱', desc: 'Heroes arrive at {v}% reduced attack.', f: v => Math.min(.75, v * .047) },
    { id: 'sprawl', b: 'dom', name: 'Dungeon Sprawl', icon: '🏰', desc: 'Room costs ×{v}.', f: v => Math.pow(.92, v) },
    { id: 'grudge', b: 'dom', name: 'Legendary Grudge', icon: '⚔', desc: 'Legends drop +{v}% of everything.', f: v => 1 + v * .62 },
    { id: 'warlord', b: 'dom', name: 'Warlord', icon: '🎖', desc: 'Battle line holds {v} extra colonies.', f: v => v },
    { id: 'sovereign', b: 'dom', name: 'Sovereign', icon: '👑', desc: 'Genome gained on Collapse ×{v}.', f: v => Math.pow(1.35, v) },

    // void
    { id: 'slumber', b: 'void', name: 'Timeless Slumber', icon: '💤', desc: '+{v}h offline accumulation.', f: v => v * 1.2 },
    { id: 'memory', b: 'void', name: 'Deep Memory', icon: '🧠', desc: 'Offline runs at {v}% efficiency.', f: v => Math.min(1.6, .35 + v * .06) },
    { id: 'echo', b: 'void', name: 'Echoes', icon: '〰', desc: 'Auto-raid speed +{v}%.', f: v => 1 + v * .10 },
    { id: 'metab', b: 'void', name: 'Void Metabolism', icon: '🌌', desc: '+{v}% passive income.', f: v => 1 + v * .275 },
    { id: 'rift', b: 'void', name: 'Temporal Rift', icon: '⏳', desc: 'Ability cooldowns ×{v}.', f: v => Math.pow(.915, v) },
    { id: 'hunger', b: 'void', name: 'Eternal Hunger', icon: '🕳', desc: 'Kills drop {v}% extra of everything.', f: v => v * 3.75 },
    { id: 'sing', b: 'void', name: 'Singularity', icon: '⊙', desc: 'Game speed +{v}%.', f: v => 1 + v * .075 },
    { id: 'primal', b: 'void', name: 'Primordial Will', icon: '◉', desc: 'All multipliers ×{v}.', f: v => Math.pow(2.4, v) }
  ];

  /* Cost / growth / max are assigned by depth within a branch, so every branch
     has the same shape: cheap early nodes, monstrous capstones. */
  const MUT_TIERS = [
    [1, 1.16, 25], [3, 1.18, 20], [8, 1.20, 20], [25, 1.24, 15],
    [80, 1.28, 25], [300, 1.34, 25], [1200, 1.45, 40], [6000, 2.20, 60]
  ];
  {
    const pos = {};
    for (const m of MUTATIONS) {
      const p = pos[m.b] = (pos[m.b] == null ? 0 : pos[m.b] + 1);
      const [cost, g, max] = MUT_TIERS[Math.min(p, MUT_TIERS.length - 1)];
      m.cost = cost; m.g = g; m.max = max;
    }
    // hand-priced exceptions: things that must stay rare no matter how rich you get
    MUT_BY_ID_OVERRIDE(MUTATIONS, 'deeper', { cost: 12, g: 2.9, max: 8 });     // colony slots
    MUT_BY_ID_OVERRIDE(MUTATIONS, 'warlord', { cost: 1200, g: 2.1, max: 8 });  // battle line
    MUT_BY_ID_OVERRIDE(MUTATIONS, 'unknow', { cost: 6000, g: 1.9, max: 8 });   // hard caps
    MUT_BY_ID_OVERRIDE(MUTATIONS, 'hyper', { cost: 6000, g: 1.9, max: 8 });
    MUT_BY_ID_OVERRIDE(MUTATIONS, 'sovereign', { cost: 6000, g: 1.75, max: 12 }); // feeds itself
    MUT_BY_ID_OVERRIDE(MUTATIONS, 'sing', { cost: 1200, g: 1.60, max: 12 });   // game speed
  }
  function MUT_BY_ID_OVERRIDE(list, id, props) {
    const m = list.find(x => x.id === id); if (m) Object.assign(m, props);
  }
  const MUT_BY_ID = {}; MUTATIONS.forEach(m => MUT_BY_ID[m.id] = m);

  /* ---------------- active abilities ---------------- */
  const ABILITIES = [
    { id: 'cavein', name: 'Cave-In', icon: '🪨', cd: 42, dur: 0, unlock: 5, key: '1',
      desc: 'The ceiling remembers it is heavy. Deals 900% of your dungeon DPS to every hero.' },
    { id: 'frenzy', name: 'Feeding Frenzy', icon: '🩸', cd: 55, dur: 12, unlock: 16, key: '2',
      desc: 'Every colony attacks 130% faster for 12 seconds.' },
    { id: 'spores', name: 'Spore Bloom', icon: '🍄', cd: 48, dur: 10, unlock: 34, key: '3',
      desc: 'Chokes the corridor: heroes take heavy poison damage and attack 35% slower.' },
    { id: 'devour', name: 'Devour', icon: '👄', cd: 38, dur: 0, unlock: 62, key: '4',
      desc: 'Swallow the weakest living hero whole. Instant kill, triple loot.' },
    { id: 'surge', name: 'Ecosystem Surge', icon: '🌿', cd: 85, dur: 25, unlock: 110, key: '5',
      desc: 'All income ×4 and stability locked at maximum for 25 seconds.' },
    { id: 'apocalypse', name: 'Apex Awakening', icon: '🐉', cd: 150, dur: 20, unlock: 200, key: '6',
      desc: 'Your entire ecosystem doubles in size and power for 20 seconds.' }
  ];

  /* ---------------- achievements ---------------- */
  function A(id, name, desc, icon, check, rew, rewTxt) {
    return { id, name, desc, icon, check, rew, rewTxt };
  }
  const ACHIEVEMENTS = [
    A('first', 'Something Stirs', 'Found your first colony.', '🥚', g => g.colonies.length >= 1, 1.02, '+2% all gain'),
    A('kill10', 'Ankle-Biter', 'Kill 10 heroes.', '🩸', g => g.stats.kills >= 10, 1.02, '+2% all gain'),
    A('kill100', 'Local Problem', 'Kill 100 heroes.', '⚔', g => g.stats.kills >= 100, 1.03, '+3% all gain'),
    A('kill1k', 'Regional Catastrophe', 'Kill 1,000 heroes.', '💀', g => g.stats.kills >= 1000, 1.05, '+5% all gain'),
    A('kill10k', 'Extinction Vector', 'Kill 10,000 heroes.', '☠', g => g.stats.kills >= 1e4, 1.08, '+8% all gain'),
    A('kill100k', 'The Reason They Stopped Coming', 'Kill 100,000 heroes.', '🌑', g => g.stats.kills >= 1e5, 1.12, '+12% all gain'),
    A('kill1m', 'Statistically Inevitable', 'Kill 1,000,000 heroes.', '♾', g => g.stats.kills >= 1e6, 1.2, '+20% all gain'),

    A('evo1', 'It Changed', 'Evolve any species once.', '🧫', g => g.stats.evolutions >= 1, 1.03, '+3% all gain'),
    A('evo10', 'Directed Mutation', 'Perform 10 evolutions.', '🌀', g => g.stats.evolutions >= 10, 1.05, '+5% all gain'),
    A('evo40', 'Rewriting the Kingdom', 'Perform 40 evolutions.', '🧬', g => g.stats.evolutions >= 40, 1.1, '+10% all gain'),
    A('acid', 'Acid Ocean', 'Reach the final stage of the Ooze.', '🌊', g => g.colonies.some(c => c.fam === 'ooze' && c.stage >= 4), 1.15, '+15% all gain'),
    A('allbase', 'Full Spectrum', 'Discover all 16 families.', '📖', g => Object.keys(g.discovered.fam).length >= 16, 1.25, '+25% all gain'),
    A('mythic', 'Mythic', 'Evolve any species to Mythic.', '✨', g => g.colonies.some(c => c.stage >= 4), 1.2, '+20% all gain'),

    A('wave10', 'Word Gets Around', 'Clear raid 10.', '🚪', g => g.stats.bestWave >= 10, 1.03, '+3% all gain'),
    A('wave50', 'A Bad Reputation', 'Clear raid 50.', '🏴', g => g.stats.bestWave >= 50, 1.05, '+5% all gain'),
    A('wave150', 'Kingdom-Level Threat', 'Clear raid 150.', '👑', g => g.stats.bestWave >= 150, 1.08, '+8% all gain'),
    A('wave300', 'They Send Armies Now', 'Clear raid 300.', '⚔', g => g.stats.bestWave >= 300, 1.12, '+12% all gain'),
    A('wave500', 'Nothing Comes Back Up', 'Clear raid 500.', '🕳', g => g.stats.bestWave >= 500, 1.18, '+18% all gain'),
    A('wave750', 'Myth', 'Clear raid 750.', '🌌', g => g.stats.bestWave >= 750, 1.3, '+30% all gain'),

    A('biome2', 'Deeper', 'Reach the Fungal Hollows.', '🍄', g => g.stats.bestBiome >= 2, 1.03, '+3% all gain'),
    A('biome4', 'Down and Down', 'Reach the Screaming Vein.', '🩸', g => g.stats.bestBiome >= 4, 1.06, '+6% all gain'),
    A('biome6', 'Below the Cold', 'Reach the Frostbound Abyss.', '❄', g => g.stats.bestBiome >= 6, 1.09, '+9% all gain'),
    A('biome8', 'Consecrated Ground', 'Reach the Cathedral of Bones.', '🦴', g => g.stats.bestBiome >= 8, 1.13, '+13% all gain'),
    A('biome10', 'The First Dark', 'Reach the Primordial Core.', '◉', g => g.stats.bestBiome >= 10, 1.25, '+25% all gain'),

    A('legend1', 'Giant-Slayer, Slain', 'Kill your first Legend.', '🗡', g => g.stats.legendKills >= 1, 1.05, '+5% all gain'),
    A('legend10', 'The Ballads Stopped', 'Kill 10 Legends.', '🎻', g => g.stats.legendKills >= 10, 1.08, '+8% all gain'),
    A('legend50', 'No More Heroes', 'Kill 50 Legends.', '🏆', g => g.stats.legendKills >= 50, 1.15, '+15% all gain'),

    A('stab', 'Balanced', 'Reach 80% ecosystem stability.', '☯', g => g.eco.stability >= .8, 1.06, '+6% all gain'),
    A('stab100', 'Perfect Ecology', 'Reach 99% ecosystem stability.', '🜨', g => g.eco.stability >= .99, 1.15, '+15% all gain'),
    A('div8', 'Biodiversity', 'Run 8 different families at once.', '🌈', g => new Set(g.colonies.map(c => c.fam)).size >= 8, 1.1, '+10% all gain'),
    A('div12', 'A Whole World', 'Run 12 different families at once.', '🌍', g => new Set(g.colonies.map(c => c.fam)).size >= 12, 1.2, '+20% all gain'),
    A('starve', 'Lesson Learned', 'Starve your ecosystem. Just once.', '🥀', g => g.stats.starved >= 1, 1.03, '+3% all gain'),

    A('pop100', 'Teeming', 'Reach 100 total population.', '🐛', g => g.eco.pop >= 100, 1.04, '+4% all gain'),
    A('pop1000', 'Swarm', 'Reach 1,000 total population.', '🐜', g => g.eco.pop >= 1000, 1.08, '+8% all gain'),
    A('pop10000', 'Biomass Singularity', 'Reach 10,000 total population.', '🌐', g => g.eco.pop >= 1e4, 1.15, '+15% all gain'),

    A('bio1m', 'Rich Soil', 'Bank 1M biomass.', '🧬', g => g.res.bio >= 1e6, 1.04, '+4% all gain'),
    A('bio1b', 'Nutrient Ocean', 'Bank 1B biomass.', '🌊', g => g.res.bio >= 1e9, 1.07, '+7% all gain'),
    A('bio1t', 'Geological Quantity', 'Bank 1T biomass.', '⛰', g => g.res.bio >= 1e12, 1.12, '+12% all gain'),

    A('room1', 'Interior Decorating', 'Build your first room.', '🏰', g => Object.keys(g.rooms).length >= 1, 1.03, '+3% all gain'),
    A('room10', 'Architect', 'Build 10 different rooms.', '📐', g => Object.keys(g.rooms).length >= 10, 1.06, '+6% all gain'),
    A('roomAll', 'The Complete Dungeon', 'Build every room type.', '🏯', g => Object.keys(g.rooms).length >= 21, 1.15, '+15% all gain'),

    A('collapse1', 'Collapse', 'Survive your first Collapse.', '🜛', g => g.stats.collapses >= 1, 1.08, '+8% all gain'),
    A('collapse5', 'Cyclical', 'Collapse 5 times.', '🔁', g => g.stats.collapses >= 5, 1.12, '+12% all gain'),
    A('collapse15', 'Nothing Is Permanent', 'Collapse 15 times.', '⏳', g => g.stats.collapses >= 15, 1.2, '+20% all gain'),
    A('collapse40', 'Deep Time', 'Collapse 40 times.', '🌑', g => g.stats.collapses >= 40, 1.35, '+35% all gain'),
    A('rebirth1', 'Primordial', 'Perform a Primordial Rebirth.', '◉', g => g.stats.rebirths >= 1, 1.3, '+30% all gain'),
    A('rebirth5', 'Before the World', 'Rebirth 5 times.', '🌌', g => g.stats.rebirths >= 5, 1.5, '+50% all gain'),

    A('mut10', 'Twisted', 'Buy 10 mutation levels.', '🧬', g => g.stats.mutLevels >= 10, 1.05, '+5% all gain'),
    A('mut100', 'Unrecognisable', 'Buy 100 mutation levels.', '👁', g => g.stats.mutLevels >= 100, 1.12, '+12% all gain'),
    A('mut400', 'A Different Kind of Life', 'Buy 400 mutation levels.', '🜛', g => g.stats.mutLevels >= 400, 1.25, '+25% all gain'),

    A('adapt0', 'Untraceable', 'Hold every adaptation below 10%.', '👻', g => TYPE_LIST.every(t => (g.adapt[t] || 0) < .1) && g.stats.kills > 200, 1.08, '+8% all gain'),
    A('nolose', 'Impenetrable', 'Clear 50 raids in a row.', '🛡', g => g.stats.streak >= 50, 1.1, '+10% all gain'),
    A('ability100', 'Hands-On Ecology', 'Use abilities 100 times.', '✋', g => g.stats.abilityUses >= 100, 1.06, '+6% all gain'),
    A('idle1h', 'Patient Predator', 'Accumulate 1 hour of offline time.', '💤', g => g.stats.offlineTime >= 3600, 1.05, '+5% all gain'),
    A('play10h', 'Ten Hours Down Here', 'Play for 10 hours.', '⏱', g => g.stats.playTime >= 36000, 1.15, '+15% all gain')
  ];

  /* ---------------- helper: hero power / rewards ---------------- */
  function biomeOf(globalWave) {
    for (let i = 0; i < BIOMES.length; i++) if (globalWave <= BIOMES[i].endWave) return i;
    return BIOMES.length - 1;
  }
  function heroUnit(globalWave) {
    const b = biomeOf(globalWave);
    return Math.pow(CONF.waveScale, globalWave - 1) * Math.pow(CONF.biomeStep, b);
  }
  function rewardUnit(globalWave) {
    const b = biomeOf(globalWave);
    return CONF.baseReward * Math.pow(CONF.rewardScale, globalWave - 1) * BIOMES[b].loot;
  }

  global.DATA = {
    CONF, TYPES, TYPE_LIST, ROLES, ROLE_BASE, FAMS, FAM_BY_ID, PASSIVES,
    STAGE_GATE, STAGE_LABEL, HEROES, HERO_BY_ID, TIER_WAVE, HERO_ABILITIES,
    LEGENDS, LEGEND_TITLES, BIOMES, ROOMS, MUT_BRANCHES, MUTATIONS, MUT_BY_ID,
    ABILITIES, ACHIEVEMENTS, biomeOf, heroUnit, rewardUnit
  };
})(this);
