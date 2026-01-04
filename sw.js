/* Telegram WebApp cache (GitHub Pages) — FAST
   Стратегия: app-shell cache-first + background update (stale-while-revalidate)
*/
const CACHE_NAME = "avtolink-webapp-cache-v6";
const ASSETS = ["./", "./index.html", "./sw.js"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      // cache only успешные ответы
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);

  // отдаём кэш сразу, а обновление — в фоне
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Навигация (открытие index.html): cache-first, чтобы заходило быстрее
  if (req.mode === "navigate") {
    event.respondWith(staleWhileRevalidate("./index.html"));
    return;
  }

  // Только same-origin ресурсы — через SWR
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
  }
});
