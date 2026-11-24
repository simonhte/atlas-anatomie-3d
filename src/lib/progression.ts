// Progression et répétition espacée (algorithme FSRS, bibliothèque ts-fsrs).
//
// Chaque question est une « carte » identifiée par une chaîne stable, ex. :
//   identifier:femur|d        reconnaître le fémur droit sur le modèle
//   pointer:femur|d           le montrer sur le modèle
//   fiche:deltoide:Innervation   question de cours
//   coupe:liver               reconnaître le foie sur une coupe de scanner
// Une réponse fausse fait revenir la carte vite ; une bonne réponse l'espace.
// Tout est stocké sur l'appareil (localStorage) et peut être exporté/importé.

import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

export { Rating };
export type Note = Grade; // Again (1), Hard (2), Good (3), Easy (4)

export interface MetaCarte {
  type: 'identifier' | 'pointer' | 'fiche' | 'coupe';
  systeme: string;
  region: string;
  /** Libellé lisible (pour le tableau de bord) */
  libelle: string;
}

export interface EtatCarte {
  card: Card;
  meta: MetaCarte;
  vues: number;
  reussites: number;
  echecs: number;
}

export interface Progression {
  version: 1;
  cartes: Record<string, EtatCarte>;
  /** Liste personnelle : clés « cle|cote » de structures */
  liste: string[];
  /** Dernières réponses (pour les statistiques) */
  journal: { t: string; id: string; ok: boolean }[];
}

const CLE_STOCKAGE = 'atlas-progression-v1';
const moteur = fsrs({ enable_fuzz: true, request_retention: 0.9 });

export function progressionVide(): Progression {
  return { version: 1, cartes: {}, liste: [], journal: [] };
}

/** Les dates JSON redeviennent des objets Date. */
function reviver(c: Card): Card {
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
}

export function charger(stockage: Pick<Storage, 'getItem'> = localStorage): Progression {
  try {
    const brut = stockage.getItem(CLE_STOCKAGE);
    return brut ? valider(JSON.parse(brut)) : progressionVide();
  } catch {
    return progressionVide();
  }
}

export function sauvegarder(p: Progression, stockage: Pick<Storage, 'setItem'> = localStorage) {
  stockage.setItem(CLE_STOCKAGE, JSON.stringify(p));
}

/** Vérifie et normalise un objet de progression (fichier importé, stockage). */
export function valider(o: unknown): Progression {
  const p = o as Progression;
  if (!p || p.version !== 1 || typeof p.cartes !== 'object') throw new Error("Ce fichier n'est pas une progression de l'atlas");
  const cartes: Record<string, EtatCarte> = {};
  for (const [id, e] of Object.entries(p.cartes)) {
    if (!e?.card || !e.meta) continue;
    cartes[id] = { ...e, card: reviver(e.card) };
  }
  return { version: 1, cartes, liste: Array.isArray(p.liste) ? p.liste : [], journal: Array.isArray(p.journal) ? p.journal.slice(-2000) : [] };
}

/** Enregistre une réponse : met à jour la planification FSRS de la carte. */
export function noter(p: Progression, id: string, meta: MetaCarte, note: Note, maintenant = new Date()): EtatCarte {
  const e = p.cartes[id] ?? { card: createEmptyCard(maintenant), meta, vues: 0, reussites: 0, echecs: 0 };
  const suite = moteur.next(e.card, maintenant, note);
  const ok = note !== Rating.Again;
  const nouveau: EtatCarte = { card: suite.card, meta, vues: e.vues + 1, reussites: e.reussites + (ok ? 1 : 0), echecs: e.echecs + (ok ? 0 : 1) };
  p.cartes[id] = nouveau;
  p.journal.push({ t: maintenant.toISOString(), id, ok });
  if (p.journal.length > 2000) p.journal.splice(0, p.journal.length - 2000);
  return nouveau;
}

/** Note automatique d'une réponse objective (QCM, saisie, pointer). */
export function noteAuto(correct: boolean, opts: { lent?: boolean; aide?: boolean } = {}): Note {
  if (!correct) return Rating.Again;
  if (opts.aide || opts.lent) return Rating.Hard;
  return Rating.Good;
}

export const estDue = (e: EtatCarte | undefined, maintenant = new Date()) => !!e && e.card.due.getTime() <= maintenant.getTime();
/** Carte considérée comme « maîtrisée » : intervalle de révision ≥ 21 jours. */
export const estMaitrisee = (e: EtatCarte | undefined) => !!e && e.card.state === State.Review && e.card.stability >= 21;

/**
 * Choix des cartes d'une séance parmi un ensemble de cartes possibles :
 * d'abord celles à réviser (les plus en retard d'abord), puis des nouvelles.
 */
export function choisirSeance(p: Progression, possibles: string[], taille = 20, nouvellesMax = 10, maintenant = new Date(), hasard = Math.random): string[] {
  const dues = possibles.filter((id) => estDue(p.cartes[id], maintenant)).sort((a, b) => p.cartes[a].card.due.getTime() - p.cartes[b].card.due.getTime());
  const nouvelles = possibles.filter((id) => !p.cartes[id]);
  // mélange des nouvelles (Fisher-Yates)
  for (let i = nouvelles.length - 1; i > 0; i--) { const j = Math.floor(hasard() * (i + 1)); [nouvelles[i], nouvelles[j]] = [nouvelles[j], nouvelles[i]]; }
  const seance = dues.slice(0, taille);
  for (const id of nouvelles) { if (seance.length >= taille || seance.length - Math.min(dues.length, taille) >= nouvellesMax) break; seance.push(id); }
  // s'il reste de la place et rien à réviser : cartes déjà vues, les moins stables d'abord
  if (seance.length < Math.min(taille, 5)) {
    const autres = possibles.filter((id) => p.cartes[id] && !seance.includes(id)).sort((a, b) => p.cartes[a].card.stability - p.cartes[b].card.stability);
    seance.push(...autres.slice(0, Math.min(taille, 5) - seance.length));
  }
  return seance;
}

/**
 * Fusion de deux progressions (passer du Mac à la tablette et inversement) :
 * pour chaque carte, on garde la version révisée le plus récemment.
 */
export function fusionner(a: Progression, b: Progression): Progression {
  const cartes: Record<string, EtatCarte> = { ...a.cartes };
  for (const [id, e] of Object.entries(b.cartes)) {
    const x = cartes[id];
    const t = (c?: EtatCarte) => c?.card.last_review?.getTime() ?? 0;
    if (!x || t(e) > t(x)) cartes[id] = e;
  }
  const journal = [...a.journal, ...b.journal]
    .filter((j, i, arr) => arr.findIndex((k) => k.t === j.t && k.id === j.id) === i)
    .sort((x, y) => x.t.localeCompare(y.t))
    .slice(-2000);
  return { version: 1, cartes, liste: [...new Set([...a.liste, ...b.liste])], journal };
}

export interface Bilan { total: number; vues: number; maitrisees: number; dues: number; taux: number | null }

/** Statistiques groupées (par système ou par région) sur un ensemble de cartes possibles. */
export function bilanPar(p: Progression, possibles: { id: string; groupe: string }[], maintenant = new Date()): Map<string, Bilan> {
  const res = new Map<string, Bilan>();
  for (const { id, groupe } of possibles) {
    const b = res.get(groupe) ?? { total: 0, vues: 0, maitrisees: 0, dues: 0, taux: null };
    const e = p.cartes[id];
    b.total++;
    if (e) {
      b.vues++;
      if (estMaitrisee(e)) b.maitrisees++;
      if (estDue(e, maintenant)) b.dues++;
      const r = (b.taux ?? 0) * (b.vues - 1) + e.reussites / Math.max(1, e.vues);
      b.taux = r / b.vues;
    }
    res.set(groupe, b);
  }
  return res;
}
