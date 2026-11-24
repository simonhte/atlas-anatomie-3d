#!/usr/bin/env node
// Étape 1 du pipeline : télécharge les données sources de BodyParts3D 4.0
// (DBCLS, licence CC BY 4.0) dans sources/bodyparts3d/.
// Les fichiers déjà présents ne sont pas re-téléchargés.
//
//   npm run modeles:telecharger

import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join } from 'node:path';

const BASE = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/';
const DOSSIER = join(import.meta.dirname, '..', 'sources', 'bodyparts3d');

// Les maillages de l'arborescence « part-of » sont un sous-ensemble de ceux
// de l'arborescence « is-a » (mêmes fichiers FJxxxx) : une seule archive suffit.
const FICHIERS = [
  'isa_parts_list_e.txt',
  'partof_parts_list_e.txt',
  'isa_inclusion_relation_list.txt',
  'partof_inclusion_relation_list.txt',
  'isa_element_parts.txt',
  'partof_element_parts.txt',
  'isa_BP3D_4.0_obj_99.zip', // ≈ 136 Mo
];

mkdirSync(DOSSIER, { recursive: true });

for (const nom of FICHIERS) {
  const cible = join(DOSSIER, nom);
  if (existsSync(cible) && statSync(cible).size > 0) {
    console.log(`✔ déjà présent : ${nom}`);
    continue;
  }
  process.stdout.write(`↓ ${nom} … `);
  const rep = await fetch(BASE + nom);
  if (!rep.ok) throw new Error(`Échec du téléchargement de ${nom} : HTTP ${rep.status}`);
  await pipeline(Readable.fromWeb(rep.body), createWriteStream(cible));
  console.log(`${(statSync(cible).size / 1e6).toFixed(1)} Mo`);
}
// Table Terminologia Anatomica 2 (anglais / latin / français) fournie par Z-Anatomy (CC BY-SA 4.0) :
// sert à traduire les noms des vaisseaux, nerfs et organes.
const TA2 = join(import.meta.dirname, '..', 'sources', 'z-anatomy', 'TA2.csv');
if (!existsSync(TA2)) {
  mkdirSync(join(import.meta.dirname, '..', 'sources', 'z-anatomy'), { recursive: true });
  const rep = await fetch('https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/master/TA2.csv');
  if (!rep.ok) throw new Error(`TA2.csv : HTTP ${rep.status}`);
  await pipeline(Readable.fromWeb(rep.body), createWriteStream(TA2));
  console.log('↓ TA2.csv');
}
console.log('Téléchargement terminé.');
