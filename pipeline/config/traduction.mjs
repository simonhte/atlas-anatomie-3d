// Traduction automatique des noms anatomiques anglais (FMA / Z-Anatomy) en
// français et en latin, pour les vaisseaux, nerfs et organes (trop nombreux
// pour une table écrite à la main).
//
// Ordre de recherche, du plus fiable au moins fiable :
//   1. Terminologia Anatomica 2 (TA2) : table anglais → latin → français
//      fournie par Z-Anatomy (sources/z-anatomy/TA2.csv) ;
//   2. synonymes FMA → TA2 (ex. « adrenal gland » → « suprarenal gland ») ;
//   3. décomposition « <partie> of <structure> » (« branche antérieure de l'artère X ») ;
//   4. règles « adjectifs + nom » (« anterior tibial vein » → « veine tibiale antérieure »).
// Les résultats des étapes 3–4 sont marqués `auto: true` (affichés « traduction
// automatique » dans l'app) car ils n'ont pas de nom latin officiel.

import { readFileSync, existsSync } from 'node:fs';

// --------------------------------------------------------------------------- TA2
let TA2 = null;
export function chargerTA2(chemin) {
  TA2 = new Map();
  if (!existsSync(chemin)) return TA2;
  for (const ligne of readFileSync(chemin, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const c = ligne.trim().replace(/^"|"$/g, '').split(';');
    if (c.length < 4 || !c[1]) continue;
    const en = c[1].trim().toLowerCase();
    const val = { la: c[2].trim(), fr: corrigerFr(c[3].trim()) };
    // variantes : sans crochets (« facial nerve [vii] ») ni parenthèses
    for (const k of [en, en.replace(/\s*\[[^\]]*\]/g, '').trim(), en.replace(/\s*\([^)]*\)/g, '').trim()]) {
      if (k && !TA2.has(k)) TA2.set(k, val);
    }
  }
  return TA2;
}

/** Petites corrections typographiques de la colonne française de TA2. */
function corrigerFr(fr) {
  return fr
    .replace(/\bBr\. /g, 'Branche ').replace(/\bbr\. /g, 'branche ')
    .replace(/\bméd\./g, 'médiale').replace(/\blat\./g, 'latérale')
    .replace(/\bant\./g, 'antérieure').replace(/\bpost\./g, 'postérieure')
    .replace(/\bA\. /g, 'Artère ').replace(/\bV\. /g, 'Veine ').replace(/\bN\. /g, 'Nerf ')
    .replace(/[Mm]oëlle épinière/g, (m) => (m[0] === 'M' ? 'Moelle spinale' : 'moelle spinale'))
    .replace(/communiquante/g, 'communicante')
    .replace(/\s*\[[^\]]*\]/g, (m) => m) // les chiffres romains entre crochets sont conservés
    .replace(/Coeur/g, 'Cœur').replace(/coeur/g, 'cœur').replace(/oe(?=sophag)/g, 'œ')
    .replace(/\s+/g, ' ').trim();
}

const majuscule = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const minusculeInitiale = (s) => (s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

// --------------------------------------------------------------------------- synonymes FMA → TA2
const SYNONYMES = {
  'adrenal gland': 'suprarenal gland',
  amygdala: 'amygdaloid body',
  appendix: 'vermiform appendix',
  'main bronchus proper': 'main bronchus',
  'urinary bladder': 'urinary bladder',
  'deferent duct': 'ductus deferens',
  'pituitary gland': 'hypophysis',
  'pineal body': 'pineal gland',
  'white matter of cerebral hemisphere': 'white matter',
  'septum of telencephalon': 'septum pellucidum',
  'descending thoracic aorta': 'thoracic aorta',
  'descending aorta': 'descending aorta',
  'external ear': 'auricle',
  'optic part of retina': 'retina',
  'corona ciliaris': 'ciliary body',
  'superficial palmar arterial arch': 'superficial palmar arch',
  'posterior intercostal arteries': 'posterior intercostal arteries',
  'common tendinous ring': 'common tendinous ring',
  'hair of head': 'hair',
  'abducens nerve': 'abducent nerve',
  'celiac trunk': 'coeliac trunk', 'celiac artery': 'coeliac trunk',
  esophagus: 'oesophagus',
  'brachiocephalic artery': 'brachiocephalic trunk',
  'gastro-epiploic artery': 'gastro-omental artery', 'gastroepiploic vein': 'gastro-omental vein',
  'hepatic artery proper': 'hepatic artery proper',
  'superficial cervical artery': 'superficial cervical artery',
  'pre-hepatic portal vein': 'hepatic portal vein',
  'seminal vesicle': 'seminal gland',
  'mammillary body': 'mammillary body',
  'fornix of forebrain': 'fornix', 'commissure of fornix of forebrain': 'commissure of fornix',
  'peduncle of midbrain': 'cerebral peduncle',
  'ileocecal junction': 'ileocaecal orifice',
  'optic nerve': 'optic nerve',
  'fusiform gyrus': 'lateral occipitotemporal gyrus',
  'orbital gyrus': 'orbital gyri',
  'cerebral aqueduct': 'aqueduct of midbrain',
  'stria medullaris of thalamus': 'stria medullaris of thalamus',
  'testicular vein': 'testicular vein', 'suprarenal vein': 'suprarenal vein',
  'arteria princeps pollicis': 'princeps pollicis artery', 'arteria radialis indicis': 'radialis indicis artery',
  'lip': 'lips',
};

// Traductions écrites à la main (absentes de TA2 ou propres à la FMA)
const MANUEL = {
  'anterior leaflet of mitral valve': ['Cuspide antérieure de la valve mitrale', 'Cuspis anterior valvae mitralis'],
  'posterior leaflet of mitral valve': ['Cuspide postérieure de la valve mitrale', 'Cuspis posterior valvae mitralis'],
  'anterior leaflet of tricuspid valve': ['Cuspide antérieure de la valve tricuspide', 'Cuspis anterior valvae tricuspidalis'],
  'posterior leaflet of tricuspid valve': ['Cuspide postérieure de la valve tricuspide', 'Cuspis posterior valvae tricuspidalis'],
  'septal leaflet of tricuspid valve': ['Cuspide septale de la valve tricuspide', 'Cuspis septalis valvae tricuspidalis'],
  'anterior papillary muscle of ventricle': ['Muscle papillaire antérieur', 'M. papillaris anterior'],
  'posterior papillary muscle of ventricle': ['Muscle papillaire postérieur', 'M. papillaris posterior'],
  'septal papillary muscle of ventricle': ['Muscle papillaire septal', 'M. papillaris septalis'],
  'lateral papillary muscle of ventricle': ['Muscle papillaire latéral (antéro-latéral)', 'M. papillaris anterior'],
  'anterolateral head of lateral papillary muscle of ventricle': ['Chef antéro-latéral du muscle papillaire', ''],
  'distal part of ileum': ["Iléum, partie distale", 'Ileum'], 'middle part of ileum': ["Iléum, partie moyenne", 'Ileum'], 'proximal part of ileum': ["Iléum, partie proximale", 'Ileum'],
  'distal part of jejunum': ['Jéjunum, partie distale', 'Jejunum'], 'middle part of jejunum': ['Jéjunum, partie moyenne', 'Jejunum'], 'proximal part of jejunum': ['Jéjunum, partie proximale', 'Jejunum'],
  'gingiva of upper jaw': ['Gencive supérieure', 'Gingiva'], 'gingiva of lower jaw': ['Gencive inférieure', 'Gingiva'],
  'parenchyma of pancreas': ['Pancréas (parenchyme)', 'Pancreas'], 'pancreatic duct tree': ['Arbre canalaire du pancréas', 'Ductus pancreaticus'],
  mesoappendix: ['Méso-appendice', 'Mesoappendix'], 'taenia libera': ['Ténia libre', 'Taenia libera'], 'taenia mesocolica': ['Ténia mésocolique', 'Taenia mesocolica'], 'taenia omentalis': ['Ténia omental', 'Taenia omentalis'],
  'check ligament of lateral rectus': ['Aileron ligamentaire du droit latéral', ''], 'check ligament of medial rectus': ['Aileron ligamentaire du droit médial', ''],
  'trochlea of superior oblique': ["Trochlée de l'oblique supérieur", 'Trochlea musculi obliqui superioris'],
  'tarsal plate of upper eyelid': ['Tarse supérieur', 'Tarsus superior'], 'tarsal plate of lower eyelid': ['Tarse inférieur', 'Tarsus inferior'],
  'suspensory ligament of lens': ['Zonule ciliaire', 'Zonula ciliaris'], 'lacrimal lake': ['Lac lacrymal', 'Lacus lacrimalis'],
  'lateral nasal cartilage': ['Cartilage latéral du nez', 'Cartilago nasi lateralis'], 'septal nasal cartilage': ['Cartilage septal du nez', 'Cartilago septi nasi'],
  'long ciliary nerve': ['Nerfs ciliaires longs', 'Nervi ciliares longi'], 'short ciliary nerve': ['Nerfs ciliaires courts', 'Nervi ciliares breves'],
  'trochlear nerve': ['Nerf trochléaire (IV)', 'Nervus trochlearis'],
  'communicating branch of nasociliary nerve with ciliary ganglion': ['Rameau communicant du nerf naso-ciliaire avec le ganglion ciliaire', ''],
  'mammillary body': ['Corps mamillaire', 'Corpus mammillare'],
  'stria medullaris of thalamus': ['Strie médullaire du thalamus', 'Stria medullaris thalami'],
  'hepatic artery proper': ['Artère hépatique propre', 'Arteria hepatica propria'],
  'ileocecal junction': ['Jonction iléo-cæcale', 'Ostium ileale'],
  'radial collateral branch of deep brachial artery': ['Artère collatérale radiale', 'Arteria collateralis radialis'],
  'middle collateral branch of deep brachial artery': ['Artère collatérale moyenne', 'Arteria collateralis media'],
  'set of plantar digital arteries proper': ['Artères digitales plantaires propres', 'Arteriae digitales plantares propriae'],
  'communicating branch of median nerve with ulnar nerve': ['Rameau communicant du nerf médian avec le nerf ulnaire', 'Ramus communicans cum nervo ulnari'],
  'branch of anterior choroidal artery to posterior limb of internal capsule': ["Branche de l'artère choroïdienne antérieure pour le bras postérieur de la capsule interne", ''],
  'branch of middle cerebral artery to angular gyrus': ["Branche de l'artère cérébrale moyenne pour le gyrus angulaire", ''],
  coccygeus: ['Coccygien', 'M. coccygeus'], iliococcygeus: ['Ilio-coccygien', 'M. iliococcygeus'], pubococcygeus: ['Pubo-coccygien', 'M. pubococcygeus'], puborectalis: ['Pubo-rectal', 'M. puborectalis'],
};
const DENTS = { 'central secondary incisor': 'Incisive centrale', 'lateral secondary incisor': 'Incisive latérale', 'secondary canine': 'Canine',
  'first secondary premolar': '1re prémolaire', 'second secondary premolar': '2e prémolaire', 'first secondary molar': '1re molaire', 'second secondary molar': '2e molaire' };


// --------------------------------------------------------------------------- vocabulaire des règles
// Noms : [français, genre, latin éventuel]
const NOMS = {
  artery: ['artère', 'f'], arteries: ['artères', 'fp'], vein: ['veine', 'f'], veins: ['veines', 'fp'],
  nerve: ['nerf', 'm'], nerves: ['nerfs', 'mp'], branch: ['branche', 'f'], branches: ['branches', 'fp'],
  tributary: ['affluent', 'm'], tributaries: ['affluents', 'mp'], trunk: ['tronc', 'm'], division: ['division', 'f'],
  part: ['partie', 'f'], segment: ['segment', 'm'], arch: ['arcade', 'f'], network: ['réseau', 'm'],
  plexus: ['plexus', 'm'], ganglion: ['ganglion', 'm'], root: ['racine', 'f'], roots: ['racines', 'fp'], cord: ['faisceau', 'm'],
  duct: ['conduit', 'm'], 'bronchial tree': ['arbre bronchique', 'm'], bronchus: ['bronche', 'f'], lobe: ['lobe', 'm'],
  gyrus: ['gyrus', 'm'], nucleus: ['noyau', 'm'], cusp: ['valvule', 'f'], leaflet: ['cuspide', 'f'], wall: ['paroi', 'f'],
  cavity: ['cavité', 'f'], tooth: ['dent', 'f'], ligament: ['ligament', 'm'], membrane: ['membrane', 'f'], cartilage: ['cartilage', 'm'],
  muscle: ['muscle', 'm'], tract: ['tractus', 'm'], body: ['corps', 'm'], sinus: ['sinus', 'm'], gland: ['glande', 'f'],
  lobule: ['lobule', 'm'], commissure: ['commissure', 'f'], ventricle: ['ventricule', 'm'], atrium: ['atrium', 'm'],
  'hepatic biliary tree': ['arbre biliaire hépatique', 'm'], 'lobe branch': ['branche lobaire', 'f'], 'caudate lobe branch': ['branche du lobe caudé', 'f'],
  'caudate lobe tributary': ['affluent du lobe caudé', 'm'], hair: ['poils', 'mp'], junction: ['jonction', 'f'], 'hepatovenous segment': ['segment hépatique', 'm'],
};
// Adjectifs : [masculin, féminin]
const ADJ = {
  anterior: ['antérieur', 'antérieure'], posterior: ['postérieur', 'postérieure'], superior: ['supérieur', 'supérieure'],
  inferior: ['inférieur', 'inférieure'], medial: ['médial', 'médiale'], lateral: ['latéral', 'latérale'],
  middle: ['moyen', 'moyenne'], deep: ['profond', 'profonde'], superficial: ['superficiel', 'superficielle'],
  common: ['commun', 'commune'], internal: ['interne', 'interne'], external: ['externe', 'externe'],
  ascending: ['ascendant', 'ascendante'], descending: ['descendant', 'descendante'], transverse: ['transverse', 'transverse'],
  accessory: ['accessoire', 'accessoire'], proper: ['propre', 'propre'], dorsal: ['dorsal', 'dorsale'], palmar: ['palmaire', 'palmaire'],
  plantar: ['plantaire', 'plantaire'], digital: ['digital', 'digitale'], basal: ['basal', 'basale'], apical: ['apical', 'apicale'],
  segmental: ['segmentaire', 'segmentaire'], lingular: ['lingulaire', 'lingulaire'], central: ['central', 'centrale'],
  cerebral: ['cérébral', 'cérébrale'], cerebellar: ['cérébelleux', 'cérébelleuse'], temporal: ['temporal', 'temporale'],
  frontal: ['frontal', 'frontale'], parietal: ['pariétal', 'pariétale'], occipital: ['occipital', 'occipitale'],
  hepatic: ['hépatique', 'hépatique'], renal: ['rénal', 'rénale'], pulmonary: ['pulmonaire', 'pulmonaire'], portal: ['porte', 'porte'],
  cardiac: ['cardiaque', 'cardiaque'], coronary: ['coronaire', 'coronaire'], interventricular: ['interventriculaire', 'interventriculaire'],
  colic: ['colique', 'colique'], cecal: ['cæcale', 'cæcale'], pancreaticoduodenal: ['pancréatico-duodénal', 'pancréatico-duodénale'],
  tibial: ['tibial', 'tibiale'], fibular: ['fibulaire', 'fibulaire'], femoral: ['fémoral', 'fémorale'], humeral: ['huméral', 'humérale'],
  circumflex: ['circonflexe', 'circonflexe'], recurrent: ['récurrent', 'récurrente'], interosseous: ['interosseux', 'interosseuse'],
  metacarpal: ['métacarpien', 'métacarpienne'], metatarsal: ['métatarsien', 'métatarsienne'], perforating: ['perforant', 'perforante'],
  intercostal: ['intercostal', 'intercostale'], lumbar: ['lombal', 'lombale'], sacral: ['sacral', 'sacrale'], spinal: ['spinal', 'spinale'],
  communicating: ['communicant', 'communicante'], choroidal: ['choroïdien', 'choroïdienne'], callosomarginal: ['calloso-marginal', 'calloso-marginale'],
  pericallosal: ['péricalleux', 'péricalleuse'], precuneal: ['précunéen', 'précunéenne'], paracentral: ['paracentral', 'paracentrale'],
  pontine: ['pontique', 'pontique'], vermian: ['vermien', 'vermienne'], insular: ['insulaire', 'insulaire'], terminal: ['terminal', 'terminale'],
  azygos: ['azygos', 'azygos'], hemiazygos: ['hémi-azygos', 'hémi-azygos'], cephalic: ['céphalique', 'céphalique'], basilic: ['basilique', 'basilique'],
  ciliary: ['ciliaire', 'ciliaire'], ethmoidal: ['ethmoïdal', 'ethmoïdale'], cutaneous: ['cutané', 'cutanée'], muscular: ['musculaire', 'musculaire'],
  calcaneal: ['calcanéen', 'calcanéenne'], oesophageal: ['œsophagien', 'œsophagienne'], esophageal: ['œsophagien', 'œsophagienne'],
  bronchial: ['bronchique', 'bronchique'], thoracic: ['thoracique', 'thoracique'], abdominal: ['abdominal', 'abdominale'],
  left: ['gauche', 'gauche'], right: ['droit', 'droite'], main: ['principal', 'principale'], first: ['premier', 'première'],
  second: ['deuxième', 'deuxième'], third: ['troisième', 'troisième'], fourth: ['quatrième', 'quatrième'],
  subsuperior: ['sous-supérieur', 'sous-supérieure'], anterolateral: ['antéro-latéral', 'antéro-latérale'], posteromedial: ['postéro-médial', 'postéro-médiale'],
  intermediomedial: ['intermédio-médial', 'intermédio-médiale'], hypothalamic: ['hypothalamique', 'hypothalamique'],
  precommunicating: ['précommunicant', 'précommunicante'], postcommunicating: ['postcommunicant', 'postcommunicante'],
  sphenoid: ['sphénoïdal', 'sphénoïdale'], 'temporo-occipital': ['temporo-occipital', 'temporo-occipitale'], caudate: ['caudé', 'caudée'],
  ileal: ['iléal', 'iléale'], jejunal: ['jéjunal', 'jéjunale'], scapular: ['scapulaire', 'scapulaire'], venous: ['veineux', 'veineuse'],
  genicular: ['génial', 'géniale'], frontobasal: ['fronto-basal', 'fronto-basale'], rectal: ['rectal', 'rectale'], testicular: ['testiculaire', 'testiculaire'],
  suprarenal: ['surrénal', 'surrénale'], subcostal: ['subcostal', 'subcostale'], phrenic: ['phrénique', 'phrénique'], marginal: ['marginal', 'marginale'],
  septal: ['septal', 'septale'], ventricular: ['ventriculaire', 'ventriculaire'], diagonal: ['diagonal', 'diagonale'], conus: ['du cône', 'du cône'],
  polar: ['polaire', 'polaire'], prefrontal: ['préfrontal', 'préfrontale'], splenial: ['splénial', 'spléniale'], thalamogeniculate: ['thalamo-genouillé', 'thalamo-genouillée'],
  thalamoperforating: ['thalamo-perforant', 'thalamo-perforante'], lobar: ['lobaire', 'lobaire'], collateral: ['collatéral', 'collatérale'],
  pectoral: ['pectoral', 'pectorale'], mediobasal: ['médio-basal', 'médio-basale'], laterobasal: ['latéro-basal', 'latéro-basale'], caudal: ['caudal', 'caudale'],
  pancreatic: ['pancréatique', 'pancréatique'], brachial: ['brachial', 'brachiale'], ileocolic: ['iléo-colique', 'iléo-colique'], gastric: ['gastrique', 'gastrique'],
  gastroepiploic: ['gastro-omental', 'gastro-omentale'], 'gastro-epiploic': ['gastro-omental', 'gastro-omentale'], distal: ['distal', 'distale'], proximal: ['proximal', 'proximale'],
  ureteric: ['urétérique', 'urétérique'], cervical: ['cervical', 'cervicale'],
  arterial: ['artériel', 'artérielle'], secondary: ['permanent', 'permanente'], upper: ['supérieur', 'supérieure'], lower: ['inférieur', 'inférieure'],
};
// Compléments au génitif courants : « of X » → « de X »
const GENITIFS = {
  'index finger': "de l'index", 'middle finger': 'du majeur', 'ring finger': "de l'annulaire", 'little finger': "de l'auriculaire",
  thumb: 'du pouce', hand: 'de la main', foot: 'du pied', ileum: "de l'iléum", jejunum: 'du jéjunum', liver: 'du foie',
  'left ventricle': 'du ventricule gauche', 'right ventricle': 'du ventricule droit', ventricle: 'du ventricule', eyeball: 'du bulbe oculaire',
};

const estVoyelle = (s) => /^[aeiouyéèêàâîôûœh]/i.test(s);
/** « de » + groupe nominal français avec article défini (« de l'artère », « du nerf », « des branches »). */
function genitif(fr, genre) {
  const f = minusculeInitiale(fr);
  if (genre?.endsWith('p')) return `des ${f}`;
  if (estVoyelle(f)) return `de l'${f}`;
  return genre === 'f' ? `de la ${f}` : `du ${f}`;
}
/** Genre d'un nom français déjà traduit (premier mot). */
function genreDe(fr) {
  const premier = minusculeInitiale(fr).split(' ')[0];
  for (const [f, g] of Object.values(NOMS)) if (f.split(' ')[0] === premier) return g;
  if (/^(moelle|veine|artère|branche|glande|partie|racine|bronche|paroi|cavité|dent|membrane|commissure|valvule|cuspide|division|arcade|langue|vessie|rate|trachée|prostate|vésicule)/.test(premier)) return 'f';
  if (/s$/.test(premier) && !/(plexus|corps|sinus|tractus|gyrus|pancréas|thymus|utérus|bulbe|anus)$/.test(premier)) return 'mp';
  return 'm';
}

// --------------------------------------------------------------------------- traduction
function viaTA2(en) {
  const k = en.toLowerCase().trim();
  const cand = [k, SYNONYMES[k], k.replace(/ veins$/, ' vein'), k.replace(/ arteries$/, ' artery'), k.replace(/ vein$/, ' veins'), k.replace(/ artery$/, ' arteries'),
    k.replace(/ muscle$/, ''), k.replace(/^set of /, ''), k.replace(/ proper$/, '')];
  for (const c of cand) if (c && TA2?.has(c)) return { ...TA2.get(c), auto: false };
  return null;
}

/** « adjectifs + nom » : « anterior tibial vein » → « Veine tibiale antérieure ». */
function viaRegles(en) {
  const mots = en.toLowerCase().split(' ');
  // nom = suffixe le plus long reconnu
  for (let i = 0; i < mots.length; i++) {
    const tete = mots.slice(i).join(' ');
    const n = NOMS[tete];
    if (!n) continue;
    const adjs = mots.slice(0, i);
    if (!adjs.every((a) => ADJ[a])) return null;
    const [fr, g] = n;
    const fem = g.startsWith('f');
    const plur = g.endsWith('p');
    // en français, les adjectifs suivent le nom, dans l'ordre inverse de l'anglais
    const accords = adjs.reverse().map((a) => ADJ[a][fem ? 1 : 0] + (plur && !/[sx]$/.test(ADJ[a][fem ? 1 : 0]) ? 's' : ''));
    return { fr: majuscule([fr, ...accords].join(' ')), la: '', auto: true };
  }
  return null;
}

/** Traduit un nom anglais SANS latéralité. Renvoie { fr, la, auto } ou null. */
export function traduireNom(en, profondeur = 0) {
  if (!TA2) throw new Error('chargerTA2() doit être appelé avant traduireNom()');
  let base = en.toLowerCase().trim();
  // chiffres romains des nerfs crâniens : « Facial nerve (VII) » → conservés à la fin
  let romain = '';
  const r = base.match(/^(.*?)\s*\(([ivx]+)\)$/);
  if (r) { base = r[1]; romain = ` (${r[2].toUpperCase()})`; }
  base = base.replace(/^\((.*)\)$/, '$1');
  const fin = (t) => (t ? { ...t, fr: t.fr + (romain && !t.fr.includes('(') ? romain : '') } : null);

  if (MANUEL[base]) return fin({ fr: MANUEL[base][0], la: MANUEL[base][1], auto: false });
  const dent = base.match(/^(upper|lower) (.+) tooth$/);
  if (dent && DENTS[dent[2]]) return { fr: `${DENTS[dent[2]]} ${dent[1] === 'upper' ? 'supérieure' : 'inférieure'}`, la: '', auto: false };
  const seg = base.match(/^hepatovenous segment ([ivx]+)$/);
  if (seg) return { fr: `Segment ${seg[1].toUpperCase()} du foie`, la: `Segmentum hepatis ${seg[1].toUpperCase()}`, auto: false };
  const t1 = viaTA2(base);
  if (t1) return fin(t1);
  // « set of X » : ensemble → pluriel
  if (base.startsWith('set of ')) {
    const t = traduireNom(base.slice(7), profondeur + 1);
    if (t) return fin(t);
  }
  // « trunk of X », « anterior branch of X », « X part of Y »…
  const m = base.match(/^(.+?) of (.+)$/);
  if (m && profondeur < 3) {
    const partie = viaTA2(m[1]) ?? viaRegles(m[1]);
    const tout = GENITIFS[m[2]] ? { fr: GENITIFS[m[2]], brut: true } : traduireNom(m[2], profondeur + 1);
    if (partie && tout) {
      const de = tout.brut ? tout.fr : genitif(tout.fr, genreDe(tout.fr));
      return fin({ fr: majuscule(`${minusculeInitiale(partie.fr)} ${de}`), la: '', auto: true });
    }
  }
  return fin(viaRegles(base));
}
