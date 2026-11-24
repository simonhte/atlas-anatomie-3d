// Service worker de l'Atlas 3D : rend l'app utilisable sans connexion.
// Ce fichier est un modèle : la construction (outils/vite-hors-ligne.ts)
// remplace les deux valeurs ci-dessous par la version et la liste des fichiers.
//
// Principe :
//   - chaque fichier est rangé dans le cache sous « chemin?v=empreinte » ;
//     une nouvelle version de l'app ne retélécharge donc que ce qui a changé ;
//   - à l'installation, le « cœur » (page, code, polices, données) est copié ;
//   - ensuite, tout fichier connu demandé par l'app est servi depuis le cache
//     s'il y est, sinon téléchargé puis gardé (modèles, coupes…).
const VERSION = self.__VERSION__;
/** chemin relatif -> [empreinte, 1 si « cœur »] */
const FICHIERS = self.__FICHIERS__;
const CACHE = 'atlas-fichiers';
const BASE = new URL('./', self.location).href;

const cle = (chemin) => `${BASE}${encodeURI(chemin)}?v=${FICHIERS[chemin][0]}`;

async function garder(cache, chemin, reponse) {
  if (reponse.ok && reponse.status === 200 && reponse.type !== 'opaque') await cache.put(cle(chemin), reponse.clone());
  return reponse;
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const coeur = Object.keys(FICHIERS).filter((c) => FICHIERS[c][1]);
    for (let i = 0; i < coeur.length; i += 8) {
      await Promise.all(coeur.slice(i, i + 8).map(async (c) => {
        if (await cache.match(cle(c))) return;
        const r = await fetch(`${BASE}${c}`, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`${c} : ${r.status}`);
        await garder(cache, c, r);
      }));
    }
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // On supprime les fichiers d'anciennes versions
    const valides = new Set(Object.keys(FICHIERS).map(cle));
    const cache = await caches.open(CACHE);
    for (const req of await cache.keys()) if (!valides.has(req.url)) await cache.delete(req);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'activer') self.skipWaiting();
  if (e.data?.type === 'version') e.ports[0]?.postMessage({ version: VERSION });
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(BASE) || req.headers.has('range')) return;
  let chemin = decodeURIComponent(new URL(req.url).pathname.slice(new URL(BASE).pathname.length));
  if (req.mode === 'navigate' && (chemin === '' || chemin.endsWith('/') || chemin === 'index.html')) chemin = 'index.html';
  if (!FICHIERS[chemin]) return; // fichier inconnu : réseau normal
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const enCache = await cache.match(cle(chemin));
    if (enCache) return enCache;
    return garder(cache, chemin, await fetch(req.mode === 'navigate' ? `${BASE}${chemin}` : req));
  })());
});
