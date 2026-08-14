/* ============================================================
   ui.js — panels, shops, evolution chains, genome tree, codex
   ============================================================ */
(function (global) {
  'use strict';
  const D = global.DATA, C = D.CONF, G = global.G, S = global.S, ECO = global.ECO;
  const { $, $$, el, fmt, fmtInt, pct, time, clamp, roman } = global.U;
  const ico = (n, o) => global.ICON.ico(n, o);
  const GH_URL = 'https://github.com/DeepanBiswas07';

  let buyAmt = 1;
  let activeTab = 'colonies';
  const dirty = { colonies: 1, evolve: 1, dungeon: 1, genome: 1, codex: 1 };
  let pickerOpen = false;

  /* ---------------- icon maps ---------------- */
  const ROOM_ICON = {
    pool: 'colonies', warren: 'dungeon', garden: 'producer', bonepit: 'skull', sluice: 'pois',
    still: 'flask', vault: 'plunder', spikes: 'phys', vents: 'pois', ceiling: 'cavein',
    core: 'cell', hatch: 'fecundity', vats: 'flask', forge: 'genome', chamber: 'void',
    troughs: 'consumer', drums: 'predation', carapace: 'construct', sonar: 'spark',
    lure: 'gate', crypt: 'hourglass'
  };
  const MUT_ICON = {
    fang: 'predator', instinct: 'spark', frenzy: 'pois', apex: 'apex', rend: 'phys',
    spiral: 'void', overwhelm: 'cavein', extinct: 'apocalypse',
    fertile: 'fecundity', division: 'colonies', digest: 'essence', plunder: 'plunder',
    brood: 'consumer', cheapmeat: 'flask', bloom: 'producer', hyper: 'symbiosis',
    web: 'symbiosis', cycle: 'decomposer', mutual: 'colonies', keystone: 'pyramid',
    cascade: 'frost', roots: 'tree', balance: 'pyramid', gaia: 'cell',
    shift: 'adaptation', immune: 'construct', camo: 'producer', counter: 'evolve',
    mimic: 'eye', antigen: 'flask', converge: 'arc', unknow: 'void',
    deeper: 'dungeon', heart: 'cell', ironeco: 'construct', terror: 'skull',
    sprawl: 'gate', grudge: 'trophy', warlord: 'predation', sovereign: 'dominion',
    slumber: 'hourglass', memory: 'codex', echo: 'spark', metab: 'void',
    rift: 'hourglass', hunger: 'devour', sing: 'cell', primal: 'apocalypse'
  };
  function achIcon(id) {
    if (/^kill/.test(id)) return 'skull';
    if (/^(evo|mythic|acid)/.test(id)) return 'evolve';
    if (/^(wave|biome)/.test(id)) return 'down';
    if (/^legend/.test(id)) return 'trophy';
    if (/^(stab|div)/.test(id)) return 'symbiosis';
    if (/^(pop|bio)/.test(id)) return 'biomass';
    if (/^room/.test(id)) return 'dungeon';
    if (/^(collapse|rebirth)/.test(id)) return 'genome';
    if (/^mut/.test(id)) return 'adaptation';
    if (/^(idle|play)/.test(id)) return 'hourglass';
    return 'spark';
  }

  /* ---------------- helpers ---------------- */
  function markDirty(k) { if (k) dirty[k] = 1; else for (const x in dirty) dirty[x] = 1; }
  function afford(cur, amt) { return G.res[cur] >= amt - 1e-9; }
  const CUR_CLS = { bio: 'cost-bio', ess: 'cost-ess', gold: 'cost-gold', dna: 'cost-dna' };
  function cost(cur, amt) {
    return '<small class="' + CUR_CLS[cur] + '">' + ico(global.ICON.RES_ICON[cur], { size: 9, w: 2 }) + fmt(amt) + '</small>';
  }

  /** fill every <span data-ico="name"> in a subtree */
  function paintIcons(root) {
    (root || document).querySelectorAll('[data-ico]').forEach(n => {
      if (n.dataset.painted) return;
      n.innerHTML = ico(n.dataset.ico, { size: +n.dataset.size || 15 });
      n.dataset.painted = '1';
    });
  }
  function paintPortraits(root) {
    root.querySelectorAll('canvas[data-k]').forEach(c => {
      if (c.dataset.painted) return;
      if (!c.clientWidth || !c.clientHeight) return;
      global.SPR.portrait(c, c.dataset.k, c.dataset.a, c.dataset.b);
      c.dataset.painted = '1';
    });
  }
  function paint(root) { paintIcons(root); paintPortraits(root); }

  /* ================= LOG / TOAST / BANNER ================= */
  function log(html, cls) {
    const box = $('#log'); if (!box) return;
    box.insertBefore(el('p', cls || '', html), box.firstChild);
    while (box.children.length > 60) box.removeChild(box.lastChild);
  }
  /* Notifications arrive one at a time, spaced far enough apart to actually be
     read, and never while a teaching card is up. Four things unlocking at once
     used to stack into an unreadable pile. */
  const toastQ = [];
  let toastLive = 0, toastLast = 0;
  function toast(iconName, title, sub, cls) {
    toastQ.push({ iconName, title, sub, cls });
    while (toastQ.length > 8) toastQ.shift();
    pumpToasts();
  }
  function pumpToasts() {
    if (!toastQ.length) return;
    const now = performance.now();
    const busy = toastLive >= 2 || (global.REVEAL && global.REVEAL.isShowing());
    if (busy || now - toastLast < 1500) {
      setTimeout(pumpToasts, 400);
      return;
    }
    const { iconName, title, sub, cls } = toastQ.shift();
    toastLast = now; toastLive++;
    const box = $('#toasts');
    const t = el('div', 'toast ' + (cls || ''),
      '<span class="ti">' + ico(iconName, { size: 16 }) + '</span>' +
      '<div><div class="tt">' + title + '</div>' + (sub ? '<div class="ts">' + sub + '</div>' : '') + '</div>');
    box.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => { t.remove(); toastLive--; pumpToasts(); }, 400);
    }, 5200);
    if (toastQ.length) setTimeout(pumpToasts, 400);
  }
  function banner(title, sub, color) {
    const b = $('#banner');
    b.innerHTML = title + (sub ? '<small>' + sub + '</small>' : '');
    b.style.color = color || 'var(--ink)';
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }
  function flashRes() {
    $$('.res').forEach(r => { r.classList.remove('tick'); void r.offsetWidth; r.classList.add('tick'); });
  }
  function shake() {
    const w = $('.stage-wrap'); if (!w) return;
    w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
  }
  function newDiscovery(kind, obj) {
    if (kind === 'hero') toast('phys', 'New hero class', obj.name + ' has entered the dungeon.', 'unlock');
    if (kind === 'fam') toast('colonies', 'New species available', obj.name + ' — ' + obj.blurb, 'unlock');
    markDirty('codex');
  }

  /* ================= TOP BAR ================= */
  function updateRes() {
    $('#resBio').textContent = fmt(G.res.bio);
    $('#resEss').textContent = fmt(G.res.ess);
    $('#resGold').textContent = fmt(G.res.gold);
    $('#resBioRate').textContent = '+' + fmt(G.eco.bioRate || 0) + '/s';
    $('#resEssRate').textContent = (G.eco.essRate > 0 ? '+' + fmt(G.eco.essRate) + '/s' : 'essence');
    $('#resDna').textContent = fmt(G.res.dna);
    $('#resDnaGain').textContent = '+' + fmt(S.dnaGain()) + ' on collapse';
    $('#resCell').textContent = fmt(G.res.cell);
  }

  function updateDepthBar() {
    const b = S.biome();
    $('#depthNum').textContent = 'DEPTH ' + G.depth;
    $('#biomeName').textContent = b.name;
    $('#waveNum').textContent = G.wave + ' / ' + b.waves;
    $('#waveBest').textContent = G.stats.bestWave ? '  ·  BEST ' + G.stats.bestWave : '';
    $('#btnDepthUp').disabled = !(G.depth < G.maxDepth || (G.bestInBiome[G.depth] || 0) >= b.waves) || G.depth >= D.BIOMES.length;
    $('#btnDepthDown').disabled = G.depth <= 1;
    // the whole interface takes its accent from the depth you are standing in
    const r = document.documentElement;
    r.style.setProperty('--accent', b.glow);
    r.style.setProperty('--accent-soft', U.rgba(b.glow, .13));
    r.style.setProperty('--accent-line', U.rgba(b.glow, .34));
  }

  /* ================= COLONIES ================= */
  function famUnlocked(f) { return G.stats.bestWave >= f.unlockWave || S.globalWave() >= f.unlockWave; }
  function maxPopBuy(col) {
    const f = D.FAM_BY_ID[col.fam];
    const base = f.popBase * Math.pow(1.55, col.stage) * G.mult.popCost;
    return Math.min(U.geoMaxBuy(base, C.popCostGrowth, col.pop, G.res.bio),
      Math.max(0, G.mult.capacity - ECO.capacityUsed()));
  }
  function maxGeneBuy(col) {
    const f = D.FAM_BY_ID[col.fam];
    const base = f.geneBase * Math.pow(1.7, col.stage) * G.mult.geneCost;
    return U.geoMaxBuy(base, C.geneCostGrowth, col.gene, G.res.ess);
  }
  function amtFor(col, kind) {
    if (buyAmt === 'max') return Math.max(1, kind === 'pop' ? maxPopBuy(col) : maxGeneBuy(col));
    return buyAmt;
  }

  function renderColonies() {
    const pane = $('#pane-colonies');
    const used = ECO.capacityUsed();
    let h = '';

    h += '<div class="sec-h"><h4>Your Ecosystem</h4><span class="sub">' +
      G.colonies.length + '/' + G.mult.slots + ' slots · ' + fmt(used) + '/' + fmt(G.mult.capacity) + ' pop</span></div>';

    h += '<div class="segmented" data-veil="buyamt">' +
      [1, 10, 'max'].map(a => '<button class="btn buyamt' + (buyAmt === a ? ' on' : '') +
        '" data-amt="' + a + '">' + (a === 'max' ? 'Max' : '×' + a) + '</button>').join('') + '</div>';

    if (!G.colonies.length) {
      h += '<div class="emptyslot" style="cursor:default"><b>Nothing lives here</b>The dark is empty and quiet. Give it an occupant.</div>';
    }

    G.colonies.forEach((col, i) => {
      const f = D.FAM_BY_ID[col.fam];
      const st = ECO.colonyStats(col);
      const pn = amtFor(col, 'pop'), gn = amtFor(col, 'gene');
      const pc = S.popCost(col, pn), gc = S.geneCost(col, gn), ec = S.evoCost(col);
      const canEvo = col.stage < 4 && G.stats.bestWave >= D.STAGE_GATE[col.stage + 1] &&
        (col.stage < 3 || G.stats.rebirths > 0);
      const capFull = used >= G.mult.capacity;
      const starving = G.eco.starving > 0.02 && f.food > 0;
      const isProd = f.role === 'producer' || f.role === 'decomposer';

      h += '<div class="colony' + (starving ? ' starving' : '') + '">';
      h += '<div class="col-top">';
      h += '<span class="col-portrait"><canvas data-k="monster" data-a="' + col.fam + '" data-b="' + col.stage + '"></canvas></span>';
      h += '<div class="col-meta">';
      h += '<div class="col-name"><span class="nm">' + f.stages[col.stage] + '</span>' +
        '<span class="stg">' + D.STAGE_LABEL[col.stage] + '</span></div>';
      h += '<div class="col-tags">' +
        '<span class="tag t-' + f.dmg + '">' + ico(global.ICON.TYPE_ICON[f.dmg], { size: 11 }) + D.TYPES[f.dmg].name + '</span>' +
        '<span class="tag">' + ico(global.ICON.ROLE_ICON[f.role], { size: 11 }) + D.ROLES[f.role].short + '</span>' +
        (col.gene ? '<span class="tag">GENE ' + roman(col.gene) + '</span>' : '') + '</div>';
      h += '<div class="col-nums">' +
        '<div><span>Atk</span><b>' + fmt(st.atk) + '</b></div>' +
        '<div><span>Hp</span><b>' + fmt(st.hp) + '</b></div>' +
        '<div><span>Pop</span><b>' + fmt(col.pop) + '</b></div>' +
        (isProd ? '<div><span>Yield</span><b>' + fmt(st.prod) + '</b></div>'
          : '<div><span>Food</span><b>' + fmt(st.food) + '</b></div>') +
        '</div>';
      h += '</div></div>';

      h += '<div class="col-actions">';
      h += '<button class="btn act-pop' + (afford('bio', pc) && !capFull ? ' afford' : '') + '" data-i="' + i + '" data-veil="breed"' +
        (capFull ? ' disabled' : '') + '>Breed ×' + fmt(pn) + cost('bio', pc) + '</button>';
      h += '<button class="btn act-gene' + (afford('ess', gc) ? ' afford' : '') + '" data-i="' + i + '" data-veil="gene">Gene ×' + fmt(gn) + cost('ess', gc) + '</button>';
      if (col.stage < 4) {
        h += '<button class="btn act-evo' + (canEvo && afford('ess', ec) ? ' btn-primary' : '') + '" data-i="' + i + '" data-veil="evolve"' +
          (canEvo ? '' : ' disabled') + ' data-tip="' +
          (canEvo ? 'Become <b>' + f.stages[col.stage + 1] + '</b> — ×' + fmt(C.stageMult[col.stage + 1] / C.stageMult[col.stage]) + ' combat power'
            : (col.stage >= 3 ? 'Mythic evolution requires a Primordial Rebirth' : 'Requires best raid ' + D.STAGE_GATE[col.stage + 1])) +
          '">Evolve' + cost('ess', ec) + '</button>';
      } else {
        h += '<button class="btn" disabled>Mythic<small class="mythic">MAX</small></button>';
      }
      if (G.stats.bestWave >= 20) {
        h += '<button class="icobtn act-auto' + (col.auto ? ' on' : '') + '" data-i="' + i + '" data-tip="' +
          '<b class=\'tth\'>Auto-breed</b>Keep breeding this colony whenever biomass and capacity allow, ' +
          'so you can stop clicking and think about the pyramid instead.">' + ico('fecundity', { size: 12 }) + '</button>';
      }
      h += '<button class="icobtn act-cull" data-i="' + i + '" data-tip="Remove this colony. Nothing is refunded — this is for reshaping the pyramid.">' +
        ico('close', { size: 12 }) + '</button>';
      h += '</div></div>';
    });

    if (G.mult.slots - G.colonies.length > 0) {
      const free = G.mult.slots - G.colonies.length;
      h += '<button class="emptyslot" id="btnFound" data-veil="found"><b>Found a colony</b>' +
        free + ' empty chamber' + (free > 1 ? 's' : '') + '</button>';
    }
    if (pickerOpen) h += renderPicker();

    pane.innerHTML = h;
    paint(pane);
  }

  function renderPicker() {
    let h = '<div class="picker"><div class="card-h"><h3>Choose a species</h3>' +
      '<button class="btn btn-xs" id="btnPickClose">Close</button></div><div class="pickgrid">';
    for (const f of D.FAMS) {
      const un = famUnlocked(f);
      const c = S.foundCost(f);
      const can = un && afford('bio', c);
      h += '<button class="pick' + (can ? '' : ' disabled') + '" data-fam="' + f.id + '"' +
        (un ? ' data-tip="<b class=\'tth\'>' + f.name + '</b>' + D.ROLES[f.role].name + ' · ' + D.TYPES[f.dmg].name +
          '<br><br>' + f.blurb + '<br><br><b>' + D.PASSIVES[f.passive].name + '</b> — ' +
          D.PASSIVES[f.passive].desc.replace('{v}', f.passiveVal) + '"' : '') + '>';
      h += '<canvas data-k="monster" data-a="' + f.id + '" data-b="0"></canvas>';
      h += '<div class="pn">' + (un ? f.stages[0] : '???') + '</div>';
      h += un ? '<div class="pc">' + ico('biomass', { size: 9, w: 2 }) + fmt(c) + '</div>'
        : '<div class="plock">' + ico('lock', { size: 9, w: 2 }) + 'Raid ' + f.unlockWave + '</div>';
      h += '</button>';
    }
    return h + '</div></div>';
  }

  /* ================= EVOLVE ================= */
  function renderEvolve() {
    const pane = $('#pane-evolve');
    let h = '<div class="sec-h"><h4>Evolution Chains</h4><span class="sub">' +
      Object.keys(G.discovered.stage).length + ' / ' + (D.FAMS.length * 5) + ' forms</span></div>';

    const owned = {};
    G.colonies.forEach((c, i) => { if (!owned[c.fam] || owned[c.fam].col.stage < c.stage) owned[c.fam] = { col: c, i }; });
    const fams = D.FAMS.filter(f => famUnlocked(f));
    if (!fams.length) h += '<div class="emptyslot" style="cursor:default">Nothing has evolved yet.</div>';

    for (const f of fams) {
      const o = owned[f.id];
      h += '<div class="evo-fam"><div class="evo-h">' +
        '<span class="tag t-' + f.dmg + '">' + ico(global.ICON.TYPE_ICON[f.dmg], { size: 12 }) + '</span>' +
        '<span class="nm">' + f.name + '</span>' +
        '<span class="tag">' + ico(global.ICON.ROLE_ICON[f.role], { size: 11 }) + D.ROLES[f.role].short + '</span></div>';
      h += '<div class="evo-chain">';
      for (let s = 0; s < 5; s++) {
        const cur = o ? o.col.stage : -1;
        const cls = s <= cur ? 'owned' : (s === cur + 1 ? 'next' : 'future');
        h += '<div class="evo-node ' + cls + '" data-tip="<b class=\'tth\'>' + f.stages[s] + '</b>' +
          'Stage ' + (s + 1) + ' · ×' + fmt(C.stageMult[s]) + ' combat power' +
          (s > 0 ? '<br>Unlocks at best raid ' + D.STAGE_GATE[s] : '') +
          (s === 4 ? '<br><b>Requires Primordial Rebirth</b>' : '') + '">' +
          '<canvas data-k="monster" data-a="' + f.id + '" data-b="' + s + '"></canvas>' +
          '<div class="en' + (s === 4 ? ' mythic' : '') + '">' + f.stages[s] + '</div></div>';
      }
      h += '</div>';
      if (o) {
        const col = o.col, ec = S.evoCost(col);
        const canEvo = col.stage < 4 && G.stats.bestWave >= D.STAGE_GATE[col.stage + 1] && (col.stage < 3 || G.stats.rebirths > 0);
        h += '<div class="evo-foot">' + (col.stage < 4
          ? '<button class="btn act-evo' + (canEvo && afford('ess', ec) ? ' btn-primary' : '') + '" data-i="' + o.i + '"' +
          (canEvo ? '' : ' disabled') + '>Evolve → ' + f.stages[col.stage + 1] + cost('ess', ec) + '</button>'
          : '<button class="btn" disabled>Fully evolved</button>') + '</div>';
      }
      h += '<div class="evo-pass">' + ico('spark', { size: 12 }) +
        '<span><b>' + D.PASSIVES[f.passive].name + '</b> — ' +
        D.PASSIVES[f.passive].desc.replace('{v}', f.passiveVal) + '</span></div>';
      h += '</div>';
    }
    pane.innerHTML = h;
    paint(pane);
  }

  /* ================= DUNGEON ================= */
  function renderDungeon() {
    const pane = $('#pane-dungeon');
    let h = '<div class="sec-h"><h4>Dungeon Rooms</h4><span class="sub">carve · trap · fortify</span></div>';
    for (const r of D.ROOMS) {
      const lvl = S.roomLvl(r.id);
      if (G.stats.bestWave < r.unlock && lvl === 0) continue;
      const maxed = lvl >= r.max;
      const c = S.roomCost(r, lvl);
      const can = !maxed && afford(r.cur, c);
      h += '<div class="urow' + (maxed ? ' maxed' : '') + '">' +
        '<span class="uico">' + ico(ROOM_ICON[r.id] || 'dungeon', { size: 19 }) + '</span>' +
        '<div class="ubody"><div class="un">' + r.name + ' <i>' + lvl + '/' + r.max + '</i></div>' +
        '<div class="ud">' + r.desc + '</div>' +
        '<div class="ueff">' + (lvl > 0 ? r.eff(lvl) : '—') +
        (maxed ? '' : '<span class="arrow">→</span>' + r.eff(lvl + 1)) + '</div></div>' +
        (maxed ? '<button class="btn" disabled>Max</button>'
          : '<button class="btn act-room' + (can ? ' afford' : '') + '" data-r="' + r.id + '">Build' + cost(r.cur, c) + '</button>') +
        '</div>';
    }
    const hidden = D.ROOMS.filter(r => G.stats.bestWave < r.unlock && !S.roomLvl(r.id));
    if (hidden.length) {
      h += '<div class="emptyslot" style="cursor:default">' + hidden.length + ' more room' + (hidden.length > 1 ? 's' : '') +
        ' waits deeper down · next at raid ' + Math.min(...hidden.map(r => r.unlock)) + '</div>';
    }
    pane.innerHTML = h;
    paint(pane);
  }

  /* ================= GENOME ================= */
  function renderGenome() {
    const pane = $('#pane-genome');
    const gain = S.dnaGain();
    let h = '<div class="genome-head"><h4>' + ico('genome', { size: 15 }) + 'Collapse the Dungeon</h4>' +
      '<p>Everything above dies. What you <em>are</em> survives.<br>Colonies, rooms, biomass and depth reset. Genome, mutations, codex and achievements do not.</p>' +
      '<div class="mstat"><span>Deepest raid this cycle</span><b>' + (G.stats.bestWaveRun || 0) + '</b></div>' +
      '<div class="mstat"><span>Genome on collapse</span><b class="cost-dna">' + fmt(gain) + '</b></div>' +
      '<div class="mstat"><span>Next point at raid</span><b>' + nextDnaWave() + '</b></div>' +
      '<button class="btn btn-lg ' + (gain >= 1 ? 'btn-primary' : '') + '" id="btnCollapse" style="margin-top:14px;width:100%"' +
      (gain >= 1 ? '' : ' disabled') + '>' +
      (gain >= 1 ? 'Collapse · gain ' + fmt(gain) : 'Reach raid ' + C.dnaMinWave + ' to collapse') + '</button>';
    if (G.stats.bestWave >= C.cellStart) {
      const cg = S.cellGain();
      h += '<button class="btn btn-lg" id="btnRebirth" style="margin-top:8px;width:100%;border-color:rgba(111,216,239,.4);color:var(--cell)"' +
        (S.canRebirth() ? '' : ' disabled') + '>Primordial Rebirth · ' + fmt(cg) + ' cell' + (cg === 1 ? '' : 's') + '</button>' +
        '<p style="margin:10px 0 0">Rebirth resets the run but <b>keeps</b> your genome — and unlocks <b>Mythic</b> evolution, permanently.</p>';
    }
    h += '</div>';

    h += '<div class="segmented">' + [1, 10, 'max'].map(a =>
      '<button class="btn buyamt' + (buyAmt === a ? ' on' : '') + '" data-amt="' + a + '">' +
      (a === 'max' ? 'Max' : '×' + a) + '</button>').join('') + '</div>';

    for (const br of D.MUT_BRANCHES) {
      const nodes = D.MUTATIONS.filter(m => m.b === br.id);
      const spent = nodes.reduce((a, m) => a + S.mutLvl(m.id), 0);
      const total = nodes.reduce((a, m) => a + m.max, 0);
      h += '<div class="gbranch"><div class="gbranch-h"><span class="l" style="color:' + br.color + '">' +
        ico(global.ICON.BRANCH_ICON[br.id], { size: 13 }) + br.name + '</span>' +
        '<span class="n">' + spent + '/' + total + '</span></div><div class="gnodes">';
      for (const m of nodes) {
        const lvl = S.mutLvl(m.id);
        const maxed = lvl >= m.max;
        const n = maxed ? 0 : Math.max(1, Math.min(m.max - lvl, buyAmt === 'max' ? S.mutMaxBuy(m) : buyAmt));
        const c = maxed ? 0 : S.mutCost(m, lvl, n);
        const can = !maxed && G.res.dna >= c;
        const val = m.f(maxed ? lvl : lvl + n);
        const fv = v => (typeof v === 'number' && v < 10 && v % 1 !== 0) ? v.toFixed(2) : fmt(v);
        h += '<button class="gnode' + (maxed ? ' max' : lvl > 0 ? ' owned' : '') + (can || maxed ? '' : ' locked') +
          '" data-m="' + m.id + '" data-tip="<b class=\'tth\'>' + m.name + '</b>' + m.desc.replace('{v}', fv(val)) +
          '<br><br>Level ' + lvl + ' / ' + m.max + (maxed ? '' : '<br>Buy ' + n + ' for ' + fmt(c) + ' genome') + '">' +
          ico(MUT_ICON[m.id] || 'spark', { size: 17 }) +
          '<div class="gn">' + m.name + '</div>' +
          '<div class="gl">' + (maxed ? 'MAX' : lvl + ' · ' + fmt(c)) + '</div></button>';
      }
      h += '</div></div>';
    }
    pane.innerHTML = h;
    paint(pane);
  }
  function nextDnaWave() {
    const cur = S.dnaGain(), sov = S.mutVal('sovereign'), den = D.rewardUnit(C.dnaMinWave);
    for (let w = Math.max(C.dnaMinWave, G.stats.bestWaveRun || 0) + 1; w < 6000; w++) {
      if (Math.floor(C.dnaBase * Math.pow(D.rewardUnit(w) / den, C.dnaPow) * sov) > cur) return w;
    }
    return '—';
  }

  /* ================= CODEX ================= */
  function renderCodex() {
    const pane = $('#pane-codex');
    let h = '';
    const totalForms = D.FAMS.length * 5;
    let found = 0;
    D.FAMS.forEach(f => { for (let s = 0; s < 5; s++) if (G.discovered.stage[f.id + ':' + s]) found++; });

    h += '<div class="sec-h"><h4>Bestiary</h4><span class="sub">' + found + ' / ' + totalForms + '</span></div><div class="codex-grid">';
    for (const f of D.FAMS) for (let s = 0; s < 5; s++) {
      const disc = !!G.discovered.stage[f.id + ':' + s];
      h += '<div class="cx' + (disc ? '' : ' undiscovered') + '" data-tip="' +
        (disc ? '<b class=\'tth\'>' + f.stages[s] + '</b>' + f.name + ' · ' + D.ROLES[f.role].name + ' · ' + D.TYPES[f.dmg].name + '<br><br>' + f.blurb
          : 'Undiscovered — evolve a ' + f.name + ' to stage ' + (s + 1)) + '">' +
        '<canvas data-k="monster" data-a="' + f.id + '" data-b="' + s + '"></canvas>' +
        '<div class="cn">' + (disc ? f.stages[s] : '???') + '</div></div>';
    }
    h += '</div>';

    h += '<div class="sec-h" style="margin-top:18px"><h4>Heroes Encountered</h4><span class="sub">' +
      Object.keys(G.discovered.hero).length + ' / ' + D.HEROES.length + '</span></div><div class="codex-grid">';
    for (const hero of D.HEROES) {
      const disc = !!G.discovered.hero[hero.id];
      h += '<div class="cx' + (disc ? '' : ' undiscovered') + '"' +
        (disc ? ' data-tip="<b class=\'tth\'>' + hero.name + '</b>Tier ' + hero.tier + ' · ' + D.TYPES[hero.dmg].name +
          (hero.ability ? '<br><br><b>' + D.HERO_ABILITIES[hero.ability].name + '</b> — ' + D.HERO_ABILITIES[hero.ability].desc : '') +
          (Object.keys(hero.res).length ? '<br><br>Resists ' + Object.keys(hero.res).map(k => D.TYPES[k].name + ' ' + pct(hero.res[k])).join(', ') : '') + '"' : '') + '>' +
        '<canvas data-k="hero" data-a="' + hero.shape + '" data-b="' + hero.color + '"></canvas>' +
        '<div class="cn">' + (disc ? hero.name : '???') + '</div></div>';
    }
    h += '</div>';

    h += '<div class="sec-h" style="margin-top:18px"><h4>Legends</h4><span class="sub">' +
      Object.keys(G.discovered.legend).length + ' / ' + D.LEGENDS.length + '</span></div><div class="codex-grid">';
    for (const L of D.LEGENDS) {
      const n = G.discovered.legend[L.name] || 0;
      h += '<div class="cx' + (n ? '' : ' undiscovered') + '"' +
        (n ? ' data-tip="<b class=\'tth\'>' + L.name + '</b>Slain ' + n + ' time' + (n > 1 ? 's' : '') +
          '<br><br>Each death makes them stronger and gives them a ward against whatever killed them."' : '') + '>' +
        '<canvas data-k="hero" data-a="' + L.shape + '" data-b="' + L.color + '"></canvas>' +
        '<div class="cn">' + (n ? L.name : '???') + (n ? ' ×' + n : '') + '</div></div>';
    }
    h += '</div>';

    const done = D.ACHIEVEMENTS.filter(a => G.ach[a.id]).length;
    h += '<div class="sec-h" style="margin-top:18px"><h4>Achievements</h4><span class="sub">' +
      done + ' / ' + D.ACHIEVEMENTS.length + ' · ×' + fmt(S.achMult()) + '</span></div>';
    for (const a of D.ACHIEVEMENTS) {
      const got = !!G.ach[a.id];
      h += '<div class="ach' + (got ? ' done' : '') + '"><span class="ai">' +
        ico(got ? achIcon(a.id) : 'lock', { size: 15 }) + '</span>' +
        '<div class="ab"><div class="an">' + a.name + '</div><div class="ad">' + a.desc + '</div></div>' +
        '<div class="ar">' + a.rewTxt + '</div></div>';
    }
    pane.innerHTML = h;
    paint(pane);
  }

  /* ================= RIGHT COLUMN ================= */
  function renderEco() {
    const eco = G.eco;
    const pill = $('#stabPill');
    pill.textContent = pct(eco.stability) + ' stable';
    pill.className = 'pill' + (eco.stability < .4 ? ' bad' : eco.stability < .7 ? ' warn' : '');

    const pop = eco.pop || 1;
    let h = '';
    for (const r of ECO.ROLE_ORDER) {
      const role = D.ROLES[r];
      const actual = (eco.byRole ? eco.byRole[r] || 0 : 0) / pop;
      const ideal = ECO.IDEAL[r];
      const off = Math.abs(actual - ideal) > 0.09;
      h += '<div class="pyr-row' + (off ? ' ideal-off' : '') + '" data-tip="<b class=\'tth\'>' + role.name + '</b>' + role.desc +
        '<br><br>Ideal share ' + pct(ideal) + ' · yours ' + pct(actual) + '">' +
        '<span class="pl">' + ico(global.ICON.ROLE_ICON[r], { size: 11 }) + role.name + '</span>' +
        '<span class="pyr-bar"><i style="width:' + (actual * 100).toFixed(1) + '%;background:' + role.color + '"></i>' +
        '<u style="left:' + (ideal * 100).toFixed(1) + '%"></u></span>' +
        '<span class="pv">' + fmt(eco.byRole ? eco.byRole[r] || 0 : 0) + '</span></div>';
    }
    $('#pyramid').innerHTML = h;

    const starv = eco.starving > 0.02;
    $('#ecoStats').innerHTML =
      '<div data-tip="Food produced each second by producers and decomposers."><span>Supply</span><b style="color:var(--bio)">' + fmt(eco.supply) + '</b></div>' +
      '<div data-tip="Food required by consumers, predators and apex colonies."><span>Demand</span><b style="color:' + (starv ? 'var(--danger)' : 'var(--dim)') + '">' + fmt(eco.demand) + '</b></div>' +
      '<div data-tip="Multiplier applied to every colony, from pyramid shape, diversity and balance."><span>Eco</span><b style="color:var(--ess)">×' + fmt(eco.mult) + '</b></div>' +
      '<div><span>Families</span><b>' + (eco.families || 0) + '</b></div>' +
      '<div><span>Population</span><b>' + fmt(eco.pop) + '/' + fmt(G.mult.capacity) + '</b></div>' +
      '<div><span>Biomass/s</span><b style="color:var(--bio)">' + fmt(eco.bioRate) + '</b></div>';

    $('#ecoAdvice').innerHTML = ico(starv ? 'skull' : 'symbiosis', { size: 13 }) +
      '<span' + (starv ? ' style="color:var(--danger)"' : '') + '>' + ECO.advice() + '</span>';
  }

  function renderAdapt() {
    const loss = G.eco.adaptLoss || 0;
    const pill = $('#adaptPill');
    if (pill) {
      pill.textContent = '−' + pct(loss) + ' dmg';
      pill.className = 'pill' + (loss > .35 ? ' bad' : loss > .15 ? ' warn' : '');
      pill.dataset.tip = '<b class=\'tth\'>Damage absorbed</b>The share of your output currently soaked up by hero armour, ' +
        'given what your colonies actually deal.';
    }
    let h = '';
    for (const t of D.TYPE_LIST) {
      const v = G.adapt[t] || 0, share = G.dmgShare[t] || 0, T2 = D.TYPES[t];
      const isDoc = G.doctrine === t;
      h += '<div class="ad-row' + (isDoc ? ' doc' : '') + '" data-tip="<b class=\'tth\'>' + T2.name + '</b>' +
        'Heroes take <b>' + pct(v * C.adaptResist * G.mult.adaptBite) + ' less</b> ' + T2.name.toLowerCase() + ' damage.<br><br>' +
        'Your last raid was <b>' + pct(share) + '</b> ' + T2.name.toLowerCase() + ' — the white tick.<br><br>' +
        'They learn from <b>concentration</b>: this climbs fast when one type does everything and barely moves when six types share the work.' +
        (isDoc ? '<br><br><b>They are recruiting against this.</b> Heroes who natively resist ' + T2.name.toLowerCase() + ' now appear far more often.' : '') + '">' +
        '<span class="adn" style="color:' + T2.color + '">' + ico(global.ICON.TYPE_ICON[t], { size: 11 }) + T2.name.slice(0, 5) + '</span>' +
        '<span class="ad-bar"><i style="width:' + (v * 100).toFixed(0) + '%;background:' + T2.color + '"></i>' +
        '<u style="left:' + (share * 100).toFixed(0) + '%"></u></span>' +
        '<span class="adv">' + pct(v) + '</span></div>';
    }
    if (G.doctrine) {
      h += '<div class="ad-doctrine">' + ico('eye', { size: 12 }) +
        '<span>Doctrine: they are now sending <b>' + D.TYPES[G.doctrine].name.toLowerCase() +
        '-resistant</b> heroes.</span></div>';
    }
    $('#adaptBody').innerHTML = h;
  }

  /* ================= ABILITIES ================= */
  function refreshAbilities() {
    let h = '';
    for (const a of D.ABILITIES) {
      const un = G.stats.bestWave >= a.unlock;
      const cd = G.abil[a.id] || 0, maxCd = a.cd * G.mult.abilityCd;
      h += '<button class="abil' + (un ? (cd > 0 ? ' cd' : ' ready') : ' lockedab') + '" data-ab="' + a.id + '"' +
        ' data-tip="<b class=\'tth\'>' + a.name + '</b>' + a.desc + '<br><br>Cooldown ' + Math.round(maxCd) + 's' +
        (un ? '' : '<br><b>Unlocks at raid ' + a.unlock + '</b>') + '">' +
        '<span class="akey">' + a.key + '</span>' + ico(un ? a.id : 'lock', { size: 19 }) +
        '<span class="aname">' + (un ? a.name : 'Raid ' + a.unlock) + '</span>' +
        '<span class="acd" style="width:' + (cd > 0 ? cd / maxCd * 100 : 0) + '%"></span></button>';
    }
    $('#abilities').innerHTML = h;
  }
  function tickAbilities() {
    $$('#abilities .abil').forEach(b => {
      const a = D.ABILITIES.find(x => x.id === b.dataset.ab);
      if (!a) return;
      const cd = G.abil[a.id] || 0, maxCd = a.cd * G.mult.abilityCd;
      const bar = b.querySelector('.acd');
      if (bar) bar.style.width = (cd > 0 ? cd / maxCd * 100 : 0) + '%';
      const un = G.stats.bestWave >= a.unlock;
      b.classList.toggle('ready', un && cd <= 0);
      b.classList.toggle('cd', un && cd > 0);
      b.classList.toggle('lockedab', !un);
    });
  }

  /* ================= RAID BAR ================= */
  function refreshRaidBtn() {
    const btn = $('#btnRaid');
    btn.textContent = G.autoRaid ? 'Auto · pause' : 'Open the gates';
    btn.classList.toggle('btn-primary', !G.autoRaid);
  }
  function tickRaidBar() {
    const B = global.CB.B, fill = $('#raidFill'), label = $('#raidLabel');
    if (B.phase === 'fight') {
      const alive = B.heroes.filter(h => h.alive).length;
      fill.style.width = ((1 - alive / Math.max(1, B.heroes.length)) * 100) + '%';
      fill.classList.toggle('danger', !G.colonies.some(c => c.alive));
      label.textContent = 'Raid ' + G.wave + ' — ' + alive + ' hero' + (alive === 1 ? '' : 'es') + ' left' +
        (B.core < B.coreMax ? '  ·  core ' + Math.max(0, B.core).toFixed(1) : '');
    } else {
      const g = Math.max(0, B.gap);
      fill.style.width = ((1 - g / Math.max(0.001, G.mult.raidGap)) * 100) + '%';
      fill.classList.remove('danger');
      label.textContent = G.autoRaid ? (g > 0.05 ? 'Next raid in ' + g.toFixed(1) + 's' : 'Listening for footsteps') : 'The gates are shut';
    }
  }
  function afterRaid() { markDirty(); updateDepthBar(); }

  /* ================= SPEED ================= */
  function speedOptions() {
    // pause and half-speed are never gated — they are how you cope with the
    // pace, not a reward. Faster than real time still has to be earned.
    const s = S.mutLvl('sing'), o = [1, 0.5, 0];
    if (s >= 1) o.splice(1, 0, 2);
    if (s >= 5) o.splice(1, 0, 3);
    return o;
  }
  const SPEED_LABEL = v => v === 0 ? 'II' : v === 0.5 ? '½×' : v + '×';
  function updateSpeedBtn() {
    const opts = speedOptions();
    if (opts.indexOf(G.settings.speed) === -1) G.settings.speed = 1;
    $('#speedLabel').textContent = SPEED_LABEL(G.settings.speed);
    $('#btnSpeed').classList.toggle('paused', G.settings.speed === 0);
    $('#btnSpeed').dataset.tip = '<b class=\'tth\'>Pace</b>' +
      opts.map(o => SPEED_LABEL(o)).join(' · ') + '<br><br>Pause and half speed are always available. ' +
      'Nothing in this game is lost by slowing down.';
  }

  /* ================= ACTIONS ================= */
  function doFound(famId) {
    const f = D.FAM_BY_ID[famId];
    if (!f || !famUnlocked(f)) return;
    if (G.colonies.length >= G.mult.slots) { toast('lock', 'No free chamber', 'Build a Spawning Pool for another slot.'); return; }
    const c = S.foundCost(f);
    if (!afford('bio', c)) { global.SFX.error(); return; }
    G.res.bio -= c;
    G.colonies.push(S.makeColony(famId, 0, 1, 0));
    G.discovered.fam[famId] = 1; G.discovered.stage[famId + ':0'] = 1;
    pickerOpen = false;
    global.SFX.buy();
    log('A <b>' + f.stages[0] + '</b> colony takes root.', 'g');
    markDirty();
  }
  function doPop(i) {
    const col = G.colonies[i]; if (!col) return;
    const real = Math.min(amtFor(col, 'pop'), G.mult.capacity - ECO.capacityUsed());
    if (real < 1) { toast('lock', 'At capacity', 'Build Warren Depths for more population.'); return; }
    const c = S.popCost(col, real);
    if (!afford('bio', c)) { global.SFX.error(); return; }
    G.res.bio -= c; col.pop += real;
    global.SFX.buy(); markDirty('colonies');
  }
  function doGene(i) {
    const col = G.colonies[i]; if (!col) return;
    const n = amtFor(col, 'gene'), c = S.geneCost(col, n);
    if (!afford('ess', c)) { global.SFX.error(); return; }
    G.res.ess -= c; col.gene += n;
    global.SFX.buy(); markDirty('colonies');
  }
  function doEvolve(i) {
    const col = G.colonies[i]; if (!col || col.stage >= 4) return;
    if (G.stats.bestWave < D.STAGE_GATE[col.stage + 1]) return;
    if (col.stage >= 3 && G.stats.rebirths < 1) return;
    const c = S.evoCost(col);
    if (!afford('ess', c)) { global.SFX.error(); return; }
    G.res.ess -= c; col.stage++;
    const f = D.FAM_BY_ID[col.fam];
    G.discovered.stage[col.fam + ':' + col.stage] = 1;
    G.stats.evolutions++;
    global.SFX.evolve();
    banner('EVOLUTION', f.stages[col.stage], f.colors[0]);
    toast('evolve', f.stages[col.stage], 'Combat power ×' + fmt(C.stageMult[col.stage] / C.stageMult[col.stage - 1]), 'unlock');
    log('Your <b>' + f.stages[col.stage - 1] + '</b> becomes a <b class="p">' + f.stages[col.stage] + '</b>.', 'p');
    if (global.FX) FX.wave(1, .5, f.colors[0]);
    shake(); markDirty();
  }
  function doCull(i) {
    const col = G.colonies[i]; if (!col) return;
    const f = D.FAM_BY_ID[col.fam];
    modal('<h2>Cull the ' + f.stages[col.stage] + '?</h2>' +
      '<p>The colony is destroyed. Population, gene levels and evolution are lost. Nothing is refunded — this is only for reshaping your pyramid.</p>' +
      '<div class="mrow"><button class="btn" id="mCullYes" style="border-color:rgba(255,106,106,.45);color:#ff9a9a">Cull it</button>' +
      '<button class="btn btn-primary" id="mCullNo">Keep it</button></div>');
    $('#mCullYes').onclick = () => { G.colonies.splice(i, 1); closeModal(); markDirty(); global.SFX.monsterDie(); };
    $('#mCullNo').onclick = closeModal;
  }
  function doRoom(id) {
    const r = D.ROOMS.find(x => x.id === id); if (!r) return;
    const lvl = S.roomLvl(id); if (lvl >= r.max) return;
    const c = S.roomCost(r, lvl);
    if (!afford(r.cur, c)) { global.SFX.error(); return; }
    G.res[r.cur] -= c; G.rooms[id] = lvl + 1;
    S.recalc(); global.SFX.buy();
    if (lvl === 0) log('Built the <b>' + r.name + '</b>.', 'y');
    markDirty('dungeon'); markDirty('colonies');
  }
  function doMut(id) {
    const m = D.MUT_BY_ID[id]; if (!m) return;
    const lvl = S.mutLvl(id); if (lvl >= m.max) return;
    const n = Math.max(1, Math.min(m.max - lvl, buyAmt === 'max' ? S.mutMaxBuy(m) : buyAmt));
    const c = S.mutCost(m, lvl, n);
    if (G.res.dna < c) { global.SFX.error(); return; }
    G.res.dna -= c; G.muts[id] = lvl + n; G.stats.mutLevels += n;
    S.recalc(); global.SFX.buy();
    if (id === 'sing') updateSpeedBtn();
    markDirty('genome'); markDirty('colonies');
  }

  /* ================= MODALS ================= */
  function modal(html) { $('#modalBody').innerHTML = html; paintIcons($('#modalBody')); $('#modalBg').classList.remove('hidden'); }
  function closeModal() { $('#modalBg').classList.add('hidden'); }

  function settingsModal() {
    const st = G.stats, pr = global.REVEAL.progress();
    modal('<h2>Settings</h2>' +
      '<h3>Display</h3><div class="mrow">' +
      '<button class="btn" id="tgNum">Damage numbers: ' + (G.settings.dmgNumbers ? 'on' : 'off') + '</button>' +
      '<button class="btn" id="tgSnd">Sound: ' + (G.settings.muted ? 'off' : 'on') + '</button>' +
      '<button class="btn" id="tgAmb">Ambience: ' + (G.settings.ambience === false ? 'off' : 'on') + '</button>' +
      '<button class="btn" id="tgFx">Effect sounds: ' + (G.settings.sfx === false ? 'off' : 'on') + '</button>' +
      '<button class="btn" id="tgAuto">Auto-raid: ' + (G.autoRaid ? 'on' : 'off') + '</button></div>' +
      '<h3>Statistics</h3>' +
      '<div class="mstat"><span>Time in the dark</span><b>' + time(st.playTime) + '</b></div>' +
      '<div class="mstat"><span>Mechanics discovered</span><b>' + pr.done + ' / ' + pr.total + '</b></div>' +
      '<div class="mstat"><span>Heroes killed</span><b>' + fmtInt(st.kills) + '</b></div>' +
      '<div class="mstat"><span>Legends killed</span><b>' + fmtInt(st.legendKills) + '</b></div>' +
      '<div class="mstat"><span>Raids won / lost</span><b>' + fmtInt(st.raidsWon) + ' / ' + fmtInt(st.raidsLost) + '</b></div>' +
      '<div class="mstat"><span>Best raid</span><b>' + st.bestWave + '</b></div>' +
      '<div class="mstat"><span>Evolutions</span><b>' + fmtInt(st.evolutions) + '</b></div>' +
      '<div class="mstat"><span>Collapses / rebirths</span><b>' + fmtInt(st.collapses) + ' / ' + fmtInt(st.rebirths) + '</b></div>' +
      '<div class="mstat"><span>Total biomass earned</span><b>' + fmt(st.totalBio) + '</b></div>' +
      '<div class="mstat"><span>Offline time banked</span><b>' + time(st.offlineTime) + '</b></div>' +
      '<div class="mstat"><span>Storage</span><b style="color:' + (global.Store.ephemeral ? 'var(--danger)' : 'var(--dim)') + '">' +
        (global.Store.ephemeral ? 'BLOCKED — not persisting' : 'browser local storage') + '</b></div>' +
      '<div class="mstat"><span>Version</span><b>' + global.ENV.version + '</b></div>' +
      '<h3>Save</h3><div class="mrow">' +
      '<button class="btn" id="btnSaveNow">Save now</button>' +
      '<button class="btn" id="btnExport">Export</button>' +
      '<button class="btn" id="btnImport">Import</button>' +
      '<button class="btn" id="btnWipe" style="border-color:rgba(255,106,106,.4);color:#ff9a9a">Erase everything</button></div>' +
      '<div id="saveArea"></div>' +
      '<p style="margin-top:16px;font-size:10.5px;color:var(--ghost)">Saves live in this browser only. Export before clearing site data.</p>' +
      '<p class="credit">Sporecrawl — made by ' +
      '<a href="' + GH_URL + '" target="_blank" rel="noopener noreferrer">Deepan</a></p>');

    $('#tgNum').onclick = e => { G.settings.dmgNumbers = !G.settings.dmgNumbers; e.target.textContent = 'Damage numbers: ' + (G.settings.dmgNumbers ? 'on' : 'off'); };
    $('#tgSnd').onclick = e => {
      G.settings.muted = !G.settings.muted; global.SFX.setMuted(G.settings.muted);
      e.target.textContent = 'Sound: ' + (G.settings.muted ? 'off' : 'on'); updateMuteBtn();
    };
    $('#tgAmb').onclick = e => {
      G.settings.ambience = G.settings.ambience === false;
      global.SFX.setAmbience(G.settings.ambience);
      e.target.textContent = 'Ambience: ' + (G.settings.ambience ? 'on' : 'off');
    };
    $('#tgFx').onclick = e => {
      G.settings.sfx = G.settings.sfx === false;
      global.SFX.setSfx(G.settings.sfx);
      e.target.textContent = 'Effect sounds: ' + (G.settings.sfx ? 'on' : 'off');
    };
    $('#tgAuto').onclick = e => { G.autoRaid = !G.autoRaid; e.target.textContent = 'Auto-raid: ' + (G.autoRaid ? 'on' : 'off'); refreshRaidBtn(); };
    $('#btnSaveNow').onclick = () => { S.save(); toast('check', 'Saved', 'Written to this browser.'); };
    $('#btnExport').onclick = () => {
      $('#saveArea').innerHTML = '<h3>Export</h3><textarea class="savebox" readonly>' + S.exportSave() + '</textarea>';
      $('#saveArea textarea').select();
    };
    $('#btnImport').onclick = () => {
      $('#saveArea').innerHTML = '<h3>Paste a save</h3><textarea class="savebox" id="impBox"></textarea>' +
        '<div class="mrow"><button class="btn btn-primary" id="impGo">Load it</button></div>';
      $('#impGo').onclick = () => S.importSave($('#impBox').value) ? location.reload() : toast('close', 'Bad save', 'That did not parse.');
    };
    $('#btnWipe').onclick = () => {
      modal('<h2>Erase everything?</h2><p>Every colony, mutation and memory. There is no undo.</p>' +
        '<div class="mrow"><button class="btn" id="wipeYes" style="border-color:rgba(255,106,106,.45);color:#ff9a9a">Erase</button>' +
        '<button class="btn btn-primary" id="wipeNo">Cancel</button></div>');
      $('#wipeYes').onclick = () => { S.wipe(); location.reload(); };
      $('#wipeNo').onclick = closeModal;
    };
  }

  function collapseModal() {
    const gain = S.dnaGain(); if (gain < 1) return;
    modal('<h2>Collapse the Dungeon</h2>' +
      '<p>The tunnels fold in. Everything you built is buried and digested. Your genome does not live in the tunnels.</p>' +
      '<h3>You lose</h3><ul><li>All colonies, population and gene levels</li><li>All dungeon rooms</li>' +
      '<li>Biomass, essence and plunder</li><li>Depth and raid progress</li></ul>' +
      '<h3>You keep</h3><ul><li>Genome and every mutation</li><li>Codex, achievements and their multipliers</li>' +
      '<li>Everything you have learned about them</li></ul>' +
      '<div class="mstat"><span>Genome gained</span><b class="cost-dna">' + fmt(gain) + '</b></div>' +
      '<div class="mrow"><button class="btn btn-primary" id="mColYes">Collapse it all</button>' +
      '<button class="btn" id="mColNo">Not yet</button></div>');
    $('#mColYes').onclick = () => { closeModal(); global.GAME.collapse(); };
    $('#mColNo').onclick = closeModal;
  }

  function rebirthModal() {
    const gain = S.cellGain(); if (gain < 1) return;
    modal('<h2>Primordial Rebirth</h2>' +
      '<p>You stop being a dungeon. For a moment you are the thing that dungeons are made of.</p>' +
      '<h3>You lose</h3><ul><li>Everything a Collapse takes</li><li>Nothing else — your genome and mutations survive</li></ul>' +
      '<h3>You gain</h3><ul><li><b>' + fmt(gain) + ' Primordial Cell' + (gain > 1 ? 's' : '') + '</b> — ×1.9 to everything, each, forever</li>' +
      '<li><b>Mythic</b> evolution unlocked for every species</li><li>+25% permanent multiplier per rebirth</li></ul>' +
      '<div class="mrow"><button class="btn btn-primary" id="mRbYes">Become primordial</button>' +
      '<button class="btn" id="mRbNo">Wait</button></div>');
    $('#mRbYes').onclick = () => { closeModal(); global.GAME.rebirth(); };
    $('#mRbNo').onclick = closeModal;
  }

  function helpModal() {
    const step = (n, t, b) => '<div class="step"><div class="sn">' + n + '</div><div class="sb"><h4>' + t + '</h4><p>' + b + '</p></div></div>';
    modal('<h2>How the dungeon works</h2>' +
      step(1, 'You are an ecosystem',
        'Every colony has a trophic role. Producers grow food, consumers eat it, predators eat them, decomposers turn corpses back into biomass. The closer your population matches a real pyramid, the higher your <em>stability</em> — and stability multiplies everything.') +
      step(2, 'Heroes adapt',
        'Heroes armour against whatever keeps killing them, and they learn from <em>concentration</em> — six damage types sharing the work teach them almost nothing, one type doing everything teaches them fast. Watch the “dmg absorbed” figure on the Adaptation panel. There is no button for this; the answer is what lives in your dungeon.') +
      step(3, 'Legends remember',
        'Every tenth raid brings a named Legend. Kill one and it comes back — stronger, titled, and warded specifically against whatever killed it last time.') +
      step(4, 'Three currencies',
        '<b class="cost-bio">Biomass</b> breeds population and grows rooms. <b class="cost-ess">Essence</b> buys gene levels and evolutions. <b class="cost-gold">Plunder</b> builds rooms and traps.') +
      step(5, 'Collapse',
        'When progress stalls, Collapse. You lose the dungeon, keep the genome, and come back faster and meaner.') +
      '<h3>Shortcuts</h3><p><b>1–6</b> abilities · <b>Space</b> toggle auto-raid · <b>S</b> save · <b>?</b> this screen</p>' +
      '<div class="mrow"><button class="btn btn-primary" id="mHelpOk">Back to it</button></div>');
    $('#mHelpOk').onclick = closeModal;
  }

  /* ================= TOOLTIPS ================= */
  /* Tooltips carry most of this game's explanation, so on touch devices they
     cannot be hover-only. There, a long-press opens the tip anchored to the
     element, and any tap closes it — without swallowing the tap that a button
     needs to actually fire. */
  function initTooltips() {
    const tip = $('#tooltip');
    let cur = null, pressTimer = 0, pressed = null, moved = false;

    const show = (t, x, y, anchored) => {
      cur = t;
      tip.innerHTML = t.dataset.tip;
      tip.classList.remove('hidden');
      anchored ? placeOn(t) : placeAt(x, y);
    };
    const hide = () => { cur = null; tip.classList.add('hidden'); };

    function placeAt(cx, cy) {
      const r = tip.getBoundingClientRect();
      let x = cx + 18, y = cy + 18;
      if (x + r.width > innerWidth - 8) x = cx - r.width - 14;
      if (y + r.height > innerHeight - 8) y = cy - r.height - 14;
      tip.style.left = Math.max(6, x) + 'px';
      tip.style.top = Math.max(6, y) + 'px';
    }
    function placeOn(el) {
      const b = el.getBoundingClientRect(), r = tip.getBoundingClientRect();
      let x = b.left + b.width / 2 - r.width / 2;
      let y = b.top - r.height - 10;
      if (y < 6) y = b.bottom + 10;
      tip.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + 'px';
      tip.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + 'px';
    }

    if (!global.ENV.touch) {
      document.addEventListener('mouseover', e => {
        const t = e.target.closest('[data-tip]'); if (!t) return;
        show(t, e.clientX, e.clientY, false);
      });
      document.addEventListener('mousemove', e => { if (cur) placeAt(e.clientX, e.clientY); });
      document.addEventListener('mouseout', e => {
        if (cur && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-tip]'))) hide();
      });
      return;
    }

    document.addEventListener('touchstart', e => {
      hide();
      const t = e.target.closest('[data-tip]');
      if (!t) return;
      pressed = t; moved = false;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        if (!moved && pressed) { show(pressed, 0, 0, true); pressed = null; }
      }, 380);
    }, { passive: true });

    document.addEventListener('touchmove', () => { moved = true; clearTimeout(pressTimer); }, { passive: true });
    document.addEventListener('touchend', () => { clearTimeout(pressTimer); pressed = null; }, { passive: true });
    document.addEventListener('touchcancel', () => { clearTimeout(pressTimer); pressed = null; hide(); }, { passive: true });
  }

  /* ================= TABS ================= */
  function setTab(name) {
    activeTab = name;
    $$('#tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    $$('.tabpane').forEach(p => p.classList.toggle('hidden', p.id !== 'pane-' + name));
    renderActive(true);
    if (name === 'evolve') $('#dotEvolve').classList.add('hidden');
    if (name === 'dungeon') $('#dotDungeon').classList.add('hidden');
  }
  function renderActive(force) {
    if (force) dirty[activeTab] = 1;
    if (!dirty[activeTab]) return;
    dirty[activeTab] = 0;
    ({ colonies: renderColonies, evolve: renderEvolve, dungeon: renderDungeon, genome: renderGenome, codex: renderCodex })[activeTab]();
  }
  function updateMuteBtn() {
    const b = $('#btnMute');
    b.innerHTML = ico(G.settings.muted ? 'mute' : 'sound', { size: 15 });
  }

  /* ================= EVENTS ================= */
  function initEvents() {
    $('#tabs').addEventListener('click', e => {
      const t = e.target.closest('.tab'); if (!t) return;
      global.SFX.click(); setTab(t.dataset.tab);
    });

    $('#leftPanel').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('buyamt')) { buyAmt = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt; markDirty(); renderActive(true); return; }
      if (b.id === 'btnFound') { pickerOpen = !pickerOpen; renderActive(true); return; }
      if (b.id === 'btnPickClose') { pickerOpen = false; renderActive(true); return; }
      if (b.classList.contains('pick')) { doFound(b.dataset.fam); renderActive(true); return; }
      if (b.classList.contains('act-pop')) { doPop(+b.dataset.i); renderActive(true); return; }
      if (b.classList.contains('act-gene')) { doGene(+b.dataset.i); renderActive(true); return; }
      if (b.classList.contains('act-evo')) { doEvolve(+b.dataset.i); renderActive(true); return; }
      if (b.classList.contains('act-auto')) {
        const col = G.colonies[+b.dataset.i];
        if (col) { col.auto = !col.auto; global.SFX.click(); renderActive(true); }
        return;
      }
      if (b.classList.contains('act-cull')) { doCull(+b.dataset.i); return; }
      if (b.classList.contains('act-room')) { doRoom(b.dataset.r); renderActive(true); return; }
      if (b.classList.contains('gnode')) { doMut(b.dataset.m); renderActive(true); return; }
      if (b.id === 'btnCollapse') { collapseModal(); return; }
      if (b.id === 'btnRebirth') { rebirthModal(); return; }
    });

    $('#abilities').addEventListener('click', e => {
      const b = e.target.closest('.abil'); if (!b) return;
      global.CB.useAbility(b.dataset.ab);
    });

    $('#btnRaid').addEventListener('click', () => {
      G.autoRaid = !G.autoRaid;
      if (G.autoRaid && global.CB.B.phase !== 'fight') global.CB.B.gap = 0.1;
      refreshRaidBtn();
    });

    $('#btnDepthUp').addEventListener('click', () => {
      const b = S.biome();
      if (G.depth < G.maxDepth || (G.bestInBiome[G.depth] || 0) >= b.waves) {
        G.depth = Math.min(D.BIOMES.length, G.depth + 1);
        G.maxDepth = Math.max(G.maxDepth, G.depth);
        G.wave = Math.min(G.bestInBiome[G.depth] || 1, S.biome().waves) || 1;
        global.CB.B.phase = 'idle'; global.CB.B.gap = 1;
        const nb = S.biome();
        banner(nb.name, nb.blurb, nb.glow);
        markDirty(); updateDepthBar();
      }
    });
    $('#btnDepthDown').addEventListener('click', () => {
      if (G.depth > 1) {
        G.depth--; G.wave = Math.min(G.bestInBiome[G.depth] || 1, S.biome().waves) || 1;
        global.CB.B.phase = 'idle'; global.CB.B.gap = 1;
        markDirty(); updateDepthBar();
      }
    });

    const fsBtn = $('#btnFull');
    if (global.FS.supported) {
      const syncFs = () => {
        fsBtn.innerHTML = ico(global.FS.active ? 'compress' : 'expand', { size: 15 });
        fsBtn.dataset.tip = global.FS.active ? 'Leave fullscreen' : 'Fullscreen';
      };
      fsBtn.addEventListener('click', () => { global.FS.toggle(); setTimeout(syncFs, 120); });
      document.addEventListener('fullscreenchange', syncFs);
      document.addEventListener('webkitfullscreenchange', syncFs);
      syncFs();
    } else fsBtn.classList.add('hidden');

    $('#btnSettings').addEventListener('click', settingsModal);
    $('#brandBtn').addEventListener('click', helpModal);
    $('#modalX').addEventListener('click', closeModal);
    $('#modalBg').addEventListener('click', e => { if (e.target.id === 'modalBg') closeModal(); });
    $('#btnMute').addEventListener('click', () => {
      G.settings.muted = !G.settings.muted;
      global.SFX.setMuted(G.settings.muted);
      updateMuteBtn();
    });
    $('#btnSpeed').addEventListener('click', () => {
      const opts = speedOptions();
      const i = opts.indexOf(G.settings.speed);
      G.settings.speed = opts[(i + 1) % opts.length];
      updateSpeedBtn();
    });

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const k = e.key;
      if (k >= '1' && k <= '6') { const a = D.ABILITIES[+k - 1]; if (a) global.CB.useAbility(a.id); }
      if (k === ' ') { e.preventDefault(); $('#btnRaid').click(); }
      if (k === 's' || k === 'S') { S.save(); toast('check', 'Saved', ''); }
      if (k === '?' || k === '/') helpModal();
      if (k === 'f' || k === 'F') global.FS.toggle();
      if (k === 'Escape') closeModal();
    });
  }

  /* ================= TICK ================= */
  let acc = 0;
  function tick(dt) {
    acc += dt;
    tickRaidBar(); tickAbilities();
    if (acc > 0.2) {
      acc = 0;
      updateRes(); renderEco(); renderAdapt(); renderActive(false);
      global.OBJ && global.OBJ.render();
    }
  }

  function init() {
    paintIcons(document);
    initEvents(); initTooltips();
    refreshAbilities(); refreshRaidBtn(); updateDepthBar(); updateRes();
    setTab('colonies');
    renderEco(); renderAdapt();
    if (G.settings.ambience === undefined) G.settings.ambience = true;
    if (G.settings.sfx === undefined) G.settings.sfx = true;
    global.SFX.setAmbience(G.settings.ambience);
    global.SFX.setSfx(G.settings.sfx);
    updateMuteBtn(); updateSpeedBtn();
  }

  global.UI = {
    init, tick, log, toast, banner, flashRes, shake, markDirty, renderActive,
    afterRaid, refreshAbilities, refreshRaidBtn, newDiscovery, modal, closeModal,
    helpModal, settingsModal, setTab, collapseModal, rebirthModal, updateDepthBar, paintIcons
  };
})(this);
