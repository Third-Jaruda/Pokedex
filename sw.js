/**
 * Pokédex Service Worker
 *
 * Provides Progressive Web App (PWA) offline support.
 * Implements a hybrid caching architecture:
 * - Network-First: Application Shell (HTML, CSS, JS, JSON) ensuring live updates during development.
 * - Cache-First: Media assets (sprites, icons) for instant rendering and bandwidth savings.
 */

const CACHE_NAME = 'pokedex-offline-v5';

// Core Application Shell assets required for offline boot
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './pokemon.json'
];

// =============================================================================
// 1. INSTALL EVENT
// =============================================================================
// Pre-cache core application shell files and activate the new worker immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// =============================================================================
// 2. ACTIVATE EVENT
// =============================================================================
// Purge deprecated cache versions and claim all open client tabs immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cache) => cache !== CACHE_NAME)
          .map((cache) => caches.delete(cache))
      );
    })
  );
  self.clients.claim();
});

// =============================================================================
// 3. FETCH EVENT (HYBRID CACHING STRATEGY)
// =============================================================================
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isImage = event.request.destination === 'image' || 
                  url.pathname.includes('/sprites/') || 
                  url.pathname.includes('/splash/');

  if (isImage) {
    // Strategy A: Cache-First, fallback to Network (For sprite images & splash icons)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {});
      })
    );
  } else {
    // Strategy B: Network-First, fallback to Cache (For HTML, CSS, JS, and JSON data)
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // When offline, fall back to the cached version of the requested asset
        return caches.match(event.request);
      })
    );
  }
});
