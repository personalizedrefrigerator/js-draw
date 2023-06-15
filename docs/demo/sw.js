// Service worker.
// See https://developer.chrome.com/docs/workbox/caching-strategies-overview/ for service-worker-related documentation.

const cacheName = 'v1';

self.addEventListener('fetch', event => {
	// We need to pass a Promise to event.respondWith — event.respondWith
	// must be called synchronously within 'fetch'. See
	// https://stackoverflow.com/a/46839810
	event.respondWith((async () => {
		const cache = await caches.open(cacheName);
		try {
			const fetched = await fetch(event.request.url);
			cache.put(event.request, fetched.clone());
			return fetched;
		} catch (e) {
			console.warn('Error fetching,', e);
			return cache.match(event.request.url);
		}
	})());
});
