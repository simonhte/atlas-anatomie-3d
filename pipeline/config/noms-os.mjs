// Traduction des noms anglais de BodyParts3D (FMA) vers la terminologie
// anatomique française, avec le nom latin (Terminologia Anatomica) et la
// région du corps. Utilisé par pipeline/02-inventaire.mjs.
//
// Chaque règle reçoit le nom anglais SANS latéralité (« left » / « right »
// déjà retirés) et renvoie :
//   cle    identifiant stable de la structure (non latéralisée), en ASCII
//   fr     nom français
//   la     nom latin (TA)
//   genre  "m" ou "f" : accord de « droit/droite » ajouté après le nom
//   region tete | cou | rachis | thorax | membre-sup | membre-inf | bassin
//   groupe sous-groupe affiché dans l'arborescence
//   fiche  identifiant de la fiche de cours (fichier contenu/fiches/os/<fiche>.md)

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const ROMAIN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ord = (mot) => ORD.indexOf(mot) + 1; // "third" -> 3
/** 1 -> "1er"/"1re", 2 -> "2e" */
const ordFr = (n, genre) => (n === 1 ? (genre === 'f' ? '1re' : '1er') : `${n}e`);
const ORD_RE = ORD.join('|');

// Doigts de la main : [nom FMA, français, latin, genre]
const DOIGTS = {
  thumb: ['pouce', 'pollicis', 'm'],
  'index finger': ["l'index", 'indicis', 'm'],
  'middle finger': ['majeur', 'digiti medii', 'm'],
  'ring finger': ["l'annulaire", 'digiti anularis', 'm'],
  'little finger': ["l'auriculaire", 'digiti minimi', 'm'],
};
// Orteils
const ORTEILS = {
  'big toe': ["l'hallux", 'hallucis', 'm'],
  'second toe': ['2e orteil', 'digiti II pedis', 'm'],
  'third toe': ['3e orteil', 'digiti III pedis', 'm'],
  'fourth toe': ['4e orteil', 'digiti IV pedis', 'm'],
  'little toe': ['5e orteil', 'digiti minimi pedis', 'm'],
};
const PHALANGE = { proximal: ['proximale', 'proximalis'], middle: ['moyenne', 'media'], distal: ['distale', 'distalis'] };
/** "l'index" -> "de l'index", "pouce" -> "du pouce", "2e orteil" -> "du 2e orteil" */
const de = (s) => (s.startsWith("l'") ? `de ${s}` : `du ${s}`);

// Os à nom simple : anglais -> [cle, fr, la, genre, region, groupe, fiche]
const SIMPLES = {
  'frontal bone': ['frontal', 'Os frontal', 'Os frontale', 'm', 'tete', 'Neurocrâne', 'crane'],
  'parietal bone': ['parietal', 'Os pariétal', 'Os parietale', 'm', 'tete', 'Neurocrâne', 'crane'],
  'temporal bone': ['temporal', 'Os temporal', 'Os temporale', 'm', 'tete', 'Neurocrâne', 'crane'],
  'occipital bone': ['occipital', 'Os occipital', 'Os occipitale', 'm', 'tete', 'Neurocrâne', 'crane'],
  'sphenoid bone': ['sphenoide', 'Os sphénoïde', 'Os sphenoidale', 'm', 'tete', 'Neurocrâne', 'crane'],
  ethmoid: ['ethmoide', 'Os ethmoïde', 'Os ethmoidale', 'm', 'tete', 'Neurocrâne', 'crane'],
  maxilla: ['maxillaire', 'Maxillaire', 'Maxilla', 'm', 'tete', 'Viscérocrâne (face)', 'face'],
  'zygomatic bone': ['zygomatique', 'Os zygomatique', 'Os zygomaticum', 'm', 'tete', 'Viscérocrâne (face)', 'face'],
  'nasal bone': ['nasal', 'Os nasal', 'Os nasale', 'm', 'tete', 'Viscérocrâne (face)', 'face'],
  'lacrimal bone': ['lacrymal', 'Os lacrymal', 'Os lacrimale', 'm', 'tete', 'Viscérocrâne (face)', 'face'],
  'palatine bone': ['palatin', 'Os palatin', 'Os palatinum', 'm', 'tete', 'Viscérocrâne (face)', 'face'],
  'inferior nasal concha': ['cornet-inferieur', 'Cornet nasal inférieur', 'Concha nasalis inferior', 'm', 'tete', 'Viscérocrâne (face)', 'face'],
  vomer: ['vomer', 'Vomer', 'Vomer', 'm', 'tete', 'Viscérocrâne (face)', 'face'],
  mandible: ['mandibule', 'Mandibule', 'Mandibula', 'f', 'tete', 'Viscérocrâne (face)', 'mandibule'],
  'hyoid bone': ['hyoide', 'Os hyoïde', 'Os hyoideum', 'm', 'cou', 'Os hyoïde', 'hyoide'],
  atlas: ['atlas', 'Atlas (C1)', 'Atlas', 'm', 'rachis', 'Rachis cervical', 'atlas-axis'],
  axis: ['axis', 'Axis (C2)', 'Axis', 'm', 'rachis', 'Rachis cervical', 'atlas-axis'],
  sacrum: ['sacrum', 'Sacrum', 'Os sacrum', 'm', 'bassin', 'Sacrum et coccyx', 'sacrum'],
  manubrium: ['manubrium', 'Manubrium sternal', 'Manubrium sterni', 'm', 'thorax', 'Sternum', 'sternum'],
  'body of sternum': ['corps-sternum', 'Corps du sternum', 'Corpus sterni', 'm', 'thorax', 'Sternum', 'sternum'],
  'xiphoid process': ['xiphoide', 'Processus xiphoïde', 'Processus xiphoideus', 'm', 'thorax', 'Sternum', 'sternum'],
  clavicle: ['clavicule', 'Clavicule', 'Clavicula', 'f', 'membre-sup', 'Ceinture scapulaire', 'clavicule'],
  scapula: ['scapula', 'Scapula', 'Scapula', 'f', 'membre-sup', 'Ceinture scapulaire', 'scapula'],
  humerus: ['humerus', 'Humérus', 'Humerus', 'm', 'membre-sup', 'Bras', 'humerus'],
  radius: ['radius', 'Radius', 'Radius', 'm', 'membre-sup', 'Avant-bras', 'radius'],
  ulna: ['ulna', 'Ulna', 'Ulna', 'f', 'membre-sup', 'Avant-bras', 'ulna'],
  scaphoid: ['scaphoide', 'Scaphoïde', 'Os scaphoideum', 'm', 'membre-sup', 'Carpe', 'carpe'],
  lunate: ['lunatum', 'Lunatum (semi-lunaire)', 'Os lunatum', 'm', 'membre-sup', 'Carpe', 'carpe'],
  triquetral: ['triquetrum', 'Triquetrum (pyramidal)', 'Os triquetrum', 'm', 'membre-sup', 'Carpe', 'carpe'],
  pisiform: ['pisiforme', 'Pisiforme', 'Os pisiforme', 'm', 'membre-sup', 'Carpe', 'carpe'],
  trapezium: ['trapeze', 'Trapèze', 'Os trapezium', 'm', 'membre-sup', 'Carpe', 'carpe'],
  trapezoid: ['trapezoide', 'Trapézoïde', 'Os trapezoideum', 'm', 'membre-sup', 'Carpe', 'carpe'],
  capitate: ['capitatum', 'Capitatum (grand os)', 'Os capitatum', 'm', 'membre-sup', 'Carpe', 'carpe'],
  hamate: ['hamatum', 'Hamatum (os crochu)', 'Os hamatum', 'm', 'membre-sup', 'Carpe', 'carpe'],
  'hip bone': ['coxal', 'Os coxal', 'Os coxae', 'm', 'bassin', 'Ceinture pelvienne', 'coxal'],
  femur: ['femur', 'Fémur', 'Femur', 'm', 'membre-inf', 'Cuisse', 'femur'],
  patella: ['patella', 'Patella', 'Patella', 'f', 'membre-inf', 'Genou', 'patella'],
  tibia: ['tibia', 'Tibia', 'Tibia', 'm', 'membre-inf', 'Jambe', 'tibia'],
  fibula: ['fibula', 'Fibula', 'Fibula', 'f', 'membre-inf', 'Jambe', 'fibula'],
  talus: ['talus', 'Talus', 'Talus', 'm', 'membre-inf', 'Tarse', 'tarse'],
  calcaneus: ['calcaneus', 'Calcanéus', 'Calcaneus', 'm', 'membre-inf', 'Tarse', 'tarse'],
  'navicular bone of foot': ['naviculaire', 'Naviculaire', 'Os naviculare', 'm', 'membre-inf', 'Tarse', 'tarse'],
  'cuboid bone': ['cuboide', 'Cuboïde', 'Os cuboideum', 'm', 'membre-inf', 'Tarse', 'tarse'],
  'medial cuneiform bone': ['cuneiforme-medial', 'Cunéiforme médial', 'Os cuneiforme mediale', 'm', 'membre-inf', 'Tarse', 'tarse'],
  'intermediate cuneiform bone': ['cuneiforme-intermediaire', 'Cunéiforme intermédiaire', 'Os cuneiforme intermedium', 'm', 'membre-inf', 'Tarse', 'tarse'],
  'lateral cuneiform bone': ['cuneiforme-lateral', 'Cunéiforme latéral', 'Os cuneiforme laterale', 'm', 'membre-inf', 'Tarse', 'tarse'],
  'sesamoid bone of foot': ['sesamoide-pied', 'Os sésamoïde du pied', 'Os sesamoideum pedis', 'm', 'membre-inf', 'Métatarse et orteils', 'pied-metatarse-phalanges'],
};

const REGLES = [
  // Vertèbres C3–C7, T1–T12, L1–L5
  [new RegExp(`^(${ORD_RE}) (cervical|thoracic|lumbar) vertebra$`), (m) => {
    const n = ord(m[1]);
    const t = { cervical: ['c', 'C', 'cervicalis', 'Rachis cervical', 'vertebres-cervicales'], thoracic: ['t', 'T', 'thoracica', 'Rachis thoracique', 'vertebres-thoraciques'], lumbar: ['l', 'L', 'lumbalis', 'Rachis lombal', 'vertebres-lombales'] }[m[2]];
    return { cle: `vertebre-${t[0]}${n}`, fr: `Vertèbre ${t[1]}${n}`, la: `Vertebra ${t[2]} ${ROMAIN[n - 1]}`, genre: 'f', region: 'rachis', groupe: t[3], fiche: t[4] };
  }],
  // Côtes
  [new RegExp(`^(${ORD_RE}) rib$`), (m) => {
    const n = ord(m[1]);
    return { cle: `cote-${n}`, fr: `${ordFr(n, 'f')} côte`, la: `Costa ${ROMAIN[n - 1]}`, genre: 'f', region: 'thorax', groupe: 'Côtes', fiche: 'cotes' };
  }],
  // Cartilages costaux
  [new RegExp(`^(${ORD_RE}) costal cartilage$`), (m) => {
    const n = ord(m[1]);
    return { cle: `cartilage-costal-${n}`, fr: `${ordFr(n, 'm')} cartilage costal`, la: `Cartilago costalis ${ROMAIN[n - 1]}`, genre: 'm', region: 'thorax', groupe: 'Cartilages costaux', fiche: 'cotes' };
  }],
  // Métacarpiens / métatarsiens
  [new RegExp(`^(${ORD_RE}) (metacarpal|metatarsal) bone$`), (m) => {
    const n = ord(m[1]);
    const main = m[2] === 'metacarpal';
    return {
      cle: `${main ? 'metacarpien' : 'metatarsien'}-${n}`,
      fr: `${ordFr(n, 'm')} ${main ? 'métacarpien' : 'métatarsien'}`,
      la: `Os ${main ? 'metacarpi' : 'metatarsi'} ${ROMAIN[n - 1]}`,
      genre: 'm', region: main ? 'membre-sup' : 'membre-inf',
      groupe: main ? 'Métacarpe et doigts' : 'Métatarse et orteils',
      fiche: main ? 'main-metacarpe-phalanges' : 'pied-metatarse-phalanges',
    };
  }],
  // Phalanges des doigts et des orteils
  [/^(proximal|middle|distal) phalanx of (.+)$/, (m) => {
    const [pf, pl] = PHALANGE[m[1]];
    const d = DOIGTS[m[2]], o = ORTEILS[m[2]];
    const x = d || o;
    if (!x) return null;
    const main = !!d;
    const slug = m[2].replace(/ /g, '-');
    return {
      cle: `phalange-${m[1]}-${slug}`,
      fr: `Phalange ${pf} ${de(x[0])}`,
      la: `Phalanx ${pl} ${x[1]}`,
      genre: x[2], // l'accord se fait avec le doigt : « … du pouce droit »
      region: main ? 'membre-sup' : 'membre-inf',
      groupe: main ? 'Métacarpe et doigts' : 'Métatarse et orteils',
      fiche: main ? 'main-metacarpe-phalanges' : 'pied-metatarse-phalanges',
    };
  }],
];

/**
 * Sépare la latéralité d'un nom FMA anglais.
 * "left femur" -> { cote: "g", base: "femur" }
 * "distal phalanx of right thumb" -> { cote: "d", base: "distal phalanx of thumb" }
 */
export function separerCote(en) {
  const m = en.match(/\b(left|right) /);
  if (!m) return { cote: null, base: en };
  return { cote: m[1] === 'left' ? 'g' : 'd', base: en.replace(m[0], '') };
}

/** Accord de la latéralité : ("Fémur","m","d") -> "Fémur droit" */
export function avecCote(fr, genre, cote) {
  if (!cote) return fr;
  const mot = cote === 'd' ? 'droit' : 'gauche';
  return `${fr} ${mot}${genre === 'f' && cote === 'd' ? 'e' : ''}`;
}

/** Traduit un nom FMA anglais d'os. Renvoie null si le nom n'est pas connu. */
export function traduireOs(en) {
  const { cote, base: b0 } = separerCote(en);
  // Nommage Z-Anatomy des vertèbres : « vertebra l3 » -> « third lumbar vertebra »
  const v = b0.match(/^vertebra ([ctl])(\d+)$/);
  const base = v ? `${ORD[+v[2] - 1]} ${{ c: 'cervical', t: 'thoracic', l: 'lumbar' }[v[1]]} vertebra` : b0;
  const s = SIMPLES[base];
  if (s) {
    const [cle, fr, la, genre, region, groupe, fiche] = s;
    return { cle, fr, la, genre, region, groupe, fiche, cote };
  }
  for (const [re, f] of REGLES) {
    const m = base.match(re);
    if (m) {
      const r = f(m);
      if (r) return { ...r, cote };
    }
  }
  return null;
}
