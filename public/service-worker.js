/**
 * Xeno AI Service Worker
 * - Provides caching for API responses
 * - Handles offline functionality
 * - Manages background sync for data acquisition
 */

// Cache name with version
const CACHE_NAME = 'xeno-ai-cache-v1';

// Resources to cache on install
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing');
  
  // Skip waiting to ensure the latest service worker activates immediately
  self.skipWaiting();
  
  // Precache core assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(PRECACHE_RESOURCES);
      })
      .catch(error => {
        console.error('Service Worker: Precaching failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating');
  
  // Claim clients so the service worker is in control immediately
  event.waitUntil(self.clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => {
            console.log('Service Worker: Removing old cache', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
});

// Fetch event - serve cached responses or fetch from network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip WebSocket connections
  if (event.request.url.includes('/ws')) {
    return;
  }
  
  // API requests - network first, then cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache a clone of the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // If network fails, try the cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For non-API requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Cache miss - get from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Cache a clone of the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(error => {
        console.error('Service Worker: Fetch error', error);
        // Network & cache both failed
        return new Response('Network and cache both failed.');
      })
  );
});

// Handle background sync for data acquisition
self.addEventListener('sync', event => {
  if (event.tag === 'data-acquisition-sync') {
    console.log('Service Worker: Running data acquisition background sync');
    event.waitUntil(
      fetch('/api/data-acquisition/sync')
        .then(response => {
          if (!response.ok) throw new Error('Sync failed');
          return response.json();
        })
        .then(data => {
          console.log('Service Worker: Background sync completed', data);
        })
        .catch(error => {
          console.error('Service Worker: Background sync failed', error);
        })
    );
  }
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Xeno AI';
  const options = {
    body: data.body || 'New information is available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  // Open a window when the notification is clicked
  event.waitUntil(
    clients.openWindow('/')
  );
});