/* =========================================================================
   Service worker — Suivi de projet PRISMAE
   Objectif : installation "écran d'accueil" + chargement instantané en visite
   répétée, SANS jamais servir de données périmées.
   Stratégie :
     - Navigations (pages HTML) : réseau d'abord → HTML frais après un déploiement,
       repli sur le cache si hors-ligne.
     - Autres ressources same-origin (CSS, polices, images) : cache d'abord +
       revalidation en arrière-plan (stale-while-revalidate).
     - Requêtes cross-origin (Supabase, CDN, analytics) : NON interceptées → le
       suivi reste toujours à jour (données réseau direct).
   ⚠️ Incrémente VERSION quand des assets (CSS/polices/icônes) changent, pour
      forcer le renouvellement du cache.
   ========================================================================= */
const VERSION = "v1";
const CACHE = "suivi-" + VERSION;
const CORE = ["./", "./suivi.html", "./styles.css", "./styles-studio.css", "./fonts.css", "./logo-prismae.svg"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // laisse passer Supabase / CDN / analytics

  // Navigations : réseau d'abord, repli cache hors-ligne.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./suivi.html")))
    );
    return;
  }

  // Autres ressources same-origin : cache d'abord + revalidation.
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
