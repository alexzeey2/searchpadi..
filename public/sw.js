// SearchPadi Service Worker
// Handles: push notifications + app shell caching for Vite build

const CACHE_NAME = 'searchpadi-v1';

// App shell files Vite generates — cache these for offline/fast load
const APP_SHELL = [
    '/',
    '/index.html',
    '/offline.html',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                APP_SHELL.map(url =>
                    cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Supabase API — always network, never cache
    if (url.includes('supabase.co')) return;

    // Navigation requests — network first, fall back to cached index or offline page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() =>
                    caches.match(event.request)
                        .then(cached => cached || caches.match('/offline.html'))
                )
        );
        return;
    }

    // Static assets (JS, CSS, images) — cache first, then network
    if (
        url.includes('/assets/') ||
        event.request.destination === 'script' ||
        event.request.destination === 'style' ||
        event.request.destination === 'image'
    ) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) {
                    // Serve from cache, refresh in background
                    fetch(event.request).then(fresh => {
                        if (fresh.ok) {
                            caches.open(CACHE_NAME).then(cache => cache.put(event.request, fresh));
                        }
                    }).catch(() => {});
                    return cached;
                }
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'SearchPadi';
    const options = {
        body: data.body || 'You have a new notification',
        icon: 'https://i.postimg.cc/vBGbJsLw/grok-1771024869365-Photoroom-(1).png',
        badge: 'https://i.postimg.cc/vBGbJsLw/grok-1771024869365-Photoroom-(1).png',
        vibrate: [200, 100, 200],
        data: { url: data.url || self.location.origin }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
