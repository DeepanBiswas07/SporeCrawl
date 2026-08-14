/* ============================================================
   tools/sim.js — headless balance simulator
   Loads the real game modules with DOM/audio stubbed out and
   plays them with a greedy AI, reporting how long the curve takes.
     node tools/sim.js [hours] [--verbose]
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/util.js', 'js/data.js', 'js/state.js', 'js/ecosystem.js', 'js/combat.js'];

function makeGame() {
  const sandbox = {
    console,
    Math, Date, JSON, isFinite, isNaN, parseInt, parseFloat,
    performance: { now: () => Date.now() },
    localStorage: { getItem: () => null, setItem() { }, removeItem() { } },
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    atob: s => Buffer.from(s, 'base64').toString('binary'),
    escape, unescape, encodeURIComponent, decodeURIComponent,
    setTimeout, clearTimeout
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);

  // stubs the real modules poke at
  vm.runInContext(`
    var SFX = new Proxy({}, { get: () => () => {} });
    var FX  = new Proxy({}, { get: () => () => {} });
    var UI  = new Proxy({}, { get: () => () => {} });
  `, ctx);

  for (const f of FILES) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }
  return ctx;
}

/* ---------------- greedy AI ---------------- */
function makeAI(ctx) {
  const { DATA: D, G, S, ECO, CB, U } = ctx;

  function famUnlocked(f) { return G.stats.bestWave >= f.unlockWave || S.globalWave() >= f.unlockWave; }

  /** which role does the pyramid most need right now? */
  function neededRole() {
    const pop = G.eco.pop || 1;
    let worst = null, gap = -Infinity;
    for (const r of ECO.ROLE_ORDER) {
      const g = ECO.IDEAL[r] - (G.eco.byRole ? G.eco.byRole[r] || 0 : 0) / pop;
      if (g > gap) { gap = g; worst = r; }
    }
    return worst;
  }

  function tryFound() {
    if (G.colonies.length >= G.mult.slots) return false;
    const want = neededRole();
    const have = new Set(G.colonies.map(c => c.fam));
    const buffer = G.colonies.length === 0 ? 1 : 2;
    const cands = D.FAMS.filter(f => famUnlocked(f) && !have.has(f.id) && G.res.bio >= S.foundCost(f) * buffer);
    if (!cands.length) return false;
    // prefer the needed role, then the strongest unlocked family
    cands.sort((a, b) => (b.role === want) - (a.role === want) || b.index - a.index);
    const f = cands[0];
    G.res.bio -= S.foundCost(f);
    G.colonies.push(S.makeColony(f.id, 0, 1, 0));
    G.discovered.fam[f.id] = 1; G.discovered.stage[f.id + ':0'] = 1;
    return true;
  }

  function tryEvolve() {
    let did = false;
    for (const col of G.colonies) {
      if (col.stage >= 4) continue;
      if (G.stats.bestWave < D.STAGE_GATE[col.stage + 1]) continue;
      if (col.stage >= 3 && G.stats.rebirths < 1) continue;
      const c = S.evoCost(col);
      if (G.res.ess >= c) { G.res.ess -= c; col.stage++; G.stats.evolutions++; G.discovered.stage[col.fam + ':' + col.stage] = 1; did = true; }
    }
    return did;
  }

  function tryGene() {
    // spend spare essence evenly, keeping a reserve for the next evolution
    let reserve = Infinity;
    for (const col of G.colonies) {
      if (col.stage < 4 && G.stats.bestWave >= D.STAGE_GATE[col.stage + 1] && (col.stage < 3 || G.stats.rebirths > 0)) {
        reserve = Math.min(reserve, S.evoCost(col));
      }
    }
    if (!isFinite(reserve)) reserve = 0;
    let did = false;
    for (let i = 0; i < 40; i++) {
      let best = null, bc = Infinity;
      for (const col of G.colonies) { const c = S.geneCost(col, 1); if (c < bc) { bc = c; best = col; } }
      if (!best || G.res.ess - bc < reserve) break;
      G.res.ess -= bc; best.gene++; did = true;
    }
    return did;
  }

  function tryPop() {
    let did = false;
    for (let i = 0; i < 300; i++) {
      const free = G.mult.capacity - ECO.capacityUsed();
      if (free < 1) break;
      // grow whichever colony most improves the pyramid, cheapest first
      const want = neededRole();
      let best = null, bs = -Infinity;
      for (const col of G.colonies) {
        const f = D.FAM_BY_ID[col.fam];
        const c = S.popCost(col, 1);
        if (c > G.res.bio) continue;
        let score = 1 / c;
        if (f.role === want) score *= 6;
        if (bs < score) { bs = score; best = col; }
      }
      if (!best) break;
      G.res.bio -= S.popCost(best, 1); best.pop++; did = true;
    }
    return did;
  }

  function tryRooms() {
    let did = false;
    for (let i = 0; i < 60; i++) {
      let best = null, bc = Infinity;
      for (const r of D.ROOMS) {
        const lvl = S.roomLvl(r.id);
        if (lvl >= r.max) continue;
        if (G.stats.bestWave < r.unlock) continue;
        const c = S.roomCost(r, lvl);
        // keep a buffer so rooms don't eat the population budget
        const budget = r.cur === 'gold' ? G.res.gold : G.res[r.cur] * 0.35;
        if (c > budget) continue;
        if (c < bc) { bc = c; best = r; }
      }
      if (!best) break;
      G.res[best.cur] -= S.roomCost(best, S.roomLvl(best.id));
      G.rooms[best.id] = S.roomLvl(best.id) + 1;
      S.recalc();
      did = true;
    }
    return did;
  }

  /** value of one more level, expressed as a global power multiplier */
  function mutRatio(m, lvl) {
    const a = m.f(lvl), b = m.f(lvl + 1);
    if (!isFinite(a) || !isFinite(b) || a === 0) return 1.02;
    let r = b / a;
    if (r < 1) r = 1 / r;                 // cost reductions: cheaper is better
    if (r <= 1.0001) r = 1 + Math.abs(b - a) * 0.01;  // flat/additive nodes
    return Math.max(1.001, Math.min(r, 4));
  }

  function tryMuts() {
    let did = false;
    for (let i = 0; i < 400; i++) {
      // best value per genome point across the WHOLE tree, so the AI saves
      // for the multiplicative capstones instead of hoovering up cheap levels
      let best = null, bestScore = 0, bestAff = null, bestAffScore = 0;
      for (const m of D.MUTATIONS) {
        const lvl = S.mutLvl(m.id);
        if (lvl >= m.max) continue;
        const c = S.mutCost(m, lvl);
        const score = Math.log(mutRatio(m, lvl)) / c;
        if (score > bestScore) { bestScore = score; best = m; }
        if (c <= G.res.dna && score > bestAffScore) { bestAffScore = score; bestAff = m; }
      }
      if (!bestAff) break;
      // only settle for a cheaper node if it is at least a third as efficient
      if (best && best !== bestAff && bestAffScore < bestScore * 0.34) break;
      G.res.dna -= S.mutCost(bestAff, S.mutLvl(bestAff.id));
      G.muts[bestAff.id] = S.mutLvl(bestAff.id) + 1;
      G.stats.mutLevels++;
      S.recalc();
      did = true;
    }
    return did;
  }

  function tryAbilities() {
    if (CB.B.phase !== 'fight') return;
    for (const a of D.ABILITIES) {
      if (G.stats.bestWave < a.unlock) continue;
      if ((G.abil[a.id] || 0) > 0) continue;
      CB.useAbility(a.id);
    }
  }

  return { tryFound, tryEvolve, tryGene, tryPop, tryRooms, tryMuts, tryAbilities };
}

/* ---------------- run ---------------- */
function run(hours, verbose) {
  const ctx = makeGame();
  const { DATA: D, G, S, ECO, CB } = ctx;
  const AI = makeAI(ctx);

  G.autoRaid = true;
  S.recalc(); ECO.recompute();

  const DT = 0.1;
  const maxT = hours * 3600;
  let t = 0, decideAcc = 0;
  let stallSince = 0, lastBest = 0, losses = 0, winsSince = 0;

  const milestones = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 750, 900];
  const hit = {};
  const timeline = [];
  let collapses = 0, rebirths = 0;
  let lastLog = 0;

  while (t < maxT) {
    S.recalc();
    ECO.recompute();

    G.res.bio += G.eco.bioRate * DT;
    G.res.ess += G.eco.essRate * DT;

    for (const k in G.abil) if (G.abil[k] > 0) G.abil[k] = Math.max(0, G.abil[k] - DT);
    for (const k in G.buffs) if (G.buffs[k] > 0) G.buffs[k] = Math.max(0, G.buffs[k] - DT);

    const beforeWon = G.stats.raidsWon, beforeLost = G.stats.raidsLost;
    if (CB.B.phase === 'fight') { CB.update(DT); AI.tryAbilities(); }
    else { CB.B.gap -= DT; if (CB.B.gap <= 0) CB.startRaid(); }
    if (G.stats.raidsLost > beforeLost) { losses++; winsSince = 0; }
    if (G.stats.raidsWon > beforeWon) { winsSince++; losses = 0; }

    decideAcc += DT;
    if (decideAcc >= 1) {
      decideAcc = 0;
      AI.tryFound(); AI.tryEvolve(); AI.tryGene(); AI.tryPop(); AI.tryRooms(); AI.tryMuts();
      // achievements
      for (const a of D.ACHIEVEMENTS) {
        if (!G.ach[a.id]) { let ok = false; try { ok = a.check(G); } catch (e) { } if (ok) { G.ach[a.id] = 1; S.recalc(); } }
      }
    }

    // milestones
    for (const m of milestones) {
      if (!hit[m] && G.stats.bestWave >= m) {
        hit[m] = t;
        timeline.push({ wave: m, t, colonies: G.colonies.length, collapses, rebirths, stab: G.eco.stability });
      }
    }

    // stall detection -> prestige
    if (G.stats.bestWave > lastBest) { lastBest = G.stats.bestWave; stallSince = t; }
    const stalled = t - stallSince > 420;   // 7 minutes with no new depth
    if (stalled) {
      if (S.canRebirth()) {
        G.res.cell += S.cellGain(); G.stats.rebirths++; rebirths++;
        hardReset(ctx, false);
      } else if (S.canCollapse() && S.dnaGain() >= Math.max(1, G.res.dna * 0.35)) {
        G.res.dna += S.dnaGain(); G.stats.collapses++; collapses++;
        hardReset(ctx, false);
      }
      stallSince = t;
    }

    // repeated losses -> back off a depth
    if (losses >= 4) {
      losses = 0;
      if (G.depth > 1 && (G.bestInBiome[G.depth] || 0) < 3) { G.depth--; G.wave = Math.max(1, (G.bestInBiome[G.depth] || 1)); }
      else G.wave = Math.max(1, G.wave - 3);
      CB.B.phase = 'idle'; CB.B.gap = 1;
    }

    t += DT;
    if (verbose && t - lastLog >= verboseEvery) {
      lastLog = t;
      const hp = CB.B.heroes.length ? CB.B.heroes[0].maxHp : 0;
      const c0 = G.colonies[0];
      console.log(`  t=${(t / 3600).toFixed(2)}h best=${G.stats.bestWave} d=${G.depth} col=${G.colonies.length}` +
        ` stab=${(G.eco.stability * 100).toFixed(0)}% dps=${fmtN(ECO.dungeonDPS())} heroHP=${fmtN(hp)}` +
        ` pop=${G.eco.pop}/${G.mult.capacity} gene=${c0 ? c0.gene : 0} stg=${G.colonies.map(c => c.stage).join('')}` +
        ` atk×=${fmtN(G.mult.atk)} eco×=${G.eco.mult.toFixed(1)} bio=${fmtN(G.res.bio)} dna=${fmtN(G.res.dna)} c/r=${collapses}/${rebirths}`);
    }
  }

  return { ctx, timeline, hit, collapses, rebirths, t };
}

function hardReset(ctx, hard) {
  const { G, S, ECO, CB, DATA: D } = ctx;
  G.colonies = []; G.rooms = {};
  G.res.bio = 30; G.res.ess = 0; G.res.gold = 0;
  G.depth = 1; G.wave = 1; G.maxDepth = 1; G.bestInBiome = {};
  G.stats.bestWaveRun = 0;
  for (const t of D.TYPE_LIST) { G.adapt[t] = 0; G.dmgDealt[t] = 0; }
  G.abil = {}; G.buffs = {};
  CB.B.phase = 'idle'; CB.B.heroes = []; CB.B.gap = 1;
  if (hard) { G.res.dna = 0; G.muts = {}; G.stats.mutLevels = 0; }
  S.recalc(); ECO.recompute();
}

function fmtN(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n.toFixed(0);
  const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const i = Math.min(u.length - 1, Math.floor(Math.log10(n) / 3));
  return (n / Math.pow(1000, i)).toFixed(2) + u[i];
}
function hms(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h + 'h' + String(m).padStart(2, '0') + 'm';
}

/* ---------------- main ---------------- */
const hours = parseFloat(process.argv[2]) || 20;
const verbose = process.argv.includes('--verbose');
const evArg = process.argv.find(a => a.startsWith('--every='));
const verboseEvery = evArg ? parseFloat(evArg.split('=')[1]) : 1800;
console.log(`\n=== Sporecrawl — ${hours}h simulation ===\n`);
const t0 = Date.now();
const { ctx, timeline, collapses, rebirths } = run(hours, verbose);
const { G, S, ECO, DATA: D } = ctx;

console.log('\n--- milestone timeline ---');
console.log(' raid |   time   | colonies | collapses | stability');
for (const m of timeline) {
  console.log(String(m.wave).padStart(5) + ' | ' + hms(m.t).padStart(8) + ' | ' +
    String(m.colonies).padStart(8) + ' | ' + String(m.collapses).padStart(9) + ' | ' +
    (m.stab * 100).toFixed(0).padStart(8) + '%');
}

console.log('\n--- end state ---');
console.log('best raid      ', G.stats.bestWave, '(depth ' + G.stats.bestBiome + '/' + D.BIOMES.length + ')');
console.log('collapses      ', collapses, ' rebirths', rebirths);
console.log('colonies       ', G.colonies.map(c => D.FAM_BY_ID[c.fam].stages[c.stage] + ' ×' + c.pop + ' g' + c.gene).join(', '));
console.log('stability      ', (G.eco.stability * 100).toFixed(1) + '%   eco× ' + G.eco.mult.toFixed(2));
console.log('population     ', G.eco.pop, '/', G.mult.capacity);
console.log('resources      ', 'bio ' + fmtN(G.res.bio), 'ess ' + fmtN(G.res.ess), 'gold ' + fmtN(G.res.gold), 'dna ' + fmtN(G.res.dna), 'cells ' + G.res.cell);
console.log('kills          ', fmtN(G.stats.kills), ' legends', G.stats.legendKills);
console.log('raids w/l      ', G.stats.raidsWon + '/' + G.stats.raidsLost);
console.log('evolutions     ', G.stats.evolutions, ' mutation lvls', G.stats.mutLevels);
console.log('achievements   ', D.ACHIEVEMENTS.filter(a => G.ach[a.id]).length + '/' + D.ACHIEVEMENTS.length);
console.log('forms found    ', Object.keys(G.discovered.stage).length + '/' + (D.FAMS.length * 5));
console.log('rooms built    ', Object.keys(G.rooms).length + '/' + D.ROOMS.length);
console.log('\nsim wall time  ', ((Date.now() - t0) / 1000).toFixed(1) + 's\n');
