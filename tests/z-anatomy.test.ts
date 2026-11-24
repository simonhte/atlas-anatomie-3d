// Tests de la configuration Z-Anatomy et de l'intégration des structures complémentaires.
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
// @ts-ignore module JS du pipeline
import { STRUCTURES_ZA, OS_ANCRAGE, GROUPES_ANCRAGE, groupeAncrage, decouperNomZA, nomsAExporter } from '../pipeline/config/z-anatomy.mjs';

describe('configuration Z-Anatomy', () => {
  it('découpe la latéralité Blender', () => {
    expect(decouperNomZA('Rectus abdominis muscle.l')).toEqual({ base: 'Rectus abdominis muscle', cote: 'g' });
    expect(decouperNomZA('Masseter.r').cote).toBe('d');
    expect(decouperNomZA('Coccyx')).toEqual({ base: 'Coccyx', cote: null });
  });
  it('chaque structure a un groupe d’os d’ancrage connu', () => {
    const groupes = GROUPES_ANCRAGE as Record<string, string[]>;
    const ancrages = OS_ANCRAGE as Record<string, string>;
    for (const base of Object.keys(STRUCTURES_ZA)) {
      const g: string = groupeAncrage(base);
      expect(groupes[g], base).toBeDefined();
      for (const os of groupes[g]) expect(ancrages[os], os).toBeDefined();
    }
  });
  it('le coccyx est ancré sur le sacrum, les masticateurs sur le crâne', () => {
    expect(groupeAncrage('Coccyx')).toBe('sacrum');
    expect(groupeAncrage('Superficial part of masseter')).toBe('tete');
    expect(groupeAncrage('Latissimus dorsi muscle')).toBe('dos');
  });
  it('demande les trois formes de chaque nom (médian, gauche, droite)', () => {
    const n = nomsAExporter();
    expect(n).toContain('Coccyx');
    expect(n).toContain('Latissimus dorsi muscle.l');
    expect(n).toContain('Latissimus dorsi muscle.r');
  });
});

const chemin = join(import.meta.dirname, '..', 'public', 'data', 'structures.json');
describe.skipIf(!existsSync(chemin))('structures complémentaires intégrées', () => {
  const { structures } = JSON.parse(readFileSync(chemin, 'utf8')) as { structures: { cle: string; cote: string | null; source: string; systeme: string; centre: number[] }[] };
  const za = structures.filter((s) => s.source === 'z-anatomy');
  it('contient les manques comblés', () => {
    for (const cle of ['coccyx', 'cartilage-costal-8', 'cartilage-costal-9', 'cartilage-costal-10', 'grand-dorsal', 'droit-abdomen', 'oblique-interne', 'transverse-abdomen', 'carre-lombes', 'temporal-muscle', 'masseter-superficiel', 'pterygoidien-medial']) {
      expect(za.some((s) => s.cle === cle), cle).toBe(true);
    }
  });
  it('la latéralité est respectée (gauche du sujet en x positif)', () => {
    // os et muscles seulement : certains nerfs croisent la ligne médiane (ex. nerf vague droit → estomac)
    for (const s of za.filter((x) => x.cote && ['os', 'muscles'].includes(x.systeme))) {
      if (Math.abs(s.centre[0]) < 0.01) continue; // structures très proches du plan médian
      expect(s.cote === 'g' ? s.centre[0] > 0 : s.centre[0] < 0, `${s.cle} ${s.cote}`).toBe(true);
    }
  });
});
