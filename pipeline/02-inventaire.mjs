#!/usr/bin/env node
// Étape 2 du pipeline : inventaire des maillages BodyParts3D.
//
// Pour chaque fichier OBJ (un par structure élémentaire « FJxxxx »), on lit
// l'en-tête (identifiant FMA, nom anglais, boîte englobante), on détermine
// le système anatomique grâce aux arborescences FMA « is-a » et « part-of »,
// puis on traduit le nom en français et en latin.
//
// Résultat : pipeline/sortie/inventaire.json (versionné dans git, lisible),
// qui sert d'entrée à l'étape 3 (construction des GLB).
//
//   npm run modeles:inventaire

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { traduireOs } from './config/noms-os.mjs';

const RACINE = join(import.meta.dirname, '..');
const SRC = join(RACINE, 'sources', 'bodyparts3d');
const OBJ = join(SRC, 'isa_BP3D_4.0_obj_99');
const SORTIE = join(import.meta.dirname, 'sortie');

// --- 1. Décompresser l'archive si besoin -----------------------------------
if (!existsSync(OBJ)) {
  console.log('Décompression de isa_BP3D_4.0_obj_99.zip …');
  execFileSync('unzip', ['-q', '-o', join(SRC, 'isa_BP3D_4.0_obj_99.zip'), '-d', SRC]);
}

// --- 2. Arborescences FMA : parent(s) de chaque concept ---------------------
const parents = new Map(); // concept -> Set(parents)
for (const arbre of ['isa', 'partof']) {
  const lignes = readFileSync(join(SRC, `${arbre}_inclusion_relation_list.txt`), 'utf8').split(/\r?\n/).slice(1);
  for (const l of lignes) {
    const [p, , c] = l.split('\t');
    if (!p || !c) continue;
    if (!parents.has(c)) parents.set(c, new Set());
    parents.get(c).add(p);
  }
}
const cacheAnc = new Map();
function ancetres(c) {
  if (cacheAnc.has(c)) return cacheAnc.get(c);
  const res = new Set();
  const pile = [c];
  while (pile.length) {
    const x = pile.pop();
    for (const p of parents.get(x) ?? []) if (!res.has(p)) { res.add(p); pile.push(p); }
  }
  cacheAnc.set(c, res);
  return res;
}

// --- 3. Règles de classement par système -----------------------------------
// Un maillage appartient au système si son concept FMA est, ou descend de,
// l'un des concepts listés. Les systèmes sont testés dans l'ordre.
const SYSTEMES = [
  {
    id: 'os',
    concepts: {
      FMA5018: 'organe osseux (bone organ)',
      FMA7485: 'sternum',
      FMA7591: 'cartilage costal',
      FMA10446: 'disque intervertébral',
    },
  },
  // Les étapes suivantes ajouteront : muscles, vaisseaux, nerfs, organes…
];

function systemeDe(fma) {
  const anc = ancetres(fma);
  for (const s of SYSTEMES) for (const c of Object.keys(s.concepts)) if (c === fma || anc.has(c)) return s.id;
  return null;
}

// --- 4. Lecture des en-têtes OBJ (les 2 premiers Ko suffisent) --------------
function entete(chemin) {
  const fd = openSync(chemin, 'r');
  const buf = Buffer.alloc(2048);
  readSync(fd, buf, 0, 2048, 0);
  closeSync(fd);
  const t = buf.toString('utf8');
  const get = (re) => t.match(re)?.[1]?.trim();
  const b = t.match(/Bounds\(mm\): \(([^)]+)\)-\(([^)]+)\)/);
  return {
    fma: get(/Concept ID : (\S+)/),
    en: get(/English name : (.+)/),
    min: b?.[1].split(',').map(Number),
    max: b?.[2].split(',').map(Number),
  };
}

// --- 5. Inventaire ----------------------------------------------------------
const fichiers = readdirSync(OBJ).filter((f) => f.endsWith('.obj')).sort();
const inventaire = [];
const nonTraduits = [];
for (const f of fichiers) {
  const fj = f.replace('.obj', '');
  const h = entete(join(OBJ, f));
  if (!h.fma) continue;
  const systeme = systemeDe(h.fma);
  if (!systeme) continue;
  const en = h.en.toLowerCase();
  let t = null;
  if (systeme === 'os') t = traduireOs(en);
  const centre = h.min.map((v, i) => +((v + h.max[i]) / 2).toFixed(1));
  const item = { fj, fma: h.fma, en: h.en, systeme, centre, min: h.min, max: h.max };
  if (t) Object.assign(item, t);
  else if (!/intervertebral disk/.test(en)) nonTraduits.push(`${fj}  ${h.fma}  ${h.en}`);
  inventaire.push(item);
}

// --- 6. Disques intervertébraux : nommés d'après les vertèbres voisines -----
// Les noms FMA (« intervertebral disk of axis ») sont ambigus ; on repère le
// disque par sa hauteur (axe z) entre les centres des vertèbres.
const vertebres = inventaire
  .filter((x) => /^vertebre-|^axis$|^atlas$|^sacrum$/.test(x.cle ?? ''))
  .map((x) => ({ nom: x.cle === 'atlas' ? 'C1' : x.cle === 'axis' ? 'C2' : x.cle === 'sacrum' ? 'S1' : x.cle.replace('vertebre-', '').toUpperCase(), z: x.centre[2] }))
  .sort((a, b) => b.z - a.z);
for (const d of inventaire.filter((x) => /intervertebral disk/i.test(x.en))) {
  const z = d.centre[2];
  const dessus = vertebres.filter((v) => v.z > z).at(-1);
  const dessous = vertebres.find((v) => v.z < z);
  if (dessus && dessous) {
    const n = `${dessus.nom}–${dessous.nom}`;
    Object.assign(d, {
      cle: `disque-${dessus.nom}-${dessous.nom}`.toLowerCase(),
      fr: `Disque intervertébral ${n}`,
      la: 'Discus intervertebralis',
      genre: 'm', cote: null, region: 'rachis', groupe: 'Disques intervertébraux', fiche: 'disques-intervertebraux',
    });
  } else nonTraduits.push(`${d.fj}  ${d.fma}  ${d.en} (position non résolue)`);
}

// --- 6 bis. Sésamoïdes de l'hallux : médial (tibial) et latéral (fibulaire) ---
// FMA leur donne le même nom ; le plus proche du plan médian est le médial.
for (const cote of ['d', 'g']) {
  const s = inventaire.filter((x) => x.cle === 'sesamoide-pied' && x.cote === cote).sort((a, b) => Math.abs(a.centre[0]) - Math.abs(b.centre[0]));
  if (s.length === 2) {
    Object.assign(s[0], { cle: 'sesamoide-medial', fr: "Sésamoïde médial de l'hallux", la: 'Os sesamoideum mediale' });
    Object.assign(s[1], { cle: 'sesamoide-lateral', fr: "Sésamoïde latéral de l'hallux", la: 'Os sesamoideum laterale' });
  }
}

// --- 6 ter. Doublons : même concept FMA et même boîte englobante ------------
// (ex. l'os hyoïde est fourni deux fois, à l'identique)
const vus = new Set();
for (let i = inventaire.length - 1; i >= 0; i--) {
  const x = inventaire[i];
  const k = `${x.fma}|${x.min.join()}|${x.max.join()}`;
  if (vus.has(k)) { console.log(`Doublon ignoré : ${x.fj} (${x.en})`); inventaire.splice(i, 1); }
  else vus.add(k);
}

// --- 7. Écriture ------------------------------------------------------------
mkdirSync(SORTIE, { recursive: true });
inventaire.sort((a, b) => (a.systeme + a.region + a.groupe + a.fr).localeCompare(b.systeme + b.region + b.groupe + b.fr, 'fr'));
writeFileSync(join(SORTIE, 'inventaire.json'), JSON.stringify(inventaire, null, 1) + '\n');

const parSysteme = {};
for (const x of inventaire) parSysteme[x.systeme] = (parSysteme[x.systeme] ?? 0) + 1;
console.log('Maillages retenus par système :', parSysteme);
const doublons = Object.entries(Object.groupBy(inventaire, (x) => `${x.cle}|${x.cote}`)).filter(([, v]) => v.length > 1);
if (doublons.length) console.log('Structures composées de plusieurs maillages :', doublons.map(([k, v]) => `${k} (${v.length})`).join(', '));
if (nonTraduits.length) {
  console.error(`\n⚠ ${nonTraduits.length} maillage(s) sans traduction française (à ajouter dans pipeline/config/) :\n  ` + nonTraduits.join('\n  '));
  process.exitCode = 1;
}
