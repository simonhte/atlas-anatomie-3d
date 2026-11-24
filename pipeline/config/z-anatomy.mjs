// Structures prises dans l'atlas Z-Anatomy (CC BY-SA 4.0) pour combler les
// manques de BodyParts3D. Z-Anatomy dérive lui-même de BodyParts3D, enrichi.
//
// Format : 'Nom de l'objet Blender sans suffixe': [systeme, cle, fr, la, genre, region, groupe, couche, fiche]
// Les suffixes « .l » / « .r » de Blender donnent la latéralité (gauche / droite) ;
// le script de recalage vérifie que « .l » tombe bien du côté gauche du sujet.

export const STRUCTURES_ZA = {
  // ------------------------------------------------------------ Os et cartilages manquants
  Coccyx: ['os', 'coccyx', 'Coccyx', 'Os coccygis', 'm', 'bassin', 'Sacrum et coccyx', 9, 'sacrum'],
  'Costal cartilage of eighth rib': ['os', 'cartilage-costal-8', '8e cartilage costal', 'Cartilago costalis VIII', 'm', 'thorax', 'Cartilages costaux', 9, 'cotes'],
  'Costal cartilage of ninth rib': ['os', 'cartilage-costal-9', '9e cartilage costal', 'Cartilago costalis IX', 'm', 'thorax', 'Cartilages costaux', 9, 'cotes'],
  'Costal cartilage of tenth rib': ['os', 'cartilage-costal-10', '10e cartilage costal', 'Cartilago costalis X', 'm', 'thorax', 'Cartilages costaux', 9, 'cotes'],

  // ------------------------------------------------------------ Paroi abdominale et dos
  'Rectus abdominis muscle': ['muscles', 'droit-abdomen', "Droit de l'abdomen", 'M. rectus abdominis', 'm', 'abdomen', 'Paroi antérolatérale', 1, 'droit-abdomen'],
  'Pyramidalis muscle': ['muscles', 'pyramidal', "Pyramidal de l'abdomen", 'M. pyramidalis', 'm', 'abdomen', 'Paroi antérolatérale', 1, 'droit-abdomen'],
  'Internal abdominal oblique muscle': ['muscles', 'oblique-interne', "Oblique interne de l'abdomen", 'M. obliquus internus abdominis', 'm', 'abdomen', 'Paroi antérolatérale', 2, 'oblique-interne'],
  'Transversus abdominis muscle': ['muscles', 'transverse-abdomen', "Transverse de l'abdomen", 'M. transversus abdominis', 'm', 'abdomen', 'Paroi antérolatérale', 3, 'transverse-abdomen'],
  'Quadratus lumborum muscle': ['muscles', 'carre-lombes', 'Carré des lombes', 'M. quadratus lumborum', 'm', 'abdomen', 'Paroi postérieure', 3, 'carre-lombes'],
  'Latissimus dorsi muscle': ['muscles', 'grand-dorsal', 'Grand dorsal', 'M. latissimus dorsi', 'm', 'dos', 'Plan superficiel du dos', 1, 'grand-dorsal'],

  // ------------------------------------------------------------ Muscles masticateurs
  'Temporalis muscle': ['muscles', 'temporal-muscle', 'Temporal (muscle)', 'M. temporalis', 'm', 'tete', 'Muscles masticateurs', 1, 'temporal-muscle'],
  'Superficial part of masseter': ['muscles', 'masseter-superficiel', 'Masséter, partie superficielle', 'M. masseter, pars superficialis', 'm', 'tete', 'Muscles masticateurs', 1, 'masseter'],
  'Deep part of masseter': ['muscles', 'masseter-profond', 'Masséter, partie profonde', 'M. masseter, pars profunda', 'm', 'tete', 'Muscles masticateurs', 2, 'masseter'],
  'Medial pterygoid muscle': ['muscles', 'pterygoidien-medial', 'Ptérygoïdien médial', 'M. pterygoideus medialis', 'm', 'tete', 'Muscles masticateurs', 3, 'pterygoidiens'],
  'Superior head of lateral pterygoid muscle': ['muscles', 'pterygoidien-lateral-sup', 'Ptérygoïdien latéral, chef supérieur', 'M. pterygoideus lateralis, caput superius', 'm', 'tete', 'Muscles masticateurs', 3, 'pterygoidiens'],
  'Inferior head of lateral pterygoid muscle': ['muscles', 'pterygoidien-lateral-inf', 'Ptérygoïdien latéral, chef inférieur', 'M. pterygoideus lateralis, caput inferius', 'm', 'tete', 'Muscles masticateurs', 3, 'pterygoidiens'],

  // ------------------------------------------------------------ Muscles de la face (peauciers)
  'Frontalis muscle': ['muscles', 'occipito-frontal-frontal', 'Occipito-frontal, ventre frontal', 'M. occipitofrontalis, venter frontalis', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Occipitalis muscle': ['muscles', 'occipito-frontal-occipital', 'Occipito-frontal, ventre occipital', 'M. occipitofrontalis, venter occipitalis', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Orbital part of orbicularis oculi': ['muscles', 'orbiculaire-oeil-orbitaire', "Orbiculaire de l'œil, partie orbitaire", 'M. orbicularis oculi, pars orbitalis', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Palpebral part of orbicularis oculi': ['muscles', 'orbiculaire-oeil-palpebral', "Orbiculaire de l'œil, partie palpébrale", 'M. orbicularis oculi, pars palpebralis', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Orbicularis oris muscle': ['muscles', 'orbiculaire-bouche', 'Orbiculaire de la bouche', 'M. orbicularis oris', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Zygomaticus major muscle': ['muscles', 'grand-zygomatique', 'Grand zygomatique', 'M. zygomaticus major', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Zygomaticus minor muscle': ['muscles', 'petit-zygomatique', 'Petit zygomatique', 'M. zygomaticus minor', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Levator labii superioris': ['muscles', 'releveur-levre-sup', 'Releveur de la lèvre supérieure', 'M. levator labii superioris', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Risorius muscle': ['muscles', 'risorius', 'Risorius', 'M. risorius', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Depressor anguli oris': ['muscles', 'abaisseur-angle-bouche', "Abaisseur de l'angle de la bouche", 'M. depressor anguli oris', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Depressor labii inferioris': ['muscles', 'abaisseur-levre-inf', 'Abaisseur de la lèvre inférieure', 'M. depressor labii inferioris', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Mentalis muscle': ['muscles', 'mentonnier', 'Mentonnier', 'M. mentalis', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Nasalis muscle': ['muscles', 'nasal-muscle', 'Nasal (muscle)', 'M. nasalis', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Procerus muscle': ['muscles', 'procerus', 'Procérus', 'M. procerus', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Corrugator supercilii': ['muscles', 'corrugateur-sourcil', 'Corrugateur du sourcil', 'M. corrugator supercilii', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],
  'Depressor septi nasi': ['muscles', 'abaisseur-septum', 'Abaisseur du septum nasal', 'M. depressor septi nasi', 'm', 'tete', 'Muscles de la face', 1, 'muscles-face'],

  // ------------------------------------------------------------ Pied
  'Extensor digitorum brevis': ['muscles', 'court-extenseur-orteils', 'Court extenseur des orteils', 'M. extensor digitorum brevis', 'm', 'membre-inf', 'Pied – face dorsale', 1, 'muscles-pied'],
  'Dorsal interossei muscles of foot': ['muscles', 'interosseux-dorsaux-pied', 'Interosseux dorsaux du pied', 'Mm. interossei dorsales pedis', 'm', 'membre-inf', 'Pied – plante', 3, 'muscles-pied'],
};

// Os présents dans les DEUX atlas : servent à calculer la transformation qui
// amène Z-Anatomy dans le repère de BodyParts3D. Nom Z-Anatomy -> clé BodyParts3D.
export const REPERES = {
  Femur: 'femur', Tibia: 'tibia', Fibula: 'fibula', Humerus: 'humerus',
  Radius: 'radius', Ulna: 'ulna', Clavicle: 'clavicule', Scapula: 'scapula', Patella: 'patella',
};

/** Liste des noms d'objets Blender à exporter (avec suffixes de latéralité). */
export function nomsAExporter() {
  const noms = [];
  for (const base of [...Object.keys(STRUCTURES_ZA), ...Object.keys(REPERES), ...Object.keys(OS_ANCRAGE)]) {
    // les structures médianes n'ont pas de suffixe ; on demande les trois formes,
    // l'exporteur signale simplement celles qui n'existent pas
    noms.push(base, `${base}.l`, `${base}.r`);
  }
  return noms;
}

/** « Rectus abdominis muscle.l » -> { base, cote: 'g' } */
export function decouperNomZA(nom) {
  const m = nom.match(/^(.*)\.(l|r)$/);
  return m ? { base: m[1], cote: m[2] === 'l' ? 'g' : 'd' } : { base: nom, cote: null };
}

// ---------------------------------------------------------------------------
// RECALAGE LOCAL. Z-Anatomy a retouché certaines proportions du squelette
// (ex. tibia ≈ 2 cm plus court que dans BodyParts3D) : un recalage global
// laisserait des décalages d'environ 1 cm. Chaque structure est donc recalée
// sur les os qui l'entourent, présents dans les deux atlas.
// Os Z-Anatomy (sans suffixe) -> clé BodyParts3D
export const OS_ANCRAGE = {
  Sacrum: 'sacrum', 'Hip bone': 'coxal',
  'Vertebra L1': 'vertebre-l1', 'Vertebra L2': 'vertebre-l2', 'Vertebra L3': 'vertebre-l3', 'Vertebra L4': 'vertebre-l4', 'Vertebra L5': 'vertebre-l5',
  'Body of sternum': 'corps-sternum', 'Xiphoid process': 'xiphoide',
  'Seventh rib': 'cote-7', 'Eighth rib': 'cote-8', 'Ninth rib': 'cote-9', 'Tenth rib': 'cote-10', 'Eleventh rib': 'cote-11', 'Twelfth rib': 'cote-12',
  Humerus: 'humerus', Scapula: 'scapula',
  Mandible: 'mandibule', Maxilla: 'maxillaire', 'Zygomatic bone': 'zygomatique', 'Temporal bone': 'temporal',
  'Frontal bone': 'frontal', 'Occipital bone': 'occipital', 'Parietal bone': 'parietal', 'Sphenoid bone': 'sphenoide',
  Calcaneus: 'calcaneus', Talus: 'talus', 'Navicular bone': 'naviculaire', 'Cuboid bone': 'cuboide', 'Medial cuneiform bone': 'cuneiforme-medial',
  'First metatarsal bone': 'metatarsien-1', 'Second metatarsal bone': 'metatarsien-2', 'Third metatarsal bone': 'metatarsien-3',
  'Fourth metatarsal bone': 'metatarsien-4', 'Fifth metatarsal bone': 'metatarsien-5',
};
const LOMBAIRES = ['Vertebra L1', 'Vertebra L2', 'Vertebra L3', 'Vertebra L4', 'Vertebra L5'];
const COTES_BASSES = ['Seventh rib', 'Eighth rib', 'Ninth rib', 'Tenth rib'];
export const GROUPES_ANCRAGE = {
  bassin: ['Sacrum', 'Hip bone', 'Vertebra L5'],
  // le coccyx s'articule avec le sacrum : on l'ancre sur lui seul
  sacrum: ['Sacrum'],
  'thorax-bas': ['Body of sternum', 'Xiphoid process', ...COTES_BASSES],
  abdomen: ['Body of sternum', 'Xiphoid process', ...COTES_BASSES, 'Twelfth rib', 'Hip bone', ...LOMBAIRES],
  lombes: ['Eleventh rib', 'Twelfth rib', 'Hip bone', ...LOMBAIRES],
  dos: ['Humerus', 'Scapula', 'Ninth rib', 'Tenth rib', 'Eleventh rib', 'Twelfth rib', 'Hip bone', 'Sacrum', ...LOMBAIRES],
  tete: ['Mandible', 'Maxilla', 'Zygomatic bone', 'Temporal bone', 'Frontal bone', 'Occipital bone', 'Parietal bone', 'Sphenoid bone'],
  pied: ['Calcaneus', 'Talus', 'Navicular bone', 'Cuboid bone', 'Medial cuneiform bone', 'First metatarsal bone', 'Second metatarsal bone',
    'Third metatarsal bone', 'Fourth metatarsal bone', 'Fifth metatarsal bone'],
};
/** Groupe d'os d'ancrage pour une structure Z-Anatomy. */
export function groupeAncrage(base) {
  const [, cle, , , , region] = STRUCTURES_ZA[base];
  if (cle === 'coccyx') return 'sacrum';
  if (cle.startsWith('cartilage-costal')) return 'thorax-bas';
  if (cle === 'carre-lombes') return 'lombes';
  if (cle === 'grand-dorsal') return 'dos';
  return { abdomen: 'abdomen', tete: 'tete', 'membre-inf': 'pied' }[region] ?? 'abdomen';
}

// ---------------------------------------------------------------------------
// ÉTAPE 3 : nerfs et organes absents de BodyParts3D, pris dans Z-Anatomy.
// Ils sont classés et traduits automatiquement (voir noms-organes.mjs et
// traduction.mjs) et recalés sur les os les plus proches.

/** Nerfs : objets « courbe » de Z-Anatomy dont le nom correspond à ce motif. */
export const MOTIF_NERFS = /nerve|plexus|ganglion|trunk of brachial plexus|division of .*trunk|cord of brachial plexus|roots? of /i;
/** Noms de courbes à écarter (textes parasites, structures non nerveuses). */
export const EXCLUS_NERFS = /, which|venous plexus|choroid plexus|^nucleus|nucleus of|accessory nucleus|motor nucleus|posterior nucleus/i;

/** Organes absents de BodyParts3D (noms exacts des objets, sans suffixe). */
export const ORGANES_ZA = [
  'Superior lobe of right lung', 'Middle lobe of right lung', 'Inferior lobe of right lung',
  'Superior lobe of left lung', 'Inferior lobe of left lung',
  'Thyroid gland', 'Left lobe of thymus', 'Right lobe of thymus',
  'White matter of spinal cord', 'Anterior horn of spinal cord', 'Posterior horn of spinal cord',
];

/** Nombre d'os voisins utilisés pour le recalage local automatique. */
export const K_VOISINS = 8;
