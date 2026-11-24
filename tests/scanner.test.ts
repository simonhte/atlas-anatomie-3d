import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FENETRES, huDepuis8, interpoler, positionModele, tableFenetre, type IndexScanner } from '../src/lib/scanner';
// @ts-ignore module JS du pipeline
import { traduireTS } from '../pipeline/config/totalsegmentator.mjs';

describe('densités et fenêtres', () => {
  it('rétablit les HU aux bornes des morceaux', () => {
    expect(huDepuis8(0)).toBe(-1000);
    expect(huDepuis8(40)).toBe(-100);
    expect(huDepuis8(230)).toBe(300);
    expect(huDepuis8(255)).toBe(2000);
  });
  it('fenêtre parties molles : l’air est noir, l’os blanc, l’eau gris moyen', () => {
    const t = tableFenetre(FENETRES[0]);
    expect(t[0]).toBe(0);
    expect(t[255]).toBe(255);
    const eau = Math.round(40 + (100 / 400) * 190); // 0 HU
    expect(t[eau]).toBeGreaterThan(90);
    expect(t[eau]).toBeLessThan(140);
  });
});

describe('correspondance scanner → modèle', () => {
  it('interpole et extrapole linéairement', () => {
    const p: [number, number][] = [[0, 10], [10, 30]];
    expect(interpoler(p, 5)).toBe(20);
    expect(interpoler(p, 20)).toBe(50);
    expect(interpoler(p, -10)).toBe(-10);
  });
});

describe('structures TotalSegmentator', () => {
  it('traduit les structures et leur latéralité', () => {
    expect(traduireTS('liver')).toMatchObject({ fr: 'Foie', lien: 'foie' });
    expect(traduireTS('kidney_left')).toMatchObject({ fr: 'Rein gauche', cote: 'g' });
    expect(traduireTS('scapula_right')).toMatchObject({ fr: 'Scapula droite' });
    expect(traduireTS('rib_left_1')).toMatchObject({ fr: '1re côte gauche' });
    expect(traduireTS('vertebrae_T12')).toMatchObject({ fr: 'Vertèbre T12', lien: 'vertebre-t12' });
    expect(traduireTS('lung_middle_lobe_right')).toMatchObject({ fr: 'Lobe moyen du poumon droit' });
    expect(traduireTS('inconnu')).toBeNull();
  });
});

const chemin = join(import.meta.dirname, '..', 'public', 'coupes', 's1371', 'index.json');
describe.skipIf(!existsSync(chemin))('coupes générées', () => {
  const index = JSON.parse(readFileSync(chemin, 'utf8')) as IndexScanner;
  it('contient les trois orientations', () => {
    for (const o of ['axiale', 'coronale', 'sagittale'] as const) expect(index.orientations[o].coupes.length).toBeGreaterThan(50);
  });
  it('les hauteurs du scanner tombent dans le modèle, dans l’ordre', () => {
    const coupes = index.orientations.axiale.coupes;
    const y0 = positionModele(index, 'axiale', coupes[0].mm).valeur;
    const y1 = positionModele(index, 'axiale', coupes[coupes.length - 1].mm).valeur;
    expect(y1).toBeGreaterThan(y0);
    expect(y0).toBeGreaterThan(0.3); // cuisses
    expect(y1).toBeLessThan(1.6); // bas du cou
  });
  it('le foie (droite du patient) est à gauche de l’image axiale', () => {
    const foie = index.structures.find((s) => s.nom === 'liver')!;
    const coupe = index.orientations.axiale.coupes.find((c) => c.s.some((e) => e[0] === foie.id))!;
    const [, x] = coupe.s.find((e) => e[0] === foie.id)!;
    expect(x).toBeLessThan(index.orientations.axiale.largeur / 2);
  });
});
