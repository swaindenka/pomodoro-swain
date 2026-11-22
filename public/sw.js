/*
 * Service worker: uygulamayı ana ekrana eklenebilir yapar ve internet yokken de açılmasını sağlar.
 * Önce ağdan dener (her zaman en güncel sürüm), ağ yoksa son kaydedilen kopyayı verir.
 * Çok oyunculu bağlantı (/ws) ve sağlık kontrolü önbelleğe alınmaz.
 */
const CACHE = 'pomodoro-room-v3';

const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/config.js',
  'js/shared.js',
  'js/util.js',
  'js/audio.js',
  'js/art.js',
  'js/items.js',
  'js/seasonal.js',
  'js/pets.js',
  'js/game.js',
  'js/todos.js',
  'js/timer.js',
  'js/stats.js',
  'js/breaks.js',
  'js/goal.js',
  'js/journal.js',
  'js/calendar.js',
  'js/net.js',
  'js/editor.js',
  'js/main.js',
  'js/lighting.js',
  'js/layout.js',
  'js/pwa.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/ws') || url.pathname.endsWith('/healthz')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        // davet bağlantısı gibi ?oda=… içeren adresler de çevrimdışıyken ana sayfayı açar
        caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((hit) => hit || caches.match('index.html')),
      ),
  );
});
