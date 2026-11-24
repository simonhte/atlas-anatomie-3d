// Encodeur PNG minimal : image en niveaux de gris 8 bits (utilisé pour les
// cartes d'étiquettes des coupes, où chaque valeur de pixel = n° de structure).

import { deflateSync } from 'node:zlib';

const TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function bloc(type, donnees) {
  const t = Buffer.from(type, 'ascii');
  const lg = Buffer.alloc(4); lg.writeUInt32BE(donnees.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, donnees])));
  return Buffer.concat([lg, t, donnees, crc]);
}

/** pixels : Uint8Array de largeur × hauteur valeurs (0–255). */
export function encoderPngGris(pixels, largeur, hauteur) {
  const brut = Buffer.alloc((largeur + 1) * hauteur);
  for (let y = 0; y < hauteur; y++) {
    brut[y * (largeur + 1)] = 0; // filtre « aucun »
    brut.set(pixels.subarray(y * largeur, (y + 1) * largeur), y * (largeur + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0); ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8; ihdr[9] = 0; // 8 bits, niveaux de gris
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr), bloc('IDAT', deflateSync(brut, { level: 9 })), bloc('IEND', Buffer.alloc(0)),
  ]);
}
