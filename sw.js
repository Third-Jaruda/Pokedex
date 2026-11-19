const CACHE_NAME = 'pokedex-offline-v1';

// Core files required for the app shell to load offline
// Add any other local JSON/data files your app uses to this list!
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css', 
  '/app.js',
  '/manifest.json',
  '/pokemon.json'
];

// 1. Install Event: Cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching core assets...');
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches if you update CACHE_NAME
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Serve from cache first, fallback to network & cache new images/data
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network and save a copy to the cache
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response (including opaque responses from external image CDNs)
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Optional: Return a fallback if offline and resource wasn't cached
        console.log('Offline and resource not cached:', event.request.url);
      });
    })
  );
});