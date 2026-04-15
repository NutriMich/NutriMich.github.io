// ══════════════════════════════════════════════════
// SERVICE WORKER — nutrimich.github.io
// Diana Lara · Nutrióloga Clínica
// ══════════════════════════════════════════════════

const CACHE_NAME = 'nutrimich-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/clinico.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap',
];

// ── INSTALACIÓN: guarda los archivos en caché ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        CACHE_URLS.map(url =>
          cache.add(url).catch(() => {
            // Si una URL falla (ej. fuentes sin conexión) continúa igual
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVACIÓN: limpia cachés antiguas ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: sirve desde caché, con fallback a red ──
self.addEventListener('fetch', event => {
  // Solo interceptar GET
  if (event.request.method !== 'GET') return;

  // Estrategia: Cache First → Network Fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // No está en caché — ir a la red y guardar para la próxima
      return fetch(event.request)
        .then(response => {
          // Solo guardar respuestas válidas de nuestro dominio y fuentes
          if (
            response.ok &&
            (event.request.url.includes('nutrimich.github.io') ||
             event.request.url.includes('fonts.googleapis.com') ||
             event.request.url.includes('fonts.gstatic.com'))
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Sin red y sin caché — página de fallback offline
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// ── MENSAJE: forzar actualización desde la UI ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
