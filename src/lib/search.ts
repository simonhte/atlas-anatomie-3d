// Recherche de structures par nom français ou latin, tolérante aux accents,
// à la casse, aux ligatures (œ, æ) et aux petites fautes de frappe.
//
// Principe : on découpe la requête et chaque nom en mots « normalisés ».
// Chaque mot de la requête doit correspondre à un mot du nom, soit
// exactement, soit par préfixe (« hum » → « humérus »), soit avec une
// distance d'édition faible (« femure » → « fémur »).

/** Supprime accents, ligatures, ponctuation ; met en minuscules. */
export function normaliser(s: string): string {
  return s
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Mots vides ignorés dans la requête (« nerf de la face » → nerf, face)
const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'a', 'au', 'aux', 'of', 'the']);

export function mots(s: string): string[] {
  return normaliser(s).split(' ').filter((m) => m && !MOTS_VIDES.has(m));
}

/** Distance de Damerau-Levenshtein (transpositions adjacentes comprises), bornée par `max`. */
export function distance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length, m = b.length;
  let pp = new Array<number>(m + 1).fill(0); // ligne i-2
  let p = Array.from({ length: m + 1 }, (_, j) => j); // ligne i-1
  for (let i = 1; i <= n; i++) {
    const c = new Array<number>(m + 1);
    c[0] = i;
    let minLigne = c[0];
    for (let j = 1; j <= m; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) c[j] = Math.min(c[j], pp[j - 2] + 1);
      if (c[j] < minLigne) minLigne = c[j];
    }
    if (minLigne > max) return max + 1;
    pp = p;
    p = c;
  }
  return p[m];
}

/** Nombre de fautes tolérées selon la longueur du mot tapé. */
function tolerance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  return 2;
}

/** Score d'un mot de requête contre un mot de nom (0 = pas de correspondance). */
function scoreMot(q: string, w: string): number {
  if (q === w) return 1;
  if (w.startsWith(q)) return 0.85 * (q.length >= 3 ? 1 : 0.6);
  if (q.length >= 4 && w.includes(q)) return 0.6;
  const tol = tolerance(q.length);
  if (tol === 0) return 0;
  // faute sur le mot entier, ou sur le début du mot (requête incomplète)
  const d = Math.min(distance(q, w, tol), w.length > q.length ? distance(q, w.slice(0, q.length), tol) + 0.5 : 99);
  if (d <= tol) return 0.7 - 0.15 * d;
  return 0;
}

export interface Entree {
  id: string;
  /** Noms à indexer : français, latin, synonymes… */
  noms: string[];
}

export interface Resultat {
  id: string;
  score: number;
  /** Le nom qui a le mieux correspondu */
  nom: string;
}

export class IndexRecherche {
  private entrees: { id: string; noms: { brut: string; mots: string[] }[] }[];

  constructor(entrees: Entree[]) {
    this.entrees = entrees.map((e) => ({ id: e.id, noms: e.noms.filter(Boolean).map((n) => ({ brut: n, mots: mots(n) })) }));
  }

  chercher(requete: string, limite = 20): Resultat[] {
    const qm = mots(requete);
    if (!qm.length) return [];
    const res: Resultat[] = [];
    for (const e of this.entrees) {
      let meilleur = 0, nomMeilleur = '';
      for (const n of e.noms) {
        let total = 0;
        let ok = true;
        for (const q of qm) {
          let best = 0;
          for (const w of n.mots) best = Math.max(best, scoreMot(q, w));
          if (best === 0) { ok = false; break; }
          total += best;
        }
        if (!ok) continue;
        // bonus aux noms courts (« fémur » avant « tête du fémur ») et au 1er mot
        let s = total / qm.length - 0.02 * Math.max(0, n.mots.length - qm.length);
        if (n.mots[0]?.startsWith(qm[0])) s += 0.05;
        if (s > meilleur) { meilleur = s; nomMeilleur = n.brut; }
      }
      if (meilleur > 0) res.push({ id: e.id, score: meilleur, nom: nomMeilleur });
    }
    res.sort((a, b) => b.score - a.score || a.nom.localeCompare(b.nom, 'fr'));
    return res.slice(0, limite);
  }
}
