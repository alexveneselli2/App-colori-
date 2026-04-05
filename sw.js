// Iride Service Worker — minimal, handles notification click
const CACHE = 'iride-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Cache-first for static assets
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  )
})

// Open app when notification is clicked
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length) return clients[0].focus()
      return self.clients.openWindow('/')
    })
  )
})
