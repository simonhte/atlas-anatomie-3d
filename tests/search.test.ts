import { describe, expect, it } from 'vitest';
import { IndexRecherche, distance, normaliser } from '../src/lib/search';

const index = new IndexRecherche([
  { id: 'femur-d', noms: ['Fémur droit', 'Femur', 'right femur'] },
  { id: 'femur-g', noms: ['Fémur gauche', 'Femur', 'left femur'] },
  { id: 'coxal-d', noms: ['Os coxal droit', 'Os coxae'] },
  { id: 'scaphoide-d', noms: ['Scaphoïde droit', 'Os scaphoideum'] },
  { id: 'sterno', noms: ['Sterno-cléido-mastoïdien droit', 'Musculus sternocleidomastoideus'] },
  { id: 'oesophage', noms: ['Œsophage', 'Oesophagus'] },
  { id: 'humerus-d', noms: ['Humérus droit', 'Humerus'] },
  { id: 'phal', noms: ["Phalange distale de l'index droit", 'Phalanx distalis indicis'] },
]);
const premier = (q: string) => index.chercher(q)[0]?.id;

describe('normaliser', () => {
  it('retire accents, ligatures et ponctuation', () => {
    expect(normaliser('Sterno-cléido-mastoïdien')).toBe('sterno cleido mastoidien');
    expect(normaliser('Œsophage')).toBe('oesophage');
    expect(normaliser("  L'Humérus ")).toBe('l humerus');
  });
});

describe('distance', () => {
  it('compte substitutions, insertions et transpositions', () => {
    expect(distance('femur', 'femur')).toBe(0);
    expect(distance('femur', 'femru')).toBe(1); // transposition
    expect(distance('femur', 'femure')).toBe(1);
    expect(distance('coxal', 'coxale')).toBe(1);
  });
});

describe('recherche', () => {
  it('trouve sans accents ni majuscules', () => {
    expect(premier('femur droit')).toBe('femur-d');
    expect(premier('SCAPHOIDE')).toBe('scaphoide-d');
    expect(premier('oesophage')).toBe('oesophage');
  });
  it('tolère les fautes de frappe', () => {
    expect(premier('femru droit')).toBe('femur-d');
    expect(premier('os coxale')).toBe('coxal-d');
    expect(premier('humerys')).toBe('humerus-d');
  });
  it('accepte un début de mot', () => {
    expect(premier('hum')).toBe('humerus-d');
    expect(premier('sterno cleido')).toBe('sterno');
  });
  it('cherche aussi en latin', () => {
    expect(premier('os coxae')).toBe('coxal-d');
    expect(premier('phalanx distalis indicis')).toBe('phal');
  });
  it('ignore les mots vides', () => {
    expect(premier("phalange de l'index")).toBe('phal');
  });
  it('ne renvoie rien pour une requête sans rapport', () => {
    expect(index.chercher('xyzzy')).toEqual([]);
    expect(index.chercher('   ')).toEqual([]);
  });
  it('exige que chaque mot corresponde', () => {
    expect(index.chercher('femur gauche').map((r) => r.id)).toEqual(['femur-g']);
  });
});
