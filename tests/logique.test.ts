import { describe, expect, it } from 'vitest';
import { Historique } from '../src/lib/history';
import { disposerEtiquettes } from '../src/lib/etiquettes';

describe('annuler / rétablir', () => {
  it('annule et rétablit dans l’ordre', () => {
    const h = new Historique<{ n: number }>();
    let etat = { n: 0 };
    h.enregistrer(etat); etat = { n: 1 };
    h.enregistrer(etat); etat = { n: 2 };
    etat = h.annuler(etat)!; expect(etat.n).toBe(1);
    etat = h.annuler(etat)!; expect(etat.n).toBe(0);
    expect(h.annuler(etat)).toBeNull();
    etat = h.retablir(etat)!; expect(etat.n).toBe(1);
  });
  it('une nouvelle action efface le « futur »', () => {
    const h = new Historique<{ n: number }>();
    h.enregistrer({ n: 0 });
    h.annuler({ n: 1 });
    h.enregistrer({ n: 0 });
    expect(h.peutRetablir).toBe(false);
  });
  it('copie les états (pas de modification par référence)', () => {
    const h = new Historique<{ l: number[] }>();
    const e = { l: [1] };
    h.enregistrer(e);
    e.l.push(2);
    expect(h.annuler(e)!.l).toEqual([1]);
  });
});

describe('étiquettes', () => {
  it('ne chevauche jamais deux étiquettes d’une même colonne', () => {
    const ancres = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, x: 300, y: 200 + i * 3, taille: 50 }));
    const r = disposerEtiquettes(ancres, { largeur: 1000, hauteur: 800, max: 12 });
    const ys = r.map((e) => e.ly).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(20);
  });
  it('met la sélection en priorité et range à gauche/droite', () => {
    const ancres = [
      { id: 'petit', x: 800, y: 300, taille: 7 },
      { id: 'gros', x: 100, y: 300, taille: 100 },
    ];
    const r = disposerEtiquettes(ancres, { largeur: 1000, hauteur: 800, max: 1, prioritaire: 'petit' });
    expect(r.map((e) => [e.id, e.cote])).toEqual([['petit', 'droite']]);
  });
});
