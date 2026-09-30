// Web build only (registered from main.svelte.js). Scope is the directory it is
// served from, so each deployed build (/master/, /latest/, a release) keeps its
// own cache. vite.config.mjs stamps the version and commit into CACHE_VERSION,
// so a new deploy drops the previous build's cache on activation.

const CACHE_VERSION = "rotorflight-configurator-__APP_VERSION__-__COMMIT_HASH__";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./images/favicon/favicon-192.png",
  "./images/favicon/favicon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_VERSION)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseCopy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseCopy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseCopy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseCopy));
        return response;
      });
    }),
  );
});
