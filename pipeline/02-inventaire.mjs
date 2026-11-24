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
import { traduireMuscle, traduirePeau } from './config/noms-muscles.mjs';
import { STRUCTURES_ZA } from './config/z-anatomy.mjs';
import { chargerTA2, traduireNom } from './config/traduction.mjs';
import { classerOrgane, groupeVaisseau, regionDepuisPosition, COUCHE_VAISSEAUX_NERFS, COUCHE_ORGANES } from './config/noms-organes.mjs';

chargerTA2(join(import.meta.dirname, '..', 'sources', 'z-anatomy', 'TA2.csv'));

/** Identifiant ASCII à partir d'un nom français : « Artère fémorale » -> « artere-femorale » */
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Classe et traduit une structure qui n'est ni un os, ni un muscle, ni la peau.
 * `systemeFMA` : 'arteres' | 'veines' | 'nerfs' | null (d'après l'arborescence FMA)
 */
function classerAutre(enComplet, systemeFMA, centre) {
  const en = enComplet.toLowerCase().trim();
  // 1. Nom complet AVEC « left/right » (ex. « left gastric artery », structure impaire)
  let cote = null;
  let t = traduireNom(en);
  let base = en;
  if (!t || t.auto || !/\b(left|right)\b/.test(en)) {
    const sep = separerCoteAnglais(en);
    base = sep.base; cote = sep.cote;
    t = traduireNom(base) ?? { fr: base[0].toUpperCase() + base.slice(1), la: '', auto: true, anglais: true };
  }
  let systeme = systemeFMA, groupe = null;
  // Certains vaisseaux ne sont pas rattachés aux artères / veines dans les arborescences FMA
  if (!systeme && /\bveins?\b|venous|vena cava/.test(base)) systeme = 'veines';
  else if (!systeme && /arter|aorta|palmar arch|arterial arch|plantar arch|pulmonary trunk|brachiocephalic trunk|celiac trunk/.test(base)) systeme = 'arteres';
  if (!systeme) {
    const c = classerOrgane(base);
    if (!c) return null;
    systeme = c.systeme; groupe = c.groupe;
  }
  const region = systeme === 'snc' ? (centre[2] > 1380 ? 'tete' : 'rachis') : regionDepuisPosition(centre);
  if (!groupe) groupe = groupeVaisseau(systeme, region);
  const couche = systeme === 'muscles' ? 2 : systeme === 'os' ? 9 : ['arteres', 'veines', 'nerfs'].includes(systeme) ? COUCHE_VAISSEAUX_NERFS : COUCHE_ORGANES;
  const frSansRomain = t.fr.replace(/\s*\([IVX]+\)$/, '');
  const cle = slug(frSansRomain);
  return { cle, fr: t.fr, la: t.la, genre: /^(artère|veine|branche|glande|partie|moelle|racine|bronche|paroi|cavité|dent|membrane|commissure|valvule|cuspide|division|arcade|langue|vessie|rate|trachée|prostate|vésicule|trompe|vulve|gencive|incisive|canine|prémolaire|molaire|zonule|corde)/i.test(t.fr) ? 'f' : 'm',
    region, groupe, couche, fiche: cle, cote, systeme, auto: !!t.auto, anglais: !!t.anglais };
}
function separerCoteAnglais(en) {
  const m = en.match(/\b(left|right) /);
  // certains noms contiennent deux fois la latéralité (« … of left X to left Y »)
  return m ? { cote: m[1] === 'left' ? 'g' : 'd', base: en.replace(/\b(left|right) /g, '') } : { cote: null, base: en };
}

const RACINE = join(import.meta.dirname, '..');
const SRC = join(RACINE, 'sources', 'bodyparts3d');
const OBJ = join(SRC, 'isa_BP3D_4.0_obj_99');
// Structures complémentaires issues de Z-Anatomy, déjà recalées (étape 4)
const OBJ_ZA = join(RACINE, 'sources', 'z-anatomy', 'recale');
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
  {
    // Les muscles sont surtout reconnus par la table pipeline/config/noms-muscles.mjs ;
    // ces concepts servent à repérer les muscles qui manqueraient dans la table.
    id: 'muscles',
    concepts: {
      FMA5022: 'organe musculaire (muscle organ)',
      FMA10474: 'zone de muscle (zone of muscle organ)',
    },
  },
  // Les étapes suivantes ajouteront : vaisseaux, nerfs, organes…
];

// Couche de dissection des os (la plus profonde) et de la peau (la plus superficielle)
const COUCHE_OS = 9;
const COUCHE_PEAU = 0;

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
  const en = h.en.toLowerCase();
  let systeme = systemeDe(h.fma);
  let t = null;
  if (systeme === 'os') t = traduireOs(en);
  // Muscles et peau : reconnus d'abord par leur nom (les arborescences FMA de
  // BodyParts3D ne rattachent pas toujours les chefs et parties de muscles)
  if (systeme !== 'os') {
    const tm = traduireMuscle(en);
    const tp = traduirePeau(en);
    if (tm) { systeme = 'muscles'; t = tm; }
    else if (tp) { systeme = 'peau'; t = tp; }
    else if (systeme === 'muscles' && /papillary|intestin|taenia/.test(en)) systeme = null; // muscles d'organes : classés plus bas
  }
  // Vaisseaux, nerfs et organes (étape 3) — les disques (os) sont nommés plus loin
  if (!t && systeme !== 'os') {
    const anc = ancetres(h.fma);
    const sysFMA = anc.has('FMA50720') ? 'arteres' : anc.has('FMA50723') ? 'veines' : anc.has('FMA65132') ? 'nerfs' : null;
    const centreMm = h.min.map((v, i) => (v + h.max[i]) / 2);
    const a = classerAutre(h.en, sysFMA, centreMm);
    if (!a) continue;
    systeme = a.systeme;
    t = a;
  }
  if (!systeme) continue;
  if (t && systeme === 'os') t.couche = COUCHE_OS;
  if (t && systeme === 'peau') t.couche = COUCHE_PEAU;
  const centre = h.min.map((v, i) => +((v + h.max[i]) / 2).toFixed(1));
  const item = { fj, fma: h.fma, en: h.en, systeme, centre, min: h.min, max: h.max };
  if (t) Object.assign(item, t);
  else if (!/intervertebral disk/.test(en)) nonTraduits.push(`${fj}  ${h.fma}  ${h.en}`);
  inventaire.push(item);
}

// --- 5 bis. Compléments Z-Anatomy (si l'étape 4 a été lancée) ---------------
if (existsSync(OBJ_ZA)) {
  let n = 0;
  for (const f of readdirSync(OBJ_ZA).filter((x) => x.endsWith('.obj')).sort()) {
    const h = entete(join(OBJ_ZA, f));
    const m = h.en.match(/^(Left |Right )?(.+)$/);
    const def = STRUCTURES_ZA[m[2]];
    if (!def) {
      // nerfs et organes recalés automatiquement (Concept ID : ZA-AUTO)
      const nerf = /nerve|plexus|ganglion|trunk|division|cord|root/i.test(m[2]) && !/spinal cord/i.test(m[2]);
      const a = classerAutre(h.en, nerf ? 'nerfs' : null, h.min.map((v, i) => (v + h.max[i]) / 2));
      if (!a) continue;
      const centre = h.min.map((v, i) => +((v + h.max[i]) / 2).toFixed(1));
      inventaire.push({ fj: f.replace('.obj', ''), fma: '', en: h.en, centre, min: h.min, max: h.max, source: 'z-anatomy', ...a });
      n++;
      continue;
    }
    const [systeme, cle, fr, la, genre, region, groupe, couche, fiche] = def;
    const cote = m[1] === 'Left ' ? 'g' : m[1] === 'Right ' ? 'd' : null;
    const centre = h.min.map((v, i) => +((v + h.max[i]) / 2).toFixed(1));
    inventaire.push({ fj: f.replace('.obj', ''), fma: '', en: h.en, systeme, centre, min: h.min, max: h.max, source: 'z-anatomy', cle, fr, la, genre, region, groupe, couche, fiche, cote });
    n++;
  }
  console.log(`Compléments Z-Anatomy : ${n} maillages`);
} else {
  console.log("(Compléments Z-Anatomy absents : lancer « npm run modeles:z-anatomy » pour les ajouter)");
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
      genre: 'm', cote: null, region: 'rachis', groupe: 'Disques intervertébraux', fiche: 'disques-intervertebraux', couche: COUCHE_OS,
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
  // arrondi à 2 mm près : certains doublons diffèrent d'une fraction de millimètre
  const r = (v) => v.map((a) => Math.round(a / 2)).join();
  const k = `${x.fma}|${r(x.min)}|${r(x.max)}`;
  if (vus.has(k)) { console.log(`Doublon ignoré : ${x.fj} (${x.en})`); inventaire.splice(i, 1); }
  else vus.add(k);
}

// --- 6 quater. Nerfs en double (orbite) : on garde la version Z-Anatomy ---------
const nerfsZA = new Set(inventaire.filter((x) => x.systeme === 'nerfs' && x.source === 'z-anatomy').map((x) => `${x.cle}|${x.cote}`));
for (let i = inventaire.length - 1; i >= 0; i--) {
  const x = inventaire[i];
  if (x.systeme === 'nerfs' && x.source !== 'z-anatomy' && nerfsZA.has(`${x.cle}|${x.cote}`)) inventaire.splice(i, 1);
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
