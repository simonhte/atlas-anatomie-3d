// Disposition des étiquettes : choix des structures à étiqueter puis
// placement en deux colonnes sans chevauchement (logique pure, testée).

export interface AncreEcran { id: string; x: number; y: number; taille: number }
export interface EtiquettePlacee { id: string; ax: number; ay: number; lx: number; ly: number; cote: 'gauche' | 'droite'; largeurTexte: number }

export function disposerEtiquettes(
  ancres: AncreEcran[],
  o: { largeur: number; hauteur: number; max: number; prioritaire?: string | null; espacement?: number; hautReserve?: number },
): EtiquettePlacee[] {
  const esp = o.espacement ?? 20;
  const haut = o.hautReserve ?? 90; // laisse la place aux boutons de vue
  const bas = o.hauteur - 30;
  // Priorité : la sélection, puis les structures les plus grandes à l'écran
  const triees = [...ancres].sort((a, b) => (b.id === o.prioritaire ? 1 : 0) - (a.id === o.prioritaire ? 1 : 0) || b.taille - a.taille);
  const choisies = triees.filter((a) => a.taille > 6).slice(0, o.max);
  const milieu = o.largeur / 2;
  const marge = Math.min(230, o.largeur * 0.3);
  const res: EtiquettePlacee[] = [];
  for (const cote of ['gauche', 'droite'] as const) {
    const col = choisies.filter((a) => (cote === 'gauche' ? a.x < milieu : a.x >= milieu)).sort((a, b) => a.y - b.y);
    // Placement de haut en bas en imposant un espacement minimal, puis
    // remontée si la colonne déborde en bas.
    const ys = col.map((a) => Math.min(Math.max(a.y, haut), bas));
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + esp);
    if (ys.length && ys[ys.length - 1] > bas) {
      ys[ys.length - 1] = bas;
      for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - esp);
    }
    col.forEach((a, i) => res.push({ id: a.id, ax: a.x, ay: a.y, lx: cote === 'gauche' ? marge : o.largeur - marge, ly: ys[i], cote, largeurTexte: marge - 12 }));
  }
  return res;
}
