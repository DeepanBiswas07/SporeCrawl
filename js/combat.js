/* ============================================================
   combat.js — raid generation, real-time auto-battle, rewards,
   hero adaptation. Heroes learn what killed them.
   ============================================================ */
(function (global) {
  'use strict';
  const D = global.DATA, C = D.CONF, G = global.G, S = global.S, ECO = global.ECO;

  const B = {
    phase: 'idle',      // idle | fight | won | lost
    heroes: [],
    timer: 0,
    raidTime: 0,
    gap: 0,
    core: 0,
    coreMax: 0,
    killsThisRaid: 0,
    dmgThisRaid: {},
    loot: { bio: 0, ess: 0, gold: 0 },
    legend: null,
    pending: null,
    slowT: 0,
    result: null
  };
  global.BATTLE = B;

  /* -------------------- layout -------------------- */
  // three ragged columns of monsters facing two columns of heroes, with the
  // killing corridor left open in the middle for projectiles to cross
  const MSLOT = [];
  for (let i = 0; i < 18; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    MSLOT.push({ x: 0.125 + col * 0.105 + (row % 2) * 0.022, y: 0.36 + row * 0.125 });
  }
  const HSLOT = [];
  for (let i = 0; i < 14; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    HSLOT.push({ x: 0.885 - col * 0.095, y: 0.32 + row * 0.125 });
  }

  /* -------------------- hero party generation -------------------- */
  function availableClasses(gw) {
    const pool = D.HEROES.filter(h => gw >= h.minWave);
    return pool.length ? pool : [D.HEROES[0]];
  }
  function pickClass(gw) {
    const pool = availableClasses(gw);
    // bias strongly toward the newest tiers
    const maxTier = pool.reduce((a, h) => Math.max(a, h.tier), 1);
    const doc = G.doctrine;
    const weighted = [];
    for (const h of pool) {
      let w = Math.pow(2.1, h.tier - maxTier) * 10;
      if (h.tier === maxTier) w *= 2.2;
      // Doctrine: once they have learned what kills them, the villages start
      // sending the specialists. Spam poison and Wardens start showing up.
      if (doc && (h.res[doc] || 0) >= 0.3) w *= 3.2;
      weighted.push([h, w]);
    }
    let tot = 0; weighted.forEach(w => tot += w[1]);
    let r = Math.random() * tot;
    for (const [h, w] of weighted) { r -= w; if (r <= 0) return h; }
    return pool[pool.length - 1];
  }

  function partySize(gw) {
    const base = 1 + Math.floor(Math.pow(gw, 0.42) * 0.9);
    return U.clamp(Math.round(base * G.mult.raidSize), 1, 10);
  }

  function makeHero(cls, gw, opt) {
    opt = opt || {};
    const unit = D.heroUnit(gw);
    const legendMul = opt.legend ? (7 + opt.grudge * 1.35) : 1;
    const hp = C.baseHeroHP * cls.hpMul * unit * legendMul;
    const res = Object.assign({}, cls.res);
    if (opt.legend && opt.grudgeType) {
      res[opt.grudgeType] = (res[opt.grudgeType] || 0) + Math.min(0.75, 0.14 * opt.grudge);
    }
    return {
      cls, name: opt.name || cls.name, legend: !!opt.legend, grudge: opt.grudge || 0,
      hp, maxHp: hp,
      atk: C.baseHeroATK * cls.atkMul * unit * (1 - G.mult.terror) * (opt.legend ? 1.6 : 1),
      spd: cls.spd * (opt.legend ? 1.15 : 1),
      dmg: cls.dmg, res, ability: opt.ability || cls.ability,
      color: opt.color || cls.color, shape: opt.shape || cls.shape,
      atkT: Math.random() * 0.7, alive: true,
      x: 1.15, y: 0.5, tx: 0.85, ty: 0.5, slot: 0,
      shield: 0, frozen: 0, burn: 0, burnDps: 0, enrage: 0, revived: false,
      hitT: 0, flash: 0, entering: true, dieT: 0, abilT: U.rand(2, 6),
      auraT: 0, wardT: 0
    };
  }

  function buildParty() {
    const gw = S.globalWave();
    const heroes = [];
    const isBoss = G.wave % 10 === 0;
    B.legend = null;

    if (isBoss) {
      const idx = (Math.floor(S.globalWave() / 10) - 1 + G.depth * 3) % D.LEGENDS.length;
      const L = D.LEGENDS[idx];
      const key = L.name;
      const grudge = G.discovered.legend[key] || 0;
      const title = D.LEGEND_TITLES[Math.min(grudge, D.LEGEND_TITLES.length - 1)];
      // the legend adapts automatically to whatever has been killing it
      let top = 'phys', tv = -1;
      for (const t of D.TYPE_LIST) if ((G.dmgDealt[t] || 0) > tv) { tv = G.dmgDealt[t]; top = t; }
      const cls = availableClasses(gw).slice(-4)[0] || D.HEROES[0];
      const h = makeHero(cls, gw, {
        legend: true, grudge, grudgeType: top, name: L.name + (title ? ' ' + title : ''),
        color: L.color, shape: L.shape, ability: L.ability
      });
      h.legendKey = key;
      h.legendType = top;
      heroes.push(h);
      B.legend = h;
      const escort = Math.min(6, 1 + Math.floor(gw / 25));
      for (let i = 0; i < escort; i++) heroes.push(makeHero(pickClass(gw), gw));
    } else {
      const n = partySize(gw);
      for (let i = 0; i < n; i++) heroes.push(makeHero(pickClass(gw), gw));
    }

    heroes.forEach((h, i) => {
      h.slot = i;
      const s = HSLOT[Math.min(i, HSLOT.length - 1)];
      h.tx = s.x + (h.legend ? 0.04 : 0); h.ty = h.legend ? 0.55 : s.y;
      h.x = 1.15 + i * 0.05; h.y = h.ty;
      if (h.legend) { h.tx = 0.9; }
      if (!G.discovered.hero[h.cls.id]) { G.discovered.hero[h.cls.id] = 1; global.UI && UI.newDiscovery('hero', h.cls); }
    });
    return heroes;
  }

  /* -------------------- battle lifecycle -------------------- */
  function livingColonies() { return G.colonies.filter(c => c.alive); }
  function battleLine() {
    return G.colonies.slice(0, G.mult.battleSlots);
  }

  function startRaid(manual) {
    if (B.phase === 'fight') return;
    if (!G.colonies.length) {
      // the very first raid is meant to be walked in on with an empty dungeon;
      // after that, stop nagging every few seconds
      B.gap = 4;
      if (manual) global.UI && UI.toast('lock', 'Nothing lives here', 'Found a colony first.');
      if (G.stats.raidsWon + G.stats.raidsLost > 0) return;
    }
    ECO.recompute();
    G.colonies.forEach((c, i) => {
      const st = ECO.colonyStats(c);
      c.maxHp = st.hp; c.hp = st.hp; c.alive = true; c.atkT = Math.random() * .6;
      c.shield = 0; c.hitT = 0; c.flash = 0; c.strikes = 0; c.slow = 0;
      const s = MSLOT[Math.min(i, MSLOT.length - 1)];
      c.x = s.x; c.y = s.y; c.inLine = i < G.mult.battleSlots;
    });
    B.heroes = buildParty();
    B.phase = 'fight';
    B.raidTime = 0;
    B.killsThisRaid = 0;
    B.dmgThisRaid = {};
    B.loot = { bio: 0, ess: 0, gold: 0 };
    B.core = B.coreMax = G.mult.coreHP;
    B.result = null;
    B.slowT = 0;
    B.devoured = false;
    B.routed = 0;

    // opening traps
    const open = G.mult.trapOpen;
    for (const h of B.heroes) {
      if (open > 0) h.hp *= (1 - open);
      if (Math.random() < G.mult.crushChance && !h.legend) { h.hp = 0; }
    }

    if (B.legend) {
      global.SFX.boss();
      global.UI && UI.banner(B.legend.name, 'LEGEND', '#e8b563');
      if (!G.discovered.legend[B.legend.legendKey]) G.discovered.legend[B.legend.legendKey] = 0;
    }
    global.UI && UI.refreshRaidBtn();
  }

  /* -------------------- damage -------------------- */
  function heroResist(h, type) {
    let r = (h.res[type] || 0) + (G.adapt[type] || 0) * C.adaptResist * G.mult.adaptBite;
    r -= G.mult.rend;
    return U.clamp(r, -0.5, 0.95);
  }

  function damageHero(h, amount, type, src, opt) {
    if (!h.alive) return 0;
    opt = opt || {};
    let resist = opt.ignoreRes ? heroResist(h, type) * (1 - opt.ignoreRes) : heroResist(h, type);
    if (h.wardT > 0) resist = Math.min(0.95, resist + 0.3);
    let dmg = amount * (1 - resist);
    if (h.shield > 0) {
      const absorbed = Math.min(h.shield, dmg);
      h.shield -= absorbed; dmg -= absorbed;
    }
    h.hp -= dmg;
    h.hitT = 0.16; h.flash = 1;
    B.dmgThisRaid[type] = (B.dmgThisRaid[type] || 0) + dmg;
    G.dmgDealt[type] = (G.dmgDealt[type] || 0) + dmg;

    if (global.FX) FX.damage(h.x, h.y - 0.05, dmg, D.TYPES[type].color, opt.crit);
    if (h.hp <= 0) killHero(h, src);
    return dmg;
  }

  function killHero(h, src) {
    if (!h.alive) return;
    // Saint / legend resurrection
    if (h.ability === 'revive' && !h.revived) {
      h.revived = true; h.hp = h.maxHp * 0.45; h.shield = h.maxHp * 0.15;
      if (global.FX) FX.ring(h.x, h.y - 0.05, '#fff6d6');
      global.UI && UI.log('<b>' + h.name + '</b> refuses to die.', 'y');
      return;
    }
    h.alive = false; h.dieT = 0;
    B.killsThisRaid++;
    G.stats.kills++;
    if (global.FX) FX.death(h.x, h.y - 0.06, h.color, h.legend);
    global.SFX.heroDie();

    // ---- loot ----
    const gw = S.globalWave();
    const ru = D.rewardUnit(gw);
    let mulL = 1;
    if (h.legend) { mulL = 12 * G.mult.legendBonus; G.stats.legendKills++; G.discovered.legend[h.legendKey] = (G.discovered.legend[h.legendKey] || 0) + 1; }
    if (src === 'devour') mulL *= 3;
    const leak = 1 + G.mult.hungerLeak;

    const bio = h.cls.bio * ru * G.mult.bio * mulL * leak;
    const ess = h.cls.ess * ru * 0.052 * G.mult.ess * mulL * leak;
    const gold = h.cls.gold * ru * 0.085 * G.mult.gold * mulL * leak;
    G.res.bio += bio; G.res.ess += ess; G.res.gold += gold;
    G.stats.totalBio += bio; G.stats.totalEss += ess; G.stats.totalGold += gold;
    B.loot.bio += bio; B.loot.ess += ess; B.loot.gold += gold;

    if (h.legend) {
      global.SFX.crit();
      global.UI && UI.banner('LEGEND SLAIN', h.name, '#e8b563');
      global.UI && UI.log('<b>' + h.name + '</b> falls. The songs will be shorter now.', 'y');
      global.UI && UI.toast('trophy', 'Legend slain', h.name + ' — ×12 loot');
    }
    global.SFX.coin();
    if (global.UI) UI.flashRes();
  }

  function damageColony(col, amount, hero) {
    if (!col.alive) return;
    // Bulwark redirect
    let amt = amount;
    const guard = G.colonies.find(c => c.alive && D.FAM_BY_ID[c.fam].passive === 'bulwark' && c !== col);
    if (guard) {
      const share = D.FAM_BY_ID[guard.fam].passiveVal / 100;
      const redirected = amt * share;
      amt -= redirected;
      guard.hp -= redirected; guard.hitT = 0.14;
      if (guard.hp <= 0) routColony(guard);
    }
    // Phase dodge
    const f = D.FAM_BY_ID[col.fam];
    if (f.passive === 'phase' && Math.random() < f.passiveVal / 100) {
      if (global.FX) FX.text(col.x, col.y - 0.08, 'phase', '#b06cff');
      return;
    }
    col.hp -= amt;
    col.hitT = 0.16;
    if (global.FX && G.settings.dmgNumbers) FX.damage(col.x, col.y - 0.05, amt, '#ff5f6d', false, true);
    if (col.hp <= 0) routColony(col);
  }

  function routColony(col) {
    const f = D.FAM_BY_ID[col.fam];
    // A routed colony is out for the rest of the raid. Nothing comes back
    // mid-fight — otherwise a staggered respawn cycle means the core never
    // drains and any raid can be ground out regardless of power.
    col.alive = false;
    col.routedAt = B.raidTime;
    if (global.FX) FX.death(col.x, col.y - 0.05, f.colors[0]);
    global.SFX.monsterDie();
  }

  /* -------------------- per-frame update -------------------- */
  function update(dt) {
    if (B.phase !== 'fight') return;
    B.raidTime += dt;
    const line = battleLine();
    const livingH = B.heroes.filter(h => h.alive);

    /* ---- hero movement / entry ---- */
    // acid vents chew on the party at a rate set by your own ecosystem
    const ventDps = G.mult.trapDot > 0 && livingH.length
      ? ECO.dungeonDPS() * G.mult.trapDot / livingH.length : 0;
    let allIn = true;
    for (const h of B.heroes) {
      if (!h.alive) { h.dieT += dt; continue; }
      if (h.entering) {
        h.x += (h.tx - h.x) * Math.min(1, dt * 2.6);
        h.y += (h.ty - h.y) * Math.min(1, dt * 2.6);
        if (Math.abs(h.x - h.tx) < 0.012) { h.x = h.tx; h.entering = false; }
        else allIn = false;
      }
      h.hitT = Math.max(0, h.hitT - dt);
      h.flash = Math.max(0, h.flash - dt * 5);
      h.frozen = Math.max(0, h.frozen - dt);
      h.wardT = Math.max(0, h.wardT - dt);
      h.auraT = Math.max(0, h.auraT - dt);
      if (h.burn > 0) {
        h.burn -= dt;
        damageHero(h, h.burnDps * dt, 'fire', 'burn');
      }
      // acid vents
      if (ventDps > 0) damageHero(h, ventDps * dt, 'pois', 'trap');
    }

    /* ---- sustain: healing, not resurrection ---- */
    let regen = G.mult.regen;
    for (const c of G.colonies) {
      const f = D.FAM_BY_ID[c.fam];
      if (f.passive === 'regrow' && c.alive) regen += f.passiveVal / 100;
    }
    B.routed = 0;
    for (const c of G.colonies) {
      c.hitT = Math.max(0, c.hitT - dt);
      c.slow = Math.max(0, (c.slow || 0) - dt);
      if (!c.alive) { B.routed++; continue; }
      if (regen > 0 && c.hp < c.maxHp) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * regen * dt);
    }

    /* ---- colony attacks ---- */
    const frenzy = G.buffs.frenzy > 0 ? 2.3 : 1;
    const killBonus = 1 + B.killsThisRaid * (G.mult.frenzyPerKill + G.mult.spiralPerKill);
    const webSlow = G.colonies.some(c => c.alive && D.FAM_BY_ID[c.fam].passive === 'web')
      ? 1 - Math.max(...G.colonies.filter(c => c.alive && D.FAM_BY_ID[c.fam].passive === 'web')
        .map(c => D.FAM_BY_ID[c.fam].passiveVal)) / 100
      : 1;

    for (const c of line) {
      if (!c.alive || !livingH.length) continue;
      const st = ECO.colonyStats(c);
      const f = st.fam;
      const slowMul = c.slow > 0 ? 0.8 : 1;
      c.atkT += dt * st.spd * frenzy * slowMul * (G.buffs.spores > 0 ? 1 : 1);
      const period = 1;
      while (c.atkT >= period && livingH.length) {
        c.atkT -= period;
        c.strikes++;
        const targets = B.heroes.filter(h => h.alive);
        if (!targets.length) break;
        // pick target: front-most (largest x is deepest in dungeon => nearest is smallest x)
        let tgt = targets[0];
        for (const h of targets) if (h.x < tgt.x) tgt = h;
        if (f.passive === 'devour') {
          // prefer wounded
          let best = tgt, bv = Infinity;
          for (const h of targets) { const v = h.hp / h.maxHp; if (v < bv) { bv = v; best = h; } }
          tgt = best;
        }
        let dmg = st.atk * killBonus;
        let crit = false;
        if (Math.random() < G.mult.crit) { dmg *= 3; crit = true; }
        const opt = { crit };
        if (f.passive === 'gaze') opt.ignoreRes = f.passiveVal / 100;
        if (f.passive === 'devour' && tgt.hp / tgt.maxHp < 0.5) dmg *= 1 + f.passiveVal / 100;
        if (f.passive === 'mob') dmg *= 1 + (livingColonies().length - 1) * f.passiveVal / 100;
        if (f.passive === 'split') dmg *= 1 + (B.routed || 0) * f.passiveVal / 100;

        // Mimicry: part of every strike lands as whatever they are least ready for
        let dtype = f.dmg;
        if (G.mult.mimic > 0 && G.eco.leastAdapted && Math.random() < G.mult.mimic) {
          dtype = G.eco.leastAdapted;
        }
        if (global.FX) FX.projectile(c.x, c.y - 0.06, tgt.x, tgt.y - 0.06, D.TYPES[dtype].color, dtype);
        const dealt = damageHero(tgt, dmg, dtype, c, opt);
        if (crit) global.SFX.crit(); else global.SFX.hit();

        // passives
        if (f.passive === 'lifesteal' && c.alive) c.hp = Math.min(c.maxHp, c.hp + dealt * f.passiveVal / 100);
        if (f.passive === 'burn' && tgt.alive) { tgt.burn = 3; tgt.burnDps = dealt * (f.passiveVal / 100) / 3; }
        if (f.passive === 'freeze' && tgt.alive && Math.random() < f.passiveVal / 100) {
          tgt.frozen = 1.4; if (global.FX) FX.ring(tgt.x, tgt.y - 0.06, '#8fe6ff');
        }
        if (f.passive === 'swarm') {
          const others = targets.filter(h => h !== tgt && h.alive);
          if (others.length) damageHero(U.pick(others), dmg * f.passiveVal / 100, dtype, c, {});
        }
        if (f.passive === 'breath' && c.strikes % 5 === 0) {
          for (const h of targets) if (h !== tgt && h.alive) damageHero(h, dmg * 0.55, dtype, c, {});
          if (global.FX) FX.wave(0.35, 0.5, D.TYPES[dtype].color);
        }
      }
    }

    /* ---- hero attacks ---- */
    const aliveCols = line.filter(c => c.alive);
    for (const h of B.heroes) {
      if (!h.alive || h.entering || h.frozen > 0) continue;
      let spd = h.spd * webSlow * (G.buffs.spores > 0 ? 0.65 : 1);
      if (h.ability === 'enrage') spd *= 1 + (1 - h.hp / h.maxHp) * 1.2;
      if (h.auraT > 0) spd *= 1.15;
      h.atkT += dt * spd;

      // hero special abilities
      h.abilT -= dt;
      if (h.abilT <= 0 && h.ability) { heroAbility(h); h.abilT = U.rand(6, 11); }

      while (h.atkT >= 1) {
        h.atkT -= 1;
        if (!aliveCols.length) break;
        let tgt = aliveCols[0];
        if (h.ability === 'execute') { let bv = Infinity; for (const c of aliveCols) { const v = c.hp / c.maxHp; if (v < bv) { bv = v; tgt = c; } } }
        else if (h.ability === 'leap' && aliveCols.length > 1) tgt = aliveCols[aliveCols.length - 1];
        else tgt = U.pick(aliveCols);
        let dmg = h.atk;
        if (h.auraT > 0) dmg *= 1.25;
        if (h.ability === 'crit' && Math.random() < 0.25) { dmg *= 3; }
        if (h.ability === 'pierce') dmg *= 1.6;
        if (global.FX) FX.projectile(h.x, h.y - 0.06, tgt.x, tgt.y - 0.06, h.color, 'hero');
        damageColony(tgt, dmg, h);
        if (h.ability === 'cleave' && aliveCols.length > 1) {
          const other = U.pick(aliveCols.filter(c => c !== tgt));
          if (other) damageColony(other, dmg * 0.6, h);
        }
        if (h.ability === 'volley') {
          for (let i = 0; i < 2; i++) { const o = U.pick(aliveCols); if (o) damageColony(o, dmg * 0.5, h); }
        }
        if (h.ability === 'drain') { const st = Math.min(G.res.bio, dmg * 0.02); G.res.bio -= st; }
      }
    }

    /* ---- resolution ---- */
    if (!B.heroes.some(h => h.alive)) { winRaid(); return; }
    if (!G.colonies.some(c => c.alive)) {
      // the line has broken — heroes reach the core
      B.core -= dt * 0.85;
      if (global.FX) FX.coreBreach();
      if (B.core <= 0) { loseRaid(); return; }
    }
    if (B.raidTime > 120) { loseRaid(true); return; }
  }

  function heroAbility(h) {
    const alive = B.heroes.filter(x => x.alive);
    switch (h.ability) {
      case 'heal': {
        let t = null, w = 1;
        for (const x of alive) { const v = x.hp / x.maxHp; if (v < w) { w = v; t = x; } }
        if (t && w < 0.95) {
          t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.22);
          if (global.FX) { FX.ring(t.x, t.y - 0.06, '#8dffb0'); FX.text(t.x, t.y - 0.14, '+heal', '#8dffb0'); }
        }
        break;
      }
      case 'shield': h.shield = h.maxHp * 0.3; if (global.FX) FX.ring(h.x, h.y - 0.06, '#9fd8ff'); break;
      case 'ward': alive.forEach(x => x.wardT = 4); if (global.FX) FX.wave(0.8, 0.5, '#9fd8ff'); break;
      case 'aura': alive.forEach(x => x.auraT = 5); if (global.FX) FX.wave(0.8, 0.5, '#ffe08a'); break;
      case 'cleanse': alive.forEach(x => x.res.pois = Math.min(0.9, (x.res.pois || 0) + 0.15)); break;
      case 'slow': G.colonies.forEach(c => { if (c.alive) c.slow = 3; }); if (global.FX) FX.wave(0.3, 0.5, '#8fe6ff'); break;
      case 'purge': {
        const keys = Object.keys(G.buffs).filter(k => G.buffs[k] > 0);
        if (keys.length) { const k = U.pick(keys); G.buffs[k] = 0; global.UI && UI.log('<b>' + h.name + '</b> purges your ' + k + '!', 'r'); }
        break;
      }
      case 'adapt': {
        for (const t of D.TYPE_LIST) if ((B.dmgThisRaid[t] || 0) > 0) G.adapt[t] = Math.min(G.mult.adaptCap, (G.adapt[t] || 0) + 0.02);
        if (global.FX) FX.text(h.x, h.y - 0.16, 'adapting', '#c9a0ff');
        break;
      }
    }
  }

  /* -------------------- win / lose -------------------- */
  /* Heroes learn from CONCENTRATION, not from volume. A type that did all of
     your damage teaches them a lot; six types doing a sixth each teach them
     almost nothing, because share^1.7 collapses fast. This is what replaces
     the old free Purge button — the answer to adaptation is composition. */
  function updateAdaptation() {
    let tot = 0;
    for (const t of D.TYPE_LIST) tot += B.dmgThisRaid[t] || 0;
    const cap = G.mult.adaptCap;
    for (const t of D.TYPE_LIST) {
      const share = tot > 0 ? (B.dmgThisRaid[t] || 0) / tot : 0;
      G.dmgShare[t] = share;
      if (share > 0.02) {
        const gain = C.adaptGain * Math.pow(share, C.adaptConc) * G.mult.adaptGain;
        G.adapt[t] = U.clamp((G.adapt[t] || 0) + gain, 0, cap);
      } else {
        G.adapt[t] = Math.max(0, (G.adapt[t] || 0) - C.adaptDecay * G.mult.adaptDecay);
      }
    }
    // whatever they have most armour against defines who they send next
    let top = null, tv = 0;
    for (const t of D.TYPE_LIST) if ((G.adapt[t] || 0) > tv) { tv = G.adapt[t]; top = t; }
    G.doctrine = tv >= C.doctrineAt ? top : null;
  }

  function winRaid() {
    B.phase = 'won';
    B.result = 'won';
    updateAdaptation();
    G.stats.raidsWon++;
    G.stats.streak++;
    const gw = S.globalWave();
    if (gw > G.stats.bestWave) G.stats.bestWave = gw;
    if (gw > (G.stats.bestWaveRun || 0)) G.stats.bestWaveRun = gw;
    G.bestInBiome[G.depth] = Math.max(G.bestInBiome[G.depth] || 0, G.wave);
    if (G.depth > G.stats.bestBiome) G.stats.bestBiome = G.depth;
    global.SFX.waveWin();
    global.UI && UI.log('Raid <b>' + G.wave + '</b> repelled — ' +
      '<span class="g">' + U.fmt(B.loot.bio) + ' biomass</span>, ' +
      '<span class="p">' + U.fmt(B.loot.ess) + ' essence</span>, ' +
      '<span class="y">' + U.fmt(B.loot.gold) + ' plunder</span>.');

    // advance
    const biome = S.biome();
    if (G.wave >= biome.waves && G.depth < D.BIOMES.length) {
      G.depth++; G.wave = 1;
      G.maxDepth = Math.max(G.maxDepth, G.depth);
      const nb = S.biome();
      global.SFX.unlock();
      global.UI && UI.banner(nb.name, nb.blurb, nb.glow);
      global.UI && UI.toast('down', 'Depth ' + G.depth + ' — ' + nb.name, nb.blurb);
      global.UI && UI.log('You dig through into <b>' + nb.name + '</b>.', 'p');
    } else {
      G.wave++;
    }
    B.gap = G.mult.raidGap;
    global.UI && UI.afterRaid();
  }

  function loseRaid(stalemate) {
    B.phase = 'lost';
    B.result = 'lost';
    updateAdaptation();
    G.stats.raidsLost++;
    G.stats.streak = 0;
    global.SFX.waveLose();
    global.UI && UI.banner(stalemate ? 'THEY WALKED OUT' : 'CORE BREACHED', stalemate ? 'the raid stalled' : 'the dungeon holds, barely', '#ff6a6a');
    global.UI && UI.log(stalemate
      ? 'The raid <b class="r">stalled</b>. They left with their lives and your reputation.'
      : 'Your core was <b class="r">breached</b>. Something important is bleeding.', 'r');
    B.gap = G.mult.raidGap * 2.2;
    global.UI && UI.afterRaid();
  }

  /* -------------------- abilities -------------------- */
  function useAbility(id) {
    const a = D.ABILITIES.find(x => x.id === id);
    if (!a) return false;
    if (S.globalWave() < a.unlock && G.stats.bestWave < a.unlock) return false;
    if ((G.abil[id] || 0) > 0) { global.SFX.error(); return false; }
    G.abil[id] = a.cd * G.mult.abilityCd;
    G.stats.abilityUses++;
    global.SFX.ability();

    switch (id) {
      case 'cavein': {
        const dps = ECO.dungeonDPS() * 9;
        const alive = B.heroes.filter(h => h.alive);
        alive.forEach(h => damageHero(h, dps / Math.max(1, alive.length) * 2.2, 'phys', 'ability'));
        if (global.FX) { FX.wave(0.6, 0.4, '#d9d3c4'); FX.shake(1); }
        global.UI && UI.log('The ceiling comes down.', 'g');
        break;
      }
      case 'frenzy': G.buffs.frenzy = a.dur; if (global.FX) FX.wave(0.3, 0.5, '#ff5f6d'); break;
      case 'spores': G.buffs.spores = a.dur;
        B.heroes.forEach(h => { if (h.alive) { h.burn = a.dur; h.burnDps = h.maxHp * 0.045; } });
        if (global.FX) FX.wave(0.6, 0.5, '#8de84f'); break;
      case 'devour': {
        // an unconditional kill has to be rationed, or it beats every health bar in the game
        if (B.devoured) { G.abil[id] = 0; global.SFX.error(); global.UI && UI.toast('devour', 'Still digesting', 'One Devour per raid.'); return false; }
        const alive = B.heroes.filter(h => h.alive && !h.legend);
        if (!alive.length) { G.abil[id] = 0; global.SFX.error(); return false; }
        B.devoured = true;
        let t = alive[0], bv = Infinity;
        for (const h of alive) if (h.hp < bv) { bv = h.hp; t = h; }
        t.hp = 0; killHero(t, 'devour');
        if (global.FX) FX.ring(t.x, t.y - 0.06, '#ff5f6d');
        global.UI && UI.log('<b>' + t.name + '</b> is swallowed whole.', 'g');
        break;
      }
      case 'surge': G.buffs.surge = a.dur; if (global.FX) FX.wave(0.9, 0.5, '#5ce89a'); break;
      case 'apocalypse': G.buffs.apocalypse = a.dur; if (global.FX) { FX.wave(1.1, 0.5, '#ffcb61'); FX.shake(1.4); } break;
    }
    global.UI && UI.refreshAbilities();
    return true;
  }

  global.CB = {
    B, startRaid, update, useAbility, MSLOT, HSLOT, buildParty,
    damageHero, damageColony, heroResist, partySize, livingColonies, battleLine
  };
})(this);
