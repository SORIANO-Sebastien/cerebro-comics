const CACHE_NAME = 'cerebro-pwa-v3.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './AppliBD.html',
  './manifest.json',
  './all_comics_catalog.json',
  './sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. API routes: ALWAYS Network Only (never cache authentication or data queries)
  if (url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. External CDN & media services: Network first, cache fallback
  if (url.includes('excalibur-comics.fr') || url.includes('images-na.ssl-images-amazon.com') || url.includes('googleapis.com') || url.includes('openlibrary.org') || url.includes('bnf.fr') || url.includes('tcgdex') || url.includes('googleusercontent.com') || url.includes('unpkg.com') || url.includes('jsdelivr.net')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Navigation & HTML: Network First, fallback to cache (ensures instant updates on deploy)
  if (event.request.mode === 'navigate' || url.endsWith('.html') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 4. Static assets (images, manifest): Cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
