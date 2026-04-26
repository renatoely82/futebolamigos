const CACHE_NAME = 'barcelombra-v1';
const OFFLINE_URL = '/offline.html';

// Recursos estáticos para pré-cachear na instalação do SW
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Remove caches de versões antigas
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  // Só intercepta GET de navegação (páginas) — não toca em API calls
  if (event.request.method !== 'GET') return;
  if (!event.request.headers.get('accept')?.includes('text/html')) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL)
    )
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Barcelombra Fútbol', body: event.data.text() };
  }

  const title = data.title || 'Barcelombra Fútbol';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/partidas' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/partidas';
  event.waitUntil(clients.openWindow(url));
});
