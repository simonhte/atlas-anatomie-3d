#!/usr/bin/env node
// Étape 6 du pipeline : coupes de scanner réelles, annotées.
//
// Source : un patient du jeu de données TotalSegmentator v2 (CC BY 4.0),
// scanner (CT) de 1,5 mm avec 117 structures segmentées. On ne télécharge que
// ce patient (≈ 63 Mo) dans l'archive Zenodo de 3,2 Go, par requêtes partielles.
//
// Sorties dans public/coupes/<patient>/ :
//   axiale|coronale|sagittale/NNN.jpg  coupe en niveaux de gris (HU compressés sur 8 bits)
//   axiale|coronale|sagittale/NNN.png  carte d'étiquettes (n° de structure par pixel)
//   index.json                          liste des coupes, structures présentes et
//                                       correspondance avec le modèle 3D
//
// Conventions radiologiques : coupes axiales vues des pieds (droite du patient à
// gauche de l'écran, face antérieure en haut) ; coronales vues de face ;
// sagittales vues du côté gauche (face antérieure à gauche de l'écran).
//
//   npm run modeles:coupes

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import jpeg from 'jpeg-js';
import { ZipDistant } from './lib/zip-distant.mjs';
import { lireNifti } from './lib/nifti.mjs';
import { encoderPngGris } from './lib/png.mjs';
import { traduireTS } from './config/totalsegmentator.mjs';

const PATIENT = 's1371'; // corps (cuisses → C6), homme 70 ans, sans pathologie
const URL_ZIP = 'https://zenodo.org/api/records/10047263/files/Totalsegmentator_dataset_small_v201.zip/content';
const PAS = 2; // une coupe sur 2 voxels de 1,5 mm = tous les 3 mm
const RACINE = join(import.meta.dirname, '..');
const SRC = join(RACINE, 'sources', 'totalsegmentator', PATIENT);
const SORTIE = join(RACINE, 'public', 'coupes', PATIENT);

// --- 1. Téléchargement du seul patient choisi -------------------------------
if (!existsSync(join(SRC, 'ct.nii.gz')) || readdirSync(join(SRC, 'segmentations')).length < 117) {
  mkdirSync(join(SRC, 'segmentations'), { recursive: true });
  console.log(`Lecture de l'index de l'archive TotalSegmentator (3,2 Go, non téléchargée en entier) …`);
  const zip = await new ZipDistant(URL_ZIP).ouvrir();
  for (const [nom] of zip.entrees) {
    if (!nom.startsWith(`${PATIENT}/`) || nom.endsWith('/')) continue;
    const cible = join(SRC, nom.slice(PATIENT.length + 1));
    if (!existsSync(cible)) writeFileSync(cible, await zip.lire(nom));
  }
  console.log(`Téléchargé : ${(zip.telecharge / 1e6).toFixed(0)} Mo`);
}

// --- 2. Lecture du scanner et des segmentations -----------------------------
const ct = lireNifti(readFileSync(join(SRC, 'ct.nii.gz')));
const [nx, ny, nz] = ct.dim;
const M = ct.M;
for (const [r, c] of [[0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]]) {
  if (Math.abs(M[r][c]) > 1e-3) throw new Error('Scanner oblique : réorientation non gérée');
}
if (M[0][0] < 0 || M[1][1] < 0 || M[2][2] < 0) throw new Error('Orientation inattendue (attendu : RAS)');
const voxel = (i, j, k) => i + nx * (j + ny * k);
const etiquettes = new Uint8Array(nx * ny * nz);
const structures = [];
for (const f of readdirSync(join(SRC, 'segmentations')).sort()) {
  const nom = f.replace('.nii.gz', '');
  const t = traduireTS(nom);
  if (!t) { console.warn(`⚠ structure non traduite : ${nom}`); continue; }
  const seg = lireNifti(readFileSync(join(SRC, 'segmentations', f)));
  let n = 0;
  const id = structures.length + 1;
  for (let v = 0; v < seg.donnees.length; v++) if (seg.donnees[v]) { etiquettes[v] = id; n++; }
  if (!n) continue;
  structures.push({ id, nom, ...t, voxels: n });
}
console.log(`${structures.length} structures présentes chez ce patient`);

// HU -> 8 bits, compression par morceaux (le navigateur rétablit les fenêtres) :
//   -1000…-100 HU -> 0…40 (air, poumon, graisse) ; -100…300 -> 40…230 (parties molles) ; 300…2000 -> 230…255 (os)
function huVers8(hu) {
  if (hu <= -1000) return 0;
  if (hu < -100) return Math.round(((hu + 1000) / 900) * 40);
  if (hu < 300) return Math.round(40 + ((hu + 100) / 400) * 190);
  if (hu < 2000) return Math.round(230 + ((hu - 300) / 1700) * 25);
  return 255;
}
const LUT = new Uint8Array(5001).map((_, i) => huVers8(i - 3000));
const gris = (v) => LUT[Math.max(0, Math.min(5000, ct.donnees[v] * ct.pente + ct.ordonnee + 3000))];

// --- 3. Production des coupes -----------------------------------------------
// Pour chaque orientation : fonction (colonne, ligne, n° de coupe) -> voxel
const ORIENTATIONS = {
  axiale: { n: nz, l: nx, h: ny, vox: (c, r, s) => voxel(nx - 1 - c, ny - 1 - r, s), mm: (s) => M[2][2] * s + M[2][3] },
  coronale: { n: ny, l: nx, h: nz, vox: (c, r, s) => voxel(nx - 1 - c, s, nz - 1 - r), mm: (s) => M[1][1] * s + M[1][3] },
  sagittale: { n: nx, l: ny, h: nz, vox: (c, r, s) => voxel(s, ny - 1 - c, nz - 1 - r), mm: (s) => M[0][0] * s + M[0][3] },
};
rmSync(SORTIE, { recursive: true, force: true });
const index = { patient: PATIENT, source: 'TotalSegmentator v2 (Wasserthal et al.), CC BY 4.0', mmParPixel: ct.pixdim[0], orientations: {} };
let octets = 0;
for (const [nom, o] of Object.entries(ORIENTATIONS)) {
  mkdirSync(join(SORTIE, nom), { recursive: true });
  const coupes = [];
  for (let s = 0, numero = 0; s < o.n; s += PAS, numero++) {
    const rgba = Buffer.alloc(o.l * o.h * 4);
    const lab = new Uint8Array(o.l * o.h);
    const stats = new Map(); // étiquette -> [somme x, somme y, n]
    let corps = 0;
    for (let r = 0; r < o.h; r++) for (let c = 0; c < o.l; c++) {
      const v = o.vox(c, r, s);
      const g = gris(v);
      const p = r * o.l + c;
      rgba[4 * p] = rgba[4 * p + 1] = rgba[4 * p + 2] = g; rgba[4 * p + 3] = 255;
      if (g > 20) corps++;
      const e = etiquettes[v];
      lab[p] = e;
      if (e) { const st = stats.get(e) ?? [0, 0, 0]; st[0] += c; st[1] += r; st[2]++; stats.set(e, st); }
    }
    if (corps < o.l * o.h * 0.02) continue; // coupe vide (hors du corps)
    const fichier = String(numero).padStart(3, '0');
    const jpg = jpeg.encode({ data: rgba, width: o.l, height: o.h }, 82).data;
    const png = encoderPngGris(lab, o.l, o.h);
    writeFileSync(join(SORTIE, nom, `${fichier}.jpg`), jpg);
    writeFileSync(join(SORTIE, nom, `${fichier}.png`), png);
    octets += jpg.length + png.length;
    coupes.push({
      f: fichier,
      mm: +o.mm(s).toFixed(1),
      // structures présentes : [n°, x centre, y centre, nb de pixels] (pour les annotations)
      s: [...stats.entries()].filter(([, st]) => st[2] >= 25).map(([e, st]) => [e, Math.round(st[0] / st[2]), Math.round(st[1] / st[2]), st[2]]),
    });
  }
  index.orientations[nom] = { largeur: o.l, hauteur: o.h, coupes };
  console.log(`${nom} : ${coupes.length} coupes`);
}

// --- 4. Correspondance avec le modèle 3D ------------------------------------
// Hauteur : interpolation par les centres des vertèbres (présentes dans les deux) ;
// largeur et profondeur : boîte du gril costal (côtes + sternum).
const inv = JSON.parse(readFileSync(join(import.meta.dirname, 'sortie', 'inventaire.json'), 'utf8'));
const centreCT = (filtre) => {
  let sx = 0, sy = 0, sz = 0, n = 0;
  const ids = new Set(structures.filter(filtre).map((s) => s.id));
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (ids.has(etiquettes[voxel(i, j, k)])) { sx += i; sy += j; sz += k; n++; }
  }
  return n ? [M[0][0] * sx / n + M[0][3], M[1][1] * sy / n + M[1][3], M[2][2] * sz / n + M[2][3]] : null;
};
const pointsZ = [];
for (const s of structures.filter((x) => x.vertebre && /^[TL]/.test(x.vertebre))) {
  const c = centreCT((x) => x.id === s.id);
  const m = inv.find((x) => x.cle === s.lien && x.systeme === 'os');
  if (c && m) pointsZ.push([c[2], (m.min[2] + m.max[2]) / 2]); // mm CT (RAS z) -> mm modèle (LPS z)
}
pointsZ.sort((a, b) => a[0] - b[0]);
// Boîte du gril costal (CT en RAS, modèle en LPS)
let bCT = [[Infinity, -Infinity], [Infinity, -Infinity]];
const idsCage = new Set(structures.filter((s) => /^rib_|^sternum$/.test(s.nom)).map((s) => s.id));
for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
  if (!idsCage.has(etiquettes[voxel(i, j, k)])) continue;
  const x = M[0][0] * i + M[0][3], y = M[1][1] * j + M[1][3];
  bCT = [[Math.min(bCT[0][0], x), Math.max(bCT[0][1], x)], [Math.min(bCT[1][0], y), Math.max(bCT[1][1], y)]];
}
const cage = inv.filter((x) => x.systeme === 'os' && /^cote-|^corps-sternum$|^manubrium$|^xiphoide$/.test(x.cle));
const bMod = [0, 1].map((a) => [Math.min(...cage.map((x) => x.min[a])), Math.max(...cage.map((x) => x.max[a]))]);
// LPS = -RAS : x_LPS = a·(-x_RAS) + b
const ajuster = (ct2, mod) => { const a = (mod[1] - mod[0]) / (ct2[1] - ct2[0]); return [a, mod[0] - a * ct2[0]]; };
index.versModele = {
  // CT (mm, RAS) -> modèle (mm, LPS) ; le visualiseur convertit ensuite en mètres (Y vers le haut)
  x: ajuster([-bCT[0][1], -bCT[0][0]], bMod[0]),
  y: ajuster([-bCT[1][1], -bCT[1][0]], bMod[1]),
  z: pointsZ.map(([a, b]) => [+a.toFixed(1), +b.toFixed(1)]),
};
index.structures = structures.map(({ id, nom, fr, lien, systeme, cote }) => ({ id, nom, fr, lien, systeme, cote }));
writeFileSync(join(SORTIE, 'index.json'), JSON.stringify(index));
console.log(`Correspondance des hauteurs : ${pointsZ.length} vertèbres repères`);
console.log(`Total : ${(octets / 1e6).toFixed(1)} Mo`);
