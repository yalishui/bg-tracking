// Service Worker for BG Tracking App
const CACHE_NAME = 'bg-tracking-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/charts.js',
  './js/gi-data.js',
  './js/ocr.js',
  './js/notifications.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Roboto+Mono:wght@500;600&display=swap',
  'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.0.woff2',
  'https://fonts.gstatic.com/s/robotomono/v23/dazS1PrQQu7HsZJWISHorEd7npA7YcJLWIurws7R9emsLg.0.woff2'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached resource if found
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request).then(response => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          var responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // Offline fallback (optional)
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      })
  );
});

// Background sync (for future use - sync data when online)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-glucose-data') {
    event.waitUntil(syncGlucoseData());
  }
});

function syncGlucoseData() {
  // Future implementation: sync local data with a server
  return Promise.resolve();
}

// Push notification event
self.addEventListener('push', event => {
  var data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  var options = {
    body: data.body || '提醒时间到了！',
    icon: './icons/icon-192.png',
    badge: './icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'bg-reminder'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'BG Tracking 提醒', options)
  );
});
