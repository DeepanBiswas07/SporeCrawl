/* ============================================================
   sprites.js — 100% procedural creature art (canvas 2D)
   Nothing is loaded from disk or network: every monster and hero
   is drawn from primitives, so there is no asset licence at all.
   ============================================================ */
(function (global) {
  'use strict';
  const { rgba, shade, seeded, clamp, lerp } = global.U;

  /* ---------- tiny drawing helpers ---------- */
  function blob(ctx, w, h, wob, t, seed) {
    const pts = 14;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = 1 + Math.sin(a * 3 + t * 2.2 + seed) * wob + Math.sin(a * 5 - t * 1.4) * wob * 0.5;
      const x = Math.cos(a) * w * r, y = Math.sin(a) * h * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function ell(ctx, x, y, w, h) { ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, 6.2832); ctx.closePath(); }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.closePath(); }
  function poly(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; circ(ctx, x, y, r); ctx.fill();
  }
  function eye(ctx, x, y, r, blink, col, pupil) {
    if (blink > 0.92) { ctx.strokeStyle = '#000'; ctx.lineWidth = r * .5; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke(); return; }
    ctx.fillStyle = col || '#fff'; circ(ctx, x, y, r); ctx.fill();
    ctx.fillStyle = pupil || '#0b0f0d'; circ(ctx, x + r * .18, y + r * .1, r * .48); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; circ(ctx, x - r * .3, y - r * .32, r * .2); ctx.fill();
  }
  function limb(ctx, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  /* ============================================================
     MONSTERS
     draw in local space: feet at y=0, height ~ -1..0, width -.6..6
     ============================================================ */
  const MSHAPE = {

    blob(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const squash = 1 + Math.sin(t * 2.4) * .06;
      ctx.save(); ctx.translate(0, -0.34);
      glow(ctx, 0, 0, .8, c1, .18 + st * .05);
      // body
      const g = ctx.createLinearGradient(0, -.4, 0, .4);
      g.addColorStop(0, shade(c1, .28)); g.addColorStop(.6, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.save(); ctx.scale(1 / squash, squash); blob(ctx, .42, .34, .07, t, rnd * 6); ctx.fill(); ctx.restore();
      // inner bubbles
      ctx.fillStyle = rgba(shade(c1, .5), .35);
      for (let i = 0; i < 2 + st; i++) {
        const a = t * .8 + i * 2.1;
        circ(ctx, Math.sin(a) * .18, Math.cos(a * 1.3) * .13, .045 + (i % 3) * .015); ctx.fill();
      }
      // highlight
      ctx.fillStyle = 'rgba(255,255,255,.30)';
      ell(ctx, -.14, -.17, .12, .07); ctx.fill();
      // eyes
      const bl = (Math.sin(t * 1.1 + rnd * 9) + 1) / 2;
      eye(ctx, -.12, -.02, .075, bl); eye(ctx, .13, -.02, .075, bl);
      if (st >= 1) { // drips
        ctx.fillStyle = rgba(c1, .8);
        for (let i = 0; i < 3; i++) { const dx = -.25 + i * .25; ell(ctx, dx, .3 + Math.sin(t * 2 + i) * .04, .035, .07); ctx.fill(); }
      }
      if (st >= 3) { // crown
        ctx.fillStyle = '#ffcb61';
        poly(ctx, [[-.22, -.34], [-.12, -.5], [-.02, -.36], [.08, -.52], [.18, -.36], [.22, -.34], [.22, -.28], [-.22, -.28]]); ctx.fill();
      }
      if (st >= 4) { glow(ctx, 0, 0, 1.15, '#8de84f', .3); }
      ctx.restore();
    },

    mushroom(ctx, p) {
      const { c1, c2, st, t } = p;
      const sway = Math.sin(t * 1.3) * .05;
      ctx.save(); ctx.rotate(sway * .3);
      // stalk
      ctx.fillStyle = '#e8dfc9';
      poly(ctx, [[-.10, 0], [.10, 0], [.075, -.42], [-.075, -.42]]); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.15)'; poly(ctx, [[.03, 0], [.10, 0], [.075, -.42], [.02, -.42]]); ctx.fill();
      // gills
      ctx.strokeStyle = rgba(c2, .8); ctx.lineWidth = .014;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * .045, -.42); ctx.lineTo(i * .06, -.5); ctx.stroke(); }
      // cap
      const caps = 1 + Math.min(3, st);
      for (let k = 0; k < caps; k++) {
        const off = k === 0 ? 0 : (k % 2 ? -1 : 1) * (.16 + k * .05);
        const cy = k === 0 ? -.52 : -.34 - k * .04, sc = k === 0 ? 1 : .5;
        const g = ctx.createLinearGradient(0, cy - .3 * sc, 0, cy + .1);
        g.addColorStop(0, shade(c1, .3)); g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(off, cy, .34 * sc, .26 * sc, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        for (let i = 0; i < 4; i++) {
          const a = -.4 - i * .55; circ(ctx, off + Math.cos(a) * .2 * sc, cy - Math.abs(Math.sin(a)) * .14 * sc, .032 * sc); ctx.fill();
        }
      }
      glow(ctx, 0, -.5, .55 + st * .1, c1, .16 + st * .04);
      // eyes on stalk
      const bl = (Math.sin(t * .9) + 1) / 2;
      eye(ctx, -.045, -.3, .034, bl); eye(ctx, .045, -.3, .034, bl);
      if (st >= 2) { // spores
        ctx.fillStyle = rgba(c1, .5);
        for (let i = 0; i < 6; i++) {
          const a = t * .5 + i; circ(ctx, Math.sin(a * 1.7) * .4, -.55 - ((t * .25 + i * .17) % 1) * .45, .018); ctx.fill();
        }
      }
      ctx.restore();
    },

    rodent(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const n = 1 + Math.min(4, st);
      for (let k = n - 1; k >= 0; k--) {
        const ox = k * -.16, oy = -k * .02, sc = 1 - k * .12, bob = Math.sin(t * 6 + k * 1.7) * .015;
        ctx.save(); ctx.translate(ox, oy + bob); ctx.scale(sc, sc); ctx.globalAlpha = k ? .75 : 1;
        // tail
        ctx.strokeStyle = shade(c2, .3); ctx.lineWidth = .03; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(.22, -.14);
        ctx.quadraticCurveTo(.45 + Math.sin(t * 5 + k) * .05, -.24, .38, -.36); ctx.stroke();
        // body
        ctx.fillStyle = c1; ell(ctx, 0, -.17, .26, .16); ctx.fill();
        ctx.fillStyle = rgba(shade(c1, -.25), .5); ell(ctx, .02, -.12, .2, .09); ctx.fill();
        // head
        ctx.fillStyle = shade(c1, .06); ell(ctx, -.24, -.22, .13, .11); ctx.fill();
        // ears
        ctx.fillStyle = shade(c2, .35); circ(ctx, -.26, -.32, .06); ctx.fill(); circ(ctx, -.16, -.31, .055); ctx.fill();
        ctx.fillStyle = rgba('#ff9ab5', .8); circ(ctx, -.26, -.32, .032); ctx.fill();
        // snout + eye
        ctx.fillStyle = '#ff9ab5'; circ(ctx, -.36, -.2, .022); ctx.fill();
        eye(ctx, -.29, -.235, .032, (Math.sin(t * 1.4 + rnd * 5 + k) + 1) / 2, '#fff', st >= 2 ? '#ff4646' : '#0b0f0d');
        // whiskers
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = .008;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-.35, -.2); ctx.lineTo(-.48, -.2 + i * .05); ctx.stroke(); }
        // feet
        limb(ctx, -.1, -.03, -.12, 0, .035, shade(c2, .2));
        limb(ctx, .1, -.03, .12, 0, .035, shade(c2, .2));
        ctx.restore();
      }
      if (st >= 3) { ctx.fillStyle = '#ffcb61'; poly(ctx, [[-.34, -.34], [-.29, -.44], [-.24, -.35], [-.19, -.45], [-.14, -.34]]); ctx.fill(); }
      if (st >= 2) glow(ctx, -.1, -.2, .55, c1, .16);
    },

    bat(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const flap = Math.sin(t * 7 + rnd * 3);
      ctx.save(); ctx.translate(0, -.5 + Math.sin(t * 2.3) * .05);
      glow(ctx, 0, 0, .7 + st * .12, c1, .18);
      // wings
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(s, 1);
        ctx.fillStyle = rgba(c2, .95);
        ctx.beginPath(); ctx.moveTo(.06, -.04);
        ctx.quadraticCurveTo(.34, -.28 - flap * .16, .62, -.1 - flap * .2);
        ctx.quadraticCurveTo(.46, .02 - flap * .06, .5, .14 - flap * .12);
        ctx.quadraticCurveTo(.34, .04 - flap * .04, .3, .16 - flap * .07);
        ctx.quadraticCurveTo(.18, .06, .06, .12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(shade(c1, .3), .5); ctx.lineWidth = .012;
        ctx.beginPath(); ctx.moveTo(.08, -.02); ctx.lineTo(.5, .12 - flap * .12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(.08, -.02); ctx.lineTo(.3, .15 - flap * .07); ctx.stroke();
        ctx.restore();
      }
      // body
      const g = ctx.createLinearGradient(0, -.2, 0, .18);
      g.addColorStop(0, shade(c1, .2)); g.addColorStop(1, c2);
      ctx.fillStyle = g; ell(ctx, 0, .02, .13, .19); ctx.fill();
      // head + ears
      ctx.fillStyle = shade(c1, .1); circ(ctx, 0, -.16, .12); ctx.fill();
      ctx.fillStyle = c2;
      poly(ctx, [[-.1, -.22], [-.14, -.4], [-.02, -.26]]); ctx.fill();
      poly(ctx, [[.1, -.22], [.14, -.4], [.02, -.26]]); ctx.fill();
      // eyes
      const ec = st >= 2 ? '#ff4646' : '#ffd166';
      circ(ctx, -.045, -.17, .028); ctx.fillStyle = ec; ctx.fill();
      circ(ctx, .045, -.17, .028); ctx.fill();
      glow(ctx, -.045, -.17, .07, ec, .8); glow(ctx, .045, -.17, .07, ec, .8);
      // fangs
      ctx.fillStyle = '#fff';
      poly(ctx, [[-.035, -.1], [-.015, -.1], [-.025, -.045]]); ctx.fill();
      poly(ctx, [[.035, -.1], [.015, -.1], [.025, -.045]]); ctx.fill();
      if (st >= 3) { ctx.fillStyle = rgba('#ff2d55', .6); ell(ctx, 0, .18, .3, .05); ctx.fill(); }
      ctx.restore();
    },

    skeleton(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const bob = Math.sin(t * 2.1 + rnd) * .015;
      ctx.save(); ctx.translate(0, bob);
      const bone = c1;
      // legs
      limb(ctx, -.07, -.02, -.08, -.28, .036, bone); limb(ctx, .07, -.02, .08, -.28, .036, bone);
      // spine + ribs
      limb(ctx, 0, -.28, 0, -.58, .04, bone);
      ctx.strokeStyle = bone; ctx.lineWidth = .026;
      for (let i = 0; i < 4; i++) {
        const y = -.34 - i * .06, w = .13 - i * .012;
        ctx.beginPath(); ctx.ellipse(0, y, w, .035, 0, Math.PI * .1, Math.PI * .9); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, y, w, .035, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      }
      // arms
      const sw = Math.sin(t * 2.4) * .05;
      limb(ctx, -.02, -.54, -.19, -.4 + sw, .032, bone);
      limb(ctx, .02, -.54, .19, -.4 - sw, .032, bone);
      // skull
      ctx.fillStyle = shade(bone, .1); circ(ctx, 0, -.66, .115); ctx.fill();
      poly(ctx, [[-.06, -.6], [.06, -.6], [.05, -.52], [-.05, -.52]]); ctx.fill();
      ctx.fillStyle = '#0b0f0d';
      ell(ctx, -.045, -.68, .033, .038); ctx.fill(); ell(ctx, .045, -.68, .033, .038); ctx.fill();
      const ec = st >= 2 ? '#b06cff' : '#5ce89a';
      glow(ctx, -.045, -.68, .06, ec, .9); glow(ctx, .045, -.68, .06, ec, .9);
      ctx.fillStyle = '#0b0f0d';
      for (let i = -2; i <= 2; i++) { ctx.fillRect(i * .022 - .008, -.575, .014, .03); }
      if (st >= 1) { // bow / weapon
        ctx.strokeStyle = shade(c2, .2); ctx.lineWidth = .022;
        ctx.beginPath(); ctx.arc(.24, -.42, .16, -1.2, 1.2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .008;
        ctx.beginPath(); ctx.moveTo(.3, -.57); ctx.lineTo(.3, -.27); ctx.stroke();
      }
      if (st >= 2) { // pauldrons
        ctx.fillStyle = shade(c2, -.1);
        ell(ctx, -.16, -.53, .08, .055); ctx.fill(); ell(ctx, .16, -.53, .08, .055); ctx.fill();
      }
      if (st >= 3) { // lich crown + robe glow
        ctx.fillStyle = '#b06cff';
        poly(ctx, [[-.12, -.75], [-.06, -.9], [0, -.77], [.06, -.9], [.12, -.75]]); ctx.fill();
        glow(ctx, 0, -.5, .8, '#b06cff', .28);
      }
      ctx.restore();
    },

    spider(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const bob = Math.sin(t * 3.1 + rnd) * .012;
      ctx.save(); ctx.translate(0, -.3 + bob);
      // legs
      ctx.strokeStyle = shade(c2, -.1); ctx.lineCap = 'round';
      for (let s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const ph = t * 4 + i * 1.1 + (s > 0 ? .6 : 0);
        const lift = Math.max(0, Math.sin(ph)) * .05;
        ctx.lineWidth = .026;
        const bx = s * .1, by = -.02 + i * .02;
        const mx = s * (.28 + i * .06), my = -.24 - i * .02 - lift;
        const ex = s * (.4 + i * .09), ey = .3 - i * .015 - lift * .5;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      }
      // abdomen
      const g = ctx.createRadialGradient(-.05, -.1, .02, 0, 0, .34);
      g.addColorStop(0, shade(c1, .3)); g.addColorStop(1, c2);
      ctx.fillStyle = g; ell(ctx, .1, -.02, .27, .23); ctx.fill();
      // marking
      ctx.fillStyle = st >= 2 ? '#ff3b5c' : rgba(shade(c1, .5), .7);
      poly(ctx, [[.14, -.12], [.2, -.02], [.14, .08], [.08, -.02]]); ctx.fill();
      // cephalothorax
      ctx.fillStyle = shade(c1, .05); ell(ctx, -.18, -.04, .16, .14); ctx.fill();
      // eyes
      const ec = st >= 3 ? '#ff3b5c' : '#ffe066';
      for (let i = 0; i < 4; i++) {
        const ex = -.26 + (i % 2) * .07, ey = -.11 + Math.floor(i / 2) * .07;
        ctx.fillStyle = ec; circ(ctx, ex, ey, .026); ctx.fill();
      }
      glow(ctx, -.23, -.07, .16, ec, .5);
      // fangs
      ctx.strokeStyle = '#eee'; ctx.lineWidth = .016;
      ctx.beginPath(); ctx.moveTo(-.3, .04); ctx.lineTo(-.35, .12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-.25, .06); ctx.lineTo(-.28, .14); ctx.stroke();
      if (st >= 1) { // web strands
        ctx.strokeStyle = rgba('#ffffff', .16); ctx.lineWidth = .008;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(.1, -.24); ctx.lineTo(-.5 + i * .5, -.75); ctx.stroke(); }
      }
      ctx.restore();
    },

    goblinoid(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const bob = Math.sin(t * 3.4 + rnd) * .018;
      ctx.save(); ctx.translate(0, bob);
      // legs
      limb(ctx, -.06, 0, -.07, -.2, .05, shade(c2, -.05));
      limb(ctx, .06, 0, .07, -.2, .05, shade(c2, -.05));
      // body
      ctx.fillStyle = c1; ell(ctx, 0, -.32, .16, .16); ctx.fill();
      // loincloth / armour
      ctx.fillStyle = st >= 1 ? shade(c2, -.2) : '#6b4a2a';
      poly(ctx, [[-.14, -.22], [.14, -.22], [.1, -.08], [-.1, -.08]]); ctx.fill();
      // arms
      const sw = Math.sin(t * 3.4) * .06;
      limb(ctx, -.13, -.36, -.26, -.24 + sw, .042, c1);
      limb(ctx, .13, -.36, .26, -.26 - sw, .042, c1);
      // head
      ctx.fillStyle = shade(c1, .08); circ(ctx, 0, -.56, .145); ctx.fill();
      // ears
      ctx.fillStyle = c1;
      poly(ctx, [[-.12, -.6], [-.34, -.68], [-.11, -.5]]); ctx.fill();
      poly(ctx, [[.12, -.6], [.34, -.68], [.11, -.5]]); ctx.fill();
      // face
      const bl = (Math.sin(t * 1.3 + rnd * 4) + 1) / 2;
      eye(ctx, -.05, -.58, .034, bl, '#ffe066', '#111');
      eye(ctx, .05, -.58, .034, bl, '#ffe066', '#111');
      ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = .014;
      ctx.beginPath(); ctx.arc(0, -.5, .05, .2, Math.PI - .2); ctx.stroke();
      ctx.fillStyle = '#fff'; poly(ctx, [[-.03, -.47], [-.005, -.47], [-.018, -.42]]); ctx.fill();
      // weapon
      const wcol = st >= 2 ? '#c0c8d0' : '#8b5a2b';
      ctx.save(); ctx.translate(.28, -.26 - sw); ctx.rotate(-.5 + sw);
      ctx.fillStyle = wcol; ctx.fillRect(-.02, -.3, .04, .34);
      if (st >= 2) { poly(ctx, [[-.02, -.3], [.12, -.26], [-.02, -.16]]); ctx.fill(); }
      else { ctx.fillStyle = '#6b4a2a'; circ(ctx, 0, -.32, .07); ctx.fill(); }
      ctx.restore();
      if (st >= 3) { // banner
        ctx.strokeStyle = '#5a3d1e'; ctx.lineWidth = .02;
        ctx.beginPath(); ctx.moveTo(-.3, -.15); ctx.lineTo(-.34, -.85); ctx.stroke();
        ctx.fillStyle = '#c0392b';
        poly(ctx, [[-.34, -.85], [-.05, -.78], [-.33, -.6]]); ctx.fill();
      }
      ctx.restore();
    },

    treant(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const sway = Math.sin(t * .9 + rnd) * .035;
      ctx.save(); ctx.rotate(sway * .15);
      // roots
      ctx.strokeStyle = '#4a3520'; ctx.lineWidth = .045; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { if (!i) continue; ctx.beginPath(); ctx.moveTo(0, -.06); ctx.lineTo(i * .13, .02); ctx.stroke(); }
      // trunk
      const g = ctx.createLinearGradient(-.14, 0, .16, 0);
      g.addColorStop(0, '#3c2a18'); g.addColorStop(.5, '#5c4227'); g.addColorStop(1, '#33240f');
      ctx.fillStyle = g;
      poly(ctx, [[-.14, 0], [.14, 0], [.1, -.5], [-.1, -.5]]); ctx.fill();
      // bark lines
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = .012;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * .06, -.05); ctx.quadraticCurveTo(i * .05 + .02, -.28, i * .05, -.48); ctx.stroke(); }
      // arms/branches
      const sw = Math.sin(t * 1.1) * .04;
      ctx.strokeStyle = '#5c4227'; ctx.lineWidth = .045;
      ctx.beginPath(); ctx.moveTo(-.08, -.4); ctx.quadraticCurveTo(-.3, -.5, -.36, -.66 + sw); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(.08, -.42); ctx.quadraticCurveTo(.3, -.52, .36, -.7 - sw); ctx.stroke();
      // canopy
      const leaves = 3 + Math.min(4, st);
      for (let i = 0; i < leaves; i++) {
        const a = (i / leaves) * Math.PI * 2 + t * .12;
        const cx = Math.cos(a) * .2, cy = -.62 + Math.sin(a) * .1;
        const gg = ctx.createRadialGradient(cx, cy - .05, .02, cx, cy, .26);
        gg.addColorStop(0, shade(c1, .25)); gg.addColorStop(1, c2);
        ctx.fillStyle = gg; circ(ctx, cx, cy, .2); ctx.fill();
      }
      // face
      const bl = (Math.sin(t * .7 + rnd * 3) + 1) / 2;
      eye(ctx, -.055, -.32, .036, bl, '#ffe9a8', '#2b1a08');
      eye(ctx, .055, -.32, .036, bl, '#ffe9a8', '#2b1a08');
      ctx.strokeStyle = '#2b1a08'; ctx.lineWidth = .016;
      ctx.beginPath(); ctx.arc(0, -.22, .055, .15, Math.PI - .15); ctx.stroke();
      if (st >= 2) { // thorns
        ctx.fillStyle = '#d9d3c4';
        for (let i = 0; i < 5; i++) { const y = -.1 - i * .09; poly(ctx, [[.1, y], [.22, y - .03], [.1, y - .06]]); ctx.fill(); }
      }
      if (st >= 3) glow(ctx, 0, -.6, .95, c1, .22);
      ctx.restore();
    },

    wisp(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const fl = 1 + Math.sin(t * 3.1 + rnd) * .08;
      ctx.save(); ctx.translate(Math.sin(t * .9 + rnd) * .04, -.52 + Math.sin(t * 1.7) * .05);
      glow(ctx, 0, 0, .8 * fl + st * .1, c1, .5);
      // trailing motes
      for (let i = 0; i < 6 + st * 2; i++) {
        const a = t * 1.6 + i * 1.05, r = .3 + Math.sin(t * 2 + i) * .1;
        ctx.fillStyle = rgba(c1, .5 - i * .04);
        circ(ctx, Math.cos(a) * r, Math.sin(a * 1.3) * r * .7, .022 + (i % 3) * .008); ctx.fill();
      }
      // core
      const g = ctx.createRadialGradient(0, 0, .01, 0, 0, .22 * fl);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.4, shade(c1, .4)); g.addColorStop(1, rgba(c2, .1));
      ctx.fillStyle = g; circ(ctx, 0, 0, .22 * fl); ctx.fill();
      // eyes in the light
      if (st >= 1) {
        ctx.fillStyle = rgba(c2, .9);
        ell(ctx, -.06, -.01, .022, .034); ctx.fill(); ell(ctx, .06, -.01, .022, .034); ctx.fill();
      }
      if (st >= 3) { // ring
        ctx.strokeStyle = rgba(c1, .5); ctx.lineWidth = .014;
        ctx.save(); ctx.rotate(t * .6); ctx.beginPath(); ctx.ellipse(0, 0, .42, .13, 0, 0, 6.28); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    },

    golem(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const bob = Math.sin(t * 1.4 + rnd) * .01;
      ctx.save(); ctx.translate(0, bob);
      const rockG = (x, y, w, h) => {
        const g = ctx.createLinearGradient(x - w, y - h, x + w, y + h);
        g.addColorStop(0, shade(c1, .2)); g.addColorStop(1, c2); ctx.fillStyle = g;
      };
      // legs
      rockG(-.12, -.12, .1, .14); poly(ctx, [[-.2, 0], [-.04, 0], [-.06, -.26], [-.19, -.24]]); ctx.fill();
      rockG(.12, -.12, .1, .14); poly(ctx, [[.04, 0], [.2, 0], [.19, -.24], [.06, -.26]]); ctx.fill();
      // torso
      rockG(0, -.45, .26, .22);
      poly(ctx, [[-.26, -.24], [.26, -.24], [.3, -.56], [.16, -.68], [-.16, -.68], [-.3, -.56]]); ctx.fill();
      // cracks
      ctx.strokeStyle = rgba(st >= 2 ? '#ff8a4c' : '#5ce89a', .55 + Math.sin(t * 2) * .2);
      ctx.lineWidth = .022; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-.14, -.3); ctx.lineTo(-.04, -.44); ctx.lineTo(-.1, -.56); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(.16, -.3); ctx.lineTo(.06, -.46); ctx.stroke();
      // arms
      const sw = Math.sin(t * 1.4) * .03;
      rockG(-.4, -.4, .1, .16); poly(ctx, [[-.3, -.6], [-.42, -.56], [-.5, -.24 + sw], [-.34, -.2 + sw]]); ctx.fill();
      rockG(.4, -.4, .1, .16); poly(ctx, [[.3, -.6], [.42, -.56], [.5, -.24 - sw], [.34, -.2 - sw]]); ctx.fill();
      // head
      rockG(0, -.8, .14, .12);
      poly(ctx, [[-.14, -.68], [.14, -.68], [.16, -.86], [0, -.94], [-.16, -.86]]); ctx.fill();
      const ec = st >= 2 ? '#ff8a4c' : '#5ce89a';
      ctx.fillStyle = ec; ctx.fillRect(-.09, -.82, .06, .035); ctx.fillRect(.03, -.82, .06, .035);
      glow(ctx, 0, -.8, .22, ec, .6);
      if (st >= 3) { glow(ctx, 0, -.45, 1.05, ec, .2); }
      ctx.restore();
    },

    imp(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const bob = Math.sin(t * 3.6 + rnd) * .02;
      ctx.save(); ctx.translate(0, -.05 + bob);
      glow(ctx, 0, -.35, .75 + st * .1, '#ff6a2c', .22 + st * .04);
      // tail
      ctx.strokeStyle = c2; ctx.lineWidth = .028; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(.1, -.2); ctx.quadraticCurveTo(.35 + Math.sin(t * 3) * .06, -.16, .3, -.42); ctx.stroke();
      ctx.fillStyle = c2; poly(ctx, [[.3, -.42], [.38, -.52], [.24, -.5]]); ctx.fill();
      // legs
      limb(ctx, -.06, 0, -.07, -.18, .045, c1); limb(ctx, .06, 0, .07, -.18, .045, c1);
      // body
      ctx.fillStyle = c1; ell(ctx, 0, -.3, .15, .15); ctx.fill();
      ctx.fillStyle = rgba(shade(c1, .3), .5); ell(ctx, 0, -.27, .09, .07); ctx.fill();
      // wings
      const fl = Math.sin(t * 6.2) * .12;
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(s, 1); ctx.fillStyle = rgba(c2, .9);
        ctx.beginPath(); ctx.moveTo(.08, -.4);
        ctx.quadraticCurveTo(.34, -.62 - fl, .44, -.36 - fl);
        ctx.quadraticCurveTo(.3, -.34, .3, -.24); ctx.quadraticCurveTo(.18, -.3, .08, -.28);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      // arms
      const sw = Math.sin(t * 3.6) * .05;
      limb(ctx, -.12, -.34, -.24, -.22 + sw, .036, c1);
      limb(ctx, .12, -.34, .24, -.24 - sw, .036, c1);
      // head
      ctx.fillStyle = shade(c1, .08); circ(ctx, 0, -.52, .135); ctx.fill();
      // horns
      ctx.fillStyle = '#2a1208';
      poly(ctx, [[-.1, -.6], [-.18, -.78], [-.04, -.63]]); ctx.fill();
      poly(ctx, [[.1, -.6], [.18, -.78], [.04, -.63]]); ctx.fill();
      // face
      ctx.fillStyle = '#ffe066';
      poly(ctx, [[-.09, -.56], [-.02, -.53], [-.09, -.5]]); ctx.fill();
      poly(ctx, [[.09, -.56], [.02, -.53], [.09, -.5]]); ctx.fill();
      glow(ctx, 0, -.53, .17, '#ffb347', .55);
      ctx.strokeStyle = '#2a1208'; ctx.lineWidth = .014;
      ctx.beginPath(); ctx.arc(0, -.46, .05, .1, Math.PI - .1); ctx.stroke();
      if (st >= 2) { // flame aura
        for (let i = 0; i < 5; i++) {
          const a = t * 2 + i * 1.3;
          ctx.fillStyle = rgba(i % 2 ? '#ff8a4c' : '#ffd166', .5);
          circ(ctx, Math.sin(a) * .3, -.1 - ((t * .6 + i * .2) % 1) * .5, .03); ctx.fill();
        }
      }
      ctx.restore();
    },

    crystal(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const pulse = .5 + Math.sin(t * 1.8 + rnd) * .5;
      ctx.save(); ctx.translate(0, Math.sin(t * 1.2) * .015);
      glow(ctx, 0, -.4, .8 + st * .12, c1, .2 + pulse * .12);
      const shard = (x, y, w, h, rot, a) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        const g = ctx.createLinearGradient(-w, -h, w, h);
        g.addColorStop(0, shade(c1, .5)); g.addColorStop(.5, c1); g.addColorStop(1, c2);
        ctx.globalAlpha = a == null ? 1 : a; ctx.fillStyle = g;
        poly(ctx, [[0, -h], [w, -h * .2], [w * .6, h], [-w * .6, h], [-w, -h * .2]]); ctx.fill();
        ctx.strokeStyle = rgba('#ffffff', .35); ctx.lineWidth = .01;
        ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(0, h); ctx.stroke();
        ctx.restore();
      };
      shard(-.22, -.2, .1, .22, -.28, .85);
      shard(.22, -.18, .09, .2, .3, .85);
      shard(0, -.44, .18, .44, 0, 1);
      if (st >= 2) { shard(-.3, -.5, .07, .18, -.6, .7); shard(.32, -.46, .07, .16, .7, .7); }
      // eyes
      ctx.fillStyle = rgba('#ffffff', .8 + pulse * .2);
      ell(ctx, -.06, -.5, .022, .05); ctx.fill(); ell(ctx, .06, -.5, .022, .05); ctx.fill();
      // frost motes
      ctx.fillStyle = rgba('#e8f7ff', .55);
      for (let i = 0; i < 7; i++) {
        const a = t * .7 + i * .9;
        circ(ctx, Math.sin(a) * .42, -((t * .3 + i * .14) % 1) * .9, .012); ctx.fill();
      }
      if (st >= 3) { glow(ctx, 0, -.45, 1.2, '#8fe6ff', .22); }
      ctx.restore();
    },

    shade(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const drift = Math.sin(t * 1.1 + rnd) * .03;
      ctx.save(); ctx.translate(drift, -.05);
      glow(ctx, 0, -.45, .85 + st * .1, c2, .3);
      // smoke tail
      ctx.fillStyle = rgba(c2, .55);
      ctx.beginPath(); ctx.moveTo(-.22, -.3);
      ctx.quadraticCurveTo(-.3 + Math.sin(t * 1.9) * .06, -.06, -.1, .02);
      ctx.quadraticCurveTo(0, .06, .1, .02);
      ctx.quadraticCurveTo(.3 + Math.sin(t * 1.6) * .06, -.06, .22, -.3);
      ctx.closePath(); ctx.fill();
      // cloak
      const g = ctx.createLinearGradient(0, -.85, 0, 0);
      g.addColorStop(0, shade(c1, -.1)); g.addColorStop(1, rgba(c2, .2));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, -.86);
      ctx.quadraticCurveTo(.3, -.78, .27, -.28);
      ctx.quadraticCurveTo(.12, -.18, 0, -.24);
      ctx.quadraticCurveTo(-.12, -.18, -.27, -.28);
      ctx.quadraticCurveTo(-.3, -.78, 0, -.86); ctx.closePath(); ctx.fill();
      // hood void
      ctx.fillStyle = '#05070a';
      ctx.beginPath(); ctx.ellipse(0, -.66, .13, .17, 0, 0, 6.28); ctx.fill();
      // eyes
      const ec = st >= 2 ? '#ff3b5c' : '#c9a0ff';
      ctx.fillStyle = ec;
      ell(ctx, -.05, -.68, .025, .035); ctx.fill(); ell(ctx, .05, -.68, .025, .035); ctx.fill();
      glow(ctx, -.05, -.68, .08, ec, .9); glow(ctx, .05, -.68, .08, ec, .9);
      if (st >= 1) { // claws
        ctx.strokeStyle = rgba(c1, .9); ctx.lineWidth = .016; ctx.lineCap = 'round';
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(s * .24, -.42);
          ctx.lineTo(s * (.34 + i * .04), -.3 + i * .05 + Math.sin(t * 2 + i) * .02); ctx.stroke();
        }
      }
      if (st >= 3) { // crown of dark
        ctx.strokeStyle = rgba('#ff3b5c', .8); ctx.lineWidth = .018;
        ctx.beginPath(); ctx.arc(0, -.82, .17, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      ctx.restore();
    },

    worm(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      ctx.save();
      const segs = 6 + Math.min(4, st) * 2;
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .03;
      for (let i = segs - 1; i >= 0; i--) {
        const ph = t * 2.2 - i * .42 + rnd;
        const x = -.42 + (i / (segs - 1)) * .84;
        const y = -.18 - Math.abs(Math.sin(ph)) * (.34 - i * .01);
        const r = .12 - i * .006 + Math.sin(ph) * .01;
        const g = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
        g.addColorStop(0, shade(c1, .25)); g.addColorStop(1, c2);
        ctx.fillStyle = g; circ(ctx, x, y, r); ctx.fill();
        if (st >= 2) { ctx.strokeStyle = rgba('#ffd166', .35); ctx.lineWidth = .008; circ(ctx, x, y, r * .8); ctx.stroke(); }
      }
      // head
      const hph = t * 2.2 + rnd;
      const hx = -.42, hy = -.2 - Math.abs(Math.sin(hph)) * .36;
      const g2 = ctx.createRadialGradient(hx - .04, hy - .05, .02, hx, hy, .18);
      g2.addColorStop(0, shade(c1, .35)); g2.addColorStop(1, c2);
      ctx.fillStyle = g2; circ(ctx, hx, hy, .16); ctx.fill();
      // maw
      ctx.fillStyle = '#3a0d12'; circ(ctx, hx - .04, hy, .1); ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.28 + t * .6;
        poly(ctx, [[hx - .04 + Math.cos(a) * .1, hy + Math.sin(a) * .1],
        [hx - .04 + Math.cos(a + .3) * .1, hy + Math.sin(a + .3) * .1],
        [hx - .04 + Math.cos(a + .15) * .04, hy + Math.sin(a + .15) * .04]]); ctx.fill();
      }
      if (st >= 3) glow(ctx, hx, hy, .5, '#ffd166', .3);
      // dirt mound
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ell(ctx, 0, -.02, .5, .06); ctx.fill();
      ctx.restore();
    },

    eye(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const bob = Math.sin(t * 1.5 + rnd) * .025;
      ctx.save(); ctx.translate(0, -.5 + bob);
      glow(ctx, 0, 0, .9 + st * .12, c1, .26);
      // tentacle stalks
      const n = 4 + Math.min(6, st * 2);
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = -Math.PI * .95 + (i / (n - 1)) * Math.PI * .9;
        const wob = Math.sin(t * 2 + i) * .12;
        ctx.strokeStyle = c2; ctx.lineWidth = .028;
        const ex = Math.cos(a + wob) * .58, ey = Math.sin(a + wob) * .5;
        ctx.beginPath(); ctx.moveTo(0, -.05); ctx.quadraticCurveTo(ex * .5, ey * .8, ex, ey); ctx.stroke();
        // small eye on tip
        ctx.fillStyle = '#fff'; circ(ctx, ex, ey, .045); ctx.fill();
        ctx.fillStyle = '#1a0a18'; circ(ctx, ex + Math.cos(t) * .012, ey + Math.sin(t) * .012, .022); ctx.fill();
      }
      // main sphere
      const g = ctx.createRadialGradient(-.08, -.1, .04, 0, 0, .34);
      g.addColorStop(0, shade(c1, .4)); g.addColorStop(.7, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; circ(ctx, 0, 0, .32); ctx.fill();
      // big eye
      const lx = Math.sin(t * .8) * .05, ly = Math.cos(t * .6) * .03;
      ctx.fillStyle = '#fdf6ff'; circ(ctx, 0, 0, .2); ctx.fill();
      ctx.fillStyle = st >= 3 ? '#ff3b5c' : '#7a1f66'; circ(ctx, lx, ly, .11); ctx.fill();
      ctx.fillStyle = '#0a040a'; circ(ctx, lx, ly, .055); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; circ(ctx, lx - .05, ly - .06, .03); ctx.fill();
      // lid
      const lid = Math.max(0, Math.sin(t * .55 + rnd * 3) - .86) * 7;
      if (lid > 0) { ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(0, -.2 + lid * .2, .21, .21 * lid, 0, 0, 6.28); ctx.fill(); }
      // maw
      if (st >= 2) {
        ctx.fillStyle = '#2a0618';
        ctx.beginPath(); ctx.ellipse(0, .26, .14, .07, 0, 0, 6.28); ctx.fill();
        ctx.fillStyle = '#fff';
        for (let i = -2; i <= 2; i++) { poly(ctx, [[i * .05 - .02, .2], [i * .05 + .02, .2], [i * .05, .28]]); ctx.fill(); }
      }
      ctx.restore();
    },

    dragon(ctx, p) {
      const { c1, c2, st, t, rnd } = p;
      const fl = Math.sin(t * 3.4 + rnd) * .13;
      ctx.save(); ctx.translate(0, -.06 + Math.sin(t * 1.6) * .02);
      glow(ctx, 0, -.4, 1.0 + st * .12, c1, .18);
      // tail
      ctx.strokeStyle = c2; ctx.lineWidth = .06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(.14, -.28);
      ctx.quadraticCurveTo(.5 + Math.sin(t * 2) * .08, -.2, .56, -.5); ctx.stroke();
      ctx.fillStyle = c1; poly(ctx, [[.56, -.5], [.68, -.62], [.5, -.6]]); ctx.fill();
      // wings
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(s, 1);
        const g = ctx.createLinearGradient(.1, -.7, .7, -.2);
        g.addColorStop(0, shade(c2, .1)); g.addColorStop(1, rgba(c2, .75));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(.1, -.58);
        ctx.quadraticCurveTo(.5, -.95 - fl, .82, -.6 - fl);
        ctx.quadraticCurveTo(.6, -.52, .62, -.34 - fl * .6);
        ctx.quadraticCurveTo(.44, -.44, .4, -.26 - fl * .4);
        ctx.quadraticCurveTo(.24, -.4, .1, -.3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(shade(c1, .2), .5); ctx.lineWidth = .014;
        ctx.beginPath(); ctx.moveTo(.12, -.55); ctx.lineTo(.78, -.58 - fl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(.12, -.55); ctx.lineTo(.6, -.34 - fl * .6); ctx.stroke();
        ctx.restore();
      }
      // legs
      limb(ctx, -.1, -.02, -.1, -.24, .055, c2); limb(ctx, .1, -.02, .1, -.24, .055, c2);
      ctx.fillStyle = '#f0e6d2';
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { poly(ctx, [[s * .1 + (i - 1) * .035, 0], [s * .1 + (i - 1) * .035 + .022, 0], [s * .1 + (i - 1) * .035 + .011, -.05]]); ctx.fill(); }
      // body
      const bg = ctx.createLinearGradient(0, -.6, 0, -.1);
      bg.addColorStop(0, shade(c1, .18)); bg.addColorStop(1, c2);
      ctx.fillStyle = bg; ell(ctx, 0, -.34, .22, .24); ctx.fill();
      // belly
      ctx.fillStyle = rgba('#ffd9a8', .5); ell(ctx, -.02, -.28, .13, .16); ctx.fill();
      // neck + head
      ctx.strokeStyle = c1; ctx.lineWidth = .11; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-.06, -.5); ctx.quadraticCurveTo(-.24, -.66, -.3, -.8); ctx.stroke();
      ctx.fillStyle = shade(c1, .1);
      ctx.save(); ctx.translate(-.34, -.84); ctx.rotate(-.35);
      ell(ctx, 0, 0, .17, .11); ctx.fill();
      poly(ctx, [[-.12, .02], [-.3, .06], [-.12, -.06]]); ctx.fill(); // snout
      // horns
      ctx.fillStyle = '#e8dfc9';
      poly(ctx, [[.06, -.08], [.22, -.24], [.1, -.04]]); ctx.fill();
      poly(ctx, [[.0, -.1], [.12, -.28], [.04, -.06]]); ctx.fill();
      // eye
      ctx.fillStyle = '#ffd166'; ell(ctx, -.05, -.03, .034, .026); ctx.fill();
      ctx.fillStyle = '#1a0505'; ell(ctx, -.05, -.03, .01, .022); ctx.fill();
      glow(ctx, -.05, -.03, .1, '#ffb347', .6);
      ctx.restore();
      // spines
      ctx.fillStyle = '#e8dfc9';
      for (let i = 0; i < 4; i++) { poly(ctx, [[-.02 + i * .08, -.56 + i * .03], [.02 + i * .08, -.68 + i * .03], [.06 + i * .08, -.55 + i * .03]]); ctx.fill(); }
      if (st >= 2) { // breath embers
        for (let i = 0; i < 6; i++) {
          const pr = (t * .8 + i * .17) % 1;
          ctx.fillStyle = rgba(i % 2 ? '#ff8a4c' : '#ffd166', .7 * (1 - pr));
          circ(ctx, -.5 - pr * .5, -.86 + Math.sin(i * 2 + t * 3) * .05, .03 * (1 - pr * .5)); ctx.fill();
        }
      }
      ctx.restore();
    }
  };

  /* ============================================================
     HEROES — shared humanoid base + kit
     ============================================================ */
  function humanoid(ctx, p, kit) {
    const { color, t, rnd, st } = p;
    const skin = '#e8c9a0';
    const bob = Math.sin(t * 3 + rnd * 4) * .015;
    ctx.save(); ctx.translate(0, bob);
    const dark = shade(color, -.35);

    // legs
    limb(ctx, -.06, 0, -.07, -.22, .05, '#4a4438');
    limb(ctx, .06, 0, .07, -.22, .05, '#4a4438');
    // body
    const g = ctx.createLinearGradient(-.14, -.5, .14, -.2);
    g.addColorStop(0, shade(color, .12)); g.addColorStop(1, dark);
    ctx.fillStyle = g;
    if (kit.robe) {
      ctx.beginPath(); ctx.moveTo(-.1, -.52); ctx.lineTo(.1, -.52);
      ctx.quadraticCurveTo(.24, -.2, .2, 0); ctx.lineTo(-.2, 0);
      ctx.quadraticCurveTo(-.24, -.2, -.1, -.52); ctx.closePath(); ctx.fill();
    } else {
      poly(ctx, [[-.13, -.52], [.13, -.52], [.11, -.2], [-.11, -.2]]); ctx.fill();
    }
    // arms
    const sw = Math.sin(t * 3 + rnd) * .05;
    limb(ctx, -.11, -.46, -.22, -.3 + sw, .04, skin);
    limb(ctx, .11, -.46, .22, -.32 - sw, .04, skin);
    // head
    ctx.fillStyle = skin; circ(ctx, 0, -.62, .105); ctx.fill();
    // hair / hood
    if (kit.hood) {
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(0, -.63, .13, Math.PI, 0); ctx.lineTo(.12, -.55);
      ctx.quadraticCurveTo(0, -.48, -.12, -.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ell(ctx, 0, -.6, .085, .07); ctx.fill();
      ctx.fillStyle = kit.eyeCol || '#ffd166';
      circ(ctx, -.035, -.61, .016); ctx.fill(); circ(ctx, .035, -.61, .016); ctx.fill();
    } else {
      const bl = (Math.sin(t * 1.6 + rnd * 6) + 1) / 2;
      eye(ctx, -.036, -.63, .024, bl); eye(ctx, .036, -.63, .024, bl);
      if (kit.hair !== false) {
        ctx.fillStyle = kit.hairCol || '#5c4227';
        ctx.beginPath(); ctx.arc(0, -.66, .108, Math.PI, 0); ctx.closePath(); ctx.fill();
      }
    }
    if (kit.helm) {
      ctx.fillStyle = shade(color, .25);
      ctx.beginPath(); ctx.arc(0, -.64, .12, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(.11, -.58);
      ctx.lineTo(-.11, -.58); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(-.06, -.655, .12, .022);
      if (kit.plume) {
        ctx.fillStyle = kit.plume;
        ctx.beginPath(); ctx.moveTo(0, -.76);
        ctx.quadraticCurveTo(.06, -.92, -.02, -.98);
        ctx.quadraticCurveTo(-.02, -.86, -.04, -.76); ctx.closePath(); ctx.fill();
      }
    }
    if (kit.halo) {
      ctx.strokeStyle = rgba('#ffe9a8', .85); ctx.lineWidth = .022;
      ctx.beginPath(); ctx.ellipse(0, -.8, .13, .04, 0, 0, 6.28); ctx.stroke();
      glow(ctx, 0, -.8, .3, '#ffe9a8', .35);
    }
    if (kit.wings) {
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(s, 1);
        ctx.fillStyle = rgba('#ffffff', .8);
        ctx.beginPath(); ctx.moveTo(.08, -.52);
        ctx.quadraticCurveTo(.42, -.9, .56, -.52 + Math.sin(t * 2.4) * .06);
        ctx.quadraticCurveTo(.34, -.5, .3, -.28); ctx.quadraticCurveTo(.2, -.44, .08, -.4);
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      glow(ctx, 0, -.5, .9, '#fff6d6', .22);
    }
    // gear
    if (kit.shield) {
      ctx.save(); ctx.translate(-.26, -.32 + sw);
      const sg = ctx.createLinearGradient(-.1, -.14, .1, .14);
      sg.addColorStop(0, shade(color, .3)); sg.addColorStop(1, dark);
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.moveTo(0, -.17); ctx.lineTo(.11, -.1); ctx.lineTo(.09, .1);
      ctx.lineTo(0, .18); ctx.lineTo(-.09, .1); ctx.lineTo(-.11, -.1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = .014; ctx.stroke();
      ctx.restore();
    }
    if (kit.sword) {
      ctx.save(); ctx.translate(.24, -.34 - sw); ctx.rotate(.35);
      ctx.fillStyle = '#3a2a18'; ctx.fillRect(-.02, 0, .04, .1);
      ctx.fillStyle = '#c9d2da'; ctx.fillRect(-.06, -.02, .12, .03);
      const bg2 = ctx.createLinearGradient(-.03, 0, .03, 0);
      bg2.addColorStop(0, '#f2f6ff'); bg2.addColorStop(1, '#8f9aa8');
      ctx.fillStyle = bg2;
      poly(ctx, [[-.028, -.02], [.028, -.02], [.02, -.36], [0, -.42], [-.02, -.36]]); ctx.fill();
      ctx.restore();
    }
    if (kit.axe) {
      ctx.save(); ctx.translate(.26, -.3 - sw); ctx.rotate(.4);
      ctx.fillStyle = '#5c4227'; ctx.fillRect(-.022, -.34, .044, .5);
      ctx.fillStyle = '#b8c4cc';
      ctx.beginPath(); ctx.moveTo(.02, -.34); ctx.quadraticCurveTo(.22, -.3, .16, -.1);
      ctx.quadraticCurveTo(.08, -.16, .02, -.14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-.02, -.34); ctx.quadraticCurveTo(-.22, -.3, -.16, -.1);
      ctx.quadraticCurveTo(-.08, -.16, -.02, -.14); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (kit.staff) {
      ctx.save(); ctx.translate(.24, -.3 - sw);
      ctx.strokeStyle = '#5c4227'; ctx.lineWidth = .026; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, .28); ctx.lineTo(.03, -.42); ctx.stroke();
      const oc = kit.orb || '#9fb8ff';
      glow(ctx, .03, -.46, .16, oc, .8);
      ctx.fillStyle = oc; circ(ctx, .03, -.46, .055); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; circ(ctx, .01, -.48, .02); ctx.fill();
      ctx.restore();
    }
    if (kit.bow) {
      ctx.save(); ctx.translate(.24, -.34 - sw);
      ctx.strokeStyle = '#5c4227'; ctx.lineWidth = .026;
      ctx.beginPath(); ctx.arc(0, 0, .22, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = .008;
      ctx.beginPath(); ctx.moveTo(.09, -.2); ctx.lineTo(.09, .2); ctx.stroke();
      ctx.restore();
    }
    if (kit.daggers) {
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(s * .24, -.3 + s * sw); ctx.rotate(s * .6);
        ctx.fillStyle = '#c9d2da'; poly(ctx, [[-.018, 0], [.018, 0], [0, -.19]]); ctx.fill();
        ctx.fillStyle = '#2a2018'; ctx.fillRect(-.02, 0, .04, .07);
        ctx.restore();
      }
    }
    if (kit.pitchfork) {
      ctx.save(); ctx.translate(.24, -.3 - sw); ctx.rotate(.22);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = .024;
      ctx.beginPath(); ctx.moveTo(0, .3); ctx.lineTo(0, -.34); ctx.stroke();
      ctx.strokeStyle = '#b8c4cc'; ctx.lineWidth = .018;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * .05, -.3); ctx.lineTo(i * .06, -.46); ctx.stroke(); }
      ctx.restore();
    }
    if (kit.orbs) {
      for (let i = 0; i < 3; i++) {
        const a = t * 1.6 + i * 2.1;
        const ox = Math.cos(a) * .3, oy = -.5 + Math.sin(a) * .12;
        glow(ctx, ox, oy, .12, kit.orbCol || '#c9a0ff', .8);
        ctx.fillStyle = kit.orbCol || '#c9a0ff'; circ(ctx, ox, oy, .035); ctx.fill();
      }
    }
    ctx.restore();
  }

  const HSHAPE = {
    peasant: (c, p) => humanoid(c, p, { pitchfork: 1, hairCol: '#6b5433' }),
    soldier: (c, p) => humanoid(c, p, { helm: 1, sword: 1 }),
    knight: (c, p) => humanoid(c, p, { helm: 1, plume: '#c0392b', sword: 1, shield: 1 }),
    archer: (c, p) => humanoid(c, p, { bow: 1, hood: 1, eyeCol: '#a8e06a' }),
    mage: (c, p) => humanoid(c, p, { robe: 1, staff: 1, hood: 1, orb: p.color, eyeCol: p.color }),
    archmage: (c, p) => humanoid(c, p, { robe: 1, staff: 1, hood: 1, orbs: 1, orbCol: p.color, orb: p.color, eyeCol: '#fff' }),
    priest: (c, p) => humanoid(c, p, { robe: 1, halo: 1, staff: 1, orb: '#ffe9a8', hairCol: '#d9cfae' }),
    rogue: (c, p) => humanoid(c, p, { hood: 1, daggers: 1, eyeCol: '#ff6d6d' }),
    berserk: (c, p) => humanoid(c, p, { axe: 1, hairCol: '#8a2b1e', hair: true }),
    seraph: (c, p) => humanoid(c, p, { robe: 1, halo: 1, wings: 1, staff: 1, orb: '#fff6d6' })
  };

  /* ============================================================
     PUBLIC API
     ============================================================ */
  function drawMonster(ctx, famId, stage, x, y, size, t, opt) {
    opt = opt || {};
    const f = global.DATA.FAM_BY_ID[famId];
    if (!f) return;
    const rnd = (U.hash(famId) % 1000) / 1000 * 6.28;
    ctx.save();
    ctx.translate(x, y);
    const s = size * (1 + stage * 0.075) * (opt.scale || 1);
    ctx.scale(opt.flip ? -s : s, s);
    if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
    // shadow
    if (!opt.noShadow) {
      ctx.fillStyle = 'rgba(0,0,0,.38)';
      ctx.beginPath(); ctx.ellipse(0, .02, .42, .09, 0, 0, 6.28); ctx.fill();
    }
    const p = {
      c1: opt.c1 || f.colors[0], c2: opt.c2 || f.colors[1],
      st: stage, t: t, rnd: rnd, family: f
    };
    (MSHAPE[f.shape] || MSHAPE.blob)(ctx, p);
    ctx.restore();
  }

  function drawHero(ctx, shape, color, x, y, size, t, opt) {
    opt = opt || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(opt.flip ? -size : size, size);
    if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
    if (!opt.noShadow) {
      ctx.fillStyle = 'rgba(0,0,0,.38)';
      ctx.beginPath(); ctx.ellipse(0, .02, .26, .06, 0, 0, 6.28); ctx.fill();
    }
    const rnd = (U.hash(shape + color) % 1000) / 1000 * 6.28;
    (HSHAPE[shape] || HSHAPE.soldier)(ctx, { color, t, rnd, st: opt.st || 0 });
    ctx.restore();
  }

  /** render a static thumbnail into a small canvas element */
  function portrait(canvas, kind, a, b) {
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const w = canvas.clientWidth || 48, h = canvas.clientHeight || 48;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // `b` is a stage index for monsters and a colour string for heroes
    if (kind === 'monster') drawMonster(ctx, a, +b || 0, w / 2, h * 0.92, h * 0.78, 0.6, { noShadow: true });
    else drawHero(ctx, a, String(b), w / 2, h * 0.94, h * 0.82, 0.6, { noShadow: true });
  }

  global.SPR = { drawMonster, drawHero, portrait, MSHAPE, HSHAPE, glow, circ, poly, ell };
})(this);
