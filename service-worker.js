```javascript
const CACHE_NAME = 'pinger-cache-v1';
// List the core assets to cache for offline use
const CACHE_ASSETS = [
  './', // Cache the root HTML file (ping_app.html assuming it's at the root)
  './index.html', // Common alternative for root
  './ping_app.html', // Explicitly cache the filename if known and not at root
  './manifest.json',
  './service-worker.js'
  // Note: External resources like CDN CSS (Tailwind) are not included here
  // as per the basic caching requirement. Add them if full offline styling is needed.
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching core assets');
        // Use addAll to cache all assets in the list
        return cache.addAll(CACHE_ASSETS).catch(error => {
          console.error('Service Worker: Failed to cache assets', error);
          // Log the error but don't fail the install, some assets might be optional
        });
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Remove old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event: Serve cached assets first
self.addEventListener('fetch', (event) => {
  // Check if the request is for one of the cached assets
  // Note: This simple check might not cover all cases (e.g., query strings)
  // A more robust check might compare URLs more carefully.
  const url = new URL(event.request.url);
  const isCoreAsset = CACHE_ASSETS.some(asset => {
      // Simple check: does the request URL end with the asset path?
      // This handles './' for root and specific filenames.
      return url.pathname.endsWith(asset.replace('./', '/'));
  });

  if (isCoreAsset) {
      // Cache-first strategy for core assets
      event.respondWith(
          caches.match(event.request)
              .then((response) => {
                  // Return cached response if found
                  if (response) {
                      console.log('Service Worker: Serving from cache', event.request.url);
                      return response;
                  }
                  // Otherwise, fetch from network
                  console.log('Service Worker: Fetching from network (not in cache)', event.request.url);
                  return fetch(event.request);
              })
              .catch(error => {
                  console.error('Service Worker: Cache match or fetch failed', event.request.url, error);
                  // Fallback or error handling could go here
                  // For now, just let the error propagate or return a basic response
              })
      );
  } else {
      // For all other requests (like the ping checks, external CDNs),
      // let them go to the network. The browser handles these normally.
      // The 'no-cors' requests in the app cannot be intercepted and responded to
      // by the service worker in a useful way for caching anyway.
      console.log('Service Worker: Passing through network request', event.request.url);
      return fetch(event.request); // Pass through to network
  }
});
```