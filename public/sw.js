// Service worker kill-switch.
// We intentionally unregister and clear caches to prevent stale chunk/cache issues on deploys.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        clients.forEach((client) => {
          client.navigate(client.url);
        });
      })
      .catch(() => undefined)
  );
});

self.addEventListener("fetch", () => {
  // No-op by design.
});
