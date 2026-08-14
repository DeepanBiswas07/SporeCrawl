/* ============================================================
   audio.js — 100% procedural WebAudio SFX (no files, no licences)
   ============================================================ */
(function (global) {
  'use strict';

  let ctx = null, master = null, muted = false, lastPlay = {};
  let ambienceOn = true, sfxOn = true;

  function init() {
    if (ctx) return ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.20;
    // gentle limiter so overlapping hits never clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 8;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    master.connect(comp); comp.connect(ctx.destination);
    return ctx;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function env(node, t, a, d, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    node.connect(g); g.connect(master);
    return g;
  }

  function tone(freq, t, dur, type, peak, slideTo) {
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    env(o, t, Math.min(0.012, dur * 0.2), dur, peak == null ? 0.3 : peak);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  let noiseBuf = null;
  function noise(t, dur, peak, freq, q, type) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type || 'bandpass'; f.frequency.value = freq || 900; f.Q.value = q || 1.2;
    s.connect(f);
    env(f, t, 0.004, dur, peak == null ? 0.25 : peak);
    s.start(t); s.stop(t + dur + 0.05);
  }

  /* throttle: never more than N of the same sound per window */
  function gate(name, ms) {
    const now = performance.now();
    if (lastPlay[name] && now - lastPlay[name] < ms) return false;
    lastPlay[name] = now; return true;
  }

  const SFX = {
    hit() { if (!ready() || !gate('hit', 130)) return; const t = ctx.currentTime; noise(t, 0.05, 0.05, 1400 + Math.random() * 500, 1.3); tone(160 + Math.random() * 30, t, 0.05, 'sine', 0.03, 95); },
    crit() { if (!ready() || !gate('crit', 260)) return; const t = ctx.currentTime; noise(t, 0.10, 0.10, 2400, 0.9); tone(deg(5), t, 0.13, 'triangle', 0.08, deg(0)); },
    heroDie() {
      if (!ready() || !gate('die', 200)) return; const t = ctx.currentTime;
      noise(t, 0.18, 0.07, 380, 0.7, 'lowpass'); tone(deg(1), t, 0.18, 'sine', 0.05, 60);
    },
    monsterDie() { if (!ready() || !gate('mdie', 300)) return; const t = ctx.currentTime; tone(300, t, 0.3, 'sawtooth', 0.14, 55); noise(t, 0.18, 0.1, 300, 0.6, 'lowpass'); },
    coin() {
      if (!ready() || !gate('coin', 900)) return; const t = ctx.currentTime;
      tone(deg(7), t, 0.05, 'triangle', 0.035); tone(deg(9), t + 0.05, 0.09, 'triangle', 0.03);
    },
    buy() { if (!ready()) return; const t = ctx.currentTime; tone(520, t, 0.07, 'triangle', 0.16); tone(780, t + 0.055, 0.11, 'triangle', 0.13); },
    evolve() {
      if (!ready()) return; const t = ctx.currentTime;
      [0, .07, .14, .21, .3].forEach((d, i) => tone(330 * Math.pow(1.26, i), t + d, 0.34, 'triangle', 0.16));
      noise(t + 0.28, 0.5, 0.1, 1800, 0.5); tone(110, t + 0.28, 0.7, 'sine', 0.2, 220);
    },
    unlock() {
      if (!ready()) return; const t = ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.075, 0.3, 'triangle', 0.14));
    },
    ach() {
      if (!ready()) return; const t = ctx.currentTime;
      [659, 784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.06, 0.34, 'square', 0.1));
    },
    waveWin() {
      if (!ready()) return; const t = ctx.currentTime;
      [392, 523, 659].forEach((f, i) => tone(f, t + i * 0.055, 0.26, 'triangle', 0.13));
    },
    waveLose() {
      if (!ready()) return; const t = ctx.currentTime;
      tone(300, t, 0.5, 'sawtooth', 0.16, 90); tone(150, t + 0.06, 0.6, 'sine', 0.14, 50);
      noise(t, 0.5, 0.12, 260, 0.5, 'lowpass');
    },
    boss() {
      if (!ready()) return; const t = ctx.currentTime;
      tone(70, t, 1.3, 'sawtooth', 0.28, 42); tone(105, t + 0.02, 1.2, 'square', 0.09, 60);
      noise(t, 1.0, 0.15, 220, 0.6, 'lowpass');
    },
    ability() { if (!ready()) return; const t = ctx.currentTime; tone(180, t, 0.34, 'sawtooth', 0.2, 640); noise(t, 0.28, 0.14, 1400, 0.7); },
    prestige() {
      if (!ready()) return; const t = ctx.currentTime;
      for (let i = 0; i < 10; i++) tone(180 * Math.pow(1.19, i), t + i * 0.1, 0.7, 'sine', 0.12);
      noise(t, 1.6, 0.14, 700, 0.4, 'lowpass'); tone(55, t, 2.2, 'sine', 0.26);
    },
    click() { if (!ready() || !gate('click', 25)) return; const t = ctx.currentTime; tone(880, t, 0.03, 'square', 0.05); },
    error() { if (!ready() || !gate('err', 200)) return; const t = ctx.currentTime; tone(190, t, 0.12, 'square', 0.09, 130); }
  };

  function ready() { if (muted || !sfxOn) return false; if (!ctx) init(); if (!ctx) return false; resume(); return true; }

  /* ------------------------------------------------------------
     Everything pitched lives on one scale (F minor pentatonic), so
     stacked sounds stay consonant instead of turning into beeps.
     ------------------------------------------------------------ */
  const SCALE = [174.61, 207.65, 233.08, 261.63, 311.13];  // F Ab Bb C Eb
  function deg(n) {
    const oct = Math.floor(n / SCALE.length), i = ((n % SCALE.length) + SCALE.length) % SCALE.length;
    return SCALE[i] * Math.pow(2, oct);
  }

  /* ---------------- ambient bed ---------------- */
  let amb = null;
  function startAmbience() {
    if (!ambienceOn || !ready() || amb) return;
    const t = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, t);
    bus.gain.exponentialRampToValueAtTime(0.11, t + 12);
    bus.connect(master);

    // two detuned low oscillators = a room tone with a slow beat in it
    const mk = (f, type, g) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const gg = ctx.createGain(); gg.gain.value = g;
      o.connect(gg); gg.connect(bus); o.start(t);
      return { o, gg };
    };
    const a = mk(deg(-7), 'sine', 0.10);
    const b = mk(deg(-7) * 1.004, 'sine', 0.07);
    const c = mk(deg(-3), 'sine', 0.025);

    // slow filtered noise: air moving through stone
    const s = ctx.createBufferSource();
    if (!noiseBuf) { noise(t, 0.001, 0.0001, 400, 1); }
    s.buffer = noiseBuf; s.loop = true;
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 220; f2.Q.value = .6;
    const ng = ctx.createGain(); ng.gain.value = 0.016;
    s.connect(f2); f2.connect(ng); ng.connect(bus); s.start(t);

    // breathing LFO on the whole bed
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.055;
    const lg = ctx.createGain(); lg.gain.value = 0.035;
    lfo.connect(lg); lg.connect(bus.gain); lfo.start(t);

    amb = { bus, nodes: [a.o, b.o, c.o, s, lfo] };
    scheduleDrip();
  }
  function scheduleDrip() {
    if (!amb) return;
    const wait = 9000 + Math.random() * 22000;
    setTimeout(() => {
      if (!amb || muted || !ambienceOn) { scheduleDrip(); return; }
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(900 + Math.random() * 700, t);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.018, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35);
      scheduleDrip();
    }, wait);
  }
  function stopAmbience() {
    if (!amb) return;
    const t = ctx.currentTime;
    amb.bus.gain.cancelScheduledValues(t);
    amb.bus.gain.setValueAtTime(amb.bus.gain.value || 0.001, t);
    amb.bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    const nodes = amb.nodes;
    setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (e) { } }), 1800);
    amb = null;
  }

  /* a slow glassy chime for progressive-disclosure moments */
  SFX.reveal = function () {
    if (!ready()) return;
    const t = ctx.currentTime;
    [0, 2, 4, 7].forEach((d, i) => {
      const f = deg(d + 3);
      tone(f, t + i * 0.15, 1.3, 'sine', 0.075);
      tone(f * 2.01, t + i * 0.15, 0.9, 'sine', 0.022);
    });
    tone(deg(-4), t, 2.2, 'sine', 0.08);
    noise(t + 0.05, 1.0, 0.014, 2600, 0.55);
  };
  SFX.startAmbience = startAmbience;
  SFX.stopAmbience = stopAmbience;
  SFX.deg = deg;

  /** a soft two-note confirmation when a teaching objective is completed */
  SFX.objective = function () {
    if (!ready()) return;
    const t = ctx.currentTime;
    tone(deg(2), t, 0.5, 'sine', 0.07);
    tone(deg(5), t + 0.11, 0.7, 'sine', 0.06);
  };

  SFX.setAmbience = on => {
    ambienceOn = on;
    if (on) { const wasMuted = muted; muted = false; startAmbience(); muted = wasMuted; }
    else stopAmbience();
  };
  SFX.ambienceOn = () => ambienceOn;
  SFX.setSfx = on => { sfxOn = on; };
  SFX.sfxOn = () => sfxOn;
  SFX.setMuted = m => { muted = m; if (m) stopAmbience(); else if (ambienceOn) startAmbience(); };
  SFX.isMuted = () => muted;
  SFX.init = init;
  SFX.resume = resume;

  global.SFX = SFX;
})(this);
