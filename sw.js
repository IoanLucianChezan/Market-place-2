// Market Pulse Service Worker
// IMPORTANT: Schimbă VERSION la fiecare update ca să forțezi refresh pe telefoane
const VERSION = 'v1.0.1';
const CACHE_NAME = 'market-pulse-' + VERSION;

// Fișiere cache-uite (shell-ul aplicației)
const ASSETS = [
  './',
  './index.html',
];

// INSTALL: cache shell-ul
self.addEventListener('install', e => {
  console.log('[SW] install', VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting()) // activează imediat noul SW
  );
});

// ACTIVATE: șterge cache-urile vechi
self.addEventListener('activate', e => {
  console.log('[SW] activate', VERSION);
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] delete old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim()) // preia controlul imediat
  );
});

// FETCH: strategia
// - Pentru index.html și /: NETWORK FIRST (ca să detecteze versiuni noi)
// - Pentru API calls (finnhub, cnn): direct la rețea, fără cache
// - Pentru restul: cache first, network fallback
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Nu cache-ui API calls — mereu live
  if (url.hostname.includes('finnhub.io') ||
      url.hostname.includes('dataviz.cnn.io')) {
    return; // lasă browser-ul să gestioneze normal
  }

  // Pentru navigare HTML: network first
  if (e.request.mode === 'navigate' ||
      e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Cache versiunea nouă
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Pentru alte resurse: cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Mesaj de la app pentru forțare update
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
