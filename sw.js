/* sw.js — Avtolink WebApp */
const VERSION = new URL(self.location.href).searchParams.get("v") || "1";
const CACHE_NAME = `avtolink-cache-v${VERSION}`;

const CORE = [
  "./",
  "./index.html",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    } catch (e) {}
    await self.clients.claim();
  })());
});

function isGoogleAppsScript(url) {
  return url.includes("script.google.com") || url.includes("googleusercontent.com");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Apps Script / Google resources — НЕ кэшируем (чтобы всегда было свежее)
  if (isGoogleAppsScript(url.href)) {
    event.respondWith(fetch(req));
    return;
  }

  // Навигация (index.html?type=...) — network-first
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // Статика — cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch (e) {
      return cached || new Response("", { status: 504 });
    }
  })());
});
