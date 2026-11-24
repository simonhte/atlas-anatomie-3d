#!/usr/bin/env node
// Étape 4 du pipeline : compléter BodyParts3D avec des structures de Z-Anatomy
// (muscles absents, coccyx, cartilages costaux 8 à 10).
//
// 1. Télécharge l'atlas Z-Anatomy (≈ 87 Mo, CC BY-SA 4.0) si besoin.
// 2. Lance Blender sans interface pour exporter les objets voulus
//    (voir pipeline/z-anatomy/exporter.py et pipeline/config/z-anatomy.mjs).
// 3. RECALAGE : calcule la transformation (axes, échelle, translation) qui
//    superpose les os présents dans les deux atlas (fémur, tibia, humérus…),
//    puis l'applique aux structures exportées.
// 4. Écrit des OBJ au format BodyParts3D (mm, repère LPS) dans
//    sources/z-anatomy/recale/, que l'étape 2 (inventaire) intègre.
//
// Prérequis : Blender installé (/Applications/Blender.app) ou variable BLENDER.
//   npm run modeles:z-anatomy

import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';
import { STRUCTURES_ZA, REPERES, OS_ANCRAGE, GROUPES_ANCRAGE, groupeAncrage, nomsAExporter, decouperNomZA } from './config/z-anatomy.mjs';

const RACINE = join(import.meta.dirname, '..');
const DOSSIER = join(RACINE, 'sources', 'z-anatomy');
const BLEND = join(DOSSIER, 'Z-Anatomy', 'Startup.blend');
const EXPORT = join(DOSSIER, 'export');
const RECALE = join(DOSSIER, 'recale');
const URL_ZIP = 'https://github.com/Z-Anatomy/Models-of-human-anatomy/raw/master/Z-Anatomy.zip';

// --- 1. Téléchargement ------------------------------------------------------
mkdirSync(DOSSIER, { recursive: true });
if (!existsSync(BLEND)) {
  const zip = join(DOSSIER, 'Z-Anatomy.zip');
  if (!existsSync(zip)) {
    console.log('↓ Z-Anatomy.zip (≈ 87 Mo) …');
    const rep = await fetch(URL_ZIP);
    if (!rep.ok) throw new Error(`Téléchargement impossible : HTTP ${rep.status}`);
    await pipeline(Readable.fromWeb(rep.body), createWriteStream(zip));
  }
  execFileSync('unzip', ['-q', '-o', zip, 'Z-Anatomy/Startup.blend', '-d', DOSSIER]);
}

// --- 2. Export Blender ------------------------------------------------------
const blender = process.env.BLENDER
  ?? ['/Applications/Blender.app/Contents/MacOS/Blender', '/usr/bin/blender', '/opt/homebrew/bin/blender'].find(existsSync);
if (!blender) {
  console.error('Blender est introuvable. Installe-le (voir README) ou indique son chemin : BLENDER=/chemin/vers/blender');
  process.exit(1);
}
rmSync(EXPORT, { recursive: true, force: true });
mkdirSync(EXPORT, { recursive: true });
const fichierNoms = join(EXPORT, 'noms.json');
writeFileSync(fichierNoms, JSON.stringify(nomsAExporter()));
console.log('Export depuis Blender (1 à 2 minutes) …');
execFileSync(blender, ['-b', BLEND, '--python', join(import.meta.dirname, 'z-anatomy', 'exporter.py'), '--', fichierNoms, EXPORT], { stdio: ['ignore', 'ignore', 'inherit'] });
const { bornes } = JSON.parse(readFileSync(join(EXPORT, 'bornes.json'), 'utf8'));

// --- 3. Recalage ------------------------------------------------------------
const inventaire = JSON.parse(readFileSync(join(import.meta.dirname, 'sortie', 'inventaire.json'), 'utf8'));
const paires = []; // [boîte Z-Anatomy, boîte BodyParts3D]
for (const [za, cle] of Object.entries(REPERES)) {
  for (const [suf, cote] of [['l', 'g'], ['r', 'd']]) {
    const a = bornes[`${za}.${suf}`];
    const b = inventaire.find((x) => x.cle === cle && x.cote === cote);
    if (a && b) paires.push({ nom: `${za}.${suf}`, a, b });
  }
}
if (paires.length < 4) throw new Error(`Pas assez d'os repères communs (${paires.length})`);

/** Les 48 orientations « axe sur axe » (permutation + signes). */
function orientations() {
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const res = [];
  for (const p of perms) for (let s = 0; s < 8; s++) res.push({ p, sg: [s & 1 ? -1 : 1, s & 2 ? -1 : 1, s & 4 ? -1 : 1] });
  return res;
}
const orienter = (o, v) => [0, 1, 2].map((i) => o.sg[i] * v[o.p[i]]);
/** Boîte orientée : on transforme les deux coins puis on reprend min/max. */
function boiteOrientee(o, min, max) {
  const a = orienter(o, min), b = orienter(o, max);
  return { min: a.map((x, i) => Math.min(x, b[i])), max: a.map((x, i) => Math.max(x, b[i])) };
}

// Pour chaque orientation : échelle s et translation t par moindres carrés sur
// les coins des boîtes (min et max) de tous les os repères.
let meilleur = null;
for (const o of orientations()) {
  const P = [], Q = [];
  for (const { a, b } of paires) {
    const bo = boiteOrientee(o, a.min, a.max);
    P.push(bo.min, bo.max);
    Q.push(b.min, b.max);
  }
  const n = P.length;
  const mp = [0, 1, 2].map((i) => P.reduce((s, v) => s + v[i], 0) / n);
  const mq = [0, 1, 2].map((i) => Q.reduce((s, v) => s + v[i], 0) / n);
  let num = 0, den = 0;
  for (let k = 0; k < n; k++) for (let i = 0; i < 3; i++) { num += (P[k][i] - mp[i]) * (Q[k][i] - mq[i]); den += (P[k][i] - mp[i]) ** 2; }
  const s = num / den;
  if (!(s > 0)) continue;
  const t = mq.map((m, i) => m - s * mp[i]);
  let err = 0;
  for (let k = 0; k < n; k++) err += Math.hypot(...[0, 1, 2].map((i) => s * P[k][i] + t[i] - Q[k][i])) ** 2;
  const rms = Math.sqrt(err / n);
  if (!meilleur || rms < meilleur.rms) meilleur = { o, s, t, rms };
}
const { o, s, t, rms } = meilleur;
const appliquer = (v) => { const w = orienter(o, v); return w.map((x, i) => s * x + t[i]); };
console.log(`Recalage sur ${paires.length} os repères : échelle ${s.toFixed(4)}, axes [${o.p}] signes [${o.sg}], écart moyen ${rms.toFixed(1)} mm`);
if (rms > 15) throw new Error(`Recalage imprécis (${rms.toFixed(1)} mm) : vérifier les os repères`);

// Vérification de la latéralité : « Femur.l » doit être du côté gauche (x > 0)
const fl = bornes['Femur.l'];
const centreFl = appliquer(fl.min.map((v, i) => (v + fl.max[i]) / 2));
const inverserCotes = centreFl[0] < 0;
if (inverserCotes) console.log('⚠ Dans Z-Anatomy, « .l » correspond à la droite du sujet : latéralité inversée.');

// --- 3 bis. Recalage local (par groupe d'os voisins) --------------------------
// Orientation fixée par le recalage global ; on ajuste ensuite, pour chaque
// structure, une échelle et une translation PAR AXE sur les os qui l'entourent
// (régression linéaire sur les coins des boîtes englobantes).
const cacheLocal = new Map();
function recalageLocal(groupe, cote) {
  const cleCache = `${groupe}|${cote}`;
  if (cacheLocal.has(cleCache)) return cacheLocal.get(cleCache);
  const P = [], Q = [], noms = [];
  for (const base of GROUPES_ANCRAGE[groupe]) {
    const cleBP = OS_ANCRAGE[base];
    // os médian (sans suffixe) ou os du même côté ; pour une structure médiane, les deux côtés
    const candidats = [[base, null], [`${base}.l`, 'g'], [`${base}.r`, 'd']];
    for (const [nomZA, c] of candidats) {
      const a = bornes[nomZA];
      if (!a) continue;
      const cReel = c && inverserCotes ? (c === 'g' ? 'd' : 'g') : c;
      if (cote && cReel && cReel !== cote) continue;
      const b = inventaire.find((x) => x.cle === cleBP && x.cote === cReel);
      if (!b) continue;
      const bo = boiteOrientee(o, a.min, a.max);
      P.push(bo.min, bo.max); Q.push(b.min, b.max); noms.push(nomZA);
    }
  }
  if (noms.length < 1) { cacheLocal.set(cleCache, null); return null; }
  const ech = [], tr = [];
  let err = 0;
  for (let i = 0; i < 3; i++) {
    const n = P.length;
    const mp = P.reduce((acc, v) => acc + v[i], 0) / n, mq = Q.reduce((acc, v) => acc + v[i], 0) / n;
    let num = 0, den = 0;
    for (let k = 0; k < n; k++) { num += (P[k][i] - mp) * (Q[k][i] - mq); den += (P[k][i] - mp) ** 2; }
    let si = den > 0 ? num / den : s;
    // garde-fou : une échelle locale aberrante (> 15 % d'écart) est ramenée à l'échelle globale
    if (!(si > s * 0.85 && si < s * 1.15)) si = s;
    let ti = mq - si * mp;
    // Coccyx : on aligne la POINTE du sacrum (bas de la boîte sur l'axe vertical z)
    // plutôt que son centre, car les deux sacrums n'ont pas la même hauteur.
    if (groupe === 'sacrum' && i === 2) { si = s; ti = Q[0][2] - s * P[0][2]; }
    ech.push(si); tr.push(ti);
  }
  for (let k = 0; k < P.length; k++) err += Math.hypot(...[0, 1, 2].map((i) => ech[i] * P[k][i] + tr[i] - Q[k][i])) ** 2;
  const res = { ech, tr, rms: Math.sqrt(err / P.length), noms };
  cacheLocal.set(cleCache, res);
  return res;
}
const bilanLocal = {};

// --- 4. Écriture des OBJ recalés --------------------------------------------
rmSync(RECALE, { recursive: true, force: true });
mkdirSync(RECALE, { recursive: true });
const manquants = [];
let ecrits = 0;
for (const nom of Object.keys(bornes)) {
  const { base, cote: c0 } = decouperNomZA(nom);
  const def = STRUCTURES_ZA[base];
  if (!def) continue; // os repère : pas réécrit
  const cote = c0 && inverserCotes ? (c0 === 'g' ? 'd' : 'g') : c0;
  const loc = recalageLocal(groupeAncrage(base), cote);
  const transformer = loc ? (v) => orienter(o, v).map((x, i) => loc.ech[i] * x + loc.tr[i]) : appliquer;
  bilanLocal[`${groupeAncrage(base)}${cote ? `/${cote}` : ''}`] = loc ? `${loc.rms.toFixed(1)} mm (${loc.noms.length} os)` : 'global';
  const lignes = readFileSync(join(EXPORT, bornes[nom].fichier), 'utf8').split('\n');
  const sortie = [];
  const mins = [Infinity, Infinity, Infinity], maxs = [-Infinity, -Infinity, -Infinity];
  for (const l of lignes) {
    if (!l.startsWith('v ')) continue;
    const v = transformer(l.slice(2).split(' ').map(Number));
    v.forEach((x, i) => { mins[i] = Math.min(mins[i], x); maxs[i] = Math.max(maxs[i], x); });
    sortie.push(`v ${v.map((x) => x.toFixed(3)).join(' ')}`);
  }
  // Si l'orientation inverse la chirualité (nombre impair de signes moins / permutation impaire),
  // on retourne l'ordre des sommets des faces pour garder des normales sortantes.
  const parite = (o.sg.filter((x) => x < 0).length + ([[0, 2, 1], [1, 0, 2], [2, 1, 0]].some((p) => p.join() === o.p.join()) ? 1 : 0)) % 2;
  for (const l of lignes) {
    if (!l.startsWith('f ')) continue;
    const [a, b, c] = l.slice(2).split(' ');
    sortie.push(parite ? `f ${a} ${c} ${b}` : `f ${a} ${b} ${c}`);
  }
  const fj = `ZA-${def[1]}${cote ? `-${cote}` : ''}`;
  const anglais = `${cote === 'g' ? 'Left ' : cote === 'd' ? 'Right ' : ''}${base}`;
  writeFileSync(join(RECALE, `${fj}.obj`), [
    '# Source : Z-Anatomy, The libre 3D atlas of anatomy (CC BY-SA 4.0), dérivé de BodyParts3D',
    `# File ID : ${fj}`,
    '# Concept ID : ZA',
    `# English name : ${anglais}`,
    `# Bounds(mm): (${mins.join(',')})-(${maxs.join(',')})`,
    ...sortie,
  ].join('\n') + '\n');
  ecrits++;
}
for (const base of Object.keys(STRUCTURES_ZA)) {
  if (![base, `${base}.l`, `${base}.r`].some((n) => bornes[n])) manquants.push(base);
}
console.log(`${ecrits} structures recalées écrites dans sources/z-anatomy/recale/`);
console.log('Recalage local (écart moyen sur les os voisins) :');
for (const [k, v] of Object.entries(bilanLocal).sort()) console.log(`  ${k.padEnd(14)} ${v}`);
if (manquants.length) console.warn(`⚠ Introuvables dans Z-Anatomy : ${manquants.join(', ')}`);
writeFileSync(join(import.meta.dirname, 'sortie', 'recalage-z-anatomy.json'), JSON.stringify({ orientation: o, echelle: s, translation: t, ecartMoyenMm: rms, osReperes: paires.map((p) => p.nom), inverserCotes, recalageLocal: Object.fromEntries(cacheLocal) }, null, 1) + '\n');
