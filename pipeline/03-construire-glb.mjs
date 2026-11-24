#!/usr/bin/env node
// Étape 3 du pipeline : construction des paquets 3D (GLB) chargés par l'app.
//
// Entrée  : pipeline/sortie/inventaire.json + les OBJ de BodyParts3D
// Sortie  : public/models/<systeme>-<region>.<lod>.glb
//           public/data/structures.json (métadonnées de chaque maillage)
//
// Pour chaque paquet (un système × une région) on produit deux niveaux de
// détail (LOD) :
//   hi : maillage BodyParts3D d'origine (déjà réduit à 1 % par le DBCLS)
//   lo : maillage simplifié (≈ 25 % des triangles) pour le premier affichage
//        et les téléphones
// Les GLB sont compressés avec meshopt (EXT_meshopt_compression) et quantifiés.
//
// Repère : BodyParts3D est en millimètres, axes x = gauche du sujet,
// y = postérieur, z = haut (repère « LPS »). Three.js attend y = haut ;
// on convertit en mètres avec (x, y, z) -> (x, z, -y) : la face antérieure
// du corps regarde alors vers +z (vers la caméra en vue antérieure) et la
// gauche du sujet apparaît à droite de l'écran, comme sur un vrai patient.
//
//   npm run modeles:construire

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { simplify, weld, quantize, reorder, dedup, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const RACINE = join(import.meta.dirname, '..');
const OBJ = join(RACINE, 'sources', 'bodyparts3d', 'isa_BP3D_4.0_obj_99');
const OBJ_ZA = join(RACINE, 'sources', 'z-anatomy', 'recale');
const MODELES = join(RACINE, 'public', 'models');
const DONNEES = join(RACINE, 'public', 'data');

const LODS = { hi: null, lo: 0.25 }; // ratio de triangles conservés (null = original)

// Couleurs par système (sRGB 0–1), reprises du prototype
const COULEURS = { os: [0.91, 0.87, 0.78], muscles: [0.7, 0.26, 0.24], peau: [0.86, 0.69, 0.6] };
// Cartilages, disques, tendons et rétinaculums : teintes distinctes
const COULEUR_CARTILAGE = [0.72, 0.82, 0.86];
const COULEUR_TENDON = [0.88, 0.85, 0.76];
function couleurDe(it) {
  if (/cartilage|disque/.test(it.cle ?? '')) return COULEUR_CARTILAGE;
  if (/tendon|retinaculum/.test(it.cle ?? '')) return COULEUR_TENDON;
  return COULEURS[it.systeme];
}

/** Lit un OBJ BodyParts3D : sommets, normales, faces triangulaires. */
function lireObj(chemin) {
  const v = [], vn = [], idx = [];
  for (const l of readFileSync(chemin, 'utf8').split('\n')) {
    if (l.startsWith('v ')) { const [, x, y, z] = l.split(/\s+/); v.push(+x, +y, +z); }
    else if (l.startsWith('vn ')) { const [, x, y, z] = l.split(/\s+/); vn.push(+x, +y, +z); }
    else if (l.startsWith('f ')) {
      const p = l.trim().split(/\s+/).slice(1).map((s) => parseInt(s.split('/')[0], 10) - 1);
      for (let i = 1; i + 1 < p.length; i++) idx.push(p[0], p[i], p[i + 1]); // éventail
    }
  }
  const n = v.length / 3;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const avecNormales = vn.length === v.length; // BP3D : une normale par sommet
  for (let i = 0; i < n; i++) {
    // mm -> m et changement d'axes (x, y, z) -> (x, z, -y)
    pos[i * 3] = v[i * 3] / 1000;
    pos[i * 3 + 1] = v[i * 3 + 2] / 1000;
    pos[i * 3 + 2] = -v[i * 3 + 1] / 1000;
    if (avecNormales) { nor[i * 3] = vn[i * 3]; nor[i * 3 + 1] = vn[i * 3 + 2]; nor[i * 3 + 2] = -vn[i * 3 + 1]; }
  }
  return { pos, nor: avecNormales ? nor : null, idx: n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) };
}

/** Normales lissées calculées à partir des faces (si l'OBJ n'en a pas). */
function calculerNormales(pos, idx) {
  const nor = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { nor[k] += nx; nor[k + 1] += ny; nor[k + 2] += nz; }
  }
  for (let i = 0; i < nor.length; i += 3) {
    const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]) || 1;
    nor[i] /= l; nor[i + 1] /= l; nor[i + 2] /= l;
  }
  return nor;
}

const inventaire = JSON.parse(readFileSync(join(import.meta.dirname, 'sortie', 'inventaire.json'), 'utf8'));
const paquets = Object.groupBy(inventaire, (x) => `${x.systeme}-${x.region}`);

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

mkdirSync(MODELES, { recursive: true });
mkdirSync(DONNEES, { recursive: true });
const structures = [];
const bilan = [];

for (const [nomPaquet, items] of Object.entries(paquets)) {
  for (const [lod, ratio] of Object.entries(LODS)) {
    const doc = new Document();
    const buffer = doc.createBuffer();
    const scene = doc.createScene(nomPaquet);
    const materiaux = new Map();
    const materiau = (rgb) => {
      const k = rgb.join(',');
      if (!materiaux.has(k)) materiaux.set(k, doc.createMaterial(k).setBaseColorFactor([...rgb, 1]).setRoughnessFactor(0.7).setMetallicFactor(0));
      return materiaux.get(k);
    };
    for (const it of items) {
      const { pos, nor, idx } = lireObj(join(it.source === 'z-anatomy' ? OBJ_ZA : OBJ, `${it.fj}.obj`));
      const prim = doc.createPrimitive()
        .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
        .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor ?? calculerNormales(pos, idx)).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));
      prim.setMaterial(materiau(couleurDe(it)));
      // Le nœud porte l'identifiant FJ : l'app retrouve les métadonnées par ce nom.
      const mesh = doc.createMesh(it.fj).addPrimitive(prim);
      scene.addChild(doc.createNode(it.fj).setMesh(mesh));
    }
    await doc.transform(
      dedup(),
      weld(),
      ...(ratio ? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: false })] : []),
      reorder({ encoder: MeshoptEncoder }),
      quantize({ quantizePosition: 14, quantizeNormal: 8 }),
      prune(),
    );
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
    const fichier = join(MODELES, `${nomPaquet}.${lod}.glb`);
    await io.write(fichier, doc);
    const tri = doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + p.getIndices().getCount() / 3, 0), 0);
    bilan.push({ paquet: `${nomPaquet}.${lod}`, maillages: items.length, triangles: tri, Mo: +(statSync(fichier).size / 1e6).toFixed(2) });
  }
  for (const it of items) {
    const c = it.centre; // mm, LPS -> m, Y en haut
    structures.push({
      id: it.fj, fma: it.fma, en: it.en, cle: it.cle, fr: it.fr, la: it.la, cote: it.cote, genre: it.genre,
      source: it.source ?? 'bodyparts3d', systeme: it.systeme, region: it.region, groupe: it.groupe, fiche: it.fiche, couche: it.couche, paquet: nomPaquet,
      centre: [c[0] / 1000, c[2] / 1000, -c[1] / 1000].map((x) => +x.toFixed(4)),
    });
  }
}

writeFileSync(join(DONNEES, 'structures.json'), JSON.stringify({ source: 'BodyParts3D 4.0 (DBCLS), CC BY 4.0', structures }));
console.table(bilan);
const total = (l) => bilan.filter((b) => b.paquet.endsWith(l)).reduce((s, b) => s + b.Mo, 0).toFixed(1);
console.log(`Total : hi ${total('.hi')} Mo, lo ${total('.lo')} Mo`);
