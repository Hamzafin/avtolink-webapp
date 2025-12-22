/* Telegram WebApp cache (GitHub Pages) */
const CACHE_NAME = "avtolink-webapp-cache-v3"; // <-- поменял v1 -> v2

const APP_SHELL = [
  "./",
  "./index.html",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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

  // ✅ Быстрое открытие WebApp: всегда отдаём app-shell из кэша (если есть)
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) => {
        const network = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
            return res;
          })
          .catch(() => cached);

        // cache-first, update in background
        return cached || network;
      })
    );
    return;
  }

  // Остальное: cache-first для same-origin
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        });
      })
    );
  }
});
