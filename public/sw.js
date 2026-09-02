const CACHE_VERSION = "v1";
const STATIC_CACHE = `yamu-static-${CACHE_VERSION}`;
const PAGE_CACHE = `yamu-pages-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "/offline.html",
  "/yamu-logo.png",
  "/favicon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/fonts/Z20-KhitHaungg-Regular.otf",
  "/fonts/Z20-KhitHaungg-Bold.otf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("yamu-") && ![STATIC_CACHE, PAGE_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function publicPageNetworkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request))
      || (await caches.match("/offline.html"))
      || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  if (request.mode === "navigate") {
    event.respondWith(publicPageNetworkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/")
    || ["style", "script", "font", "image"].includes(request.destination)
  ) {
    event.respondWith(cacheFirst(request));
  }
});
