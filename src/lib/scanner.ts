// Logique des coupes de scanner (sans affichage) : fenêtrage des densités et
// correspondance entre le scanner et le modèle 3D.

export type Orientation = 'axiale' | 'coronale' | 'sagittale';

export interface IndexScanner {
  patient: string;
  source: string;
  mmParPixel: number;
  orientations: Record<Orientation, { largeur: number; hauteur: number; coupes: { f: string; mm: number; s: [number, number, number, number][] }[] }>;
  structures: { id: number; nom: string; fr: string; lien: string; systeme: string; cote: 'g' | 'd' | null }[];
  versModele: { x: [number, number]; y: [number, number]; z: [number, number][] };
}

/**
 * Le pipeline a compressé les densités (unités Hounsfield, HU) sur 8 bits, par
 * morceaux (voir pipeline/06-coupes-scanner.mjs). On rétablit ici une valeur
 * approchée en HU.
 */
export function huDepuis8(v: number): number {
  if (v <= 40) return -1000 + (v / 40) * 900;
  if (v <= 230) return -100 + ((v - 40) / 190) * 400;
  return 300 + ((v - 230) / 25) * 1700;
}

export interface Fenetre { nom: string; largeur: number; centre: number }
export const FENETRES: Fenetre[] = [
  { nom: 'Parties molles', largeur: 400, centre: 40 },
  { nom: 'Poumon', largeur: 1500, centre: -600 },
  { nom: 'Os', largeur: 1800, centre: 400 },
];

/** Table de correspondance 8 bits stockés -> gris affiché, pour une fenêtre. */
export function tableFenetre(f: Fenetre): Uint8Array {
  const t = new Uint8Array(256);
  const bas = f.centre - f.largeur / 2;
  for (let v = 0; v < 256; v++) {
    const g = ((huDepuis8(v) - bas) / f.largeur) * 255;
    t[v] = Math.max(0, Math.min(255, Math.round(g)));
  }
  return t;
}

/** Interpolation linéaire par morceaux (extrapolée aux extrémités). */
export function interpoler(points: [number, number][], x: number): number {
  const p = [...points].sort((a, b) => a[0] - b[0]);
  if (p.length === 1) return p[0][1] + (x - p[0][0]);
  let i = p.findIndex((q) => q[0] >= x);
  if (i <= 0) i = i === 0 ? 1 : p.length - 1;
  const [x0, y0] = p[i - 1], [x1, y1] = p[i];
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

/**
 * Position (mètres, repère du visualiseur : X gauche du sujet, Y haut, Z avant)
 * du plan du modèle 3D qui correspond à une coupe de scanner.
 * `mm` est la coordonnée de la coupe dans le repère du scanner (RAS, mm).
 */
export function positionModele(index: IndexScanner, orientation: Orientation, mm: number): { axe: 'x' | 'y' | 'z'; valeur: number } {
  const v = index.versModele;
  if (orientation === 'axiale') return { axe: 'y', valeur: interpoler(v.z, mm) / 1000 };
  // RAS -> LPS : on change de signe, puis transformation affine calée sur le gril costal
  if (orientation === 'coronale') return { axe: 'z', valeur: -(v.y[0] * -mm + v.y[1]) / 1000 };
  return { axe: 'x', valeur: (v.x[0] * -mm + v.x[1]) / 1000 };
}
