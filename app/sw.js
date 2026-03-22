/**
 * sw.js — Service Worker
 *
 * Cache-first for same-origin assets only.
 * Cross-origin requests (fonts, CDN) are always passed to the network.
 *
 * Bump CACHE_VERSION whenever you deploy updated files.
 */

const CACHE_VERSION = "v3";
const CACHE_NAME = `recipes-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/main.js",
  "/data.js",
  "/manifest.json",
  "/data/recipes.json",
  "/extractor/categoriser.js",
  "/views/shopping.js",
  "/views/mise.js",
  "/views/cook.js",
  "/views/editor.js",
  "/views/flow.js",
  "/storage.js",
];

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: same-origin only ───────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Never intercept cross-origin requests (fonts, CDN, etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
