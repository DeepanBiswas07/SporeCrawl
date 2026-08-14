/* ============================================================
   sw.js — offline support.

   Strategy is deliberately conservative so a stale cache can never
   ship a broken build:
     · versioned assets (…?v=N) are immutable → cache-first
     · index.html is network-first, cache only as a fallback
   Bump CACHE when you release and the old one is deleted on activate.
   ============================================================ */
const CACHE = 'sporecrawl-v11';

const CORE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => { })));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // never touch third-party requests

  const isDocument = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isDocument) {
    // network-first: a new release must always win
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // versioned assets are immutable — serve from cache, fill on first miss
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
      }
      return res;
    }).catch(() => hit))
  );
});
