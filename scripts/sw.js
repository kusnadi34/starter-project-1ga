const CACHE_NAME = 'storyapp-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.bundle.js',
  '/app.css',
  '/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});


self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/stories') || url.pathname.includes('/story/')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(() => caches.match('/index.html'))
    );
  }
});

self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  const title = data.title || 'Story App';
  const options = {
    body: data.body || 'Ada cerita baru nih!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});