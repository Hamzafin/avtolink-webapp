/* Telegram WebApp cache (GitHub Pages) - v10 */
const CACHE_NAME = "avtolink-webapp-cache-v10";
const CORE_ASSETS = ["./", "./index.html", "./sw.js"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Навигация (index.html): cache-first (быстро) + обновление в фоне
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put("./index.html", copy);
              cache.put(req, copy);
            });
            return res;
          })
          .catch(() => cached);

        // отдаём кеш сразу, если есть
        return cached || networkFetch;
      })
    );
    return;
  }

  const url = new URL(req.url);

  // Same-origin: stale-while-revalidate
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
