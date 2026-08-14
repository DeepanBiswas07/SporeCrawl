(function (global) {
  'use strict';

  const ENV = {
    inIframe: (() => { try { return global.self !== global.top; } catch (e) { return true; } })(),
    touch: (('ontouchstart' in global) || (navigator.maxTouchPoints || 0) > 0),
    version: '1.0.0'
  };

  const mem = {};
  let backend = 'local', warned = false;

  (function detect() {
    try {
      const k = '__probe__' + Math.random();
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      backend = 'local';
    } catch (e) {
      backend = 'memory';
    }
  })();

  const Store = {
    get backend() { return backend; },
    get ephemeral() { return backend === 'memory'; },
    getItem(k) {
      try { return backend === 'local' ? global.localStorage.getItem(k) : (k in mem ? mem[k] : null); }
      catch (e) { backend = 'memory'; return k in mem ? mem[k] : null; }
    },
    setItem(k, v) {
      try {
        if (backend === 'local') { global.localStorage.setItem(k, v); return true; }
        mem[k] = v; return true;
      } catch (e) {
        backend = 'memory'; mem[k] = v;
        Store.warnOnce();
        return false;
      }
    },
    removeItem(k) {
      try { if (backend === 'local') global.localStorage.removeItem(k); } catch (e) { }
      delete mem[k];
    },
    warnOnce() {
      if (warned) return;
      warned = true;
      Guard.notify(
        'Progress will not be saved',
        'Storage is blocked in this window (private browsing or iframe settings). ' +
        'Export your save from Settings if you want to keep progress.'
      );
    }
  };

  const seen = {};
  let bannerEl = null;

  const Guard = {
    wrap(fn, label) {
      return function () {
        try { return fn.apply(this, arguments); }
        catch (e) { Guard.report(e, label); }
      };
    },
    report(err, label) {
      const key = (label || '') + '|' + (err && err.message);
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] <= 3 && global.console && console.error) {
        console.error('[sporecrawl] ' + (label || 'error') + ':', err);
      }
      if (seen[key] === 1) {
        Guard.notify('Non-fatal error',
          'An error occurred' + (label ? ' in ' + label : '') +
          '. The game is still running.');
      }
    },
    notify(title, body) {
      try {
        if (!document.body) { setTimeout(() => Guard.notify(title, body), 400); return; }
        if (bannerEl) bannerEl.remove();
        const b = document.createElement('div');
        b.className = 'sysbanner';
        b.innerHTML = '<div class="sb-body"><b>' + title + '</b><span>' + body + '</span></div>' +
          '<button class="sb-x" aria-label="Dismiss">✕</button>';
        b.querySelector('.sb-x').onclick = () => b.remove();
        document.body.appendChild(b);
        bannerEl = b;
        setTimeout(() => { if (b.parentNode) b.remove(); }, 16000);
      } catch (e) { }
    }
  };

  global.addEventListener('error', e => {
    if (e && e.message) Guard.report(e.error || new Error(e.message), 'runtime');
  });
  global.addEventListener('unhandledrejection', e => {
    Guard.report(e && e.reason ? e.reason : new Error('unhandled rejection'), 'async');
  });

  const FS = {
    supported: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
    get active() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    toggle() {
      try {
        if (FS.active) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
          const el = document.documentElement;
          (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        }
      } catch (e) { Guard.report(e, 'fullscreen'); }
    }
  };

  global.ENV = ENV;
  global.Store = Store;
  global.Guard = Guard;
  global.FS = FS;
})(this);
