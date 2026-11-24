// Chargement des métadonnées des structures et construction de l'arborescence
// système → région → groupe → structure.

import type { Region, Structure, Systeme } from './types';
import { avecCote } from './nommage';

export const SYSTEMES: Systeme[] = [
  { id: 'os', nom: 'Squelette', couleur: '#e9dfc8' },
  // Étapes suivantes : muscles, artères, veines, nerfs, organes…
];

export const REGIONS: Region[] = [
  { id: 'tete', nom: 'Tête' },
  { id: 'cou', nom: 'Cou' },
  { id: 'rachis', nom: 'Rachis' },
  { id: 'thorax', nom: 'Thorax' },
  { id: 'abdomen', nom: 'Abdomen' },
  { id: 'bassin', nom: 'Bassin et périnée' },
  { id: 'membre-sup', nom: 'Membre supérieur' },
  { id: 'membre-inf', nom: 'Membre inférieur' },
];

export const nomRegion = (id: string) => REGIONS.find((r) => r.id === id)?.nom ?? id;
export const nomSysteme = (id: string) => SYSTEMES.find((s) => s.id === id)?.nom ?? id;

/** Nom affiché avec latéralité : « Fémur droit » */
export const nomComplet = (s: Structure) => avecCote(s.fr, s.genre, s.cote);

export async function chargerStructures(base = import.meta.env.BASE_URL): Promise<Structure[]> {
  const rep = await fetch(`${base}data/structures.json`);
  if (!rep.ok) throw new Error(`Impossible de charger les structures (HTTP ${rep.status})`);
  const json = await rep.json();
  return json.structures as Structure[];
}

export interface NoeudArbre {
  id: string;
  nom: string;
  enfants?: NoeudArbre[];
  /** Feuille : identifiant du maillage */
  structure?: string;
}

/** Arborescence système → région → groupe → structures (droite avant gauche). */
export function construireArbre(structures: Structure[]): NoeudArbre[] {
  const ordreRegion = (r: string) => {
    const i = REGIONS.findIndex((x) => x.id === r);
    return i < 0 ? 99 : i;
  };
  return SYSTEMES.map((sys) => {
    const duSys = structures.filter((s) => s.systeme === sys.id);
    const regions = [...new Set(duSys.map((s) => s.region))].sort((a, b) => ordreRegion(a) - ordreRegion(b));
    return {
      id: sys.id,
      nom: sys.nom,
      enfants: regions.map((r) => {
        const deR = duSys.filter((s) => s.region === r);
        const groupes = [...new Set(deR.map((s) => s.groupe))];
        return {
          id: `${sys.id}/${r}`,
          nom: nomRegion(r),
          enfants: groupes.map((g) => ({
            id: `${sys.id}/${r}/${g}`,
            nom: g,
            enfants: deR
              .filter((s) => s.groupe === g)
              .sort((a, b) => a.fr.localeCompare(b.fr, 'fr', { numeric: true }) || (a.cote ?? '').localeCompare(b.cote ?? ''))
              .map((s) => ({ id: s.id, nom: nomComplet(s), structure: s.id })),
          })),
        };
      }),
    };
  });
}
