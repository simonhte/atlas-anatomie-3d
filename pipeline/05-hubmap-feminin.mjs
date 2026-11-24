#!/usr/bin/env node
// Étape 5 du pipeline : appareil génital FÉMININ.
//
// BodyParts3D et Z-Anatomy sont des modèles masculins. Les organes génitaux
// féminins viennent de la « HRA 3D Reference Object Library » (HuBMAP,
// modèle féminin du Visible Human Project), licence CC BY 4.0.
//
// Ces organes sont dans le repère d'un AUTRE corps (féminin) : on les recale
// sur le bassin du modèle masculin en superposant des repères communs aux deux
// modèles — bassin osseux, reins gauche et droit, vessie — (orientation,
// échelle et translation par axe). Le résultat est une APPROXIMATION
// topographique : le bassin féminin est plus large que le bassin masculin.
//
//   npm run modeles:feminin

import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream, rmSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const RACINE = join(import.meta.dirname, '..');
const DOSSIER = join(RACINE, 'sources', 'hubmap');
const RECALE = join(DOSSIER, 'recale');
const BASE = 'https://github.com/hubmapconsortium/ccf-3d-reference-object-library/raw/main/VH_Female/v1.2/';

// Organes à intégrer : fichier -> [nom anglais écrit dans l'OBJ]
const ORGANES = {
  'VH_F_Uterus.glb': 'Uterus',
  'VH_F_Vagina.glb': 'Vagina',
  'VH_F_Ovary_L.glb': 'Left ovary',
  'VH_F_Ovary_R.glb': 'Right ovary',
  'VH_F_Fallopian_Tube_L.glb': 'Left uterine tube',
  'VH_F_Fallopian_Tube_R.glb': 'Right uterine tube',
  'VH_F_Ligaments_Uterus_Ovaries.glb': 'Ligaments of uterus and ovaries',
};
// Repères communs : fichier HuBMAP -> [clés BodyParts3D (boîte réunie), côté]
const REPERES = {
  'VH_F_Pelvis.glb': [['coxal', 'g'], ['coxal', 'd'], ['sacrum', null]],
  'VH_F_Kidney_L.glb': [['rein', 'g']],
  'VH_F_Kidney_R.glb': [['rein', 'd']],
  'VH_F_Urinary_Bladder.glb': [['vessie-urinaire', null]],
};

// --- 1. Téléchargement ------------------------------------------------------
mkdirSync(DOSSIER, { recursive: true });
for (const f of [...Object.keys(ORGANES), ...Object.keys(REPERES)]) {
  const cible = join(DOSSIER, f);
  if (existsSync(cible)) continue;
  process.stdout.write(`↓ ${f} … `);
  const rep = await fetch(BASE + f);
  if (!rep.ok) throw new Error(`${f} : HTTP ${rep.status}`);
  await pipeline(Readable.fromWeb(rep.body), createWriteStream(cible));
  console.log('ok');
}

// --- 2. Lecture des GLB en coordonnées « monde » ------------------------------
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
/** Renvoie { pos: [[x,y,z]…], tri: [[a,b,c]…] } de tous les maillages du fichier. */
async function lireGlb(fichier) {
  const doc = await io.read(join(DOSSIER, fichier));
  const pos = [], tri = [];
  for (const scene of doc.getRoot().listScenes()) {
    scene.traverse((node) => {
      const mesh = node.getMesh();
      if (!mesh) return;
      const m = node.getWorldMatrix(); // matrice 4×4 en colonnes
      for (const prim of mesh.listPrimitives()) {
        const p = prim.getAttribute('POSITION');
        if (!p) continue;
        const depart = pos.length;
        const v = [0, 0, 0];
        for (let i = 0; i < p.getCount(); i++) {
          p.getElement(i, v);
          pos.push([0, 1, 2].map((r) => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r]));
        }
        const idx = prim.getIndices();
        const n = idx ? idx.getCount() : p.getCount();
        for (let i = 0; i + 2 < n; i += 3) {
          const g = (k) => (idx ? idx.getScalar(k) : k);
          tri.push([depart + g(i), depart + g(i + 1), depart + g(i + 2)]);
        }
      }
    });
  }
  return { pos, tri };
}
const boite = (pos) => ({
  min: [0, 1, 2].map((i) => Math.min(...pos.map((p) => p[i]))),
  max: [0, 1, 2].map((i) => Math.max(...pos.map((p) => p[i]))),
});

// --- 3. Recalage ------------------------------------------------------------
const inventaire = JSON.parse(readFileSync(join(import.meta.dirname, 'sortie', 'inventaire.json'), 'utf8'));
const trouver = (cle, cote) => inventaire.filter((x) => x.cle === cle && (cote === null || x.cote === cote));
const paires = [];
for (const [f, cibles] of Object.entries(REPERES)) {
  const { pos } = await lireGlb(f);
  const a = boite(pos);
  const items = cibles.flatMap(([cle, cote]) => trouver(cle, cote));
  if (!items.length) { console.warn(`⚠ repère BodyParts3D introuvable pour ${f}`); continue; }
  const b = { min: [0, 1, 2].map((i) => Math.min(...items.map((x) => x.min[i]))), max: [0, 1, 2].map((i) => Math.max(...items.map((x) => x.max[i]))) };
  paires.push({ f, a, b });
}
if (paires.length < 3) throw new Error('Pas assez de repères pour recaler le modèle féminin');

const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const orienter = (o, v) => [0, 1, 2].map((i) => o.sg[i] * v[o.p[i]]);
let meilleur = null;
for (const p of perms) for (let sgn = 0; sgn < 8; sgn++) {
  const o = { p, sg: [sgn & 1 ? -1 : 1, sgn & 2 ? -1 : 1, sgn & 4 ? -1 : 1] };
  // points : coins de la boîte du bassin + centres des reins et de la vessie
  const P = [], Q = [];
  for (const { f, a, b } of paires) {
    const a1 = orienter(o, a.min), a2 = orienter(o, a.max);
    const amin = a1.map((x, i) => Math.min(x, a2[i])), amax = a1.map((x, i) => Math.max(x, a2[i]));
    if (f.includes('Pelvis')) { P.push(amin, amax); Q.push(b.min, b.max); }
    else { P.push(amin.map((x, i) => (x + amax[i]) / 2)); Q.push(b.min.map((x, i) => (x + b.max[i]) / 2)); }
  }
  const ech = [], tr = [];
  let ok = true;
  for (let i = 0; i < 3; i++) {
    const n = P.length, mp = P.reduce((s, v) => s + v[i], 0) / n, mq = Q.reduce((s, v) => s + v[i], 0) / n;
    let num = 0, den = 0;
    for (let k = 0; k < n; k++) { num += (P[k][i] - mp) * (Q[k][i] - mq); den += (P[k][i] - mp) ** 2; }
    const si = num / den;
    if (!(si > 0)) { ok = false; break; }
    ech.push(si); tr.push(mq - si * mp);
  }
  if (!ok) continue;
  // les échelles des 3 axes doivent rester proches (pas de déformation absurde)
  if (Math.max(...ech) / Math.min(...ech) > 1.6) continue;
  let err = 0;
  for (let k = 0; k < P.length; k++) err += Math.hypot(...[0, 1, 2].map((i) => ech[i] * P[k][i] + tr[i] - Q[k][i])) ** 2;
  const rms = Math.sqrt(err / P.length);
  if (!meilleur || rms < meilleur.rms) meilleur = { o, ech, tr, rms };
}
const { o, ech, tr, rms } = meilleur;
console.log(`Recalage du modèle féminin : axes [${o.p}] signes [${o.sg}], échelles ${ech.map((x) => x.toFixed(1)).join(' / ')}, écart moyen ${rms.toFixed(1)} mm`);
const appliquer = (v) => orienter(o, v).map((x, i) => ech[i] * x + tr[i]);
const parite = (o.sg.filter((x) => x < 0).length + ([[0, 2, 1], [1, 0, 2], [2, 1, 0]].some((p) => p.join() === o.p.join()) ? 1 : 0)) % 2;

// --- 4. Écriture des OBJ recalés --------------------------------------------
rmSync(RECALE, { recursive: true, force: true });
mkdirSync(RECALE, { recursive: true });
for (const [f, en] of Object.entries(ORGANES)) {
  const { pos, tri } = await lireGlb(f);
  const v = pos.map(appliquer);
  const b = boite(v);
  const id = `HM-${f.replace(/^VH_F_|\.glb$/g, '').toLowerCase().replace(/_/g, '-')}`;
  writeFileSync(join(RECALE, `${id}.obj`), [
    '# Source : HRA 3D Reference Object Library (HuBMAP), modèle féminin Visible Human, CC BY 4.0',
    `# File ID : ${id}`,
    '# Concept ID : HUBMAP',
    `# English name : ${en}`,
    `# Bounds(mm): (${b.min.join(',')})-(${b.max.join(',')})`,
    ...v.map((p) => `v ${p.map((x) => x.toFixed(3)).join(' ')}`),
    ...tri.map(([a, bb, c]) => (parite ? `f ${a + 1} ${c + 1} ${bb + 1}` : `f ${a + 1} ${bb + 1} ${c + 1}`)),
  ].join('\n') + '\n');
  console.log(`✔ ${en} (${tri.length} triangles)`);
}
writeFileSync(join(import.meta.dirname, 'sortie', 'recalage-feminin.json'), JSON.stringify({ orientation: o, echelles: ech, translation: tr, ecartMoyenMm: rms, reperes: paires.map((p) => p.f) }, null, 1) + '\n');
