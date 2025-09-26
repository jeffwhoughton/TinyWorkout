// CHANGE: Add the repository name to the cache name to avoid conflicts
const CACHE_NAME = 'tiny-workout-cache-v3'; 
const REPO_PREFIX = '/TinyWorkout';

// CHANGE: Prepend the repository name to all cached URLs
const URLS_TO_CACHE = [
    `${REPO_PREFIX}/`,
    `${REPO_PREFIX}/index.html`,
    `${REPO_PREFIX}/style.css`,
    `${REPO_PREFIX}/script.js`,
    `${REPO_PREFIX}/manifest.json`,
    `${REPO_PREFIX}/icons/icon-192.png`,
    `${REPO_PREFIX}/icons/icon-512.png`,
    `${REPO_PREFIX}/icons/pushup.png`,
    `${REPO_PREFIX}/icons/squats.png`,
    `${REPO_PREFIX}/icons/pullup.png`,
    `${REPO_PREFIX}/icons/stretch.png`,
    `${REPO_PREFIX}/icons/rows.png`,
    `${REPO_PREFIX}/icons/run.png`,
    `${REPO_PREFIX}/icons/plank.png`,
    `${REPO_PREFIX}/icons/bicycles.png`,
    `${REPO_PREFIX}/icons/dumbbell.png`,
    `${REPO_PREFIX}/icons/barbell.png`,
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