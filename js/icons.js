/* ============================================================
   icons.js — hand-drawn SVG icon set
   No emoji anywhere in the chrome. Every glyph is a 24×24 stroke
   drawing on the same grid, same weight, same caps.
   ============================================================ */
(function (global) {
  'use strict';

  // path data only — everything shares one stroke style
  const P = {
    /* resources */
    biomass: 'M8 3c0 4 8 6 8 9s-8 5-8 9M16 3c0 4-8 6-8 9s8 5 8 9M9 7h6M8.5 11h7M9 15h6',
    essence: 'M12 3l1.8 5.6L19 10l-4.6 2.2L12 18l-1.4-5.8L6 10l5.2-1.4z M12 19.5v2M5 17l1.4 1.4M19 17l-1.4 1.4',
    plunder: 'M12 3l8 4.6v8.8L12 21l-8-4.6V7.6zM12 3v18M4 7.6l8 4.6 8-4.6',
    genome: 'M7 3c0 5 10 5 10 10S7 18 7 21M17 3c0 5-10 5-10 10s10 5 10 8M8.4 6h7.2M8 10.5h8M8.4 15.5h7.2',
    cell: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM12 3v5.5M12 15.5V21',

    /* tabs */
    colonies: 'M7.5 20c-2.5 0-4-1.7-4-4s1.7-4.5 4-4.5 4 2 4 4.5-1.5 4-4 4zM16 15c-2 0-3.2-1.4-3.2-3.2S14 8.4 16 8.4s3.2 1.6 3.2 3.4S18 15 16 15zM10 8.5c-1.5 0-2.4-1-2.4-2.4S8.5 3.5 10 3.5s2.4 1.2 2.4 2.6S11.5 8.5 10 8.5z',
    evolve: 'M12 21V13M12 13L6 8.5M12 13l6-4.5M12 13V3M6 8.5V4.5M18 8.5V4.5M4 4.5h4M16 4.5h4M10 3h4',
    dungeon: 'M3 21V9l4-3 5 3.5L17 6l4 3v12M9 21v-6a3 3 0 016 0v6M6 12.5h1.5M16.5 12.5H18',
    tree: 'M12 21v-6M12 15l-4-3M12 15l4-3M8 12V8M16 12V8M12 9V3M6 8h4M14 8h4M10 3h4',
    codex: 'M4 4.5h6a2 2 0 012 2v13a2.4 2.4 0 00-2-1.5H4zM20 4.5h-6a2 2 0 00-2 2v13a2.4 2.4 0 012-1.5h6zM6.5 8.5h3M6.5 11.5h3M14.5 8.5h3M14.5 11.5h3',

    /* trophic roles */
    producer: 'M12 21v-8M12 13c0-3 2.2-5.5 5.5-5.5C17.5 11 15 13 12 13zM12 13c0-3.6-2.2-6.5-5.5-6.5C6.5 10.5 9 13 12 13zM8 21h8',
    decomposer: 'M12 12.5a2 2 0 100-4 2 2 0 000 4zM12 5a5.5 5.5 0 015.5 5.5c0 3-2.5 5-5.5 7.5M12 5a5.5 5.5 0 00-5.5 5.5c0 4 3.5 6.5 8 9.5',
    consumer: 'M4 8c2.5-2 5-2.5 8-2.5s5.5.5 8 2.5c-1 5-3.5 9-8 11C7.5 17 5 13 4 8zM9 8v2M15 8v2',
    construct: 'M5 8.5l7-4 7 4v7l-7 4-7-4zM12 12.5l7-4M12 12.5l-7-4M12 12.5v7',
    predator: 'M4 5c1.5 4 3 7 8 10M9 4c.5 4.5 1.5 7.5 5 11M14.5 4.5c-.5 4.5-.5 7.5 2 12M4 5l1 3M9 4v3M14.5 4.5l-.3 3',
    apex: 'M12 20.5c4.5 0 7.5-3 7.5-6.5 0-2-1-3.5-2.5-4.5.5-2-.5-4-2-5 0 1.5-.8 2.3-1.6 2.7C12.8 5 12 3.5 12 3.5S11.2 5 10.6 7.2C9.8 6.8 9 6 9 4.5c-1.5 1-2.5 3-2 5C5.5 10.5 4.5 12 4.5 14c0 3.5 3 6.5 7.5 6.5zM10 13.5h.01M14 13.5h.01',

    /* damage types */
    phys: 'M18.5 3.5l-9 9M6 16l2 2M4.5 20.5l3.5-3.5-2-2-3.5 3.5zM18.5 3.5h2v2l-8.5 8.5-2-2z',
    pois: 'M12 21c-3.3 0-6-2.5-6-5.7C6 11 12 3 12 3s6 8 6 12.3c0 3.2-2.7 5.7-6 5.7zM10 15.5h.01M14 14h.01M12 18h.01',
    fire: 'M12 21c3.3 0 6-2.4 6-5.5 0-4.5-6-12.5-6-12.5s-1 4-3 6c0-1.5-1-2.5-1-2.5S6 9.5 6 15.5C6 18.6 8.7 21 12 21zM12 21c-1.6 0-2.8-1.2-2.8-2.7 0-2 2.8-5.3 2.8-5.3s2.8 3.3 2.8 5.3c0 1.5-1.2 2.7-2.8 2.7z',
    frost: 'M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M12 6.5l-2 2M12 6.5l2 2M12 17.5l-2-2M12 17.5l2-2M7 8.4l.3 2.7M17 8.4l-.3 2.7M7 15.6l.3-2.7M17 15.6l-.3-2.7',
    arc: 'M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2zM19 17l1 2.5 2.5 1-2.5 1L19 24M4.5 3l.7 1.8L7 5.5l-1.8.7L4.5 8',
    shad: 'M16.5 3.2A9 9 0 1020 14.6a7 7 0 01-3.5-11.4z M8.5 9.5h.01M11 13h.01',

    /* abilities */
    cavein: 'M3 4.5l3 4M9 3l1.5 5M16 4l-1 4.5M21 5.5l-3 4M4 21l4-7 3 4 3-6 5 9z',
    frenzy: 'M12 21c-3.3 0-6-2.5-6-5.7C6 11 12 3 12 3s6 8 6 12.3c0 3.2-2.7 5.7-6 5.7zM12 17.5a2.5 2.5 0 002.5-2.5',
    spores: 'M4 14a4 4 0 014-4 5 5 0 019.5-1.5A3.75 3.75 0 0119 17H8a4 4 0 01-4-3zM9 20.5h.01M13 21h.01M17 20h.01',
    devour: 'M4 9c2.5 3 5 4.5 8 4.5S17.5 12 20 9M4 9c2.5-3 5-4.5 8-4.5S17.5 6 20 9M8 9.8l1 2.2M12 10.4v2.6M16 9.8l-1 2.2M8 8.2L9 6M12 7.6V5M16 8.2L15 6',
    surge: 'M12 21v-7M12 14c0-4 3-7.5 8-7.5 0 5-3.5 7.5-8 7.5zM12 16c0-3-2.2-5.5-6-5.5 0 3.8 2.6 5.5 6 5.5zM8 21h8',
    apocalypse: 'M12 20c4.5 0 7.5-3 7.5-6.5 0-2-1-3.5-2.5-4.5.5-2-.5-4-2-5 0 1.5-.8 2.3-1.6 2.7C12.8 4.5 12 3 12 3s-.8 1.5-1.4 3.7C9.8 6.3 9 5.5 9 4c-1.5 1-2.5 3-2 5-1.5 1-2.5 2.5-2.5 4.5C4.5 17 7.5 20 12 20zM9.5 12.5h.01M14.5 12.5h.01M10 16c1.3.8 2.7.8 4 0',

    /* mutation branches */
    predation: 'M5 4c0 5 2 8 7 11M12 3.5c0 5.5 0 8.5 0 12M19 4c0 5-2 8-7 11M5 4l1 3.5M12 3.5l1.2 3.4M19 4l-1 3.5M8 20h8',
    fecundity: 'M12 21c-3 0-5-2.2-5-5.5C7 11 9.5 3 12 3s5 8 5 12.5c0 3.3-2 5.5-5 5.5zM9.5 15.5a2.5 2.5 0 005 0',
    symbiosis: 'M8.5 15.5a4 4 0 110-7c2.5 0 3.5 3.5 7 3.5a4 4 0 110 7c-3.5 0-4.5-3.5-7-3.5z',
    adaptation: 'M7 3c0 5 10 5 10 10S7 18 7 21M17 3c0 5-10 5-10 10s10 5 10 8',
    dominion: 'M4 8l3 3 5-6 5 6 3-3v10H4zM4 18h16',
    void: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z',

    /* ui */
    settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1v.3a2 2 0 11-4 0v-.2a1.6 1.6 0 00-2.8-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H3a2 2 0 110-4h.2a1.6 1.6 0 001.1-2.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3h.1a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.2a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.2a1.6 1.6 0 00-1.4 1z',
    sound: 'M11 5L6.5 9H3v6h3.5L11 19zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13',
    mute: 'M11 5L6.5 9H3v6h3.5L11 19zM22 9l-6 6M16 9l6 6',
    play: 'M7 4.5l12 7.5-12 7.5z',
    close: 'M6 6l12 12M18 6L6 18',
    lock: 'M6 10.5h12v10H6zM8.5 10.5V7a3.5 3.5 0 017 0v3.5M12 14.5v2.5',
    check: 'M4.5 12.5l5 5 10-11',
    down: 'M12 4v15M6 13l6 6 6-6',
    up: 'M12 20V5M6 11l6-6 6 6',
    skull: 'M12 3a8 8 0 00-8 8c0 2.6 1.3 4.5 3 5.6V19a2 2 0 002 2h6a2 2 0 002-2v-2.4c1.7-1.1 3-3 3-5.6a8 8 0 00-8-8zM9 11.5a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2zM15 11.5a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2zM10.5 21v-3M13.5 21v-3',
    trophy: 'M7 4h10v5a5 5 0 01-10 0zM7 5.5H4.5V7a3 3 0 003 3M17 5.5h2.5V7a3 3 0 01-3 3M9.5 20.5h5M12 14v6.5',
    hourglass: 'M6.5 3h11M6.5 21h11M7.5 3v3.5c0 2 4.5 3.8 4.5 5.5s-4.5 3.5-4.5 5.5V21M16.5 3v3.5c0 2-4.5 3.8-4.5 5.5s4.5 3.5 4.5 5.5V21',
    spark: 'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3',
    flask: 'M9 3v6.5L4.5 18a2.2 2.2 0 002 3.2h11a2.2 2.2 0 002-3.2L15 9.5V3M8 3h8M6.8 14.5h10.4',
    gate: 'M4 21V8.5a8 8 0 0116 0V21M9 21v-8a3 3 0 016 0v8M4 21h16',
    eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z',
    pyramid: 'M12 3l9 16H3zM12 3v16M7.5 11h9M5.2 15h13.6',
    expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    compress: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
    spore: 'M3 13a9 9 0 0118 0zM10 13h4v5a2 2 0 01-4 0zM12 13V5M8 13L6.5 6.4M16 13l1.5-6.6M19.5 4.2h.01M21 8.4h.01M4.6 5.4h.01'
  };

  /** filled glyphs read better at tiny sizes */
  const FILLED = { play: 1, pyramid: 0 };

  /**
   * @param {string} name  key from P
   * @param {object} [o]   {size, cls, stroke, w}
   */
  function ico(name, o) {
    o = o || {};
    const d = P[name];
    if (!d) return '';
    const s = o.size || 16;
    const sw = o.w || 1.6;
    const fill = FILLED[name] ? 'currentColor' : 'none';
    const st = FILLED[name] ? 'none' : 'currentColor';
    return '<svg class="ico ' + (o.cls || '') + '" width="' + s + '" height="' + s +
      '" viewBox="0 0 24 24" fill="' + fill + '" stroke="' + st + '" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  const TYPE_ICON = { phys: 'phys', pois: 'pois', fire: 'fire', frost: 'frost', arc: 'arc', shad: 'shad' };
  const ROLE_ICON = {
    producer: 'producer', decomposer: 'decomposer', consumer: 'consumer',
    construct: 'construct', predator: 'predator', apex: 'apex'
  };
  const BRANCH_ICON = {
    pred: 'predation', fec: 'fecundity', sym: 'symbiosis',
    adp: 'adaptation', dom: 'dominion', void: 'void'
  };
  const RES_ICON = { bio: 'biomass', ess: 'essence', gold: 'plunder', dna: 'genome', cell: 'cell' };

  global.ICON = { ico, P, TYPE_ICON, ROLE_ICON, BRANCH_ICON, RES_ICON, has: n => !!P[n] };
})(this);
