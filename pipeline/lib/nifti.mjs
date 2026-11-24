// Lecture minimale du format d'imagerie médicale NIfTI-1 (.nii / .nii.gz).
// Renvoie les dimensions, l'espacement des voxels (mm), la matrice « voxel →
// monde » (repère RAS, mm) et les valeurs des voxels.

import { gunzipSync } from 'node:zlib';

const TYPES = {
  2: [Uint8Array, 1], 4: [Int16Array, 2], 8: [Int32Array, 4], 16: [Float32Array, 4],
  64: [Float64Array, 8], 256: [Int8Array, 1], 512: [Uint16Array, 2], 768: [Uint32Array, 4],
};

export function lireNifti(buffer) {
  const b = buffer[0] === 0x1f && buffer[1] === 0x8b ? gunzipSync(buffer) : buffer;
  if (b.readInt32LE(0) !== 348) throw new Error('Fichier NIfTI invalide (ou gros-boutiste, non géré)');
  const dim = [1, 2, 3].map((k) => b.readInt16LE(40 + 2 * k));
  const datatype = b.readInt16LE(70);
  const pixdim = [1, 2, 3].map((k) => Math.abs(b.readFloatLE(76 + 4 * k)));
  const voxOffset = Math.round(b.readFloatLE(108));
  let pente = b.readFloatLE(112), ordonnee = b.readFloatLE(116);
  if (!pente) { pente = 1; ordonnee = 0; }
  const qform = b.readInt16LE(252), sform = b.readInt16LE(254);
  // Matrice voxel (i, j, k) -> monde RAS (mm) : M[r] = [m0, m1, m2, translation]
  let M;
  if (sform > 0) {
    M = [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => b.readFloatLE(280 + 16 * r + 4 * c)));
  } else if (qform > 0) {
    const qb = b.readFloatLE(256), qc = b.readFloatLE(260), qd = b.readFloatLE(264);
    const qa = Math.sqrt(Math.max(0, 1 - qb * qb - qc * qc - qd * qd));
    const qfac = b.readFloatLE(76) < 0 ? -1 : 1;
    const R = [
      [qa * qa + qb * qb - qc * qc - qd * qd, 2 * (qb * qc - qa * qd), 2 * (qb * qd + qa * qc)],
      [2 * (qb * qc + qa * qd), qa * qa + qc * qc - qb * qb - qd * qd, 2 * (qc * qd - qa * qb)],
      [2 * (qb * qd - qa * qc), 2 * (qc * qd + qa * qb), qa * qa + qd * qd - qb * qb - qc * qc],
    ];
    const t = [b.readFloatLE(268), b.readFloatLE(272), b.readFloatLE(276)];
    M = [0, 1, 2].map((r) => [R[r][0] * pixdim[0], R[r][1] * pixdim[1], R[r][2] * pixdim[2] * qfac, t[r]]);
  } else {
    M = [[pixdim[0], 0, 0, 0], [0, pixdim[1], 0, 0], [0, 0, pixdim[2], 0]];
  }
  const [Type, taille] = TYPES[datatype] ?? [];
  if (!Type) throw new Error(`Type de données NIfTI non géré : ${datatype}`);
  const n = dim[0] * dim[1] * dim[2];
  // copie alignée : les tableaux typés exigent un décalage multiple de leur taille
  const aligne = new Uint8Array(n * taille);
  aligne.set(b.subarray(voxOffset, voxOffset + n * taille));
  return { dim, pixdim, M, pente, ordonnee, donnees: new Type(aligne.buffer) };
}
