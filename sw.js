/* Telegram WebApp cache (GitHub Pages) */
const SW_VERSION = new URL(self.location.href).searchParams.get("v") || "1";
const CACHE_NAME = "avtolink-webapp-cache-v5" + SW_VERSION;

const CORE = ["./", "./index.html"]; // sw.js сам кэшировать не обязательно

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // reload — чтобы GitHub Pages не отдал старое из HTTP cache
      await cache.addAll(CORE.map((u) => new Request(u, { cache: "reload" })));
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Не трогаем не-GET
  if (req.method !== "GET") return;

  // HTML навигации: stale-while-revalidate
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match("./index.html", { ignoreSearch: true });

      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put("./index.html", res.clone());
          return res;
        })
        .catch(() => null);

      return cached || fetchPromise || Response.error();
    })());
    return;
  }

  const url = new URL(req.url);

  // same-origin: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });

      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })());
  }
});
