self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'SearchPadi';
    const options = {
        body: data.body || 'You have a new notification',
        icon: 'https://i.postimg.cc/vBGbJsLw/grok-1771024869365-Photoroom-(1).png',
        badge: 'https://i.postimg.cc/vBGbJsLw/grok-1771024869365-Photoroom-(1).png',
        vibrate: [200, 100, 200],
        data: { url: self.location.origin }
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
