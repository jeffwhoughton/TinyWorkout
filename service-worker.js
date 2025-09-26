const CACHE_NAME = 'tiny-workout-cache-v2';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/pushup.png', // Add all your exercise icons here
    '/icons/squats.png',
    '/icons/pullup.png',
    '/icons/stretch.png',
    '/icons/rows.png',
    '/icons/run.png',
    '/icons/plank.png',
    '/icons/bicycles.png',
    '/icons/dumbbell.png',
    '/icons/barbell.png',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'
];

// Install a service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

// Cache and return requests
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});

// Update a service worker
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});