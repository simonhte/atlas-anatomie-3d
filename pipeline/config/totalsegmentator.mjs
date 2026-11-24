// Structures segmentées par TotalSegmentator (v2, 117 classes) : nom français
// et lien vers l'atlas (identifiant de fiche ou clé de structure du modèle 3D).
// Format : 'nom_totalsegmentator': [français, lien, système]

const COTE = { left: 'gauche', right: 'droit' };
const COTE_F = { left: 'gauche', right: 'droite' };

const BASE = {
  aorta: ['Aorte', 'aorte', 'arteres'],
  atrial_appendage_left: ['Auricule gauche', 'coeur', 'coeur'],
  brachiocephalic_trunk: ['Tronc brachio-céphalique', 'tronc-brachiocephalique', 'arteres'],
  brain: ['Encéphale', 'hemispheres-cerebraux', 'snc'],
  colon: ['Côlon', 'gros-intestin', 'digestif'],
  costal_cartilages: ['Cartilages costaux', 'cotes', 'os'],
  duodenum: ['Duodénum', 'duodenum', 'digestif'],
  esophagus: ['Œsophage', 'oesophage', 'digestif'],
  gallbladder: ['Vésicule biliaire', 'foie', 'digestif'],
  heart: ['Cœur', 'coeur', 'coeur'],
  inferior_vena_cava: ['Veine cave inférieure', 'veine-cave-inferieure', 'veines'],
  liver: ['Foie', 'foie', 'digestif'],
  pancreas: ['Pancréas', 'pancreas', 'digestif'],
  portal_vein_and_splenic_vein: ['Veines porte et splénique', 'veine-porte', 'veines'],
  prostate: ['Prostate', 'prostate', 'genital-m'],
  pulmonary_vein: ['Veines pulmonaires', 'veines-pulmonaires', 'veines'],
  sacrum: ['Sacrum', 'sacrum', 'os'],
  skull: ['Crâne', 'crane', 'os'],
  small_bowel: ['Intestin grêle', 'intestin-grele', 'digestif'],
  spinal_cord: ['Moelle spinale', 'moelle-spinale', 'snc'],
  spleen: ['Rate', 'rate', 'endocrine'],
  sternum: ['Sternum', 'sternum', 'os'],
  stomach: ['Estomac', 'estomac', 'digestif'],
  superior_vena_cava: ['Veine cave supérieure', 'veine-cave-superieure', 'veines'],
  thyroid_gland: ['Glande thyroïde', 'glande-thyroide', 'endocrine'],
  trachea: ['Trachée', 'trachee-bronches', 'respiratoire'],
  urinary_bladder: ['Vessie', 'vessie', 'urinaire'],
};
// Structures paires : [français (masc.), lien, système, genre]
const PAIRES = {
  adrenal_gland: ['Glande surrénale', 'glande-surrenale', 'endocrine', 'f'],
  autochthon: ['Muscles érecteurs du rachis', 'erecteurs-rachis', 'muscles', 'mp'],
  brachiocephalic_vein: ['Veine brachio-céphalique', 'veines-brachiocephaliques', 'veines', 'f'],
  clavicula: ['Clavicule', 'clavicule', 'os', 'f'],
  common_carotid_artery: ['Artère carotide commune', 'artere-carotide-commune', 'arteres', 'f'],
  femur: ['Fémur', 'femur', 'os', 'm'],
  gluteus_maximus: ['Grand fessier', 'grand-fessier', 'muscles', 'm'],
  gluteus_medius: ['Moyen fessier', 'moyen-petit-fessiers', 'muscles', 'm'],
  gluteus_minimus: ['Petit fessier', 'moyen-petit-fessiers', 'muscles', 'm'],
  hip: ['Os coxal', 'coxal', 'os', 'm'],
  humerus: ['Humérus', 'humerus', 'os', 'm'],
  iliac_artery: ['Artère iliaque commune', 'artere-iliaque-commune', 'arteres', 'f'],
  iliac_vena: ['Veine iliaque commune', 'veine-iliaque-commune', 'veines', 'f'],
  iliopsoas: ['Ilio-psoas', 'ilio-psoas', 'muscles', 'm'],
  kidney: ['Rein', 'rein', 'urinaire', 'm'],
  kidney_cyst: ['Kyste rénal', 'rein', 'urinaire', 'm'],
  scapula: ['Scapula', 'scapula', 'os', 'f'],
  subclavian_artery: ['Artère subclavière', 'artere-subclaviere', 'arteres', 'f'],
};
const LOBES = { upper: 'supérieur', middle: 'moyen', lower: 'inférieur' };
const ORD = (n) => (n === 1 ? '1re' : `${n}e`);

/** Traduit un nom TotalSegmentator : { fr, lien, systeme, cote } ou null. */
export function traduireTS(nom) {
  if (BASE[nom]) { const [fr, lien, systeme] = BASE[nom]; return { fr, lien, systeme, cote: null }; }
  let m = nom.match(/^(.+)_(left|right)$/);
  if (m && PAIRES[m[1]]) {
    const [fr, lien, systeme, genre] = PAIRES[m[1]];
    const mot = (genre.startsWith('f') ? COTE_F : COTE)[m[2]] + (genre.endsWith('p') ? 's' : '');
    return { fr: `${fr} ${mot}`, lien, systeme, cote: m[2] === 'left' ? 'g' : 'd' };
  }
  m = nom.match(/^lung_(upper|middle|lower)_lobe_(left|right)$/);
  if (m) return { fr: `Lobe ${LOBES[m[1]]} du poumon ${COTE[m[2]]}`, lien: 'poumons', systeme: 'respiratoire', cote: m[2] === 'left' ? 'g' : 'd' };
  m = nom.match(/^rib_(left|right)_(\d+)$/);
  if (m) return { fr: `${ORD(+m[2])} côte ${COTE_F[m[1]]}`, lien: 'cotes', systeme: 'os', cote: m[1] === 'left' ? 'g' : 'd' };
  m = nom.match(/^vertebrae_([CTLS])(\d{1,2})$/);
  if (m) {
    const v = `${m[1]}${m[2]}`;
    const lien = v === 'C1' ? 'atlas' : v === 'C2' ? 'axis' : v === 'S1' ? 'sacrum' : `vertebre-${v.toLowerCase()}`;
    return { fr: v === 'S1' ? 'Vertèbre S1 (sacrum)' : `Vertèbre ${v}`, lien, systeme: 'os', cote: null, vertebre: v };
  }
  return null;
}
