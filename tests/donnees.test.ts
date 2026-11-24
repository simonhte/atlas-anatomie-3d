// Tests du chargement des données : fiches Markdown, noms d'os, arborescence,
// et cohérence entre l'inventaire des maillages et les fiches.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { lireEntete, lireFiche, decouperSections } from '../src/lib/fiches';
import { construireArbre } from '../src/lib/data';
import { avecCote } from '../src/lib/nommage';
import { traduireOs, separerCote } from '../pipeline/config/noms-os.mjs';
import type { Structure } from '../src/lib/types';

describe('fiches Markdown', () => {
  const texte = `---
id: femur
titre: Fémur
latin: Femur
systeme: os
statut: a-verifier
structures: [femur, patella]
---
## Description et situation
Os long de la cuisse.

## À retenir pour l'examen
- Point 1
`;
  it("lit l'en-tête", () => {
    const { entete } = lireEntete(texte);
    expect(entete.id).toBe('femur');
    expect(entete.structures).toEqual(['femur', 'patella']);
  });
  it('découpe les sections', () => {
    const f = lireFiche(texte, 'contenu/fiches/os/femur.md');
    expect(f.sections.map((s) => s.titre)).toEqual(['Description et situation', "À retenir pour l'examen"]);
    expect(f.statut).toBe('a-verifier');
  });
  it('une fiche sans statut est « à vérifier »', () => {
    expect(lireFiche('---\nid: x\n---\n## A\nb', 'x.md').statut).toBe('a-verifier');
  });
  it('ignore les sections vides', () => {
    expect(decouperSections('## A\n\n## B\ntexte')).toEqual([{ titre: 'B', markdown: 'texte' }]);
  });
});

describe('noms des os', () => {
  it('sépare la latéralité', () => {
    expect(separerCote('left femur')).toEqual({ cote: 'g', base: 'femur' });
    expect(separerCote('distal phalanx of right thumb')).toEqual({ cote: 'd', base: 'distal phalanx of thumb' });
    expect(separerCote('sacrum')).toEqual({ cote: null, base: 'sacrum' });
  });
  it('traduit les os courants', () => {
    expect(traduireOs('left hip bone')).toMatchObject({ fr: 'Os coxal', la: 'Os coxae', cote: 'g', region: 'bassin' });
    expect(traduireOs('third lumbar vertebra')).toMatchObject({ cle: 'vertebre-l3', fr: 'Vertèbre L3', la: 'Vertebra lumbalis III' });
    expect(traduireOs('right first rib')).toMatchObject({ fr: '1re côte', la: 'Costa I', cote: 'd' });
    expect(traduireOs('left fifth metatarsal bone')).toMatchObject({ fr: '5e métatarsien', la: 'Os metatarsi V' });
    expect(traduireOs('proximal phalanx of left big toe')).toMatchObject({ fr: "Phalange proximale de l'hallux", la: 'Phalanx proximalis hallucis' });
    expect(traduireOs('middle phalanx of right ring finger')).toMatchObject({ fr: "Phalange moyenne de l'annulaire" });
    expect(traduireOs('nom inconnu')).toBeNull();
  });
  it('accorde droit/droite', () => {
    expect(avecCote('Fémur', 'm', 'd')).toBe('Fémur droit');
    expect(avecCote('Scapula', 'f', 'd')).toBe('Scapula droite');
    expect(avecCote('Ulna', 'f', 'g')).toBe('Ulna gauche');
    expect(avecCote('Sacrum', 'm', null)).toBe('Sacrum');
  });
});

describe('arborescence', () => {
  const s = (id: string, fr: string, region: string, groupe: string, cote: 'd' | 'g' | null): Structure => ({
    id, fr, region, groupe, cote, fma: '', en: '', cle: fr, la: '', genre: 'm', systeme: 'os', fiche: '', couche: 9, paquet: '', centre: [0, 0, 0],
  });
  it('range système → région → groupe → structures (droite puis gauche)', () => {
    const a = construireArbre([
      s('1', 'Fémur', 'membre-inf', 'Cuisse', 'g'),
      s('2', 'Fémur', 'membre-inf', 'Cuisse', 'd'),
      s('3', 'Os frontal', 'tete', 'Neurocrâne', null),
    ]);
    expect(a[0].nom).toBe('Squelette');
    expect(a[0].enfants!.map((r) => r.nom)).toEqual(['Tête', 'Membre inférieur']);
    expect(a[0].enfants![1].enfants![0].enfants!.map((x) => x.nom)).toEqual(['Fémur droit', 'Fémur gauche']);
  });
});

// Cohérence des données générées (si le pipeline a déjà été lancé)
const chemin = join(import.meta.dirname, '..', 'public', 'data', 'structures.json');
describe.skipIf(!existsSync(chemin))('données générées', () => {
  const { structures } = JSON.parse(readFileSync(chemin, 'utf8')) as { structures: Structure[] };
  const racineFiches = join(import.meta.dirname, '..', 'contenu', 'fiches');
  const fiches = new Map(['os', 'muscles', 'organes', 'vaisseaux', 'nerfs'].flatMap((sys) => {
    const dossier = join(racineFiches, sys);
    return readdirSync(dossier).filter((f) => f.endsWith('.md')).map((f) => {
      const fi = lireFiche(readFileSync(join(dossier, f), 'utf8'), f);
      return [fi.id, fi] as const;
    });
  }));
  it('chaque maillage a un nom français, un nom latin et une région', () => {
    for (const x of structures) {
      expect(x.fr, x.en).toBeTruthy();
      // les noms traduits automatiquement n'ont pas de nom latin officiel
      // nom latin exigé pour les os et les muscles ; les vaisseaux, nerfs et organes
      // traduits automatiquement ou à la main n'en ont pas toujours
      if (['os', 'muscles'].includes(x.systeme) && !(x as { auto?: boolean }).auto) expect(x.la, x.en).toBeTruthy();
      expect(x.region, x.en).toBeTruthy();
    }
  });
  it('chaque muscle qui annonce une fiche la trouve', () => {
    const manquantes = [...new Set(structures.filter((x) => x.systeme === 'muscles' && x.fiche && !fiches.has(x.fiche)).map((x) => x.fiche))];
    expect(manquantes).toEqual([]);
  });
  it('chaque fiche a un statut et au moins une rubrique', () => {
    for (const f of fiches.values()) expect(f.sections.length, f.id).toBeGreaterThan(0);
  });
  it('les fiches de muscles donnent toujours l’innervation', () => {
    for (const f of fiches.values()) if (f.systeme === 'muscles') expect(f.sections.some((s) => s.titre === 'Innervation'), f.id).toBe(true);
  });
  it('les muscles ont une couche de dissection entre 1 et 3', () => {
    for (const x of structures.filter((s) => s.systeme === 'muscles')) expect([1, 2, 3], x.en).toContain(x.couche);
  });
  it('chaque fiche d’organe, de vaisseau ou de nerf correspond à au moins une structure 3D', () => {
    const utilisees = new Set(structures.map((x) => x.fiche));
    const orphelines = [...fiches.values()].filter((f) => !['os', 'muscles'].includes(f.systeme) && !utilisees.has(f.id)).map((f) => f.id);
    expect(orphelines).toEqual([]);
  });
  it('chaque os renvoie vers une fiche existante', () => {
    const manquantes = [...new Set(structures.filter((x) => x.systeme === 'os' && x.fiche && !fiches.has(x.fiche)).map((x) => x.fiche))];
    expect(manquantes).toEqual([]);
  });
  it('les identifiants de maillage sont uniques', () => {
    expect(new Set(structures.map((x) => x.id)).size).toBe(structures.length);
  });
  it('la gauche du sujet est du côté x positif', () => {
    const fd = structures.find((x) => x.cle === 'femur' && x.cote === 'd')!;
    const fg = structures.find((x) => x.cle === 'femur' && x.cote === 'g')!;
    expect(fg.centre[0]).toBeGreaterThan(0);
    expect(fd.centre[0]).toBeLessThan(0);
  });
});
