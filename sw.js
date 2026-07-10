/* SBS Green Seeds — Service Worker (habilita instalação PWA + funciona offline no shell).
   Estratégia: network-first para navegação (sempre pega o HTML novo do deploy),
   cache-first para assets estáticos. Chamadas /api/* NUNCA são cacheadas. */
const CACHE = 'sbs-v6';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca cachear o backend
  if (url.pathname.startsWith('/api/')) return;

  // Navegação (HTML): SEMPRE busca a versão nova do servidor (ignora cache HTTP),
  // cai no cache só se estiver offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'reload' }).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html').then((m) => m || caches.match('./')))
    );
    return;
  }

  // Assets: cache-first
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      if (r && r.status === 200 && r.type === 'basic') { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return r;
    }).catch(() => m))
  );
});
