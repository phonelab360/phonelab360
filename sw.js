/* PhoneLab360 - Simple PWA Service Worker
   এটি ন্যূনতমভাবে অফলাইন/ফাস্ট লোডিং সাহায্য করবে।
   নোট: একই ফোল্ডারে index.html + manifest.webmanifest + sw.js রাখুন। */

const CACHE_NAME = 'phonelab360-pwa-v1';
const CORE_ASSETS = [
  './',
  './manifest.webmanifest',
  './sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = req.mode === 'navigate';

  // Navigation: online first, fallback cache
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache a copy (same-origin only)
          if (isSameOrigin) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./', copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('./')) || Response.error();
        })
    );
    return;
  }

  // Assets: cache first (same-origin only), otherwise network
  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        });
      })
    );
  }
});
