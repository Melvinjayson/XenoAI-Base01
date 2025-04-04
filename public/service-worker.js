// Xeno AI Service Worker

// Cache names
const STATIC_CACHE_NAME = 'xeno-static-v1';
const DYNAMIC_CACHE_NAME = 'xeno-dynamic-v1';
const ASSET_CACHE_NAME = 'xeno-assets-v1';

// Resources to cache immediately (static assets)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Function to open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xeno-ai-offline-db', 2);
    
    request.onerror = (event) => {
      reject(new Error('Could not open offline database'));
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('offline-messages')) {
        const messagesStore = db.createObjectStore('offline-messages', { keyPath: 'id', autoIncrement: true });
        messagesStore.createIndex('synced', 'synced', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('offline-canvas-data')) {
        const canvasStore = db.createObjectStore('offline-canvas-data', { keyPath: 'id', autoIncrement: true });
        canvasStore.createIndex('synced', 'synced', { unique: false });
      }
      
      // Create a new store for API requests
      if (!db.objectStoreNames.contains('api-requests')) {
        const apiStore = db.createObjectStore('api-requests', { keyPath: 'id', autoIncrement: true });
        apiStore.createIndex('synced', 'synced', { unique: false });
        apiStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
}

// Store API request for later sync
async function storeRequestForSync(url, method, body) {
  try {
    const db = await openDatabase();
    const transaction = db.transaction('api-requests', 'readwrite');
    const store = transaction.objectStore('api-requests');
    
    // Extract the endpoint path from the full URL
    const urlObj = new URL(url);
    const endpoint = urlObj.pathname;
    
    // Store the request details
    const request = {
      endpoint,
      method,
      body,
      timestamp: Date.now(),
      synced: false
    };
    
    const requestId = await new Promise((resolve, reject) => {
      const addRequest = store.add(request);
      
      addRequest.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      addRequest.onerror = (event) => {
        reject(new Error('Failed to store API request'));
      };
    });
    
    console.log('[Service Worker] Stored request for later sync:', endpoint, method, requestId);
    return requestId;
  } catch (error) {
    console.error('[Service Worker] Error storing request:', error);
    return null;
  }
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== ASSET_CACHE_NAME
            ) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Handle API requests - with intelligent caching for GET requests
  if (event.request.url.includes('/api/')) {
    // For GET requests, we can use a cache-first strategy
    if (event.request.method === 'GET') {
      return event.respondWith(
        caches.open('xeno-api-cache-v1').then(cache => 
          // Try to get from cache first
          cache.match(event.request).then(cachedResponse => {
            // If we have a cached response, use it
            if (cachedResponse) {
              console.log('[Service Worker] Serving API response from cache:', event.request.url);
              
              // Clone the cached response
              const clonedResponse = cachedResponse.clone();
              
              // Background refresh the cache (don't wait for it)
              fetch(event.request)
                .then(networkResponse => {
                  if (networkResponse.ok) {
                    console.log('[Service Worker] Updating API cache:', event.request.url);
                    cache.put(event.request, networkResponse);
                  }
                })
                .catch(err => console.log('[Service Worker] Background refresh failed:', err));
              
              return clonedResponse;
            }
            
            // If not in cache, get from network
            return fetch(event.request)
              .then(networkResponse => {
                if (networkResponse.ok) {
                  // Clone the response and cache it
                  let responseToCache = networkResponse.clone();
                  cache.put(event.request, responseToCache);
                }
                return networkResponse;
              })
              .catch(() => {
                console.log('[Service Worker] GET API request failed, no cache available');
                return new Response(
                  JSON.stringify({
                    error: 'You are offline and this data is not available in the cache.',
                    offline: true
                  }),
                  { 
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                  }
                );
              });
          })
        )
      );
    } 
    // For non-GET requests (mutations), we need to queue them for later sync
    else {
      return event.respondWith(
        fetch(event.request)
          .catch(() => {
            // Store the request for later processing if it's a mutation
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
              // Clone the request before we read it
              const requestClone = event.request.clone();
              
              // Process the request in the background
              event.request.json().then(body => {
                // Queue the request for background sync
                storeRequestForSync(event.request.url, event.request.method, body);
                
                // Register for background sync if available
                if ('sync' in self.registration) {
                  self.registration.sync.register('sync-api-requests');
                }
              }).catch(err => console.error('Error reading request body:', err));
            }
            
            // Return the offline API error response
            return new Response(
              JSON.stringify({
                error: 'You are currently offline. This action will be queued and synced when you reconnect.',
                offline: true
              }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
    }
  }
  
  // For HTML pages, try the network first, then fall back to cached content
  // For the home route, use index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('[Service Worker] Serving offline page');
          return caches.match('/offline.html');
        })
    );
    return;
  }
  
  // For all other requests, try the cache first, then network with cache update
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Return cached response immediately
          return response;
        }
        
        // If not in cache, fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Cache successful responses in the dynamic cache
            return caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                // Only cache same-origin requests
                if (event.request.url.startsWith(self.location.origin)) {
                  cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
              });
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch error:', error);
            
            // For image requests, return a placeholder image
            if (event.request.destination === 'image') {
              return caches.match('/icons/image-placeholder.png');
            }
            
            // For other requests, just propagate the error
            throw error;
          });
      })
  );
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[Service Worker] Syncing offline messages');
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-canvas-data') {
    console.log('[Service Worker] Syncing canvas data');
    event.waitUntil(syncCanvasData());
  } else if (event.tag === 'sync-api-requests') {
    console.log('[Service Worker] Syncing API requests');
    event.waitUntil(syncApiRequests());
  } else if (event.tag === 'sync-all') {
    console.log('[Service Worker] Syncing all content');
    event.waitUntil(syncAllContent());
  }
});

// Function to sync offline messages
async function syncMessages() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction('offline-messages', 'readonly');
    const store = transaction.objectStore('offline-messages');
    
    // Get all unsynced messages
    const messages = await new Promise((resolve, reject) => {
      const request = store.index('synced').getAll(false);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(new Error('Failed to get unsynced messages'));
      };
    });
    
    // Send each message to the server
    for (const message of messages) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        });
        
        if (response.ok) {
          // Mark message as synced
          const updateTransaction = db.transaction('offline-messages', 'readwrite');
          const updateStore = updateTransaction.objectStore('offline-messages');
          
          message.synced = true;
          updateStore.put(message);
        }
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
    
    console.log('[Service Worker] Messages sync complete');
    
  } catch (error) {
    console.error('[Service Worker] Messages sync error:', error);
  }
}

// Function to sync canvas data
async function syncCanvasData() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction('offline-canvas-data', 'readonly');
    const store = transaction.objectStore('offline-canvas-data');
    
    // Get all unsynced canvas data
    const canvasItems = await new Promise((resolve, reject) => {
      const request = store.index('synced').getAll(false);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(new Error('Failed to get unsynced canvas data'));
      };
    });
    
    // Send each canvas item to the server
    for (const item of canvasItems) {
      try {
        const response = await fetch('/api/canvas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item)
        });
        
        if (response.ok) {
          // Mark item as synced
          const updateTransaction = db.transaction('offline-canvas-data', 'readwrite');
          const updateStore = updateTransaction.objectStore('offline-canvas-data');
          
          item.synced = true;
          updateStore.put(item);
        }
      } catch (error) {
        console.error('Failed to sync canvas item:', error);
      }
    }
    
    console.log('[Service Worker] Canvas data sync complete');
    
  } catch (error) {
    console.error('[Service Worker] Canvas data sync error:', error);
  }
}

// Function to sync API requests
async function syncApiRequests() {
  try {
    const db = await openDatabase();
    const transaction = db.transaction('api-requests', 'readonly');
    const store = transaction.objectStore('api-requests');
    
    // Get all unsynced API requests
    const requests = await new Promise((resolve, reject) => {
      const query = store.index('synced').getAll(false);
      
      query.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      query.onerror = (event) => {
        reject(new Error('Failed to get unsynced API requests'));
      };
    });
    
    console.log(`[Service Worker] Found ${requests.length} unsynced API requests`);
    
    // Send each request to the server
    for (const request of requests) {
      try {
        // Create the full URL
        const url = self.location.origin + request.endpoint;
        
        // Attempt to send the request
        const response = await fetch(url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request.body)
        });
        
        if (response.ok) {
          // Mark request as synced
          const updateTransaction = db.transaction('api-requests', 'readwrite');
          const updateStore = updateTransaction.objectStore('api-requests');
          
          request.synced = true;
          request.syncedAt = Date.now();
          updateStore.put(request);
          
          console.log(`[Service Worker] Successfully synced request: ${request.method} ${request.endpoint}`);
          
          // Invalidate any related GET caches to ensure fresh data
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
            // For example, if we synced a POST to /api/messages, 
            // we should invalidate the cache for GET /api/messages
            const baseEndpoint = request.endpoint.split('/').slice(0, -1).join('/') || request.endpoint;
            
            // Open the API cache
            const cache = await caches.open('xeno-api-cache-v1');
            
            // Get all cached requests
            const cachedRequests = await cache.keys();
            
            // Find any that match the base endpoint
            const relatedRequests = cachedRequests.filter(req => 
              req.url.includes(baseEndpoint) && req.method === 'GET'
            );
            
            // Delete them from the cache
            for (const req of relatedRequests) {
              await cache.delete(req);
              console.log(`[Service Worker] Invalidated cache for: ${req.url}`);
            }
          }
        } else {
          console.error(`[Service Worker] Sync failed with status: ${response.status} for ${request.method} ${request.endpoint}`);
        }
      } catch (error) {
        console.error(`[Service Worker] Error syncing request ${request.id}:`, error);
      }
    }
    
    console.log('[Service Worker] API requests sync complete');
    
  } catch (error) {
    console.error('[Service Worker] API requests sync error:', error);
  }
}

// Function to sync all offline content
async function syncAllContent() {
  await Promise.all([
    syncMessages(),
    syncCanvasData(),
    syncApiRequests()
  ]);
  
  console.log('[Service Worker] All content synced');
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        const url = event.notification.data.url;
        
        // If a window is already open, focus it and navigate to the URL
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});