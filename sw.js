const CACHE_NAME = 'rl-barbershop-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './logo.jpeg',
  './manifest.json'
];

// Instalação do Service Worker e Cache de Ativos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Ativação e Limpeza de Cache Antigo
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptação de Requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna o cache se encontrar, senão faz a requisição na rede
        return response || fetch(event.request);
      })
  );
});
