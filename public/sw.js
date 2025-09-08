// Nyuchi Africa - Service Worker for Africa-Optimized Performance
// Aggressive caching strategy for slow network conditions

const CACHE_NAME = 'nyuchi-v1.2.0';
const STATIC_CACHE = 'nyuchi-static-v1';
const DYNAMIC_CACHE = 'nyuchi-dynamic-v1';

// Critical resources that must be cached
const CRITICAL_RESOURCES = [
  '/',
  '/core/styles/global.css',
  '/nyuchi-logo-dark-white.png',
  '/nyuchi-logo-dark-purple.png',
  // Core pages
  '/about',
  '/contact',
  '/products',
  // Fonts (cached from Google Fonts)
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600&family=Playfair+Display:wght@400;500;600&display=swap'
];

// Resources to cache on demand
const CACHEABLE_URLS = [
  /^https:\/\/images\.unsplash\.com\/.*/,
  /^https:\/\/fonts\.googleapis\.com\/.*/,
  /^https:\/\/fonts\.gstatic\.com\/.*/
];

// Network-first resources (dynamic content)
const NETWORK_FIRST = [
  '/api/',
  '/dashboard/',
  '/admin/'
];

// Install event - cache critical resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker for Africa optimization...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES.map(url => {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .then(() => {
        console.log('[SW] Critical resources cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.warn('[SW] Failed to cache some critical resources:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other protocols
  if (!request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Network-first strategy for dynamic content
    if (NETWORK_FIRST.some(pattern => url.pathname.startsWith(pattern))) {
      return await networkFirst(request);
    }
    
    // Cache-first strategy for static resources
    if (CRITICAL_RESOURCES.some(resource => url.pathname === resource || url.href === resource)) {
      return await cacheFirst(request);
    }
    
    // Stale-while-revalidate for images and external resources
    if (CACHEABLE_URLS.some(pattern => pattern.test(url.href))) {
      return await staleWhileRevalidate(request);
    }
    
    // Default: Network first with cache fallback
    return await networkFirst(request);
    
  } catch (error) {
    console.warn('[SW] Request failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return await caches.match('/') || new Response('Offline', { status: 503 });
    }
    
    // Return cached response if available
    return await caches.match(request) || new Response('Resource unavailable offline', { status: 503 });
  }
}

// Cache-first strategy - for critical static resources
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Optionally update cache in background
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network-first strategy - for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request, { 
      timeout: 10000 // 10 second timeout for Africa networks
    });
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving cached response for:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale-while-revalidate - for images and external resources
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Always try to update cache in background
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then(c => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(error => {
      console.warn('[SW] Background update failed:', error);
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // No cached version, wait for network
  return await networkPromise;
}

// Background cache update
async function updateCacheInBackground(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response);
      console.log('[SW] Background cache update for:', request.url);
    }
  } catch (error) {
    console.warn('[SW] Background update failed:', error);
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync...');
  // Implement offline action sync here
}

// Push notifications support
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/nyuchi-logo-dark-purple.png',
    badge: '/nyuchi-logo-dark-white.png',
    data: data.url,
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

console.log('[SW] Nyuchi Africa Service Worker loaded - Optimized for African networks');