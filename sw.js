
const CACHE = 'gota-v2';

const URLS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key =>
            key.startsWith('gota-') && key !== CACHE
          )
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (
    request.method !== 'GET' ||
    new URL(request.url).pathname.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          event.waitUntil(
            caches.open(CACHE)
              .then(cache => cache.put(request, copy))
          );
        }

        return response;
      })
      .catch(async () => {
        return (
          await caches.match(request) ||
          await caches.match('./index.html') ||
          Response.error()
        );
      })
  );
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      body: event.data ? event.data.text() : ''
    };
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || '💧 Hora de beber água!',
      {
        body: data.body || 'Cuide da sua hidratação.',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'gota-push',
        data: {
          url: './'
        }
      }
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const url = new URL('./', self.registration.scope).href;

      const windows = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      const existing = windows.find(
        window => window.url.startsWith(self.registration.scope)
      );

      if (existing) {
        return existing.focus();
      }

      return clients.openWindow(url);
    })()
  );
});
