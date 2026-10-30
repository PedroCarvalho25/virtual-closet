/* Only the local, explicitly labelled design preview registers this worker. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname !== 'closet-test.supabase.co') return;
  const local = new URL(`/__fixture${url.pathname}${url.search}`, self.location.origin);
  event.respondWith(
    (async () => {
      const request = event.request;
      return fetch(local, {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      });
    })(),
  );
});
