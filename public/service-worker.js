// Simplified service worker that doesn't attempt to cache or sync data for deployment
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Simple fetch passthrough
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});