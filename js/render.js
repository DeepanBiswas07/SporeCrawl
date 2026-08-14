/* ============================================================
   render.js — battle stage, particles, damage numbers, biomes
   ============================================================ */
(function (global) {
  'use strict';
  const D = global.DATA, G = global.G, S = global.S, ECO = global.ECO;
  const { rgba, shade, clamp, lerp, rand } = global.U;

  let cv, ctx, W = 1200, H = 620, dpr = 1, T = 0;
  let shakeAmt = 0, breachT = 0;
  let post = null, off = null, aberr = 0, shock = 0;
  const parts = [];       // particles
  const nums = [];        // damage numbers
  const projs = [];       // projectiles
  const rings = [];       // expanding rings
  const waves = [];       // screen-wide sweeps
  const ambient = [];     // background motes

  /* -------------------- FX API (called by combat) -------------------- */
  const FX = {
    damage(x, y, amount, color, crit, onMonster) {
      if (!G.settings.dmgNumbers) return;
      // merge rapid hits on the same target into one growing number, otherwise
      // a fast dungeon just paints an unreadable wall of digits
      for (let i = nums.length - 1; i >= 0; i--) {
        const n = nums[i];
        if (n.label || n.crit !== !!crit) continue;
        if (n.t < 0.34 && Math.abs(n.x - x) < 0.035 && Math.abs(n.y - y) < 0.05 && n.color === color) {
          n.amount += amount; n.txt = U.fmt(n.amount); n.t = Math.max(0, n.t - 0.12);
          return;
        }
      }
      if (nums.length > 30) return;
      nums.push({
        x: x + rand(-.02, .02), y: y + rand(-.015, .015), vy: -0.14,
        life: crit ? 1.15 : 0.9, t: 0, amount, txt: U.fmt(amount), color, crit, onMonster
      });
    },
    text(x, y, txt, color) {
      if (nums.length > 50) return;
      nums.push({ x, y, vy: -0.12, life: 1, t: 0, txt, color, label: true });
    },
    projectile(x1, y1, x2, y2, color, type) {
      if (projs.length > 70) return;
      projs.push({ x1, y1, x2, y2, color, type, t: 0, dur: 0.16 + Math.random() * .05 });
    },
    death(x, y, color, big) {
      const n = big ? 34 : 14;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.28, sp = rand(.1, big ? .7 : .38);
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .1, life: rand(.5, 1.1), t: 0, r: rand(2, big ? 7 : 4.5), color });
      }
      if (rings.length < 10) rings.push({ x, y, r: 0, max: big ? .1 : .05, life: .45, t: 0, color });
      if (big) shakeAmt = Math.max(shakeAmt, 1);
    },
    ring(x, y, color) { if (rings.length < 12) rings.push({ x, y, r: 0, max: .045, life: .4, t: 0, color }); },
    wave(power, y, color) {
      if (waves.length > 2) waves.shift();
      waves.push({ t: 0, life: .5, color, power: power || .5, y: y || .5 });
      shakeAmt = Math.max(shakeAmt, power * .6);
    },
    shake(v) { shakeAmt = Math.max(shakeAmt, v); shock = Math.max(shock, Math.min(1, v)); aberr = Math.max(aberr, Math.min(1.4, v * 1.2)); },
    coreBreach() { breachT = 0.5; },
    burst(x, y, color, n) {
      for (let i = 0; i < (n || 10); i++) {
        const a = Math.random() * 6.28, sp = rand(.08, .3);
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .08, life: rand(.4, .9), t: 0, r: rand(1.5, 4), color });
      }
    }
  };
  global.FX = FX;

  /* -------------------- setup -------------------- */
  function init(canvas) {
    cv = canvas;
    // Try to own the visible canvas with WebGL and render the game to an
    // offscreen 2D buffer that we post-process. If WebGL2 is missing we just
    // draw straight to the screen exactly as before.
    post = global.GL && global.GL.supported ? global.GL.createPost(cv) : null;
    if (post) {
      off = document.createElement('canvas');
      ctx = off.getContext('2d', { alpha: false });
    } else {
      ctx = cv.getContext('2d');
    }
    resize();
    global.addEventListener('resize', resize);
    for (let i = 0; i < 46; i++) ambient.push({ x: Math.random(), y: Math.random(), r: rand(.6, 2.4), sp: rand(.004, .022), ph: Math.random() * 6.28 });
  }
  function resize() {
    if (!cv) return;
    dpr = Math.min(post ? 1.5 : 2, global.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    W = Math.max(300, r.width); H = Math.max(200, r.height);
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (post) { off.width = pw; off.height = ph; }
    else { cv.width = pw; cv.height = ph; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const px = x => x * W, py = y => y * H;

  /* -------------------- background -------------------- */
  function drawBackground() {
    const b = S.biome();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, b.sky[0]); g.addColorStop(1, b.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // deep glow behind the core
    const rg = ctx.createRadialGradient(px(.06), py(.6), 10, px(.06), py(.6), W * .42);
    rg.addColorStop(0, rgba(b.glow, .13)); rg.addColorStop(1, rgba(b.glow, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    // parallax cave walls (deterministic per biome)
    const rnd = U.seeded('biome' + G.depth);
    ctx.fillStyle = rgba(b.rock, .55);
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * W;
      const y = (0.04 + rnd() * 0.11) * H;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, H);
    const rnd2 = U.seeded('biomeB' + G.depth);
    for (let i = 0; i <= 16; i++) {
      const x = (i / 16) * W;
      const y = H - (0.03 + rnd2() * 0.09) * H;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

    // stalactites
    ctx.fillStyle = rgba(b.rock, .8);
    const rnd3 = U.seeded('stal' + G.depth);
    for (let i = 0; i < 14; i++) {
      const x = rnd3() * W, w = 8 + rnd3() * 22, h = 20 + rnd3() * 90;
      ctx.beginPath(); ctx.moveTo(x - w / 2, 0); ctx.lineTo(x + w / 2, 0); ctx.lineTo(x, h); ctx.closePath(); ctx.fill();
    }

    // floor line
    ctx.strokeStyle = rgba(b.glow, .12); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, py(.94)); ctx.lineTo(W, py(.94)); ctx.stroke();

    // ambient motes
    for (const a of ambient) {
      a.y -= a.sp * 0.01;
      if (a.y < -0.02) { a.y = 1.02; a.x = Math.random(); }
      const al = .12 + Math.sin(T * 2 + a.ph) * .1;
      ctx.fillStyle = rgba(b.glow, Math.max(0, al));
      ctx.beginPath(); ctx.arc(px(a.x + Math.sin(T * .4 + a.ph) * .01), py(a.y), a.r, 0, 6.28); ctx.fill();
    }
  }

  function drawCore() {
    const b = S.biome();
    const CB = global.CB.B;
    const x = px(.045), y = py(.62);
    const pulse = 1 + Math.sin(T * 2.2) * .07 + (breachT > 0 ? .25 : 0);
    const dying = CB.phase === 'fight' && !G.colonies.some(c => c.alive);
    const col = dying ? '#ff5f6d' : b.glow;
    // pillar
    ctx.fillStyle = rgba(b.rock, .9);
    ctx.fillRect(x - 26, py(.28), 52, py(.66));
    ctx.fillStyle = rgba('#000000', .3); ctx.fillRect(x + 10, py(.28), 16, py(.66));
    // heart
    const r = 30 * pulse;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.2);
    g.addColorStop(0, rgba(col, .95)); g.addColorStop(.35, rgba(col, .4)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, 6.28); ctx.fill();
    ctx.fillStyle = shade(col, .4);
    ctx.beginPath(); ctx.arc(x, y, r * .55, 0, 6.28); ctx.fill();
    // veins
    ctx.strokeStyle = rgba(col, .5); ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + T * .2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5);
      ctx.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5); ctx.stroke();
    }
    // core integrity pips
    if (CB.phase === 'fight') {
      const n = Math.ceil(CB.coreMax), cur = Math.max(0, CB.core);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i < cur ? rgba(col, .9) : 'rgba(255,255,255,.12)';
        ctx.beginPath(); ctx.arc(x - 20 + i * 11, py(.22), 3.5, 0, 6.28); ctx.fill();
      }
    }
  }

  function drawGate() {
    const b = S.biome();
    const x = px(.975);
    ctx.fillStyle = rgba('#000000', .55);
    ctx.beginPath();
    ctx.moveTo(x, py(.18)); ctx.lineTo(x, py(.95));
    ctx.lineTo(px(.925), py(.95)); ctx.lineTo(px(.925), py(.42));
    ctx.quadraticCurveTo(px(.95), py(.16), x, py(.18)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(b.glow, .18); ctx.lineWidth = 2; ctx.stroke();
    // torchlight from outside
    const g = ctx.createRadialGradient(px(1.0), py(.55), 8, px(1.0), py(.55), W * .3);
    g.addColorStop(0, 'rgba(255,190,110,.18)'); g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g; ctx.fillRect(px(.7), 0, W * .3, H);
  }

  /* -------------------- units -------------------- */
  function bar(x, y, w, h, frac, color, bg) {
    ctx.fillStyle = bg || 'rgba(0,0,0,.55)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(frac, 0, 1)), h - 2);
  }

  function drawColonies() {
    const CB = global.CB.B;
    const inFight = CB.phase === 'fight';
    const sz = Math.min(H * 0.20, W * 0.105);
    for (let i = 0; i < G.colonies.length; i++) {
      const c = G.colonies[i];
      const slot = global.CB.MSLOT[Math.min(i, global.CB.MSLOT.length - 1)];
      if (!inFight) { c.x = slot.x; c.y = slot.y; }
      const f = D.FAM_BY_ID[c.fam];
      const x = px(c.x), y = py(c.y);
      const dead = inFight && !c.alive;
      const opt = { alpha: dead ? 0.16 : 1 };
      if (c.hitT > 0) { opt.c1 = '#ffffff'; opt.c2 = '#ffb3b3'; }
      const bounce = inFight && c.alive ? Math.abs(Math.sin(T * 3 + i)) * 2 : 0;
      // scale with population (visual dopamine)
      const popScale = 1 + Math.min(0.55, Math.log10(Math.max(1, c.pop)) * 0.19);
      global.SPR.drawMonster(ctx, c.fam, c.stage, x, y - bounce, sz * popScale, T, opt);

      if (inFight) {
        const w = 46, bx = x - w / 2;
        if (!dead) {
          // health above the creature
          bar(bx, Math.max(4, y - sz * popScale * 0.98 - 12), w, 5, c.hp / c.maxHp, f.colors[0]);
        } else {
          ctx.fillStyle = 'rgba(255,106,106,.5)'; ctx.font = '600 9px system-ui'; ctx.textAlign = 'center';
          ctx.fillText('ROUTED', x, y + 24);
        }
      }
      // population badge
      if (!dead) {
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        const label = '×' + U.fmt(c.pop);
        ctx.font = '700 10px ui-monospace,monospace'; ctx.textAlign = 'center';
        const tw = ctx.measureText(label).width + 8;
        ctx.fillRect(x - tw / 2, y + 3, tw, 13);
        ctx.fillStyle = f.colors[0];
        ctx.fillText(label, x, y + 13);
        if (i >= G.mult.battleSlots) {
          ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.font = '600 9px system-ui';
          ctx.fillText('reserve', x, y + 26);
        }
      }
    }
  }

  function drawHeroes() {
    const CB = global.CB.B;
    if (CB.phase !== 'fight' && CB.phase !== 'won' && CB.phase !== 'lost') return;
    const sz = Math.min(H * 0.175, W * 0.095);
    for (const h of CB.heroes) {
      const x = px(h.x), y = py(h.y);
      if (!h.alive) {
        if (h.dieT < 0.65) {
          const a = 1 - h.dieT / 0.65;
          global.SPR.drawHero(ctx, h.shape, h.color, x, y + h.dieT * 24, sz * (1 - h.dieT * .3), T, { flip: true, alpha: a * .6, noShadow: true });
        }
        continue;
      }
      const opt = { flip: true };
      if (h.flash > 0) opt.color = '#ffffff';
      const s = sz * (h.legend ? 1.45 : 1);
      const bounce = Math.abs(Math.sin(T * 2.4 + h.slot)) * 1.6;
      global.SPR.drawHero(ctx, h.shape, h.flash > 0 ? '#ffffff' : h.color, x, y - bounce, s, T, opt);

      if (h.frozen > 0) {
        ctx.fillStyle = 'rgba(143,230,255,.35)';
        ctx.beginPath(); ctx.ellipse(x, y - s * .45, s * .34, s * .5, 0, 0, 6.28); ctx.fill();
      }
      if (h.shield > 0) {
        ctx.strokeStyle = 'rgba(159,216,255,.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y - s * .45, s * .38, s * .55, 0, 0, 6.28); ctx.stroke();
      }
      if (h.burn > 0) {
        for (let i = 0; i < 3; i++) {
          const a = T * 5 + i * 2;
          ctx.fillStyle = rgba('#ff8a4c', .5);
          ctx.beginPath(); ctx.arc(x + Math.sin(a) * s * .2, y - s * (.3 + ((T * .8 + i * .3) % 1) * .6), 2.4, 0, 6.28); ctx.fill();
        }
      }
      // health bar
      const w = h.legend ? 90 : 44, bx = x - w / 2, by = y - s * 1.02 - (h.legend ? 20 : 12);
      bar(bx, by, w, h.legend ? 7 : 5, h.hp / h.maxHp, h.legend ? '#ffcb61' : '#ff6d7d');
      if (h.legend) {
        ctx.fillStyle = '#ffcb61'; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(h.name, x, by - 6);
        if (h.grudge > 0) {
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '600 9px system-ui';
          ctx.fillText('grudge ×' + h.grudge + ' · ' + D.TYPES[h.legendType].name + ' ward', x, by - 18);
        }
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '600 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(h.cls.name, x, by - 4);
      }
    }
  }

  /* -------------------- fx layers -------------------- */
  function updateFX(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t > p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 0.55;
    }
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i]; n.t += dt;
      if (n.t > n.life) { nums.splice(i, 1); continue; }
      n.y += n.vy * dt; n.vy += dt * 0.18;
    }
    for (let i = projs.length - 1; i >= 0; i--) { projs[i].t += dt; if (projs[i].t > projs[i].dur) projs.splice(i, 1); }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > rings[i].life) rings.splice(i, 1); }
    for (let i = waves.length - 1; i >= 0; i--) { waves[i].t += dt; if (waves[i].t > waves[i].life) waves.splice(i, 1); }
    shakeAmt = Math.max(0, shakeAmt - dt * 3.5);
    breachT = Math.max(0, breachT - dt);
    aberr = Math.max(0, aberr - dt * 2.2);
    shock = Math.max(0, shock - dt * 1.6);
  }

  function drawFX() {
    // projectiles
    for (const p of projs) {
      const k = p.t / p.dur;
      const x = lerp(px(p.x1), px(p.x2), k), y = lerp(py(p.y1), py(p.y2), k) - Math.sin(k * Math.PI) * 18;
      ctx.save();
      if (p.type === 'hero') {
        ctx.strokeStyle = rgba(p.color, .8); ctx.lineWidth = 2;
        const px2 = lerp(px(p.x1), px(p.x2), Math.max(0, k - .12));
        const py2 = lerp(py(p.y1), py(p.y2), Math.max(0, k - .12)) - Math.sin(Math.max(0, k - .12) * Math.PI) * 18;
        ctx.beginPath(); ctx.moveTo(px2, py2); ctx.lineTo(x, y); ctx.stroke();
      } else {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, rgba(p.color, .95)); g.addColorStop(1, rgba(p.color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.28); ctx.fill();
        ctx.fillStyle = shade(p.color, .5); ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    }
    // particles
    for (const p of parts) {
      const a = 1 - p.t / p.life;
      ctx.fillStyle = rgba(p.color, a * .85);
      ctx.beginPath(); ctx.arc(px(p.x), py(p.y), p.r * a, 0, 6.28); ctx.fill();
    }
    // rings
    for (const r of rings) {
      const k = r.t / r.life;
      ctx.strokeStyle = rgba(r.color, (1 - k) * .6); ctx.lineWidth = 2.5 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(px(r.x), py(r.y), px(r.max) * k * 1.6, 0, 6.28); ctx.stroke();
    }
    // waves — a shockwave crossing the corridor, not a screen-filling fog
    for (const w of waves) {
      const k = w.t / w.life;
      ctx.strokeStyle = rgba(w.color, (1 - k) * .26); ctx.lineWidth = 5 * (1 - k) + 1;
      ctx.beginPath(); ctx.ellipse(px(.08), py(w.y), W * .95 * k, H * .62 * k, 0, 0, 6.28); ctx.stroke();
    }
    // damage numbers
    ctx.textAlign = 'center';
    for (const n of nums) {
      const a = clamp(1 - (n.t / n.life) * 1.1, 0, 1);
      const sc = n.crit ? 1.5 : 1;
      ctx.font = (n.crit ? '800 ' : '700 ') + (n.label ? 11 : 13 * sc) + 'px ui-monospace,monospace';
      ctx.fillStyle = 'rgba(0,0,0,' + (a * .55) + ')';
      ctx.fillText(n.txt, px(n.x) + 1, py(n.y) + 1);
      ctx.fillStyle = rgba(n.color, a);
      ctx.fillText(n.txt, px(n.x), py(n.y));
    }
    // breach flash
    if (breachT > 0) {
      ctx.fillStyle = rgba('#ff5f6d', breachT * .3);
      ctx.fillRect(0, 0, W, H);
    }
    // buff vignette
    if (G.buffs.frenzy > 0 || G.buffs.apocalypse > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9);
      g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(1, 'rgba(255,40,60,.18)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (G.buffs.surge > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .9);
      g.addColorStop(0, 'rgba(92,232,154,0)'); g.addColorStop(1, 'rgba(92,232,154,.16)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }

  function drawHUD() {
    const CB = global.CB.B;
    ctx.textAlign = 'left';
    ctx.font = '700 11px ui-monospace,monospace';
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.fillText('DPS ' + U.fmt(ECO.dungeonDPS()), 12, 18);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillText('POP ' + U.fmt(G.eco.pop) + ' / ' + U.fmt(G.mult.capacity), 12, 32);
    if (CB.phase === 'fight') {
      const alive = CB.heroes.filter(h => h.alive).length;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,.32)';
      ctx.fillText(alive + ' / ' + CB.heroes.length + ' heroes', W - 12, 20);
    }
    // active buffs
    let bx = 12, by = H - 14;
    ctx.textAlign = 'left'; ctx.font = '700 10px system-ui';
    for (const k in G.buffs) {
      if (G.buffs[k] > 0) {
        const label = k.toUpperCase() + ' ' + G.buffs[k].toFixed(1) + 's';
        ctx.fillStyle = 'rgba(92,232,154,.75)';
        ctx.fillText(label, bx, by); bx += ctx.measureText(label).width + 14;
      }
    }
  }

  /* -------------------- main frame -------------------- */
  function frame(dt) {
    if (!ctx) return;
    T += dt;
    updateFX(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shakeAmt > 0.01) {
      ctx.translate(rand(-1, 1) * shakeAmt * 7, rand(-1, 1) * shakeAmt * 7);
    }
    ctx.clearRect(-20, -20, W + 40, H + 40);
    drawBackground();
    drawGate();
    drawCore();
    drawColonies();
    drawHeroes();
    drawFX();
    drawHUD();

    // real post-processing: bright pass -> blur -> additive composite,
    // with chromatic aberration and a ripple on heavy impacts
    if (post) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      post.draw(off, {
        bloom: 0.92,
        threshold: 0.46,
        aberration: 0.35 + aberr,
        shock: shock,
        time: T
      });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /* -------------------- cold open --------------------
     A black room with something breathing in it: drifting spores, a
     slow pulse of light, and shapes that only half resolve.
  ---------------------------------------------------- */
  function bootAnim(canvas) {
    const c = canvas.getContext('2d');
    let t = 0, raf, w = 0, h = 0, dp = 1;
    const motes = [];
    const shapes = ['ooze', 'fungus', 'arach', 'chiro', 'shade', 'aber'];

    function size() {
      dp = Math.min(2, global.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      w = Math.max(320, r.width); h = Math.max(240, r.height);
      canvas.width = w * dp; canvas.height = h * dp;
      c.setTransform(dp, 0, 0, dp, 0, 0);
    }
    size();
    global.addEventListener('resize', size);
    for (let i = 0; i < 70; i++) {
      motes.push({ x: Math.random(), y: Math.random(), r: rand(.4, 1.9), sp: rand(.006, .03), ph: Math.random() * 6.28 });
    }

    function loop() {
      t += 0.016;
      c.clearRect(0, 0, w, h);

      // the pulse: something large and alive, just out of focus
      const pulse = .5 + Math.sin(t * .5) * .5;
      const cx = w * .5, cy = h * .56;
      const g = c.createRadialGradient(cx, cy, 4, cx, cy, Math.max(w, h) * (.30 + pulse * .07));
      g.addColorStop(0, 'rgba(92,232,154,' + (.09 + pulse * .05) + ')');
      g.addColorStop(.5, 'rgba(92,232,154,.022)');
      g.addColorStop(1, 'rgba(92,232,154,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);

      // half-resolved silhouettes creeping along the floor — atmosphere, not
      // illustration: blurred, desaturated, never fully in focus
      c.save();
      if ('filter' in c) c.filter = 'blur(3px) saturate(.35)';
      shapes.forEach((f, i) => {
        const off = (t * .022 + i / shapes.length) % 1;
        const x = -.12 * w + off * w * 1.24;
        const y = h * (.95 + Math.sin(i * 2.3) * .04);
        const s = h * (.10 + (i % 3) * .022);
        c.globalAlpha = (.03 + Math.sin(off * Math.PI) * .045);
        global.SPR.drawMonster(c, f, (i % 4), x, y, s, t + i * 3, { noShadow: true, flip: i % 2 === 0 });
      });
      c.restore();
      if ('filter' in c) c.filter = 'none';

      // spore drift
      for (const m of motes) {
        m.y -= m.sp * .012;
        if (m.y < -.03) { m.y = 1.03; m.x = Math.random(); }
        const a = .05 + Math.sin(t * 1.6 + m.ph) * .06;
        c.fillStyle = 'rgba(150,255,200,' + Math.max(0, a) + ')';
        c.beginPath();
        c.arc((m.x + Math.sin(t * .3 + m.ph) * .012) * w, m.y * h, m.r, 0, 6.28);
        c.fill();
      }

      // floor line
      c.strokeStyle = 'rgba(233,231,225,.05)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, h * .88); c.lineTo(w, h * .88); c.stroke();

      raf = requestAnimationFrame(loop);
    }
    loop();
    return () => { cancelAnimationFrame(raf); global.removeEventListener('resize', size); };
  }

  global.R = { init, frame, resize, FX, bootAnim, get T() { return T; } };
})(this);
