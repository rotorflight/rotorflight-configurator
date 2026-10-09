// Web build only (registered from main.svelte.js). Scope is the directory it is
// served from, so each deployed build (/master/, /latest/, /v2.3/, a release)
// keeps its own cache. vite.config.mjs stamps the version and commit into
// CACHE_VERSION, so a new deploy drops the previous build's cache on
// activation.
//
// All of them share one origin, and so one CacheStorage. Several of them can
// be installed as apps side by side, so a build only ever drops the caches of
// its own scope -- never another installed version's offline copy -- and
// only ever reads from its own cache.

const CACHE_PREFIX = `rotorflight-configurator@${self.registration.scope}@`;
const CACHE_VERSION = `${CACHE_PREFIX}__APP_VERSION__-__COMMIT_HASH__`;
// Caches from before they were named by scope. Nothing reads them any more,
// so any build may drop them.
const LEGACY_CACHE_PREFIX = "rotorflight-configurator-";
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
            .filter(
              (cacheName) =>
                cacheName.startsWith(LEGACY_CACHE_PREFIX) ||
                (cacheName.startsWith(CACHE_PREFIX) &&
                  cacheName !== CACHE_VERSION),
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// caches.match() would search every build's cache on the origin.
function matchOwn(request) {
  return caches.open(CACHE_VERSION).then((cache) => cache.match(request));
}

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
        .catch(() => matchOwn(request).then((cached) => cached || matchOwn("./index.html"))),
    );
    return;
  }

  event.respondWith(
    matchOwn(request).then((cached) => {
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
