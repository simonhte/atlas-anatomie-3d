// Dissection par couches.
//
// Chaque maillage a une « couche » (voir pipeline/config) :
//   0 = peau · 1 = muscles superficiels · 2 = muscles intermédiaires
//   3 = muscles profonds · (5 = vaisseaux et nerfs, 7 = organes : étape 3) · 9 = os
//
// Le curseur de dissection avance par ÉTAPES. À l'étape i, on retire toutes
// les couches strictement inférieures à SEUILS[i]. La dissection peut être
// globale ou propre à une région : l'étape effective d'un maillage est la plus
// avancée des deux.

export interface EtapeDissection {
  /** Couche retirée jusqu'à (exclue) : couche < seuil ⇒ masquée */
  seuil: number;
  /** Ce qu'on voit en surface à cette étape */
  nom: string;
}

export const ETAPES: EtapeDissection[] = [
  { seuil: 0, nom: 'Peau' },
  { seuil: 1, nom: 'Muscles superficiels' },
  { seuil: 2, nom: 'Muscles intermédiaires' },
  { seuil: 3, nom: 'Muscles profonds' },
  { seuil: 9, nom: 'Squelette' },
];

/** Régions qu'on peut disséquer séparément */
export const REGIONS_DISSECTION = ['tete', 'cou', 'dos', 'thorax', 'abdomen', 'bassin', 'membre-sup', 'membre-inf'] as const;

export interface Dissection {
  /** Étape globale (indice dans ETAPES) */
  global: number;
  /** Étape propre à certaines régions */
  regions: Record<string, number>;
}

export const DISSECTION_INITIALE: Dissection = { global: 1, regions: {} };

/** Étape effective pour une région (la plus avancée entre globale et régionale). */
export function etapeEffective(d: Dissection, region: string): number {
  // La peau est un seul maillage (« corps entier ») : elle est retirée dès
  // qu'une région quelconque est disséquée.
  if (region === 'corps') return Math.max(d.global, ...Object.values(d.regions), 0);
  return Math.max(d.global, d.regions[region] ?? 0);
}

/** Le maillage est-il retiré par la dissection ? */
export function estDisseque(couche: number, region: string, d: Dissection): boolean {
  const e = Math.min(etapeEffective(d, region), ETAPES.length - 1);
  return couche < ETAPES[e].seuil;
}

/** Avance (+1) ou recule (−1) d'une étape, globalement ou pour une région. */
export function deplacer(d: Dissection, sens: 1 | -1, region: string | null): Dissection {
  const borne = (n: number) => Math.max(0, Math.min(ETAPES.length - 1, n));
  if (!region) return { global: borne(d.global + sens), regions: { ...d.regions } };
  return { global: d.global, regions: { ...d.regions, [region]: borne(etapeEffective(d, region) + sens) } };
}
