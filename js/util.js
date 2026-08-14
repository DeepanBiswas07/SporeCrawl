/* ============================================================
   util.js — number formatting, math, DOM, RNG
   ============================================================ */
(function (global) {
  'use strict';

  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
    'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc',
    'Vg', 'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg', 'Tg'];

  /** Compact number formatting: 1234 -> 1.23K */
  function fmt(n, dec) {
    if (n === Infinity) return '∞';
    if (!isFinite(n) || isNaN(n)) return '0';
    const neg = n < 0; n = Math.abs(n);
    if (n < 1e-6) return '0';
    if (n < 1000) {
      let s;
      if (n < 10) s = n.toFixed(dec != null ? dec : (n < 1 ? 2 : 1));
      else if (n < 100) s = n.toFixed(dec != null ? dec : 1);
      else s = Math.floor(n).toString();
      s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
      return (neg ? '-' : '') + s;
    }
    const tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIX.length) return (neg ? '-' : '') + n.toExponential(2).replace('e+', 'e');
    const scaled = n / Math.pow(1000, tier);
    let s = scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0);
    s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    return (neg ? '-' : '') + s + SUFFIX[tier];
  }

  /** Whole number with thousand separators (small values only) */
  function fmtInt(n) {
    if (n < 1e6) return Math.floor(n).toLocaleString('en-US');
    return fmt(n);
  }

  /** 0.734 -> "73%" */
  function pct(x, dec) { return (x * 100).toFixed(dec || 0) + '%'; }

  /** seconds -> 1h 04m 12s */
  function time(s) {
    if (!isFinite(s) || s < 0) return '—';
    s = Math.floor(s);
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + String(m).padStart(2, '0') + 'm';
    if (m) return m + 'm ' + String(s).padStart(2, '0') + 's';
    return s + 's';
  }

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const chance = p => Math.random() < p;

  /** deterministic hash-based rng, so a species always looks the same */
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function seeded(str) { return mulberry(hash(str)); }

  /* ---------- DOM ---------- */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function on(node, ev, fn, opt) { node.addEventListener(ev, fn, opt); return node; }

  /* ---------- colour ---------- */
  function shade(hex, amt) {
    const c = hex.replace('#', '');
    const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  }
  function rgba(hex, a) {
    const c = hex.replace('#', '');
    const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /** Roman numerals for tiers/levels */
  function roman(n) {
    if (n < 1) return '';
    const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    for (const [v, s] of map) { while (n >= v) { out += s; n -= v; } }
    return out;
  }

  /** sum of geometric series: base*r^start ... base*r^(start+count-1) */
  function geoSum(base, r, start, count) {
    if (count <= 0) return 0;
    if (Math.abs(r - 1) < 1e-9) return base * count;
    return base * Math.pow(r, start) * (Math.pow(r, count) - 1) / (r - 1);
  }
  /** how many items can be bought with `budget` starting at level `start` */
  function geoMaxBuy(base, r, start, budget) {
    if (budget < base * Math.pow(r, start)) return 0;
    const v = budget * (r - 1) / (base * Math.pow(r, start)) + 1;
    return Math.max(0, Math.floor(Math.log(v) / Math.log(r)));
  }

  global.U = {
    fmt, fmtInt, pct, time, clamp, lerp, rand, randi, pick, chance,
    hash, mulberry, seeded, $, $$, el, on, shade, rgba, roman, geoSum, geoMaxBuy
  };
})(this);
