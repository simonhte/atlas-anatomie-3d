// Génération des questions du quiz (logique pure, testée).
//
// Quatre modes :
//   identifier : une structure est surlignée sur le modèle → la nommer (QCM ou saisie libre)
//   pointer    : un nom est donné → cliquer la structure sur le modèle
//   fiche      : question de cours tirée des fiches (innervation, insertions, rapports…)
//   coupe      : une structure est surlignée sur une coupe de scanner → la nommer

import type { Fiche, Structure } from './types';
import { nomComplet } from './data';
import { IndexRecherche, mots } from './search';
import type { MetaCarte } from './progression';
import type { IndexScanner } from './scanner';

export type Mode = 'identifier' | 'pointer' | 'fiche' | 'coupe';

/** Structures internes à un organe (non cliquables de l'extérieur). */
const INTERNES = /cuspide|valvule|papillaire|noyau|ventricule latéral|troisième ventricule|quatrième ventricule|aqueduc|canal central|corne|substance blanche|capsule interne|cristallin|corps vitré|chambre/i;

/** Structure « interrogeable » : une clé + un côté, éventuellement plusieurs maillages. */
export interface Cible {
  cle: string;
  cote: 'g' | 'd' | null;
  ids: string[];
  nom: string;
  la: string;
  systeme: string;
  region: string;
  groupe: string;
  fiche: string;
}
export const idCible = (c: Pick<Cible, 'cle' | 'cote'>) => `${c.cle}|${c.cote ?? '-'}`;

export interface Filtres {
  systemes: string[]; // vide = tous
  regions: string[]; // vide = toutes
  listePerso: boolean;
}

/** Rubriques de fiche transformées en questions de cours. */
export const RUBRIQUES_QUESTIONS = [
  'Origine', 'Terminaison', 'Action', 'Innervation', 'Vascularisation', 'Vascularisation artérielle',
  'Rapports', 'Branches collatérales', 'Branches terminales', 'Territoire', 'Articulations', 'Insertions musculaires', 'Moyens de fixité',
];

/** Structures interrogeables : celles qui ont une fiche et un vrai nom (pas de traduction automatique). */
export function construireCibles(structures: Structure[], fiches: Map<string, Fiche>): Cible[] {
  const groupes = new Map<string, Cible>();
  for (const s of structures) {
    if (s.systeme === 'peau' || s.auto || s.anglais || !fiches.has(s.fiche)) continue;
    // petites branches de nerfs et de vaisseaux : trop pointues pour identifier/pointer
    if (['nerfs', 'arteres', 'veines'].includes(s.systeme) && /^(branches?|rameaux?|affluents?|division)\b/i.test(s.fr)) continue;
    const k = `${s.cle}|${s.cote ?? '-'}`;
    const c = groupes.get(k);
    if (c) c.ids.push(s.id);
    else groupes.set(k, { cle: s.cle, cote: s.cote, ids: [s.id], nom: nomComplet(s), la: s.la, systeme: s.systeme, region: s.region, groupe: s.groupe, fiche: s.fiche });
  }
  return [...groupes.values()];
}

const passe = (f: Filtres, systeme: string, region: string, cle?: string, liste?: Set<string>) =>
  (!f.systemes.length || f.systemes.includes(systeme)) &&
  (!f.regions.length || f.regions.includes(region)) &&
  (!f.listePerso || (cle !== undefined && !!liste?.has(cle)));

export interface CartePossible { id: string; meta: MetaCarte }

/** Toutes les cartes possibles pour les modes et filtres choisis. */
export function cartesPossibles(
  modes: Mode[], filtres: Filtres, cibles: Cible[], fiches: Map<string, Fiche>, liste: string[], scanner: IndexScanner | null,
): CartePossible[] {
  const res: CartePossible[] = [];
  const maListe = new Set(liste);
  const ciblesFiltrees = cibles.filter((c) => passe(filtres, c.systeme, c.region, idCible(c), maListe));
  for (const mode of modes) {
    if (mode === 'identifier' || mode === 'pointer') {
      for (const c of ciblesFiltrees) {
        // « pointer » : on écarte les structures internes, impossibles à cliquer de l'extérieur
        if (mode === 'pointer' && INTERNES.test(c.nom)) continue;
        res.push({ id: `${mode}:${idCible(c)}`, meta: { type: mode, systeme: c.systeme, region: c.region, libelle: c.nom } });
      }
    }
    if (mode === 'fiche') {
      // une fiche est retenue si au moins une de ses structures passe les filtres
      const parFiche = new Map<string, Cible>();
      for (const c of ciblesFiltrees) if (!parFiche.has(c.fiche)) parFiche.set(c.fiche, c);
      for (const [idFiche, c] of parFiche) {
        const f = fiches.get(idFiche);
        if (!f) continue;
        for (const s of f.sections) {
          if (!RUBRIQUES_QUESTIONS.includes(s.titre)) continue;
          res.push({ id: `fiche:${idFiche}:${s.titre}`, meta: { type: 'fiche', systeme: c.systeme, region: c.region, libelle: `${s.titre} — ${f.titre}` } });
        }
      }
    }
    if (mode === 'coupe' && scanner) {
      const liens = new Map(cibles.map((c) => [c.fiche, c] as const));
      for (const st of scanner.structures) {
        const c = cibles.find((x) => (x.cle === st.lien || x.fiche === st.lien) && (!st.cote || x.cote === st.cote)) ?? liens.get(st.lien);
        const systeme = c?.systeme ?? st.systeme, region = c?.region ?? 'thorax';
        if (!passe(filtres, systeme, region, c ? idCible(c) : undefined, maListe)) continue;
        res.push({ id: `coupe:${st.nom}`, meta: { type: 'coupe', systeme, region, libelle: st.fr } });
      }
    }
  }
  return res;
}

/** Mélange (Fisher-Yates) avec un générateur de hasard injectable (tests). */
export function melanger<T>(t: T[], hasard = Math.random): T[] {
  const a = [...t];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(hasard() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Distracteurs plausibles pour un QCM : même système, autre structure ;
 * d'abord la même loge/groupe, puis la même région, puis le reste.
 */
export function distracteurs(cible: Cible, cibles: Cible[], n = 3, hasard = Math.random): Cible[] {
  const autres = cibles.filter((c) => c.systeme === cible.systeme && c.cle !== cible.cle);
  const niveaux = [
    autres.filter((c) => c.groupe === cible.groupe),
    autres.filter((c) => c.groupe !== cible.groupe && c.region === cible.region),
    autres.filter((c) => c.region !== cible.region),
  ];
  const res: Cible[] = [];
  const noms = new Set([cible.nom]);
  for (const niveau of niveaux) {
    for (const c of melanger(niveau, hasard)) {
      if (res.length >= n) break;
      // pas deux fois le même nom, et on garde le même côté que la cible si possible
      const nom = cible.cote && c.cote && c.cote !== cible.cote ? null : c.nom;
      if (!nom || noms.has(nom)) continue;
      noms.add(nom);
      res.push(c);
    }
  }
  return res;
}

/** Texte brut (sans Markdown) de la première ligne utile d'une rubrique. */
export function premiereLigne(md: string): string {
  const l = md.split('\n').map((x) => x.replace(/^[-*]\s+/, '').replace(/\*\*|__|\*/g, '').trim()).find((x) => x.length > 0) ?? '';
  return l.length > 160 ? `${l.slice(0, 157)}…` : l;
}

/** QCM de cours (ex. innervation) : la bonne réponse et 3 réponses d'autres fiches du même système. */
export function qcmFiche(fiche: Fiche, rubrique: string, fiches: Map<string, Fiche>, hasard = Math.random): { bonne: string; options: string[] } | null {
  const sec = fiche.sections.find((s) => s.titre === rubrique);
  if (!sec) return null;
  const bonne = premiereLigne(sec.markdown);
  const autres = new Set<string>();
  for (const f of melanger([...fiches.values()], hasard)) {
    if (f.id === fiche.id || f.systeme !== fiche.systeme) continue;
    const s = f.sections.find((x) => x.titre === rubrique);
    const t = s && premiereLigne(s.markdown);
    if (t && t !== bonne) autres.add(t);
    if (autres.size >= 3) break;
  }
  if (autres.size < 3) return null;
  return { bonne, options: melanger([bonne, ...autres], hasard) };
}

/**
 * Vérifie une réponse tapée librement : tolère accents et fautes de frappe.
 * Si la structure est latéralisée et que le côté n'est pas précisé, la
 * réponse est acceptée mais signalée « incomplète ».
 */
export function verifierSaisie(saisie: string, cible: Cible, cibles: Cible[]): { correct: boolean; incomplet: boolean } {
  if (!mots(saisie).length) return { correct: false, incomplet: false };
  const index = new IndexRecherche(cibles.map((c) => ({ id: idCible(c), noms: [c.nom, c.la] })));
  const r = index.chercher(saisie, 5);
  const meilleur = r[0];
  if (!meilleur || meilleur.score < 0.6) return { correct: false, incomplet: false };
  if (meilleur.id.split('|')[0] !== cible.cle) return { correct: false, incomplet: false };
  // bonne structure : on vérifie le côté (s'il y en a un)
  const coteDit = /\b(droit|droite|right)\b/.test(saisie.toLowerCase()) ? 'd' : /\b(gauche|left)\b/.test(saisie.toLowerCase()) ? 'g' : null;
  if (!cible.cote) return { correct: true, incomplet: false };
  if (coteDit && coteDit !== cible.cote) return { correct: false, incomplet: false };
  return { correct: true, incomplet: !coteDit };
}
