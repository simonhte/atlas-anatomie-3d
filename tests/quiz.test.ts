import { describe, expect, it } from 'vitest';
import {
  Rating, bilanPar, charger, choisirSeance, estDue, fusionner, noteAuto, noter, progressionVide, sauvegarder, valider, type MetaCarte,
} from '../src/lib/progression';
import { construireCibles, distracteurs, premiereLigne, qcmFiche, verifierSaisie, cartesPossibles, type Cible } from '../src/lib/quiz';
import type { Fiche, Structure } from '../src/lib/types';

const META: MetaCarte = { type: 'identifier', systeme: 'os', region: 'membre-inf', libelle: 'Fémur droit' };
const JOUR = 86400000;
/** Hasard reproductible pour les tests */
function graine(n = 1) { let x = n; return () => ((x = (x * 16807) % 2147483647) / 2147483647); }

describe('répétition espacée (FSRS)', () => {
  it('une bonne réponse espace la carte, une erreur la fait revenir vite', () => {
    const p = progressionVide();
    const t0 = new Date('2026-01-01T10:00:00Z');
    noter(p, 'a', META, Rating.Good, t0);
    noter(p, 'a', META, Rating.Good, new Date(t0.getTime() + 10 * 60000));
    const intervalleBon = p.cartes.a.card.due.getTime() - t0.getTime();
    noter(p, 'b', META, Rating.Again, t0);
    const intervalleRate = p.cartes.b.card.due.getTime() - t0.getTime();
    expect(intervalleBon).toBeGreaterThan(JOUR / 2);
    expect(intervalleRate).toBeLessThan(JOUR / 24);
    expect(p.cartes.b.echecs).toBe(1);
    expect(p.journal).toHaveLength(3);
  });
  it('note automatique : faux = à revoir, lent ou aidé = difficile', () => {
    expect(noteAuto(false)).toBe(Rating.Again);
    expect(noteAuto(true)).toBe(Rating.Good);
    expect(noteAuto(true, { aide: true })).toBe(Rating.Hard);
  });
  it('une séance commence par les cartes dues, puis ajoute des nouvelles', () => {
    const p = progressionVide();
    const t0 = new Date('2026-01-01T10:00:00Z');
    noter(p, 'vue', META, Rating.Again, t0);
    const plusTard = new Date(t0.getTime() + JOUR);
    expect(estDue(p.cartes.vue, plusTard)).toBe(true);
    const s = choisirSeance(p, ['n1', 'n2', 'vue', 'n3'], 3, 10, plusTard, graine());
    expect(s[0]).toBe('vue');
    expect(s).toHaveLength(3);
  });
  it('limite le nombre de nouvelles cartes par séance', () => {
    const p = progressionVide();
    const s = choisirSeance(p, Array.from({ length: 50 }, (_, i) => `n${i}`), 20, 5, new Date(), graine());
    expect(s).toHaveLength(5);
  });
});

describe('sauvegarde, export et import', () => {
  it('sauvegarde puis recharge (dates comprises)', () => {
    const stock = new Map<string, string>();
    const s = { getItem: (k: string) => stock.get(k) ?? null, setItem: (k: string, v: string) => void stock.set(k, v) };
    const p = progressionVide();
    noter(p, 'a', META, Rating.Good, new Date('2026-01-01T10:00:00Z'));
    p.liste.push('femur|d');
    sauvegarder(p, s);
    const q = charger(s);
    expect(q.cartes.a.card.due).toBeInstanceOf(Date);
    expect(q.liste).toEqual(['femur|d']);
  });
  it('refuse un fichier qui n’est pas une progression', () => {
    expect(() => valider({ bonjour: 1 })).toThrow();
  });
  it('fusionne deux appareils en gardant la révision la plus récente', () => {
    const mac = progressionVide(), tablette = progressionVide();
    noter(mac, 'a', META, Rating.Again, new Date('2026-01-01T10:00:00Z'));
    noter(tablette, 'a', META, Rating.Good, new Date('2026-01-03T10:00:00Z'));
    noter(tablette, 'b', META, Rating.Good, new Date('2026-01-03T10:00:00Z'));
    mac.liste.push('x'); tablette.liste.push('x', 'y');
    const f = fusionner(mac, valider(JSON.parse(JSON.stringify(tablette))));
    expect(f.cartes.a.reussites).toBe(1);
    expect(Object.keys(f.cartes).sort()).toEqual(['a', 'b']);
    expect(f.liste).toEqual(['x', 'y']);
    expect(f.journal).toHaveLength(3);
  });
  it('bilan par système', () => {
    const p = progressionVide();
    noter(p, 'a', META, Rating.Good, new Date());
    const b = bilanPar(p, [{ id: 'a', groupe: 'os' }, { id: 'b', groupe: 'os' }, { id: 'c', groupe: 'muscles' }]);
    expect(b.get('os')).toMatchObject({ total: 2, vues: 1, taux: 1 });
    expect(b.get('muscles')).toMatchObject({ total: 1, vues: 0 });
  });
});

// --- Questions -------------------------------------------------------------
const st = (id: string, cle: string, fr: string, cote: 'g' | 'd' | null, groupe: string, fiche = cle, systeme = 'os', extra: Partial<Structure> = {}): Structure => ({
  id, cle, fr, cote, groupe, fiche, systeme, la: fr, en: '', fma: '', genre: 'm', region: 'membre-inf', couche: 9, paquet: '', centre: [0, 0, 0], ...extra,
});
const STRUCTS = [
  st('1', 'femur', 'Fémur', 'd', 'Cuisse'), st('2', 'femur', 'Fémur', 'g', 'Cuisse'),
  st('3', 'tibia', 'Tibia', 'd', 'Jambe'), st('4', 'fibula', 'Fibula', 'd', 'Jambe', 'fibula', 'os', { genre: 'f' }),
  st('5', 'patella', 'Patella', 'd', 'Genou', 'patella', 'os', { genre: 'f' }), st('6', 'talus', 'Talus', 'd', 'Tarse', 'tarse'),
  st('7', 'branche-x', 'Branche obscure', null, 'Cuisse', 'branche-x', 'arteres', { auto: true }),
];
const fiche = (id: string, systeme: string, sections: [string, string][]): Fiche => ({ id, titre: id, latin: '', systeme, statut: 'a-verifier', structures: [], sections: sections.map(([titre, markdown]) => ({ titre, markdown })), fichier: '' });
const FICHES = new Map<string, Fiche>([
  ['femur', fiche('femur', 'os', [['Articulations', '- **Coxo-fémorale**']])],
  ['tibia', fiche('tibia', 'os', [['Articulations', '- Fémoro-tibiale']])],
  ['fibula', fiche('fibula', 'os', [['Articulations', '- Tibio-fibulaires']])],
  ['patella', fiche('patella', 'os', [['Articulations', '- Fémoro-patellaire']])],
  ['tarse', fiche('tarse', 'os', [['Articulations', '- Talo-crurale']])],
  ['branche-x', fiche('branche-x', 'arteres', [])],
]);

describe('questions', () => {
  const cibles = construireCibles(STRUCTS, FICHES);
  it('ne garde que les structures avec une fiche et un vrai nom', () => {
    expect(cibles.map((c) => `${c.cle}|${c.cote}`).sort()).toEqual(['femur|d', 'femur|g', 'fibula|d', 'patella|d', 'talus|d', 'tibia|d']);
  });
  it('les distracteurs sont d’autres structures du même système, même côté, noms distincts', () => {
    const femurD = cibles.find((c) => c.cle === 'femur' && c.cote === 'd')!;
    const d = distracteurs(femurD, cibles, 3, graine());
    expect(d).toHaveLength(3);
    expect(d.every((c) => c.cle !== 'femur' && c.cote === 'd')).toBe(true);
  });
  it('accepte une saisie avec fautes, signale le côté manquant, refuse le mauvais côté', () => {
    const femurD = cibles.find((c) => c.cle === 'femur' && c.cote === 'd')!;
    expect(verifierSaisie('femur droit', femurD, cibles)).toEqual({ correct: true, incomplet: false });
    expect(verifierSaisie('femru droit', femurD, cibles).correct).toBe(true);
    expect(verifierSaisie('fémur', femurD, cibles)).toEqual({ correct: true, incomplet: true });
    expect(verifierSaisie('fémur gauche', femurD, cibles).correct).toBe(false);
    expect(verifierSaisie('tibia droit', femurD, cibles).correct).toBe(false);
    expect(verifierSaisie('', femurD, cibles).correct).toBe(false);
  });
  it('QCM de cours : bonne réponse + 3 réponses d’autres fiches', () => {
    const q = qcmFiche(FICHES.get('femur')!, 'Articulations', FICHES, graine())!;
    expect(q.bonne).toBe('Coxo-fémorale');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain('Coxo-fémorale');
  });
  it('filtres : système, liste personnelle', () => {
    const tout = cartesPossibles(['identifier', 'fiche'], { systemes: ['os'], regions: [], listePerso: false }, cibles, FICHES, [], null);
    expect(tout.filter((c) => c.meta.type === 'identifier')).toHaveLength(6);
    expect(tout.some((c) => c.id === 'fiche:femur:Articulations')).toBe(true);
    const perso = cartesPossibles(['identifier'], { systemes: [], regions: [], listePerso: true }, cibles, FICHES, ['tibia|d'], null);
    expect(perso.map((c) => c.id)).toEqual(['identifier:tibia|d']);
  });
  it('première ligne sans Markdown', () => {
    expect(premiereLigne('\n- **Nerf axillaire** (C5–C6).\n- autre')).toBe('Nerf axillaire (C5–C6).');
  });
  it('le type Cible expose ses maillages', () => {
    const c: Cible = cibles.find((x) => x.cle === 'femur' && x.cote === 'd')!;
    expect(c.ids).toEqual(['1']);
  });
});
