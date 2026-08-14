(function (global) {
  'use strict';
  const D = global.DATA, G = global.G, S = global.S;

  const TARGETS = {
    resBio: '#resBioWrap',
    resEss: '#resEssWrap',
    resGold: '#resGoldWrap',
    resDna: '#resDnaWrap',
    resCell: '#resCellWrap',

    tabColonies: '.tab[data-tab="colonies"]',
    tabEvolve: '.tab[data-tab="evolve"]',
    tabDungeon: '.tab[data-tab="dungeon"]',
    tabGenome: '.tab[data-tab="genome"]',
    tabCodex: '.tab[data-tab="codex"]',
    tabs: '#tabs',

    leftCol: '.col-left',
    rightCol: '.col-right',
    ecoCard: '.eco-card',
    adaptCard: '.adapt-card',
    logCard: '.log-card',

    abilities: '#abilities',
    depthNav: '#depthNav',
    raidBar: '.wavebar',
    speedBtn: '#btnSpeed',

    breed: '[data-veil="breed"]',
    gene: '[data-veil="gene"]',
    evolveBtn: '[data-veil="evolve"]',
    found: '[data-veil="found"]',
    buyAmt: '[data-veil="buyamt"]'
  };

  const STEPS = [
    {
      id: 'awake',
      when: () => true,
      unveil: ['raidBar'],
      title: 'SOMETHING IS AWAKE',
      body: 'You are a dungeon. Heroes will come down here to rob you, and you will eat them.<br><br>' +
        'You never attack directly — you decide what lives here, and it fights for you.'
    },
    {
      id: 'firstRaid',
      when: g => g.stats.raidsWon + g.stats.raidsLost >= 1,
      unveil: ['resBio', 'leftCol', 'tabs', 'tabColonies', 'found', 'logCard'],
      title: 'BIOMASS',
      body: 'That hero walked straight to your core, because nothing lives here to stop him.<br><br>' +
        '<b>Biomass</b> is your first currency — it is what dead things become. Spend it in the ' +
        '<b>Colonies</b> panel on the left to found something with teeth.'
    },
    {
      id: 'firstColony',
      when: g => g.colonies.length >= 1,
      unveil: ['breed'],
      title: 'BREEDING',
      body: 'Your colony fights automatically. If it is routed it stays down until the raid ends — nothing revives mid-fight, so losing your whole line loses the raid.<br><br>' +
        '<b>Breed</b> raises its population. Population is raw power and it is cheap — ' +
        'this is the button you will press most in the next ten minutes.'
    },
    {
      id: 'essence',
      when: g => g.res.ess >= 1 && g.stats.bestWave >= 4,
      unveil: ['resEss', 'gene', 'buyAmt'],
      title: 'ESSENCE',
      body: 'A second currency, dripping off the tougher heroes.<br><br>' +
        '<b>Gene levels</b> cost essence and give +9% to a colony <i>permanently</i>. They compound, ' +
        'so most of your power for the entire game will come from here.'
    },
    {
      id: 'plunder',
      when: g => g.stats.bestWave >= 8,
      unveil: ['resGold', 'tabDungeon'],
      title: 'PLUNDER · DUNGEON ROOMS',
      body: 'Heroes bring equipment. They do not take it home.<br><br>' +
        '<b>Plunder</b> builds rooms in the new <b>Dungeon</b> tab: extra colony slots, traps, ' +
        'population capacity, cheaper everything. Start with a <b>Spawning Pool</b>.'
    },
    {
      id: 'ability',
      when: g => g.stats.bestWave >= 12,
      unveil: ['abilities'],
      title: 'ABILITIES',
      body: 'You are not only what lives in you — you are also the ceiling.<br><br>' +
        'These are free damage on a cooldown. Press <b>1</b> for Cave-In. ' +
        'More unlock as you go deeper.'
    },
    {
      id: 'second',
      when: g => g.stats.bestWave >= 16,
      title: 'A SECOND SPECIES',
      body: 'You can now afford another kind of thing.<br><br>' +
        'Every species has a <b>damage type</b> and a <b>role in the food chain</b>. ' +
        'Running only one of anything is the most common way to get stuck.'
    },
    {
      id: 'ecosystem',
      when: g => new Set(g.colonies.map(c => c.fam)).size >= 2,
      unveil: ['rightCol', 'ecoCard'],
      title: 'THE FOOD CHAIN',
      body: 'This is the centre of the whole game.<br><br>' +
        'Producers grow food. Consumers eat it. Predators eat them. Decomposers turn corpses back ' +
        'into biomass. The closer your population sits to a real pyramid, the higher your ' +
        '<b>stability</b> — and stability multiplies <i>every stat you own</i>, up to ×3 and beyond.<br><br>' +
        'The white ticks on the right show the ideal share of each role.'
    },
    {
      id: 'evolve',
      when: g => g.stats.bestWave >= 22,
      unveil: ['tabEvolve', 'evolveBtn'],
      title: 'EVOLUTION',
      body: 'A species does not have to stay the shape it is.<br><br>' +
        'Each evolution multiplies that colony by about <b>seven</b>, and every species has ' +
        '<b>five stages</b>. It is the largest single upgrade in the game. Slime becomes Poison Slime ' +
        'becomes Corrosive Ooze becomes King Slime becomes Acid Ocean.'
    },
    {
      id: 'adapt',
      when: g => g.stats.bestWave >= 26 && D.TYPE_LIST.some(t => (g.adapt[t] || 0) >= 0.05),
      unveil: ['adaptCard'],
      title: 'THE HEROES ARE LEARNING',
      body: 'Survivors tell the others what killed them.<br><br>' +
        'Every damage type you lean on builds <b>adaptation</b> — at 100% they take almost nothing ' +
        'from it. It decays for types you stop using.<br><br>' +
        'There is no button for this. The answer is <b>composition</b>: spread your damage across many types and they learn almost nothing. Concentrate it and they will armour against you — and start sending heroes who already resist it.'
    },
    {
      id: 'legend',
      when: g => g.stats.legendKills >= 1,
      title: 'LEGENDS',
      body: 'Every tenth raid is a named hero: far more health, and twelve times the loot.<br><br>' +
        'Kill one and it <i>comes back</i> later — stronger, titled, and specifically warded against ' +
        'whatever damage type you killed it with.'
    },
    {
      id: 'depth',
      when: g => (g.bestInBiome[1] || 0) >= D.BIOMES[0].waves || g.maxDepth > 1,
      unveil: ['depthNav'],
      title: 'DEPTH',
      body: 'Clearing the last raid of a depth opens the next one. There are ten.<br><br>' +
        'Deeper means heavier heroes but far richer loot. You can always retreat to a ' +
        'shallower depth to farm safely — use <b>Shallower</b> and <b>Deeper</b>, top right.'
    },
    {
      id: 'codex',
      when: g => g.stats.bestWave >= 34,
      unveil: ['tabCodex'],
      title: 'THE CODEX',
      body: 'Everything you have met is recorded: 80 monster forms, 32 hero classes, 16 Legends ' +
        'and 55 achievements — each achievement a small permanent multiplier.'
    },
    {
      id: 'genome',
      when: () => S.canCollapse(),
      unveil: ['tabGenome', 'resDna'],
      title: 'COLLAPSE',
      body: 'You are deep enough to start over on purpose.<br><br>' +
        '<b>Collapse</b> destroys your colonies, rooms and depth — and converts how deep you got into ' +
        '<b>Genome</b>, which never resets. Genome buys permanent mutations across six branches.<br><br>' +
        'From here the game is a loop: dive as deep as you can, collapse, come back faster.'
    },
    {
      id: 'cells',
      when: g => g.stats.bestWave >= D.CONF.cellStart,
      unveil: ['resCell'],
      title: 'PRIMORDIAL CELLS',
      body: 'Beneath the last floor is a dark that was here before dark.<br><br>' +
        '<b>Cells</b> accrue from your deepest raid ever and are worth ×1.9 each, forever. ' +
        'Spending a <b>Rebirth</b> keeps your genome and unlocks the <b>Mythic</b> fifth stage for every species.'
    },
    {
      id: 'speed',
      when: () => S.mutLvl('sing') >= 1,
      unveil: ['speedBtn'],
      title: 'TIME',
      body: 'The Singularity mutation lets you run the dungeon at 2× and, later, 3×.'
    }
  ];

  let queue = [], showing = false;
  function isShowing() { return showing; }

  function el(key) {
    const sel = TARGETS[key];
    if (!sel) return [];
    return Array.from(document.querySelectorAll(sel));
  }

  function isDone(id) { return !!(G.revealed && G.revealed[id]); }
  function markDone(id) { (G.revealed = G.revealed || {})[id] = 1; }

  function applyVeils() {
    const shown = {};
    for (const st of STEPS) {
      if (!isDone(st.id)) continue;
      (st.unveil || []).forEach(k => shown[k] = 1);
    }
    for (const key in TARGETS) {
      const on = !!shown[key];
      el(key).forEach(n => n.classList.toggle('veiled', !on));
    }
  }

  function unveilSilently(keys) {
    (keys || []).forEach(k => el(k).forEach(n => n.classList.remove('veiled')));
  }

  function unveilWithFlash(keys) {
    (keys || []).forEach(k => el(k).forEach(n => {
      n.classList.remove('veiled');
      n.classList.add('unveil');
      setTimeout(() => n.classList.remove('unveil'), 1100);
      if (n.classList.contains('card') || n.classList.contains('abil') || n.id === 'abilities') {
        n.classList.add('unveil-flash');
        setTimeout(() => n.classList.remove('unveil-flash'), 2300);
      }
    }));
  }

  function decree(title, body, then) {
    const dim = document.getElementById('dimmer');
    const box = document.getElementById('decree');
    let closed = false;

    box.innerHTML =
      (title ? '<div class="dtitle">' + title + '</div>' : '') +
      '<div class="drule"></div>' +
      (body ? '<div class="dbody">' + body + '</div>' : '') +
      '<button class="btn btn-primary dbtn" id="decreeOk">Understood</button>';
    dim.classList.add('on');
    box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    global.SFX && global.SFX.reveal();

    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey);
      dim.classList.remove('on');
      box.classList.remove('show');
      box.classList.add('out');
      setTimeout(() => { box.classList.remove('out'); box.innerHTML = ''; if (then) then(); }, 420);
    };
    const onKey = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); close(); } };

    document.getElementById('decreeOk').onclick = close;
    dim.onclick = close;
    document.addEventListener('keydown', onKey);
  }

  function pump() {
    if (showing || !queue.length) return;
    showing = true;
    const st = queue.shift();
    const run = () => { unveilWithFlash(st.unveil); if (st.tab) global.UI.setTab(st.tab); };
    if (st.title) {
      run();
      decree(st.title, st.body, () => { showing = false; setTimeout(pump, 500); });
    } else {
      run();
      showing = false;
      setTimeout(pump, 350);
    }
  }

  function check() {
    for (const st of STEPS) {
      if (isDone(st.id)) continue;
      let ok = false;
      try { ok = st.when(G); } catch (e) { ok = false; }
      if (!ok) continue;
      markDone(st.id);
      queue.push(st);
    }
    pump();
  }

  function init(freshGame) {
    G.revealed = G.revealed || {};
    if (freshGame) G.revealed = {};

    if (!freshGame && !Object.keys(G.revealed).length && G.stats.bestWave > 0) {
      for (const st of STEPS) {
        let ok = false;
        try { ok = st.when(G); } catch (e) { ok = false; }
        if (ok) markDone(st.id);
      }
    }

    applyVeils();
    if (!freshGame) {
      for (const st of STEPS) if (isDone(st.id)) unveilSilently(st.unveil);
    }
  }

  function progress() {
    const done = STEPS.filter(s => isDone(s.id)).length;
    return { done, total: STEPS.length };
  }

  global.REVEAL = { init, check, applyVeils, decree, STEPS, TARGETS, progress, isShowing };
})(this);
