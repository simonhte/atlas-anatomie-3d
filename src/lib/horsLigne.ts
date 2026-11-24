// Côté app du mode hors ligne : enregistrement du service worker (outils/sw.js),
// détection des mises à jour, état du stockage et téléchargement par groupes.

export type Groupe = 'coeur' | 'essentiel' | 'coupes' | 'hd';
export interface FichierHL { u: string; h: string; t: number; g: Groupe }
export interface ListeHL { version: string; fichiers: FichierHL[] }

export const GROUPES: { id: Groupe; nom: string; detail: string }[] = [
  { id: 'coeur', nom: "L'application", detail: 'pages, code, polices, liste des structures' },
  { id: 'essentiel', nom: 'Modèles 3D (version légère)', detail: 'tout le corps, suffisant sur téléphone' },
  { id: 'coupes', nom: 'Coupes de scanner', detail: 'axiales, coronales et sagittales' },
  { id: 'hd', nom: 'Modèles 3D haute définition', detail: 'plus fins, conseillés sur Mac et tablette' },
];

const CACHE = 'atlas-fichiers';
const BASE = new URL(import.meta.env.BASE_URL, location.href).href;
export const cleCache = (f: FichierHL) => `${BASE}${encodeURI(f.u)}?v=${f.h}`;

/** Service worker disponible ? (pas en mode développement, et seulement en https ou localhost) */
export const swPossible = () => import.meta.env.PROD && 'serviceWorker' in navigator && isSecureContext;

/**
 * Enregistre le service worker. `surMiseAJour` est appelé quand une nouvelle
 * version est prête : il reçoit une fonction qui l'active et recharge la page.
 */
export async function enregistrer(surMiseAJour: (appliquer: () => void) => void) {
  if (!swPossible()) return;
  const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  const proposer = (w: ServiceWorker) => surMiseAJour(() => {
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    w.postMessage({ type: 'activer' });
  });
  // une mise à jour déjà téléchargée qui attend
  if (reg.waiting && navigator.serviceWorker.controller) proposer(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w?.addEventListener('statechange', () => {
      // « installed » avec un contrôleur existant = mise à jour (sinon : première installation)
      if (w.state === 'installed' && navigator.serviceWorker.controller) proposer(w);
    });
  });
  // vérifier les mises à jour toutes les heures si l'app reste ouverte
  setInterval(() => reg.update().catch(() => {}), 3600_000);
}

export async function chargerListe(): Promise<ListeHL> {
  const r = await fetch(`${import.meta.env.BASE_URL}hors-ligne.json`);
  if (!r.ok) throw new Error('Liste des fichiers introuvable');
  return r.json();
}

/** Fichiers déjà présents sur l'appareil (ensemble des chemins). */
export async function presents(liste: ListeHL): Promise<Set<string>> {
  const cache = await caches.open(CACHE);
  const cles = new Set((await cache.keys()).map((r) => r.url));
  return new Set(liste.fichiers.filter((f) => cles.has(cleCache(f))).map((f) => f.u));
}

/**
 * Télécharge les fichiers manquants des groupes demandés. C'est le service
 * worker qui les range dans le cache au passage. `progres(fait, total)` en octets.
 */
export async function telecharger(
  liste: ListeHL, groupes: Groupe[], deja: Set<string>, progres: (fait: number, total: number) => void, signal?: AbortSignal,
) {
  if (!navigator.serviceWorker.controller) throw new Error("Recharge la page une fois, puis réessaie (le mode hors ligne s'installe).");
  // demander au navigateur de ne pas effacer ces données quand l'espace manque
  await navigator.storage?.persist?.().catch(() => false);
  const a = liste.fichiers.filter((f) => groupes.includes(f.g) && !deja.has(f.u));
  const total = a.reduce((s, f) => s + f.t, 0);
  let fait = 0, i = 0;
  progres(0, total);
  const ouvrier = async () => {
    while (i < a.length) {
      if (signal?.aborted) return;
      const f = a[i++];
      const r = await fetch(`${import.meta.env.BASE_URL}${f.u}`, { signal });
      if (!r.ok) throw new Error(`${f.u} : erreur ${r.status}`);
      await r.arrayBuffer(); // lire jusqu'au bout pour que le cache soit complet
      deja.add(f.u);
      fait += f.t;
      progres(fait, total);
    }
  };
  await Promise.all(Array.from({ length: 6 }, ouvrier));
}

/** Supprime du cache les fichiers des groupes indiqués. */
export async function supprimer(liste: ListeHL, groupes: Groupe[]) {
  const cache = await caches.open(CACHE);
  await Promise.all(liste.fichiers.filter((f) => groupes.includes(f.g)).map((f) => cache.delete(cleCache(f))));
}

export const mo = (o: number) => `${(o / 1e6).toFixed(o < 1e7 ? 1 : 0).replace('.', ',')} Mo`;
