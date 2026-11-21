// Minimal service worker: makes the app installable and caches the app shell.
// API calls always go to the network so chore data is never stale.
const CACHE = "choretrack-v1";

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/icon.svg", "/manifest.webmanifest"])));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) {
        return;
    }
    // Network first, falling back to the cache when offline.
    event.respondWith(
        fetch(event.request)
            .then((res) => {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(event.request, copy));
                return res;
            })
            .catch(() => caches.match(event.request).then((hit) => hit || caches.match("/"))),
    );
});
