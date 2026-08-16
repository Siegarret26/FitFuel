/* FitFuel service worker — caches the app shell so it opens offline after the
   first visit. AI and cloud sync still need a connection. */
const CACHE_NAME = "fitfuel-v2";
const SHELL = [
  "./", "./index.html", "./manifest.json",
  "./css/01-base.css", "./css/02-components.css", "./css/03-navigation.css",
  "./css/04-auth.css", "./css/05-activity.css", "./css/06-home.css",
  "./css/07-workouts.css", "./css/08-meals.css", "./css/09-settings.css",
  "./css/10-modals.css", "./css/11-ai-coach.css", "./css/12-landing.css",
  "./css/13-features.css",
  "./js/01-config.js", "./js/02-calculations.js", "./js/03-data.js",
  "./js/04-ui-shared.js", "./js/05-landing-auth.js", "./js/06-cards-modals.js",
  "./js/07-activity.js", "./js/08-page-home.js", "./js/09-page-workouts.js",
  "./js/10-page-meals.js", "./js/11-page-nutrition.js", "./js/12-page-progress.js",
  "./js/13-page-profile.js", "./js/14-page-coach.js", "./js/15-page-settings.js",
  "./js/16-app.js",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
