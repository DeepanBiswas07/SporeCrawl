(function (global) {
  'use strict';
  const D = global.DATA, G = global.G, S = global.S, ECO = global.ECO;

  const totalGene = () => G.colonies.reduce((a, c) => a + c.gene, 0);
  const maxPop = () => G.colonies.reduce((a, c) => Math.max(a, c.pop), 0);
  const fams = () => new Set(G.colonies.map(c => c.fam)).size;
  const maxStage = () => G.colonies.reduce((a, c) => Math.max(a, c.stage), 0);
  const maxAdapt = () => Math.max.apply(null, D.TYPE_LIST.map(t => G.adapt[t] || 0));

  const LIST = [
    {
      id: 'open', goal: 'Open the gates',
      why: 'Nothing happens until you let someone in. Heroes raid you; you eat what is left of them.',
      look: 'The green button, bottom of the screen.',
      done: () => G.stats.raidsWon + G.stats.raidsLost >= 1
    },
    {
      id: 'found', goal: 'Found your first colony',
      why: 'That hero walked straight to your core because nothing lives here. Biomass is what corpses become — spend it on something with teeth.',
      look: 'Colonies panel, left. Press “Found a colony”.',
      done: () => G.colonies.length >= 1
    },
    {
      id: 'win1', goal: 'Win a raid',
      why: 'Your colony fights on its own. A colony that is routed is out for the rest of that raid and returns full at the next one — if every colony falls, the raid is lost.',
      done: () => G.stats.raidsWon >= 1
    },
    {
      id: 'breed', goal: 'Breed a colony to 8 population',
      why: 'Population is raw power and it is cheap. Breeding is your main button for the whole early game.',
      at: () => maxPop() + ' / 8',
      done: () => maxPop() >= 8
    },
    {
      id: 'ess', goal: 'Collect 25 Essence',
      why: 'Essence condenses out of tougher heroes. It is a separate currency from biomass and it buys permanent upgrades.',
      at: () => U.fmt(G.res.ess) + ' / 25',
      done: () => G.res.ess >= 25 || totalGene() >= 3
    },
    {
      id: 'gene', goal: 'Buy 5 gene levels',
      why: 'Each gene level is +9% to that colony forever, and they compound. Most of your power all game comes from here.',
      look: 'The “Gene” button on a colony.',
      at: () => totalGene() + ' / 5',
      done: () => totalGene() >= 5
    },
    {
      id: 'room', goal: 'Build a Spawning Pool',
      why: 'Plunder builds rooms. A Spawning Pool gives you another colony slot — more slots is more of everything.',
      look: 'Dungeon tab, left.',
      done: () => S.roomLvl('pool') >= 1
    },
    {
      id: 'second', goal: 'Found a second species',
      why: 'One species is a monoculture. Different species deal different damage types and fill different roles in the food chain.',
      at: () => fams() + ' / 2',
      done: () => fams() >= 2
    },
    {
      id: 'eco', goal: 'Reach 50% ecosystem stability',
      why: 'This is the heart of the game. Your population is scored against a real food pyramid — lots of producers, fewer consumers, very few apex. Stability multiplies every stat you own.',
      look: 'Ecosystem panel, right. The white ticks are the ideal share.',
      at: () => U.pct(G.eco.stability) + ' / 50%',
      done: () => G.eco.stability >= 0.5
    },
    {
      id: 'ability', goal: 'Use an ability',
      why: 'Abilities are free damage on a cooldown. Cave-In hits every hero at once. Press 1, or click it.',
      done: () => G.stats.abilityUses >= 1
    },
    {
      id: 'legend', goal: 'Kill a Legend',
      why: 'Every tenth raid is a named hero with far more health and twelve times the loot. Kill one and it comes back later, stronger and warded against whatever you used.',
      done: () => G.stats.legendKills >= 1
    },
    {
      id: 'adapt', goal: 'Watch an adaptation pass 30%',
      why: 'Heroes armour against whatever keeps killing them, and they learn from concentration — six damage types sharing the work teach them almost nothing. Watch the “dmg absorbed” figure, and diversify.',
      look: 'Hero Adaptation panel, right.',
      at: () => U.pct(maxAdapt()) + ' / 30%',
      done: () => maxAdapt() >= 0.3 || G.stats.bestWave >= 40
    },
    {
      id: 'evolve', goal: 'Evolve a species',
      why: 'Evolution multiplies a colony by about seven. It is the single biggest upgrade in the game and each species has five stages.',
      look: 'Evolve tab, or the Evolve button on a colony.',
      done: () => G.stats.evolutions >= 1
    },
    {
      id: 'slots', goal: 'Run four colonies at once',
      why: 'Diversity feeds stability, and every extra family adds a global bonus. Build more Spawning Pools.',
      at: () => G.colonies.length + ' / 4',
      done: () => G.colonies.length >= 4
    },
    {
      id: 'depth2', goal: 'Clear depth 1 and dig deeper',
      why: 'Clear the last raid of a depth and the next one opens. Deeper means heavier heroes but far richer loot — the trade is always worth it eventually.',
      at: () => (G.bestInBiome[1] || 0) + ' / ' + D.BIOMES[0].waves,
      done: () => G.maxDepth >= 2
    },
    {
      id: 'stab80', goal: 'Reach 80% stability',
      why: 'Shape the pyramid deliberately now: producers at the bottom, one apex at the top. Cull anything that unbalances it — culling is free.',
      at: () => U.pct(G.eco.stability) + ' / 80%',
      done: () => G.eco.stability >= 0.8
    },
    {
      id: 'stage3', goal: 'Get a species to Greater (stage 3)',
      why: 'Stage gates open as your best raid gets deeper. Keep one species ahead as your damage dealer.',
      done: () => maxStage() >= 2
    },
    {
      id: 'wave55', goal: 'Reach raid 55',
      why: 'That is deep enough to Collapse. From here the game becomes a loop: push as deep as you can, collapse, come back stronger.',
      at: () => G.stats.bestWave + ' / 55',
      done: () => G.stats.bestWave >= 55
    },
    {
      id: 'collapse', goal: 'Collapse the dungeon',
      why: 'You lose the colonies, rooms and depth. You keep the Genome — and genome buys permanent mutations that make the next run far faster. Collapse when progress stalls.',
      look: 'Genome tab, left.',
      done: () => G.stats.collapses >= 1
    },
    {
      id: 'mut', goal: 'Buy 12 mutation levels',
      why: 'Mutations never reset. Six branches: damage, economy, ecosystem, anti-adaptation, dungeon and idle. Spread out early, specialise later.',
      at: () => G.stats.mutLevels + ' / 12',
      done: () => G.stats.mutLevels >= 12
    },
    {
      id: 'wave150', goal: 'Reach raid 150',
      why: 'Now you are looping. Collapse whenever you stop making progress — a short run that ends deeper is worth more than a long one that stalls.',
      at: () => G.stats.bestWave + ' / 150',
      done: () => G.stats.bestWave >= 150
    },
    {
      id: 'div8', goal: 'Run eight different families',
      why: 'Eight damage types spread across the pyramid means no single adaptation can blunt you, and diversity itself is a multiplier.',
      at: () => fams() + ' / 8',
      done: () => fams() >= 8
    },
    {
      id: 'stage4', goal: 'Get a species to Ascendant (stage 4)',
      why: 'Ascendant is the last stage before Mythic, and Mythic needs something you do not have yet.',
      done: () => maxStage() >= 3
    },
    {
      id: 'wave330', goal: 'Reach raid 330',
      why: 'Primordial Cells begin accruing at this depth. They unlock the fifth and final evolution stage.',
      at: () => G.stats.bestWave + ' / 330',
      done: () => G.stats.bestWave >= D.CONF.cellStart
    },
    {
      id: 'rebirth', goal: 'Perform a Primordial Rebirth',
      why: 'Rebirth resets the run but keeps your entire genome. It permanently unlocks Mythic evolution for every species.',
      look: 'Genome tab, below Collapse.',
      done: () => G.stats.rebirths >= 1
    },
    {
      id: 'mythic', goal: 'Evolve a species to Mythic',
      why: 'The fifth stage. Acid Ocean, World Mycelium, Cataclysm Dragon — around 2,900× the base form.',
      done: () => maxStage() >= 4
    },
    {
      id: 'depth10', goal: 'Reach the Primordial Core',
      why: 'Depth 10 is the last authored biome — the first dark, from before there was anything to be dark about.',
      at: () => 'depth ' + G.maxDepth + ' / 10',
      done: () => G.maxDepth >= 10
    },
    {
      id: 'endless', goal: 'Go deeper than anything has gone',
      why: 'There is no bottom now. Collapse, mutate, descend, repeat — every cycle should end deeper than the last.',
      at: () => 'best raid ' + G.stats.bestWave,
      done: () => false
    }
  ];

  const BY_ID = {}; LIST.forEach((o, i) => { BY_ID[o.id] = o; o.index = i; });

  function currentIndex() {
    const done = G.objDone || {};
    for (let i = 0; i < LIST.length; i++) if (!done[LIST[i].id]) return i;
    return LIST.length - 1;
  }
  function current() { return LIST[currentIndex()]; }

  let lastId = null, flashT = 0;

  function check() {
    G.objDone = G.objDone || {};
    let completed = null;
    for (let guard = 0; guard < LIST.length; guard++) {
      const o = current();
      if (G.objDone[o.id]) break;
      let ok = false;
      try { ok = o.done(); } catch (e) { ok = false; }
      if (!ok) break;
      G.objDone[o.id] = 1;
      completed = o;
    }
    return completed;
  }

  function render() {
    const box = document.getElementById('objective');
    if (!box) return;
    const o = current();
    const n = currentIndex() + 1;
    let at = '';
    try { at = o.at ? o.at() : ''; } catch (e) { at = ''; }

    if (o.id !== lastId) {
      lastId = o.id;
      box.classList.remove('obj-in'); void box.offsetWidth; box.classList.add('obj-in');
    }
    box.innerHTML =
      '<div class="obj-step">' + n + '<i>/' + LIST.length + '</i></div>' +
      '<div class="obj-body">' +
      '<div class="obj-goal">' + o.goal + (at ? '<span class="obj-at">' + at + '</span>' : '') + '</div>' +
      '<div class="obj-why">' + o.why + '</div>' +
      (o.look ? '<div class="obj-look">' + global.ICON.ico('down', { size: 11 }) + o.look + '</div>' : '') +
      '</div>';
  }

  function celebrate(o) {
    const box = document.getElementById('objective');
    if (!box) return;
    box.classList.add('obj-done');
    setTimeout(() => box.classList.remove('obj-done'), 900);
    global.SFX && global.SFX.objective && global.SFX.objective();
    global.UI && global.UI.log('<b class="g">Done:</b> ' + o.goal, 'g');
  }

  global.OBJ = { LIST, check, render, current, currentIndex, celebrate, BY_ID };
})(this);
