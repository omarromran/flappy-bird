const CACHE_NAME = 'flappy-avatar-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/biba.png',
    '/biba2.png.jpeg',
    '/hamza.png.jpeg',
    '/angelina.png',
    '/angelina2.png',
    '/jessie.png.jpeg',
    '/us.jpeg',
    '/flappy bird.jpg'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});
