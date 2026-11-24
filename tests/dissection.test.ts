import { describe, expect, it } from 'vitest';
import { DISSECTION_INITIALE, ETAPES, deplacer, estDisseque, etapeEffective } from '../src/lib/dissection';
// @ts-ignore module JS du pipeline
import { traduireMuscle, traduirePeau } from '../pipeline/config/noms-muscles.mjs';

const PEAU = 0, SUPERFICIEL = 1, INTERMEDIAIRE = 2, PROFOND = 3, OS = 9;

describe('dissection par couches', () => {
  it('au départ, seule la peau est retirée', () => {
    expect(estDisseque(PEAU, 'corps', DISSECTION_INITIALE)).toBe(true);
    expect(estDisseque(SUPERFICIEL, 'thorax', DISSECTION_INITIALE)).toBe(false);
  });
  it('chaque étape retire la couche suivante, jamais les os', () => {
    let d = { global: 0, regions: {} };
    for (let i = 0; i < ETAPES.length + 2; i++) d = deplacer(d, 1, null);
    expect(d.global).toBe(ETAPES.length - 1); // borné
    for (const c of [PEAU, SUPERFICIEL, INTERMEDIAIRE, PROFOND]) expect(estDisseque(c, 'membre-inf', d)).toBe(true);
    expect(estDisseque(OS, 'membre-inf', d)).toBe(false);
  });
  it('disséquer une région ne touche pas les autres (sauf la peau)', () => {
    const d = deplacer(deplacer({ global: 1, regions: {} }, 1, 'membre-inf'), 1, 'membre-inf');
    expect(etapeEffective(d, 'membre-inf')).toBe(3);
    expect(estDisseque(INTERMEDIAIRE, 'membre-inf', d)).toBe(true);
    expect(estDisseque(SUPERFICIEL, 'thorax', d)).toBe(false);
    expect(estDisseque(PEAU, 'corps', d)).toBe(true);
  });
  it('recouvrir ne descend pas sous zéro', () => {
    expect(deplacer({ global: 0, regions: {} }, -1, null).global).toBe(0);
  });
});

describe('noms des muscles', () => {
  it('traduit muscles, chefs et parties', () => {
    expect(traduireMuscle('Left gluteus maximus')).toMatchObject({ fr: 'Grand fessier', la: 'M. gluteus maximus', cote: 'g', couche: 1, fiche: 'grand-fessier' });
    expect(traduireMuscle('Long head of right biceps brachii')).toMatchObject({ fr: 'Biceps brachial, chef long', cote: 'd', fiche: 'biceps-brachial' });
    expect(traduireMuscle('Acromial part of left deltoid')).toMatchObject({ fr: 'Deltoïde, partie acromiale', cote: 'g' });
    expect(traduireMuscle('Third lumbrical of right foot')).toMatchObject({ fr: '3e lombrical du pied', cote: 'd' });
    expect(traduireMuscle('Diaphragm')).toMatchObject({ fr: 'Diaphragme', cote: null });
    expect(traduireMuscle('Left femur')).toBeNull();
  });
  it('reconnaît la peau', () => {
    expect(traduirePeau('Skin')).toMatchObject({ fr: 'Peau', couche: 0 });
  });
});
