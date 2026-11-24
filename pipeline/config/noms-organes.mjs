// Classement des organes, vaisseaux et nerfs par appareil (système), groupe et
// couche de dissection. Les noms français/latins viennent de traduction.mjs.
//
// Couches : 5 = vaisseaux et nerfs · 7 = organes (et système nerveux central).

export const COUCHE_VAISSEAUX_NERFS = 5;
export const COUCHE_ORGANES = 7;

// Structures ignorées (poils, cavités vides, espaces) : [motif]
export const IGNORES = [
  /^hair of head$/, /^pubic hair$/, /^eyebrow$/, /^cavity of (atrium|ventricle)$/, /^interpeduncular fossa$/,
  /^interventricular foramen$/, /^lacrimal lake$/, /^anterior chamber of eyeball$/,
];

// Règles : [motif sur le nom anglais sans latéralité, système, groupe]
// Testées dans l'ordre ; la première qui correspond l'emporte.
export const REGLES_ORGANES = [
  // ---- Cœur
  [/valve|leaflet|papillary|wall of (atrium|ventricle)|^coronary sinus$|^heart$/, 'coeur', 'Cœur'],
  // ---- Appareil respiratoire
  [/bronchial tree|bronchus|trachea|lobe of (left|right) lung|^lung/, 'respiratoire', 'Trachée, bronches et poumons'],
  [/thyroid cartilage|cricoid|arytenoid|corniculate|cuneiform cartilage|epiglottis|vocal ligament|conus elasticus|thyrohyoid|cricothyroid ligament|epiglottic ligament/, 'respiratoire', 'Larynx'],
  [/nasal cartilage|alar cartilage/, 'respiratoire', 'Nez'],
  // ---- Appareil digestif
  [/tooth|gingiva|^lip$|^tongue$|submandibular gland|sublingual gland|parotid/, 'digestif', 'Cavité orale et glandes salivaires'],
  [/esophag/, 'digestif', 'Œsophage'],
  [/^stomach$|duodenum/, 'digestif', 'Estomac et duodénum'],
  [/jejunum|ileum|mesentery of small intestine/, 'digestif', 'Intestin grêle'],
  [/cecal|appendix|mesoappendix|colon|mesocolon|taenia|rectum|ileocecal/, 'digestif', 'Gros intestin'],
  [/liver|hepatovenous|hepatic biliary|hepatic duct|common hepatic duct|cystic duct|gallbladder|duct of caudate lobe/, 'digestif', 'Foie et voies biliaires'],
  [/pancrea/, 'digestif', 'Pancréas'],
  // ---- Appareil urinaire
  [/^kidney$|ureter|urinary bladder|urethra/, 'urinaire', 'Appareil urinaire'],
  // ---- Appareil génital masculin
  [/prostate|testis|epididym|deferent|seminal vesicle|penis|glans/, 'genital-m', 'Appareil génital masculin'],
  // ---- Glandes endocrines et organes lymphoïdes
  [/adrenal|pituitary|pineal|thymus|thyroid gland|parathyroid/, 'endocrine', 'Glandes endocrines'],
  [/^spleen$/, 'endocrine', 'Organes lymphoïdes'],
  // ---- Organes des sens
  [/cornea|sclera|choroid$|^iris$|^lens$|vitreous|retina|corona ciliaris|lacrimal|nasolacrimal|tarsal plate|trochlea of superior oblique|check ligament|common tendinous ring|suspensory ligament of lens|tendon of levator palpebrae/, 'sens', 'Œil et annexes'],
  [/external ear/, 'sens', 'Oreille'],
  // ---- Système nerveux central
  [/spinal cord|horn of spinal cord/, 'snc', 'Moelle spinale'],
  [/cerebell|tentorium/, 'snc', 'Cervelet'],
  [/pons|medulla oblongata|midbrain|colliculus|peduncle of midbrain|cerebral aqueduct|fourth ventricle/, 'snc', 'Tronc cérébral'],
  [/thalamus|hypothalamus|geniculate|mammillary|tuber cinereum|habenula|stria medullaris|third ventricle|optic chiasm|optic tract|lamina terminalis/, 'snc', 'Diencéphale'],
  [/gyrus|lobule|occipital lobe|insula|corpus callosum|fornix|commissure|internal capsule|caudate nucleus|putamen|globus pallidus|amygdala|hippocampus|stria terminalis|septum of telencephalon|white matter|lateral ventricle|choroid plexus/, 'snc', 'Hémisphères cérébraux'],
  // ---- Nerfs crâniens et ganglions de BodyParts3D (orbite)
  [/optic nerve|ciliary ganglion|ciliary nerve|trochlear nerve/, 'nerfs', 'Nerfs crâniens'],
  // ---- Aponévroses et membranes (rangées avec muscles et os)
  [/linea alba|iliotibial tract|tendinous arch of levator ani|pharyngeal raphe|pterygomandibular raphe/, 'muscles', 'Aponévroses et fascias'],
  [/interosseous membrane|long plantar ligament|stylohyoid ligament/, 'os', 'Membranes et ligaments'],
];

export function classerOrgane(base) {
  if (IGNORES.some((re) => re.test(base))) return null;
  for (const [re, systeme, groupe] of REGLES_ORGANES) if (re.test(base)) return { systeme, groupe };
  return { systeme: 'autres', groupe: 'Autres structures' };
}

/** Groupe des vaisseaux et nerfs selon leur région. */
export function groupeVaisseau(systeme, region) {
  const nom = { arteres: 'Artères', veines: 'Veines', nerfs: 'Nerfs' }[systeme] ?? systeme;
  const ou = { tete: 'de la tête', cou: 'du cou', thorax: 'du thorax', abdomen: "de l'abdomen", bassin: 'du bassin',
    'membre-sup': 'du membre supérieur', 'membre-inf': 'du membre inférieur', dos: 'du dos', rachis: 'du rachis' }[region] ?? '';
  return `${nom} ${ou}`.trim();
}

/**
 * Région déduite de la position (centre de la boîte, mm, repère BodyParts3D :
 * x = gauche du sujet, y = postérieur, z = haut). Seuils calés sur ce modèle.
 */
export function regionDepuisPosition([x, , z], min = null, max = null) {
  const ax = Math.abs(x);
  // Structures longues des membres (nerfs, vaisseaux) : leur centre peut tomber
  // près du tronc ; on regarde jusqu'où elles s'étendent latéralement.
  if (min && max) {
    const etendue = Math.max(Math.abs(min[0]), Math.abs(max[0]));
    if (etendue > 240 && z > 650 && Math.abs(min[0] - max[0]) < 260) return 'membre-sup';
  }
  if (z > 1440) return 'tete';
  // bras et avant-bras pendants le long du tronc (le thorax ne dépasse pas ~150 mm latéralement)
  if (ax > 160 && z > 650 && z < 1330) return 'membre-sup';
  if (ax > 190 && z >= 1330) return 'membre-sup';
  if (z < 760 && ax > 35) return 'membre-inf';
  if (z > 1360) return 'cou';
  if (z > 1085) return 'thorax';
  if (z > 905) return 'abdomen';
  return 'bassin';
}

// ---------------------------------------------------------------------------
// Fiches communes : plusieurs maillages (segments, branches, parties) partagent
// la fiche de l'organe ou du vaisseau entier. [motif sur la clé, id de fiche]
const FICHES_PAR_CLE = [
  [/^(aorte-|arcade-de-l-aorte$)/, 'aorte'],
  [/^artere-carotide-commune/, 'artere-carotide-commune'],
  [/^artere-subclaviere/, 'artere-subclaviere'],
  [/^(artere-renale|tronc-de-l-artere-renale|division-.*-artere-renale|segment-ureterique-de-l-artere-renale)/, 'artere-renale'],
  [/^(artere-pulmonaire|tronc-pulmonaire)/, 'tronc-pulmonaire'],
  [/coronaire|interventriculaire/, 'arteres-coronaires'],
  [/^tronc-de-l-artere-mesenterique-superieure$/, 'artere-mesenterique-superieure'],
  [/^veine-pulmonaire/, 'veines-pulmonaires'],
  [/^(veine-porte|tronc-de-la-veine-porte)/, 'veine-porte'],
  [/^veine-brachiocephalique/, 'veines-brachiocephaliques'],
  [/plexus-brachial/, 'plexus-brachial'],
  [/-du-nerf-(median|ulnaire|radial|axillaire|obturateur|saphene|oculomoteur|maxillaire)$/, (m) => `nerf-${m[1]}`],
  [/^(lobe-.*-du-poumon|poumon)/, 'poumons'],
  [/^(arbre-bronchique|bronche|trachee)/, 'trachee-bronches'],
  [/^(rein)$/, 'rein'], [/^uretere$/, 'uretere'], [/^vessie/, 'vessie'],
];
const FICHES_PAR_GROUPE = {
  'Cœur': 'coeur', 'Foie et voies biliaires': 'foie', 'Intestin grêle': 'intestin-grele', 'Gros intestin': 'gros-intestin',
  'Estomac et duodénum': null, 'Larynx': 'larynx', 'Cervelet': 'cervelet', 'Tronc cérébral': 'tronc-cerebral',
  'Diencéphale': 'diencephale', 'Hémisphères cérébraux': 'hemispheres-cerebraux', 'Moelle spinale': 'moelle-spinale', 'Œil et annexes': 'oeil',
};

/** Identifiant de fiche pour une structure (vaisseau, nerf, organe). */
export function ficheDe(cle, groupe) {
  if (cle === 'rectum') return 'rectum';
  if (/^(incisive|canine|\d+r?e-(pre)?molaire)/.test(cle)) return 'dents';
  if (/thymus/.test(cle)) return 'thymus';
  if (/pancrea/.test(cle)) return 'pancreas';
  if (/penis/.test(cle)) return 'penis';
  for (const [re, f] of FICHES_PAR_CLE) {
    const m = cle.match(re);
    if (m) return typeof f === 'function' ? f(m) : f;
  }
  return FICHES_PAR_GROUPE[groupe] ?? cle;
}
