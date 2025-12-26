/**
 * Service Worker for Canada Energy Intelligence Platform
 * 
 * Provides:
 * - Offline caching for static assets
 * - Network-first strategy for API calls
 * - Background sync for data updates
 * 
 * Addresses Gap #6: Performance UX / PWA (HIGH Priority)
 */

const CACHE_NAME = 'ceip-cache-v2';
const STATIC_CACHE_NAME = 'ceip-static-v2';
const API_CACHE_NAME = 'ceip-api-v2';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// API endpoints to cache with network-first strategy
const API_PATTERNS = [
  /\/api\//,
  /supabase\.co/,
  /\.netlify\.app\/api/
];

// Files to NEVER cache (always fetch fresh)
const NO_CACHE_PATTERNS = [
  /\.yaml$/,
  /\.yml$/,
  /openapi/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('ceip-') &&
                name !== CACHE_NAME &&
                name !== STATIC_CACHE_NAME &&
                name !== API_CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // NEVER cache these files - always fetch fresh
  const shouldNeverCache = NO_CACHE_PATTERNS.some((pattern) => pattern.test(url.href));
  if (shouldNeverCache) {
    // Let the browser handle these requests directly (no SW interception)
    return;
  }

  // Check if this is an API request
  const isApiRequest = API_PATTERNS.some((pattern) => pattern.test(url.href));

  if (isApiRequest) {
    // Network-first strategy for API calls
    event.respondWith(networkFirst(request, API_CACHE_NAME));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    // Cache-first strategy for static assets
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else {
    // Network-first for HTML pages
    event.respondWith(networkFirst(request, CACHE_NAME));
  }
});

/**
 * Cache-first strategy
 * Returns cached response if available, otherwise fetches from network
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached response and update cache in background
    updateCache(request, cacheName);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first strategy
 * Tries network first, falls back to cache if offline
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Update cache in background
 */
async function updateCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Silently fail - we already have cached version
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Background sync for data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-energy-data') {
    event.waitUntil(syncEnergyData());
  }
});

async function syncEnergyData() {
  console.log('[SW] Syncing energy data in background...');
  // This would sync any pending data updates when back online
  // Implementation depends on your data sync requirements
}

console.log('[SW] Service worker loaded');
