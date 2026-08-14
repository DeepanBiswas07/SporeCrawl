/* ============================================================
   game.js — boot, main loop, offline progress, prestige
   ============================================================ */
(function (global) {
  'use strict';
  const D = global.DATA, C = D.CONF, G = global.G, S = global.S, ECO = global.ECO, CB = global.CB;
  const { $, fmt, time } = global.U;

  let running = false, lastFrame = 0, saveAcc = 0, achAcc = 0, playAcc = 0, autoAcc = 0;

  /* ---------------- achievements ---------------- */
  function checkAchievements() {
    for (const a of D.ACHIEVEMENTS) {
      if (G.ach[a.id]) continue;
      let ok = false;
      try { ok = a.check(G); } catch (e) { ok = false; }
      if (ok) {
        G.ach[a.id] = 1;
        global.SFX.ach();
        UI.toast('trophy', 'Achievement — ' + a.name, a.desc + '  ·  ' + a.rewTxt, 'ach');
        UI.log('<b>' + a.name + '</b> — ' + a.rewTxt, 'y');
        UI.markDirty('codex');
        S.recalc();
      }
    }
  }

  /* ---------------- unlock notifications ---------------- */
  function checkUnlocks() {
    const best = G.stats.bestWave;
    for (const f of D.FAMS) {
      const key = 'fam_' + f.id;
      if (best >= f.unlockWave && !G.unlockSeen[key]) {
        G.unlockSeen[key] = 1;
        UI.newDiscovery('fam', f);
        $('#pane-colonies') && UI.markDirty('colonies');
        document.getElementById('dotEvolve').classList.remove('hidden');
      }
    }
    for (const r of D.ROOMS) {
      const key = 'room_' + r.id;
      if (best >= r.unlock && !G.unlockSeen[key]) {
        G.unlockSeen[key] = 1;
        if (best > 1) {
          UI.toast('dungeon', 'New room: ' + r.name, r.desc, 'unlock');
          document.getElementById('dotDungeon').classList.remove('hidden');
        }
        UI.markDirty('dungeon');
      }
    }
    for (const a of D.ABILITIES) {
      const key = 'ab_' + a.id;
      if (best >= a.unlock && !G.unlockSeen[key]) {
        G.unlockSeen[key] = 1;
        if (best > 1) {
          UI.toast(a.id, 'Ability unlocked: ' + a.name, a.desc, 'unlock');
          global.SFX.unlock();
        }
        UI.refreshAbilities();
      }
    }
    for (let i = 0; i < 5; i++) {
      const key = 'stage_' + i;
      if (best >= D.STAGE_GATE[i] && !G.unlockSeen[key] && i > 0 && i < 4) {
        G.unlockSeen[key] = 1;
        if (best > 1) {
          UI.toast('evolve', 'Stage ' + (i + 1) + ' evolution unlocked', 'Your species can now become ' + D.STAGE_LABEL[i] + '.', 'unlock');
          document.getElementById('dotEvolve').classList.remove('hidden');
        }
      }
    }
  }

  /* ---------------- main loop ----------------
     Simulation and rendering are deliberately separate. The dungeon keeps
     eating on a timer even when the tab is hidden and rAF stops firing;
     the canvas only redraws when there is actually a frame to draw.
  -------------------------------------------- */
  let lastSim = 0, simTimer = null;

  function simTick() {
    if (!running) return;
    try {
    const now = performance.now();
    let dt = (now - lastSim) / 1000;
    lastSim = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 1.0);   // anything longer is handled by offline progress
    const speed = (G.settings.speed == null ? 1 : G.settings.speed) * S.mutVal('sing');
    step(dt * speed, dt);
    } catch (e) { global.Guard.report(e, 'simulation'); }
  }

  let backdrop = null, glT = 0;

  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);   // re-queued FIRST so a throw below cannot end the loop
    let dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.25);
    glT += dt;

    try {
    if (backdrop) {
      const B = CB.B;
      // the room reacts: hotter mid-raid, arterial when the core is exposed
      const alive = B.phase === 'fight' ? B.heroes.filter(h => h.alive).length : 0;
      const heat = B.phase === 'fight' ? Math.min(1, 0.35 + alive / 12) : 0.1;
      const exposed = B.phase === 'fight' && !G.colonies.some(c => c.alive);
      const pulse = exposed ? Math.min(1, 1 - (B.core / Math.max(1, B.coreMax))) : 0;
      backdrop.set({
        accent: S.biome().glow,
        heat: heat,
        pulse: pulse,
        depth: (G.depth - 1) / Math.max(1, D.BIOMES.length - 1)
      });
      backdrop.render(glT);
    }

    global.R.frame(dt);
    global.UI.tick(dt);
    } catch (e) { global.Guard.report(e, 'render'); }
  }

  function step(dt, realDt) {
    S.recalc();
    ECO.recompute();

    // Hard pause while a teaching card is up, or while the player has paused.
    // Reading an explanation should never cost you three raids.
    if (global.REVEAL.isShowing() || G.settings.speed === 0) {
      playAcc += realDt; G.stats.playTime += realDt;
      return;
    }

    // passive income
    G.res.bio += G.eco.bioRate * dt;
    G.res.ess += G.eco.essRate * dt;
    G.stats.totalBio += G.eco.bioRate * dt;

    // cooldowns & buffs
    for (const k in G.abil) if (G.abil[k] > 0) G.abil[k] = Math.max(0, G.abil[k] - dt);
    for (const k in G.buffs) if (G.buffs[k] > 0) G.buffs[k] = Math.max(0, G.buffs[k] - dt);

    // battle
    if (CB.B.phase === 'fight') {
      CB.update(dt);
    } else {
      CB.B.gap -= dt;
      if (G.autoRaid && CB.B.gap <= 0) CB.startRaid();
    }

    // auto-breed: spends only spare biomass, never the reserve you are saving
    autoAcc += realDt;
    if (autoAcc > 0.5) {
      autoAcc = 0;
      const free = G.mult.capacity - ECO.capacityUsed();
      if (free > 0) {
        for (const col of G.colonies) {
          if (!col.auto) continue;
          const c = S.popCost(col, 1);
          if (G.res.bio > c * 2.5 && ECO.capacityUsed() < G.mult.capacity) { G.res.bio -= c; col.pop++; }
        }
      }
    }

    // timers
    playAcc += realDt; G.stats.playTime += realDt;
    achAcc += realDt;
    if (achAcc > 1) {
      achAcc = 0;
      checkAchievements(); checkUnlocks(); global.REVEAL.check();
      const doneObj = global.OBJ.check();
      if (doneObj) global.OBJ.celebrate(doneObj);
      global.OBJ.render();
    }
    saveAcc += realDt;
    if (saveAcc > 20) { saveAcc = 0; S.save(); }
  }

  /* ---------------- offline ---------------- */
  function offlineProgress() {
    const now = Date.now();
    const elapsed = Math.max(0, (now - (G.lastTick || now)) / 1000);
    if (elapsed < 60 || !G.colonies.length) { G.lastTick = now; return; }
    const cap = G.mult.offlineCap;
    const t = Math.min(elapsed, cap);
    const eff = G.mult.offlineEff;

    S.recalc(); ECO.recompute();

    // passive
    let bio = G.eco.bioRate * t * eff;
    let ess = G.eco.essRate * t * eff;
    let gold = 0;

    // simulated raids at the current depth, assuming you clear them
    const gw = S.globalWave();
    const ru = D.rewardUnit(gw);
    const party = CB.partySize(gw);
    const avgCls = D.HEROES.filter(h => gw >= D.TIER_WAVE[h.tier]).slice(-6);
    let pb = 0, pe = 0, pg = 0;
    for (const c of avgCls) { pb += c.bio; pe += c.ess; pg += c.gold; }
    pb /= avgCls.length; pe /= avgCls.length; pg /= avgCls.length;
    const raidTime = G.mult.raidGap + 9;
    const raids = (t / raidTime) * eff * 0.75;
    bio += raids * party * pb * ru * G.mult.bio;
    ess += raids * party * pe * ru * 0.052 * G.mult.ess;
    gold += raids * party * pg * ru * 0.085 * G.mult.gold;

    G.res.bio += bio; G.res.ess += ess; G.res.gold += gold;
    G.stats.totalBio += bio; G.stats.totalEss += ess; G.stats.totalGold += gold;
    G.stats.offlineTime += t;
    G.lastTick = now;

    UI.modal('<h2>While you were gone</h2>' +
      '<p>The dungeon does not sleep. It digests.</p>' +
      '<div class="mstat"><span>Time away</span><b>' + time(elapsed) + (elapsed > cap ? ' (capped at ' + time(cap) + ')' : '') + '</b></div>' +
      '<div class="mstat"><span>Efficiency</span><b>' + (eff * 100).toFixed(0) + '%</b></div>' +
      '<div class="mstat"><span>Simulated raids</span><b>' + fmt(raids) + '</b></div>' +
      '<div class="mstat"><span>Biomass</span><b class="cost-bio">+' + fmt(bio) + '</b></div>' +
      '<div class="mstat"><span>Essence</span><b class="cost-ess">+' + fmt(ess) + '</b></div>' +
      '<div class="mstat"><span>Plunder</span><b class="cost-gold">+' + fmt(gold) + '</b></div>' +
      '<p style="margin-top:10px;font-size:11px">Raise the cap with <b>Memory Crypt</b> rooms and the <b>Void</b> mutation branch.</p>' +
      '<div class="mrow"><button class="btn btn-primary" id="offOk">Back to work</button></div>');
    $('#offOk').onclick = UI.closeModal;
  }

  /* ---------------- prestige ---------------- */
  function resetRun(hard) {
    G.colonies = [];
    G.rooms = {};
    G.res.bio = 30; G.res.ess = 0; G.res.gold = 0;
    G.depth = 1; G.wave = 1; G.maxDepth = 1; G.bestInBiome = {};
    G.stats.bestWaveRun = 0;
    G.stats.streak = 0;
    for (const t of D.TYPE_LIST) { G.adapt[t] = 0; G.dmgDealt[t] = 0; }
    G.abil = {}; G.buffs = {};
    CB.B.phase = 'idle'; CB.B.heroes = []; CB.B.gap = 2;
    if (hard) { G.res.dna = 0; G.muts = {}; G.stats.mutLevels = 0; }
    S.recalc(); ECO.recompute();
    UI.markDirty(); UI.renderActive(true); UI.refreshAbilities();
  }

  function collapse() {
    const gain = S.dnaGain();
    if (gain < 1) return;
    G.res.dna += gain;
    G.stats.collapses++;
    resetRun(false);
    global.SFX.prestige();
    UI.banner('COLLAPSE', fmt(gain) + ' genome recovered', '#ff86c8');
    UI.toast('genome', 'Collapse complete', 'Gained ' + fmt(gain) + ' genome. Spend it in the Genome tab.', 'unlock');
    UI.log('The dungeon <b class="m">collapses</b>. You gained <b class="m">' + fmt(gain) + ' genome</b>.', 'm');
    UI.setTab('genome');
    S.save();
  }

  function rebirth() {
    const gain = S.cellGain();
    if (gain < 1) return;
    G.res.cell += gain;
    G.stats.rebirths++;
    // a Rebirth resets the run but never the genome — cells are pure gain,
    // earned by total lifetime depth rather than by any single cycle
    resetRun(false);
    global.SFX.prestige();
    UI.banner('PRIMORDIAL REBIRTH', fmt(gain) + ' cells · Mythic unlocked', '#6fd8ef');
    UI.toast('cell', 'You were here first', 'Mythic evolution unlocked for every species.', 'unlock');
    UI.log('<b class="p">Primordial Rebirth.</b> Mythic evolution is now possible.', 'p');
    UI.setTab('genome');
    S.save();
  }

  /* ---------------- boot ---------------- */
  function startGame(fresh) {
    $('#boot').classList.add('hidden');
    $('#app').classList.remove('hidden');

    // the ecosystem must be computed before any panel renders — the colony
    // list reads derived values straight out of G.eco
    S.recalc();
    ECO.recompute();

    // living WebGL backdrop behind the entire interface
    if (global.GL && global.GL.supported) {
      backdrop = global.GL.createBackdrop($('#bgfx'));
      if (backdrop) document.body.classList.add('has-gl');
    }
    global.R.init($('#stage'));
    global.R.resize();
    global.SFX.setMuted(!!G.settings.muted);
    global.UI.init();

    // progressive disclosure: veil everything that has not been earned yet
    if (global.Store.ephemeral) global.Store.warnOnce();
    global.REVEAL.init(fresh);
    global.SFX.startAmbience();

    if (fresh) {
      UI.log('You wake up.', 'g');
      UI.log('Something is walking toward the entrance.', '');
      // the opening decree fires from REVEAL.check on the first tick
    } else {
      UI.log('You return to the dark.', '');
      offlineProgress();
    }

    checkUnlocks();
    checkAchievements();
    global.REVEAL.check();
    global.OBJ.check();
    global.OBJ.render();
    UI.renderActive(true);

    running = true;
    lastFrame = lastSim = performance.now();
    requestAnimationFrame(loop);
    if (simTimer) clearInterval(simTimer);
    simTimer = setInterval(simTick, 100);

    global.addEventListener('beforeunload', () => { G.lastTick = Date.now(); S.save(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { G.lastTick = Date.now(); S.save(); }
    });
  }

  function boot() {
    const stopBoot = global.R.bootAnim($('#bootCanvas'));
    const has = S.hasSave();
    if (has) {
      $('#btnContinue').classList.remove('hidden');
      $('#btnNewGame').textContent = 'Start over';
      $('#btnNewGame').classList.remove('btn-primary');
      $('#btnContinue').classList.add('btn-primary');
    }
    $('#btnContinue').onclick = () => {
      global.SFX.init();
      S.load();
      stopBoot && stopBoot();
      startGame(false);
    };
    const fresh = () => { S.wipe(); stopBoot && stopBoot(); startGame(true); };
    $('#btnNewGame').onclick = () => {
      global.SFX.init();
      if (!has) return fresh();
      // never a native dialog — some embedders suppress them outright
      $('#modalBody').innerHTML =
        '<h2>Start over?</h2><p>Your current dungeon, its genome and everything it remembers will be erased. ' +
        'There is no undo.</p><div class="mrow">' +
        '<button class="btn" id="soYes" style="border-color:rgba(255,95,109,.5);color:#ff8f9a">Erase and begin again</button>' +
        '<button class="btn btn-primary" id="soNo">Keep my dungeon</button></div>';
      $('#modalBg').classList.remove('hidden');
      $('#soYes').onclick = () => { $('#modalBg').classList.add('hidden'); fresh(); };
      $('#soNo').onclick = () => $('#modalBg').classList.add('hidden');
    };
  }

  global.GAME = { boot, startGame, collapse, rebirth, resetRun, offlineProgress, checkAchievements };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(this);
