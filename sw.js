/* Telegram WebApp cache (GitHub Pages) */
const CACHE_NAME = "avtolink-webapp-cache-v4";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["./", "./index.html", "./sw.js"])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML навигации: stale-while-revalidate (быстро открываем из cache, обновляем в фоне)
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      // Всегда отдаём index.html (у нас single-page)
      const cached = await cache.match("./index.html", { ignoreSearch: true });

      // В фоне обновим кэш
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            cache.put("./index.html", res.clone());
          }
          return res;
        })
        .catch(() => null);

      return cached || fetchPromise || Response.error();
    })());
    return;
  }

  const url = new URL(req.url);

  // Для same-origin: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
