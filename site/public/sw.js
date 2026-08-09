/*
 * Sucopeku service worker.
 *
 * Plain JavaScript, served verbatim — it is not bundled, so its URL is stable
 * and its scope is the directory it sits in. See research.md D8.
 *
 * Two strategies, and the split is the whole design:
 *
 *   Navigation requests  → network first, cache as fallback.
 *     index.html is the only mutable object in a deployment, so a visitor with
 *     a working network must always get the current one. Falling back to cache
 *     only when the network fails is what satisfies FR-028 (offline) without
 *     violating FR-029 (never pinned to a stale version).
 *
 *     Navigations are cached under their path alone, with the query discarded.
 *     Every ?puzzle= address serves the same document, so keeping the query
 *     would fill the cache with identical copies and — worse — make an offline
 *     visit to a puzzle address miss a document we are already holding.
 *
 *   Everything else      → cache first, network as fallback.
 *     Asset filenames contain a hash of their contents, so a cached asset can
 *     never be a stale version of a different file. Cache-first is therefore
 *     safe as well as fast.
 */

const CACHE_PREFIX = 'sucopeku-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;

self.addEventListener('install', (event) => {
  // Nothing is precached: with no build-time manifest, the cache is populated
  // by what the first visit actually fetches. Activate immediately so offline
  // support is available on the next navigation rather than the next visit.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only same-origin GETs are ours to handle. Third-party requests (an ad, for
  // example) are left entirely alone — Principle IV requires gameplay to work
  // when they fail, not for us to manage them.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  // The document is the same whichever puzzle the address names, so the query
  // is not part of the key. Which puzzle to show is decided in the page, from
  // the address the browser still has.
  const url = new URL(request.url);
  url.search = '';
  const key = url.toString();

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(key, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(key);
    if (cached) return cached;

    // A navigation to a path we have never seen, with no network. Fall back to
    // whatever entry document we do hold, which is the site itself.
    const fallback = await cache.match(new URL('./', request.url).toString());
    if (fallback) return fallback;

    return new Response('Offline, and this page has not been visited before.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}
