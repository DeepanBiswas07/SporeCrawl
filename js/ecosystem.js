/* ============================================================
   ecosystem.js — trophic pyramid, food, stability, passive income
   This is the heart of the game: composition matters more than
   raw numbers, because the pyramid multiplies everything.
   ============================================================ */
(function (global) {
  'use strict';
  const D = global.DATA, C = D.CONF, G = global.G;

  const ROLE_ORDER = ['producer', 'decomposer', 'consumer', 'construct', 'predator', 'apex'];
  const IDEAL = {};
  {
    let tot = 0; ROLE_ORDER.forEach(r => tot += D.ROLES[r].ideal);
    ROLE_ORDER.forEach(r => IDEAL[r] = D.ROLES[r].ideal / tot);
  }

  /** raw per-colony stats before ecosystem multipliers */
  function colonyRaw(col) {
    const f = D.FAM_BY_ID[col.fam];
    const sm = C.stageMult[col.stage];
    const gm = Math.pow(C.geneMult, col.gene);
    const pp = Math.pow(Math.max(1, col.pop), G.mult.popExp);
    return {
      fam: f,
      atk: f.atk * sm * gm * pp,
      hp: f.hp * sm * gm * pp,
      spd: f.spd,
      food: f.food * C.stageFood[col.stage] * col.pop,
      prod: f.prod * C.stageProdMult[col.stage] * col.pop
    };
  }

  /** full combat stats including every multiplier */
  function colonyStats(col) {
    const r = colonyRaw(col);
    const f = r.fam;
    const eco = G.eco;
    let atk = r.atk * G.mult.atk * eco.mult;
    let hp = r.hp * G.mult.hp * eco.mult;
    let spd = r.spd * G.mult.atkSpd;

    if (f.role === 'apex' || f.role === 'predator') atk *= G.mult.apexBonus;
    if (f.passive === 'undying') hp *= 1 + f.passiveVal / 100;

    // starvation
    if (eco.starving > 0 && f.food > 0) {
      const pen = 1 - eco.starving * 0.65 * (1 - G.mult.starveRelief);
      atk *= pen; hp *= pen;
    }
    // least-used damage type bonus (Counter-Evolution)
    if (G.mult.counterBonus > 0 && eco.weakestType === f.dmg) atk *= 1 + G.mult.counterBonus;
    if (G.mult.convergent > 0) atk *= 1 + G.mult.convergent;

    return { atk, hp, spd, food: r.food, prod: r.prod, fam: f };
  }

  /** recompute the whole ecosystem — called every tick */
  function recompute() {
    const eco = G.eco;
    const byRole = {}; ROLE_ORDER.forEach(r => byRole[r] = 0);
    let pop = 0, supply = 0, demand = 0, decomp = 0, prodTotal = 0;
    const fams = new Set();

    for (const col of G.colonies) {
      const f = D.FAM_BY_ID[col.fam];
      const r = colonyRaw(col);
      byRole[f.role] += col.pop;
      pop += col.pop;
      fams.add(col.fam);
      if (f.role === 'producer') { const v = r.prod * G.mult.prodOut; supply += v; prodTotal += v; }
      else if (f.role === 'decomposer') { const v = r.prod * G.mult.decompOut; decomp += v; supply += v * 0.45; }
      demand += r.food;
    }
    supply *= G.mult.foodSupply;
    demand *= G.mult.foodDemand;

    eco.pop = pop;
    eco.byRole = byRole;
    eco.supply = supply;
    eco.demand = demand;
    eco.decomp = decomp;
    eco.prod = prodTotal;
    eco.families = fams.size;
    eco.starving = demand > supply && demand > 0 ? U.clamp(1 - supply / demand, 0, 1) : 0;
    if (eco.starving > 0.02) G.stats.starved = (G.stats.starved || 0) + 0;

    // ---- stability from pyramid shape ----
    let dev = 0;
    if (pop > 0) {
      for (const r of ROLE_ORDER) dev += Math.abs(byRole[r] / pop - IDEAL[r]);
      dev /= 2;
    } else dev = 1;
    let stab = U.clamp(1 - dev, 0, 1);
    stab = U.clamp(stab + G.mult.stabBonus, 0, 1);
    eco.stability = stab;
    eco.deviation = dev;

    // ---- global multiplier from ecology ----
    let m = 1 + stab * G.mult.stabCap;
    if (stab >= 0.95) m *= G.mult.balancePerfect;
    m *= 1 + eco.families * G.mult.mutualPerFam;
    if (G.buffs.surge > 0) m *= 4;
    if (G.buffs.apocalypse > 0) m *= 2;
    eco.mult = m;

    // ---- least used damage type (for Counter-Evolution) ----
    let least = null, lv = Infinity;
    for (const t of D.TYPE_LIST) { const v = G.dmgDealt[t] || 0; if (v < lv) { lv = v; least = t; } }
    eco.weakestType = least;

    // ---- least ADAPTED type (Mimicry re-deals damage as this) ----
    let la = null, lav = Infinity;
    for (const t of D.TYPE_LIST) { const v = G.adapt[t] || 0; if (v < lav) { lav = v; la = t; } }
    eco.leastAdapted = la;

    // ---- how much of your damage is currently being absorbed ----
    let lost = 0;
    for (const t of D.TYPE_LIST) lost += (G.dmgShare[t] || 0) * (G.adapt[t] || 0) * D.CONF.adaptResist * G.mult.adaptBite;
    eco.adaptLoss = lost;

    // ---- passive income ----
    const surplus = Math.max(0, supply - demand);
    const base = (decomp + surplus * 0.5) * G.mult.passive;
    eco.bioRate = base * G.mult.bio * (G.buffs.surge > 0 ? 4 : 1);
    eco.essRate = eco.bioRate * G.mult.rootsEss * 0.01;
    eco.goldRate = 0;

    return eco;
  }

  /** total dungeon DPS estimate (used by abilities and UI) */
  function dungeonDPS() {
    let d = 0;
    for (const col of G.colonies) { const s = colonyStats(col); d += s.atk * s.spd; }
    return d;
  }

  function capacityUsed() { return G.colonies.reduce((a, c) => a + c.pop, 0); }
  function capacityFree() { return Math.max(0, G.mult.capacity - capacityUsed()); }

  /** advisory text for the player: what the pyramid needs */
  function advice() {
    const eco = G.eco;
    if (!G.colonies.length) return 'Found a colony to begin.';
    if (eco.starving > 0.35) return 'STARVING — add Producers or cull the hungry.';
    if (eco.starving > 0.02) return 'Food is tight. More Producers would help.';
    const pop = eco.pop || 1;
    const byRole = eco.byRole || {};
    let worst = null, worstGap = 0;
    for (const r of ROLE_ORDER) {
      const gap = IDEAL[r] - (byRole[r] || 0) / pop;
      if (gap > worstGap) { worstGap = gap; worst = r; }
    }
    if (worst && worstGap > 0.06) return 'Under-represented: ' + D.ROLES[worst].name + 's.';
    if (eco.stability > 0.95) return 'Perfectly balanced. Everything is multiplied.';
    return 'The web holds.';
  }

  global.ECO = { recompute, colonyStats, colonyRaw, dungeonDPS, capacityUsed, capacityFree, advice, ROLE_ORDER, IDEAL };
})(this);
