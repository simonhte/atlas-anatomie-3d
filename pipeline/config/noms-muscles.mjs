// Traduction des muscles de BodyParts3D (noms FMA anglais) en français et en
// latin, avec la région, le groupe (loge) et la COUCHE de dissection :
//   1 = plan superficiel, 2 = plan intermédiaire, 3 = plan profond
// (la couche est relative à la région : elle sert au curseur de dissection).
//
// Format : 'nom FMA sans latéralité': [cle, fr, la, genre, region, groupe, couche, fiche]
// `fiche` = identifiant de la fiche de cours (contenu/fiches/muscles/<fiche>.md) ;
// les chefs et parties d'un même muscle partagent la fiche du muscle.

import { separerCote } from './noms-os.mjs';

const M = {
  // ---------------------------------------------------------------- Tête : œil
  'superior rectus': ['droit-superieur-oeil', "Droit supérieur de l'œil", 'M. rectus superior', 'm', 'tete', "Muscles de l'œil", 3, 'oculomoteurs'],
  'inferior rectus': ['droit-inferieur-oeil', "Droit inférieur de l'œil", 'M. rectus inferior', 'm', 'tete', "Muscles de l'œil", 3, 'oculomoteurs'],
  'medial rectus': ['droit-medial-oeil', "Droit médial de l'œil", 'M. rectus medialis', 'm', 'tete', "Muscles de l'œil", 3, 'oculomoteurs'],
  'lateral rectus': ['droit-lateral-oeil', "Droit latéral de l'œil", 'M. rectus lateralis', 'm', 'tete', "Muscles de l'œil", 3, 'oculomoteurs'],
  'superior oblique': ['oblique-superieur-oeil', "Oblique supérieur de l'œil", 'M. obliquus superior', 'm', 'tete', "Muscles de l'œil", 3, 'oculomoteurs'],
  'inferior oblique': ['oblique-inferieur-oeil', "Oblique inférieur de l'œil", 'M. obliquus inferior', 'm', 'tete', "Muscles de l'œil", 3, 'oculomoteurs'],
  'levator palpebrae superioris': ['releveur-paupiere', 'Releveur de la paupière supérieure', 'M. levator palpebrae superioris', 'm', 'tete', "Muscles de l'œil", 3, 'oculomoteurs'],
  // ---------------------------------------------------------------- Tête : langue, voile, pharynx, larynx
  genioglossus: ['genio-glosse', 'Génio-glosse', 'M. genioglossus', 'm', 'tete', 'Langue', 3, ''],
  hyoglossus: ['hyo-glosse', 'Hyo-glosse', 'M. hyoglossus', 'm', 'tete', 'Langue', 3, ''],
  'levator veli palatini': ['elevateur-voile', 'Élévateur du voile du palais', 'M. levator veli palatini', 'm', 'tete', 'Voile du palais', 3, ''],
  'tensor veli palatini': ['tenseur-voile', 'Tenseur du voile du palais', 'M. tensor veli palatini', 'm', 'tete', 'Voile du palais', 3, ''],
  'uvular muscle': ['muscle-luette', 'Muscle de la luette', 'M. uvulae', 'm', 'tete', 'Voile du palais', 3, ''],
  'superior pharyngeal constrictor': ['constricteur-sup-pharynx', 'Constricteur supérieur du pharynx', 'M. constrictor pharyngis superior', 'm', 'cou', 'Pharynx', 3, ''],
  'middle pharyngeal constrictor': ['constricteur-moyen-pharynx', 'Constricteur moyen du pharynx', 'M. constrictor pharyngis medius', 'm', 'cou', 'Pharynx', 3, ''],
  'inferior pharyngeal constrictor': ['constricteur-inf-pharynx', 'Constricteur inférieur du pharynx', 'M. constrictor pharyngis inferior', 'm', 'cou', 'Pharynx', 3, ''],
  stylopharyngeus: ['stylo-pharyngien', 'Stylo-pharyngien', 'M. stylopharyngeus', 'm', 'cou', 'Pharynx', 3, ''],
  palatopharyngeus: ['palato-pharyngien', 'Palato-pharyngien', 'M. palatopharyngeus', 'm', 'cou', 'Pharynx', 3, ''],
  salpingopharyngeus: ['salpingo-pharyngien', 'Salpingo-pharyngien', 'M. salpingopharyngeus', 'm', 'cou', 'Pharynx', 3, ''],
  'straight part of cricothyroid': ['crico-thyroidien-droit', 'Crico-thyroïdien, partie droite', 'M. cricothyroideus, pars recta', 'm', 'cou', 'Larynx', 3, ''],
  'oblique part of cricothyroid': ['crico-thyroidien-oblique', 'Crico-thyroïdien, partie oblique', 'M. cricothyroideus, pars obliqua', 'm', 'cou', 'Larynx', 3, ''],
  'posterior crico-arytenoid': ['crico-arytenoidien-post', 'Crico-aryténoïdien postérieur', 'M. cricoarytenoideus posterior', 'm', 'cou', 'Larynx', 3, ''],
  'lateral crico-arytenoid': ['crico-arytenoidien-lat', 'Crico-aryténoïdien latéral', 'M. cricoarytenoideus lateralis', 'm', 'cou', 'Larynx', 3, ''],
  'transverse arytenoid': ['arytenoidien-transverse', 'Aryténoïdien transverse', 'M. arytenoideus transversus', 'm', 'cou', 'Larynx', 3, ''],
  'oblique arytenoid': ['arytenoidien-oblique', 'Aryténoïdien oblique', 'M. arytenoideus obliquus', 'm', 'cou', 'Larynx', 3, ''],
  'thyro-arytenoid': ['thyro-arytenoidien', 'Thyro-aryténoïdien', 'M. thyroarytenoideus', 'm', 'cou', 'Larynx', 3, ''],
  vocalis: ['vocal', 'Muscle vocal', 'M. vocalis', 'm', 'cou', 'Larynx', 3, ''],
  aryepiglotticus: ['ary-epiglottique', 'Ary-épiglottique', 'M. aryepiglotticus', 'm', 'cou', 'Larynx', 3, ''],

  // ---------------------------------------------------------------- Cou
  platysma: ['platysma', 'Platysma', 'Platysma', 'm', 'cou', 'Muscles superficiels du cou', 1, 'platysma'],
  sternocleidomastoid: ['scm', 'Sterno-cléido-mastoïdien', 'M. sternocleidomastoideus', 'm', 'cou', 'Muscles superficiels du cou', 2, 'sterno-cleido-mastoidien'],
  digastric: ['digastrique', 'Digastrique', 'M. digastricus', 'm', 'cou', 'Muscles supra-hyoïdiens', 2, 'digastrique'],
  'intermediate tendon': ['digastrique-tendon', 'Tendon intermédiaire du digastrique', 'Tendo intermedius m. digastrici', 'm', 'cou', 'Muscles supra-hyoïdiens', 2, 'digastrique'],
  stylohyoid: ['stylo-hyoidien', 'Stylo-hyoïdien', 'M. stylohyoideus', 'm', 'cou', 'Muscles supra-hyoïdiens', 2, 'supra-hyoidiens'],
  mylohyoid: ['mylo-hyoidien', 'Mylo-hyoïdien', 'M. mylohyoideus', 'm', 'cou', 'Muscles supra-hyoïdiens', 3, 'supra-hyoidiens'],
  geniohyoid: ['genio-hyoidien', 'Génio-hyoïdien', 'M. geniohyoideus', 'm', 'cou', 'Muscles supra-hyoïdiens', 3, 'supra-hyoidiens'],
  sternohyoid: ['sterno-hyoidien', 'Sterno-hyoïdien', 'M. sternohyoideus', 'm', 'cou', 'Muscles infra-hyoïdiens', 2, 'infra-hyoidiens'],
  omohyoid: ['omo-hyoidien', 'Omo-hyoïdien', 'M. omohyoideus', 'm', 'cou', 'Muscles infra-hyoïdiens', 2, 'infra-hyoidiens'],
  sternothyroid: ['sterno-thyroidien', 'Sterno-thyroïdien', 'M. sternothyroideus', 'm', 'cou', 'Muscles infra-hyoïdiens', 3, 'infra-hyoidiens'],
  thyrohyoid: ['thyro-hyoidien', 'Thyro-hyoïdien', 'M. thyrohyoideus', 'm', 'cou', 'Muscles infra-hyoïdiens', 3, 'infra-hyoidiens'],
  'scalenus anterior': ['scalene-anterieur', 'Scalène antérieur', 'M. scalenus anterior', 'm', 'cou', 'Muscles scalènes', 3, 'scalenes'],
  'scalenus medius': ['scalene-moyen', 'Scalène moyen', 'M. scalenus medius', 'm', 'cou', 'Muscles scalènes', 3, 'scalenes'],
  'scalenus posterior': ['scalene-posterieur', 'Scalène postérieur', 'M. scalenus posterior', 'm', 'cou', 'Muscles scalènes', 3, 'scalenes'],
  'longus capitis': ['long-tete', 'Long de la tête', 'M. longus capitis', 'm', 'cou', 'Muscles prévertébraux', 3, 'prevertebraux'],
  'superior oblique part of longus colli': ['long-cou-oblique-sup', 'Long du cou, partie oblique supérieure', 'M. longus colli', 'm', 'cou', 'Muscles prévertébraux', 3, 'prevertebraux'],
  'inferior oblique part of longus colli': ['long-cou-oblique-inf', 'Long du cou, partie oblique inférieure', 'M. longus colli', 'm', 'cou', 'Muscles prévertébraux', 3, 'prevertebraux'],
  'vertical intermediate part of longus colli': ['long-cou-verticale', 'Long du cou, partie verticale', 'M. longus colli', 'm', 'cou', 'Muscles prévertébraux', 3, 'prevertebraux'],
  'rectus capitis anterior': ['droit-anterieur-tete', 'Droit antérieur de la tête', 'M. rectus capitis anterior', 'm', 'cou', 'Muscles prévertébraux', 3, 'prevertebraux'],
  'rectus capitis lateralis': ['droit-lateral-tete', 'Droit latéral de la tête', 'M. rectus capitis lateralis', 'm', 'cou', 'Muscles prévertébraux', 3, 'prevertebraux'],

  // ---------------------------------------------------------------- Dos et nuque
  'descending part of trapezius': ['trapeze-descendant', 'Trapèze, partie descendante', 'M. trapezius, pars descendens', 'm', 'dos', 'Plan superficiel du dos', 1, 'trapeze'],
  'transverse part of trapezius': ['trapeze-transverse', 'Trapèze, partie transverse', 'M. trapezius, pars transversa', 'm', 'dos', 'Plan superficiel du dos', 1, 'trapeze'],
  'ascending part of trapezius': ['trapeze-ascendant', 'Trapèze, partie ascendante', 'M. trapezius, pars ascendens', 'm', 'dos', 'Plan superficiel du dos', 1, 'trapeze'],
  'rhomboid major': ['grand-rhomboide', 'Grand rhomboïde', 'M. rhomboideus major', 'm', 'dos', 'Plan superficiel du dos', 2, 'rhomboides'],
  'rhomboid minor': ['petit-rhomboide', 'Petit rhomboïde', 'M. rhomboideus minor', 'm', 'dos', 'Plan superficiel du dos', 2, 'rhomboides'],
  'levator scapulae': ['elevateur-scapula', 'Élévateur de la scapula', 'M. levator scapulae', 'm', 'dos', 'Plan superficiel du dos', 2, 'elevateur-scapula'],
  'serratus posterior superior': ['dentele-post-sup', 'Dentelé postérieur supérieur', 'M. serratus posterior superior', 'm', 'dos', 'Plan intermédiaire du dos', 2, 'denteles-posterieurs'],
  'serratus posterior inferior': ['dentele-post-inf', 'Dentelé postérieur inférieur', 'M. serratus posterior inferior', 'm', 'dos', 'Plan intermédiaire du dos', 2, 'denteles-posterieurs'],
  'splenius capitis': ['splenius-tete', 'Splénius de la tête', 'M. splenius capitis', 'm', 'dos', 'Muscles profonds du dos', 3, 'splenius'],
  'splenius cervicis': ['splenius-cou', 'Splénius du cou', 'M. splenius cervicis', 'm', 'dos', 'Muscles profonds du dos', 3, 'splenius'],
  'iliocostalis cervicis': ['ilio-costal-cervical', 'Ilio-costal cervical', 'M. iliocostalis cervicis', 'm', 'dos', 'Érecteurs du rachis', 3, 'erecteurs-rachis'],
  'iliocostalis thoracis': ['ilio-costal-thoracique', 'Ilio-costal thoracique', 'M. iliocostalis thoracis', 'm', 'dos', 'Érecteurs du rachis', 3, 'erecteurs-rachis'],
  'iliocostalis lumborum': ['ilio-costal-lombal', 'Ilio-costal lombal', 'M. iliocostalis lumborum', 'm', 'dos', 'Érecteurs du rachis', 3, 'erecteurs-rachis'],
  'longissimus capitis': ['longissimus-tete', 'Longissimus de la tête', 'M. longissimus capitis', 'm', 'dos', 'Érecteurs du rachis', 3, 'erecteurs-rachis'],
  'longissimus cervicis': ['longissimus-cervical', 'Longissimus cervical', 'M. longissimus cervicis', 'm', 'dos', 'Érecteurs du rachis', 3, 'erecteurs-rachis'],
  'longissimus thoracis': ['longissimus-thoracique', 'Longissimus thoracique', 'M. longissimus thoracis', 'm', 'dos', 'Érecteurs du rachis', 3, 'erecteurs-rachis'],
  spinalis: ['epineux', 'Épineux', 'M. spinalis', 'm', 'dos', 'Érecteurs du rachis', 3, 'erecteurs-rachis'],
  'spinalis thoracis': ['epineux-thoracique', 'Épineux thoracique', 'M. spinalis thoracis', 'm', 'dos', 'Érecteurs du rachis', 3, 'erecteurs-rachis'],
  'semispinalis capitis': ['semi-epineux-tete', 'Semi-épineux de la tête', 'M. semispinalis capitis', 'm', 'dos', 'Transversaire-épineux', 3, 'transversaire-epineux'],
  'semispinalis cervicis': ['semi-epineux-cervical', 'Semi-épineux cervical', 'M. semispinalis cervicis', 'm', 'dos', 'Transversaire-épineux', 3, 'transversaire-epineux'],
  'semispinalis thoracis': ['semi-epineux-thoracique', 'Semi-épineux thoracique', 'M. semispinalis thoracis', 'm', 'dos', 'Transversaire-épineux', 3, 'transversaire-epineux'],
  'cervical rotator': ['rotateurs-cervicaux', 'Rotateurs cervicaux', 'Mm. rotatores cervicis', 'm', 'dos', 'Transversaire-épineux', 3, 'transversaire-epineux'],
  'thoracic rotator': ['rotateurs-thoraciques', 'Rotateurs thoraciques', 'Mm. rotatores thoracis', 'm', 'dos', 'Transversaire-épineux', 3, 'transversaire-epineux'],
  'lumbar rotator': ['rotateurs-lombaux', 'Rotateurs lombaux', 'Mm. rotatores lumborum', 'm', 'dos', 'Transversaire-épineux', 3, 'transversaire-epineux'],
  'interspinalis thoracis': ['interepineux-thoraciques', 'Interépineux thoraciques', 'Mm. interspinales thoracis', 'm', 'dos', 'Muscles segmentaires', 3, ''],
  'set of interspinales cervicis': ['interepineux-cervicaux', 'Interépineux cervicaux', 'Mm. interspinales cervicis', 'm', 'dos', 'Muscles segmentaires', 3, ''],
  'set of interspinales lumborum': ['interepineux-lombaux', 'Interépineux lombaux', 'Mm. interspinales lumborum', 'm', 'dos', 'Muscles segmentaires', 3, ''],
  'medial lumbar intertransversarius': ['intertransversaires-med-lomb', 'Intertransversaires médiaux des lombes', 'Mm. intertransversarii mediales lumborum', 'm', 'dos', 'Muscles segmentaires', 3, ''],
  'lateral lumbar intertransversarius': ['intertransversaires-lat-lomb', 'Intertransversaires latéraux des lombes', 'Mm. intertransversarii laterales lumborum', 'm', 'dos', 'Muscles segmentaires', 3, ''],
  'set of anterior cervical intertransversarii': ['intertransversaires-ant-cerv', 'Intertransversaires antérieurs du cou', 'Mm. intertransversarii anteriores cervicis', 'm', 'cou', 'Muscles prévertébraux', 3, ''],
  'set of posterior cervical intertransversarii': ['intertransversaires-post-cerv', 'Intertransversaires postérieurs du cou', 'Mm. intertransversarii posteriores cervicis', 'm', 'dos', 'Muscles segmentaires', 3, ''],
  'set of levatores costarum breves': ['elevateurs-courts-cotes', 'Élévateurs courts des côtes', 'Mm. levatores costarum breves', 'm', 'dos', 'Muscles segmentaires', 3, ''],
  'set of levatores costarum longi': ['elevateurs-longs-cotes', 'Élévateurs longs des côtes', 'Mm. levatores costarum longi', 'm', 'dos', 'Muscles segmentaires', 3, ''],
  'rectus capitis posterior major': ['grand-droit-post-tete', 'Grand droit postérieur de la tête', 'M. rectus capitis posterior major', 'm', 'dos', 'Muscles sous-occipitaux', 3, 'sous-occipitaux'],
  'rectus capitis posterior minor': ['petit-droit-post-tete', 'Petit droit postérieur de la tête', 'M. rectus capitis posterior minor', 'm', 'dos', 'Muscles sous-occipitaux', 3, 'sous-occipitaux'],
  'obliquus capitis superior': ['oblique-sup-tete', 'Oblique supérieur de la tête', 'M. obliquus capitis superior', 'm', 'dos', 'Muscles sous-occipitaux', 3, 'sous-occipitaux'],
  'obliquus capitis inferior': ['oblique-inf-tete', 'Oblique inférieur de la tête', 'M. obliquus capitis inferior', 'm', 'dos', 'Muscles sous-occipitaux', 3, 'sous-occipitaux'],

  // ---------------------------------------------------------------- Thorax
  'clavicular part of pectoralis major': ['grand-pectoral-claviculaire', 'Grand pectoral, partie claviculaire', 'M. pectoralis major, pars clavicularis', 'm', 'thorax', 'Paroi thoracique antérieure', 1, 'grand-pectoral'],
  'sternocostal part of pectoralis major': ['grand-pectoral-sternocostal', 'Grand pectoral, partie sterno-costale', 'M. pectoralis major, pars sternocostalis', 'm', 'thorax', 'Paroi thoracique antérieure', 1, 'grand-pectoral'],
  'abdominal part of pectoralis major': ['grand-pectoral-abdominal', 'Grand pectoral, partie abdominale', 'M. pectoralis major, pars abdominalis', 'm', 'thorax', 'Paroi thoracique antérieure', 1, 'grand-pectoral'],
  'pectoralis minor': ['petit-pectoral', 'Petit pectoral', 'M. pectoralis minor', 'm', 'thorax', 'Paroi thoracique antérieure', 2, 'petit-pectoral'],
  subclavius: ['subclavier', 'Subclavier', 'M. subclavius', 'm', 'thorax', 'Paroi thoracique antérieure', 2, 'subclavier'],
  'serratus anterior': ['dentele-anterieur', 'Dentelé antérieur', 'M. serratus anterior', 'm', 'thorax', 'Paroi thoracique latérale', 2, 'dentele-anterieur'],
  'external intercostal muscle': ['intercostaux-externes', 'Intercostaux externes', 'Mm. intercostales externi', 'm', 'thorax', 'Muscles intercostaux', 3, 'intercostaux'],
  'internal intercostal muscle': ['intercostaux-internes', 'Intercostaux internes', 'Mm. intercostales interni', 'm', 'thorax', 'Muscles intercostaux', 3, 'intercostaux'],
  'innermost intercostal muscle': ['intercostaux-intimes', 'Intercostaux intimes', 'Mm. intercostales intimi', 'm', 'thorax', 'Muscles intercostaux', 3, 'intercostaux'],
  'transversus thoracis': ['transverse-thorax', 'Transverse du thorax', 'M. transversus thoracis', 'm', 'thorax', 'Muscles intercostaux', 3, 'intercostaux'],
  diaphragm: ['diaphragme', 'Diaphragme', 'Diaphragma', 'm', 'thorax', 'Diaphragme', 3, 'diaphragme'],

  // ---------------------------------------------------------------- Abdomen
  'external oblique': ['oblique-externe', "Oblique externe de l'abdomen", 'M. obliquus externus abdominis', 'm', 'abdomen', 'Paroi antérolatérale', 1, 'oblique-externe'],
  'psoas major': ['grand-psoas', 'Grand psoas', 'M. psoas major', 'm', 'abdomen', 'Paroi postérieure', 3, 'ilio-psoas'],

  // ---------------------------------------------------------------- Bassin et périnée
  iliacus: ['iliaque', 'Iliaque', 'M. iliacus', 'm', 'bassin', 'Ilio-psoas', 3, 'ilio-psoas'],
  coccygeus: ['coccygien', 'Coccygien (ischio-coccygien)', 'M. coccygeus', 'm', 'bassin', 'Diaphragme pelvien', 3, 'releveur-anus'],
  iliococcygeus: ['ilio-coccygien', "Ilio-coccygien (releveur de l'anus)", 'M. iliococcygeus', 'm', 'bassin', 'Diaphragme pelvien', 3, 'releveur-anus'],
  pubococcygeus: ['pubo-coccygien', "Pubo-coccygien (releveur de l'anus)", 'M. pubococcygeus', 'm', 'bassin', 'Diaphragme pelvien', 3, 'releveur-anus'],
  puborectalis: ['pubo-rectal', "Pubo-rectal (releveur de l'anus)", 'M. puborectalis', 'm', 'bassin', 'Diaphragme pelvien', 3, 'releveur-anus'],
  'external anal sphincter': ['sphincter-externe-anus', "Sphincter externe de l'anus", 'M. sphincter ani externus', 'm', 'bassin', 'Périnée', 2, 'releveur-anus'],

  // ---------------------------------------------------------------- Membre supérieur : épaule
  'clavicular part of deltoid': ['deltoide-claviculaire', 'Deltoïde, partie claviculaire', 'M. deltoideus, pars clavicularis', 'm', 'membre-sup', 'Épaule', 1, 'deltoide'],
  'acromial part of deltoid': ['deltoide-acromiale', 'Deltoïde, partie acromiale', 'M. deltoideus, pars acromialis', 'm', 'membre-sup', 'Épaule', 1, 'deltoide'],
  'spinal part of deltoid': ['deltoide-spinale', 'Deltoïde, partie spinale', 'M. deltoideus, pars spinalis', 'm', 'membre-sup', 'Épaule', 1, 'deltoide'],
  supraspinatus: ['supra-epineux', 'Supra-épineux', 'M. supraspinatus', 'm', 'membre-sup', 'Épaule (coiffe des rotateurs)', 3, 'supra-epineux'],
  'infraspinatus muscle': ['infra-epineux', 'Infra-épineux', 'M. infraspinatus', 'm', 'membre-sup', 'Épaule (coiffe des rotateurs)', 2, 'infra-epineux'],
  'teres minor': ['petit-rond', 'Petit rond', 'M. teres minor', 'm', 'membre-sup', 'Épaule (coiffe des rotateurs)', 2, 'petit-rond'],
  subscapularis: ['subscapulaire', 'Subscapulaire', 'M. subscapularis', 'm', 'membre-sup', 'Épaule (coiffe des rotateurs)', 3, 'subscapulaire'],
  'teres major': ['grand-rond', 'Grand rond', 'M. teres major', 'm', 'membre-sup', 'Épaule', 2, 'grand-rond'],
  // ---------------------------------------------------------------- Bras
  coracobrachialis: ['coraco-brachial', 'Coraco-brachial', 'M. coracobrachialis', 'm', 'membre-sup', 'Bras – loge antérieure', 2, 'coraco-brachial'],
  'long head of biceps brachii': ['biceps-brachial-long', 'Biceps brachial, chef long', 'M. biceps brachii, caput longum', 'm', 'membre-sup', 'Bras – loge antérieure', 1, 'biceps-brachial'],
  'short head of biceps brachii': ['biceps-brachial-court', 'Biceps brachial, chef court', 'M. biceps brachii, caput breve', 'm', 'membre-sup', 'Bras – loge antérieure', 1, 'biceps-brachial'],
  brachialis: ['brachial', 'Brachial', 'M. brachialis', 'm', 'membre-sup', 'Bras – loge antérieure', 2, 'brachial'],
  'long head of triceps brachii': ['triceps-brachial-long', 'Triceps brachial, chef long', 'M. triceps brachii, caput longum', 'm', 'membre-sup', 'Bras – loge postérieure', 1, 'triceps-brachial'],
  'lateral head of triceps brachii': ['triceps-brachial-lateral', 'Triceps brachial, chef latéral', 'M. triceps brachii, caput laterale', 'm', 'membre-sup', 'Bras – loge postérieure', 1, 'triceps-brachial'],
  'medial head of triceps brachii': ['triceps-brachial-medial', 'Triceps brachial, chef médial', 'M. triceps brachii, caput mediale', 'm', 'membre-sup', 'Bras – loge postérieure', 2, 'triceps-brachial'],
  // ---------------------------------------------------------------- Avant-bras
  'humeral head of pronator teres': ['rond-pronateur-humeral', 'Rond pronateur, chef huméral', 'M. pronator teres, caput humerale', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 1, 'rond-pronateur'],
  'ulnar head of pronator teres': ['rond-pronateur-ulnaire', 'Rond pronateur, chef ulnaire', 'M. pronator teres, caput ulnare', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 1, 'rond-pronateur'],
  'flexor carpi radialis': ['flechisseur-radial-carpe', 'Fléchisseur radial du carpe', 'M. flexor carpi radialis', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 1, 'flechisseur-radial-carpe'],
  'palmaris longus': ['long-palmaire', 'Long palmaire', 'M. palmaris longus', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 1, 'long-palmaire'],
  'humeral head of flexor carpi ulnaris': ['flechisseur-ulnaire-carpe-humeral', 'Fléchisseur ulnaire du carpe, chef huméral', 'M. flexor carpi ulnaris, caput humerale', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 1, 'flechisseur-ulnaire-carpe'],
  'ulnar head of flexor carpi ulnaris': ['flechisseur-ulnaire-carpe-ulnaire', 'Fléchisseur ulnaire du carpe, chef ulnaire', 'M. flexor carpi ulnaris, caput ulnare', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 1, 'flechisseur-ulnaire-carpe'],
  'flexor digitorum superficialis': ['flechisseur-superficiel-doigts', 'Fléchisseur superficiel des doigts', 'M. flexor digitorum superficialis', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 2, 'flechisseur-superficiel-doigts'],
  'flexor digitorum profundus': ['flechisseur-profond-doigts', 'Fléchisseur profond des doigts', 'M. flexor digitorum profundus', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 3, 'flechisseur-profond-doigts'],
  'flexor pollicis longus': ['long-flechisseur-pouce', 'Long fléchisseur du pouce', 'M. flexor pollicis longus', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 3, 'long-flechisseur-pouce'],
  'pronator quadratus': ['carre-pronateur', 'Carré pronateur', 'M. pronator quadratus', 'm', 'membre-sup', 'Avant-bras – loge antérieure', 3, 'carre-pronateur'],
  brachioradialis: ['brachio-radial', 'Brachio-radial', 'M. brachioradialis', 'm', 'membre-sup', 'Avant-bras – loge latérale', 1, 'brachio-radial'],
  'extensor carpi radialis longus': ['long-extenseur-radial-carpe', 'Long extenseur radial du carpe', 'M. extensor carpi radialis longus', 'm', 'membre-sup', 'Avant-bras – loge latérale', 1, 'extenseurs-radiaux-carpe'],
  'extensor carpi radialis brevis': ['court-extenseur-radial-carpe', 'Court extenseur radial du carpe', 'M. extensor carpi radialis brevis', 'm', 'membre-sup', 'Avant-bras – loge latérale', 2, 'extenseurs-radiaux-carpe'],
  supinator: ['supinateur', 'Supinateur', 'M. supinator', 'm', 'membre-sup', 'Avant-bras – loge latérale', 3, 'supinateur'],
  anconeus: ['ancone', 'Anconé', 'M. anconeus', 'm', 'membre-sup', 'Avant-bras – loge postérieure', 1, 'triceps-brachial'],
  'extensor digitorum': ['extenseur-doigts', 'Extenseur des doigts', 'M. extensor digitorum', 'm', 'membre-sup', 'Avant-bras – loge postérieure', 1, 'extenseurs-avant-bras'],
  'extensor digiti minimi': ['extenseur-petit-doigt', 'Extenseur du petit doigt', 'M. extensor digiti minimi', 'm', 'membre-sup', 'Avant-bras – loge postérieure', 1, 'extenseurs-avant-bras'],
  'extensor carpi ulnaris': ['extenseur-ulnaire-carpe', 'Extenseur ulnaire du carpe', 'M. extensor carpi ulnaris', 'm', 'membre-sup', 'Avant-bras – loge postérieure', 1, 'extenseurs-avant-bras'],
  'abductor pollicis longus': ['long-abducteur-pouce', 'Long abducteur du pouce', 'M. abductor pollicis longus', 'm', 'membre-sup', 'Avant-bras – loge postérieure', 2, 'muscles-pouce-avant-bras'],
  'extensor pollicis brevis': ['court-extenseur-pouce', 'Court extenseur du pouce', 'M. extensor pollicis brevis', 'm', 'membre-sup', 'Avant-bras – loge postérieure', 2, 'muscles-pouce-avant-bras'],
  'extensor pollicis longus': ['long-extenseur-pouce', 'Long extenseur du pouce', 'M. extensor pollicis longus', 'm', 'membre-sup', 'Avant-bras – loge postérieure', 3, 'muscles-pouce-avant-bras'],
  'extensor indicis': ['extenseur-index', "Extenseur de l'index", 'M. extensor indicis', 'm', 'membre-sup', 'Avant-bras – loge postérieure', 3, 'extenseurs-avant-bras'],
  // ---------------------------------------------------------------- Main
  'flexor retinaculum of wrist': ['retinaculum-flechisseurs', 'Rétinaculum des fléchisseurs (poignet)', 'Retinaculum musculorum flexorum', 'm', 'membre-sup', 'Main – loge moyenne', 1, ''],
  'abductor pollicis brevis': ['court-abducteur-pouce', 'Court abducteur du pouce', 'M. abductor pollicis brevis', 'm', 'membre-sup', 'Main – éminence thénar', 1, 'thenar'],
  'flexor pollicis brevis': ['court-flechisseur-pouce', 'Court fléchisseur du pouce', 'M. flexor pollicis brevis', 'm', 'membre-sup', 'Main – éminence thénar', 1, 'thenar'],
  'superficial head of flexor pollicis brevis': ['court-flechisseur-pouce-superficiel', 'Court fléchisseur du pouce, chef superficiel', 'M. flexor pollicis brevis, caput superficiale', 'm', 'membre-sup', 'Main – éminence thénar', 1, 'thenar'],
  'opponens pollicis': ['opposant-pouce', 'Opposant du pouce', 'M. opponens pollicis', 'm', 'membre-sup', 'Main – éminence thénar', 2, 'thenar'],
  'oblique head of adductor pollicis': ['adducteur-pouce-oblique', 'Adducteur du pouce, chef oblique', 'M. adductor pollicis, caput obliquum', 'm', 'membre-sup', 'Main – éminence thénar', 3, 'thenar'],
  'transverse head of adductor pollicis': ['adducteur-pouce-transverse', 'Adducteur du pouce, chef transverse', 'M. adductor pollicis, caput transversum', 'm', 'membre-sup', 'Main – éminence thénar', 3, 'thenar'],
  'abductor digiti minimi of hand': ['abducteur-petit-doigt', 'Abducteur du petit doigt', 'M. abductor digiti minimi (manus)', 'm', 'membre-sup', 'Main – éminence hypothénar', 1, 'hypothenar'],
  'flexor digiti minimi brevis of hand': ['court-flechisseur-petit-doigt', 'Court fléchisseur du petit doigt', 'M. flexor digiti minimi brevis (manus)', 'm', 'membre-sup', 'Main – éminence hypothénar', 1, 'hypothenar'],
  'opponens digiti minimi of hand': ['opposant-petit-doigt', 'Opposant du petit doigt', 'M. opponens digiti minimi', 'm', 'membre-sup', 'Main – éminence hypothénar', 2, 'hypothenar'],
  'set of lumbricals of hand': ['lombricaux-main', 'Lombricaux de la main', 'Mm. lumbricales manus', 'm', 'membre-sup', 'Main – loge moyenne', 2, 'interosseux-lombricaux-main'],
  'set of dorsal interossei of hand': ['interosseux-dorsaux-main', 'Interosseux dorsaux de la main', 'Mm. interossei dorsales manus', 'm', 'membre-sup', 'Main – loge moyenne', 3, 'interosseux-lombricaux-main'],
  'set of palmar interossei of hand': ['interosseux-palmaires', 'Interosseux palmaires', 'Mm. interossei palmares', 'm', 'membre-sup', 'Main – loge moyenne', 3, 'interosseux-lombricaux-main'],

  // ---------------------------------------------------------------- Membre inférieur : région glutéale
  'gluteus maximus': ['grand-fessier', 'Grand fessier', 'M. gluteus maximus', 'm', 'membre-inf', 'Région glutéale', 1, 'grand-fessier'],
  'gluteus medius': ['moyen-fessier', 'Moyen fessier', 'M. gluteus medius', 'm', 'membre-inf', 'Région glutéale', 2, 'moyen-petit-fessiers'],
  'gluteus minimus': ['petit-fessier', 'Petit fessier', 'M. gluteus minimus', 'm', 'membre-inf', 'Région glutéale', 3, 'moyen-petit-fessiers'],
  'tensor fasciae latae': ['tenseur-fascia-lata', 'Tenseur du fascia lata', 'M. tensor fasciae latae', 'm', 'membre-inf', 'Région glutéale', 1, 'tenseur-fascia-lata'],
  piriformis: ['piriforme', 'Piriforme', 'M. piriformis', 'm', 'membre-inf', 'Pelvi-trochantériens', 3, 'pelvi-trochanteriens'],
  'gemellus superior': ['jumeau-superieur', 'Jumeau supérieur', 'M. gemellus superior', 'm', 'membre-inf', 'Pelvi-trochantériens', 3, 'pelvi-trochanteriens'],
  'gemellus inferior': ['jumeau-inferieur', 'Jumeau inférieur', 'M. gemellus inferior', 'm', 'membre-inf', 'Pelvi-trochantériens', 3, 'pelvi-trochanteriens'],
  'obturator internus': ['obturateur-interne', 'Obturateur interne', 'M. obturator internus', 'm', 'membre-inf', 'Pelvi-trochantériens', 3, 'pelvi-trochanteriens'],
  'obturator externus': ['obturateur-externe', 'Obturateur externe', 'M. obturator externus', 'm', 'membre-inf', 'Pelvi-trochantériens', 3, 'pelvi-trochanteriens'],
  'quadratus femoris': ['carre-femoral', 'Carré fémoral', 'M. quadratus femoris', 'm', 'membre-inf', 'Pelvi-trochantériens', 3, 'pelvi-trochanteriens'],
  // ---------------------------------------------------------------- Cuisse
  sartorius: ['sartorius', 'Sartorius', 'M. sartorius', 'm', 'membre-inf', 'Cuisse – loge antérieure', 1, 'sartorius'],
  'rectus femoris': ['droit-femoral', 'Droit fémoral', 'M. rectus femoris', 'm', 'membre-inf', 'Cuisse – loge antérieure', 1, 'quadriceps'],
  'vastus lateralis': ['vaste-lateral', 'Vaste latéral', 'M. vastus lateralis', 'm', 'membre-inf', 'Cuisse – loge antérieure', 1, 'quadriceps'],
  'vastus medialis': ['vaste-medial', 'Vaste médial', 'M. vastus medialis', 'm', 'membre-inf', 'Cuisse – loge antérieure', 1, 'quadriceps'],
  'vastus intermedius': ['vaste-intermediaire', 'Vaste intermédiaire', 'M. vastus intermedius', 'm', 'membre-inf', 'Cuisse – loge antérieure', 2, 'quadriceps'],
  pectineus: ['pectine', 'Pectiné', 'M. pectineus', 'm', 'membre-inf', 'Cuisse – loge médiale', 2, 'pectine'],
  'adductor longus': ['long-adducteur', 'Long adducteur', 'M. adductor longus', 'm', 'membre-inf', 'Cuisse – loge médiale', 2, 'adducteurs'],
  'adductor brevis': ['court-adducteur', 'Court adducteur', 'M. adductor brevis', 'm', 'membre-inf', 'Cuisse – loge médiale', 3, 'adducteurs'],
  'adductor magnus': ['grand-adducteur', 'Grand adducteur', 'M. adductor magnus', 'm', 'membre-inf', 'Cuisse – loge médiale', 3, 'adducteurs'],
  'adductor minimus': ['petit-adducteur', 'Petit adducteur', 'M. adductor minimus', 'm', 'membre-inf', 'Cuisse – loge médiale', 3, 'adducteurs'],
  gracilis: ['gracile', 'Gracile', 'M. gracilis', 'm', 'membre-inf', 'Cuisse – loge médiale', 1, 'gracile'],
  semitendinosus: ['semi-tendineux', 'Semi-tendineux', 'M. semitendinosus', 'm', 'membre-inf', 'Cuisse – loge postérieure', 1, 'ischio-jambiers'],
  semimembranosus: ['semi-membraneux', 'Semi-membraneux', 'M. semimembranosus', 'm', 'membre-inf', 'Cuisse – loge postérieure', 2, 'ischio-jambiers'],
  'long head of biceps femoris': ['biceps-femoral-long', 'Biceps fémoral, chef long', 'M. biceps femoris, caput longum', 'm', 'membre-inf', 'Cuisse – loge postérieure', 1, 'ischio-jambiers'],
  'short head of biceps femoris': ['biceps-femoral-court', 'Biceps fémoral, chef court', 'M. biceps femoris, caput breve', 'm', 'membre-inf', 'Cuisse – loge postérieure', 2, 'ischio-jambiers'],
  // ---------------------------------------------------------------- Jambe
  'tibialis anterior': ['tibial-anterieur', 'Tibial antérieur', 'M. tibialis anterior', 'm', 'membre-inf', 'Jambe – loge antérieure', 1, 'tibial-anterieur'],
  'extensor digitorum longus': ['long-extenseur-orteils', 'Long extenseur des orteils', 'M. extensor digitorum longus', 'm', 'membre-inf', 'Jambe – loge antérieure', 1, 'extenseurs-jambe'],
  'extensor hallucis longus': ['long-extenseur-hallux', "Long extenseur de l'hallux", 'M. extensor hallucis longus', 'm', 'membre-inf', 'Jambe – loge antérieure', 2, 'extenseurs-jambe'],
  'fibularis tertius': ['troisieme-fibulaire', 'Troisième fibulaire', 'M. fibularis tertius', 'm', 'membre-inf', 'Jambe – loge antérieure', 2, 'extenseurs-jambe'],
  'fibularis longus': ['long-fibulaire', 'Long fibulaire', 'M. fibularis longus', 'm', 'membre-inf', 'Jambe – loge latérale', 1, 'fibulaires'],
  'fibularis brevis': ['court-fibulaire', 'Court fibulaire', 'M. fibularis brevis', 'm', 'membre-inf', 'Jambe – loge latérale', 2, 'fibulaires'],
  'medial head of gastrocnemius': ['gastrocnemien-medial', 'Gastrocnémien, chef médial', 'M. gastrocnemius, caput mediale', 'm', 'membre-inf', 'Jambe – loge postérieure', 1, 'triceps-sural'],
  'lateral head of gastrocnemius': ['gastrocnemien-lateral', 'Gastrocnémien, chef latéral', 'M. gastrocnemius, caput laterale', 'm', 'membre-inf', 'Jambe – loge postérieure', 1, 'triceps-sural'],
  soleus: ['soleaire', 'Soléaire', 'M. soleus', 'm', 'membre-inf', 'Jambe – loge postérieure', 2, 'triceps-sural'],
  'calcaneal tendon': ['tendon-calcaneen', "Tendon calcanéen (d'Achille)", 'Tendo calcaneus', 'm', 'membre-inf', 'Jambe – loge postérieure', 1, 'triceps-sural'],
  plantaris: ['plantaire', 'Plantaire', 'M. plantaris', 'm', 'membre-inf', 'Jambe – loge postérieure', 2, 'triceps-sural'],
  popliteus: ['poplite', 'Poplité', 'M. popliteus', 'm', 'membre-inf', 'Jambe – loge postérieure', 3, 'poplite'],
  'tibialis posterior': ['tibial-posterieur', 'Tibial postérieur', 'M. tibialis posterior', 'm', 'membre-inf', 'Jambe – loge postérieure', 3, 'tibial-posterieur'],
  'flexor digitorum longus': ['long-flechisseur-orteils', 'Long fléchisseur des orteils', 'M. flexor digitorum longus', 'm', 'membre-inf', 'Jambe – loge postérieure', 3, 'flechisseurs-jambe'],
  'flexor hallucis longus': ['long-flechisseur-hallux', "Long fléchisseur de l'hallux", 'M. flexor hallucis longus', 'm', 'membre-inf', 'Jambe – loge postérieure', 3, 'flechisseurs-jambe'],
  // ---------------------------------------------------------------- Pied
  'extensor hallucis brevis': ['court-extenseur-hallux', "Court extenseur de l'hallux", 'M. extensor hallucis brevis', 'm', 'membre-inf', 'Pied – face dorsale', 1, 'muscles-pied'],
  'abductor hallucis': ['abducteur-hallux', "Abducteur de l'hallux", 'M. abductor hallucis', 'm', 'membre-inf', 'Pied – plante', 1, 'muscles-pied'],
  'flexor digitorum brevis': ['court-flechisseur-orteils', 'Court fléchisseur des orteils', 'M. flexor digitorum brevis', 'm', 'membre-inf', 'Pied – plante', 1, 'muscles-pied'],
  'abductor digiti minimi of foot': ['abducteur-5e-orteil', 'Abducteur du 5e orteil', 'M. abductor digiti minimi (pedis)', 'm', 'membre-inf', 'Pied – plante', 1, 'muscles-pied'],
  'flexor accessorius': ['carre-plantaire', 'Carré plantaire', 'M. quadratus plantae', 'm', 'membre-inf', 'Pied – plante', 2, 'muscles-pied'],
  'medial head of flexor hallucis brevis': ['court-flechisseur-hallux-medial', "Court fléchisseur de l'hallux, chef médial", 'M. flexor hallucis brevis, caput mediale', 'm', 'membre-inf', 'Pied – plante', 3, 'muscles-pied'],
  'lateral head of flexor hallucis brevis': ['court-flechisseur-hallux-lateral', "Court fléchisseur de l'hallux, chef latéral", 'M. flexor hallucis brevis, caput laterale', 'm', 'membre-inf', 'Pied – plante', 3, 'muscles-pied'],
  'oblique head of adductor hallucis': ['adducteur-hallux-oblique', "Adducteur de l'hallux, chef oblique", 'M. adductor hallucis, caput obliquum', 'm', 'membre-inf', 'Pied – plante', 3, 'muscles-pied'],
  'transverse head of adductor hallucis': ['adducteur-hallux-transverse', "Adducteur de l'hallux, chef transverse", 'M. adductor hallucis, caput transversum', 'm', 'membre-inf', 'Pied – plante', 3, 'muscles-pied'],
  'flexor digiti minimi brevis of foot': ['court-flechisseur-5e-orteil', 'Court fléchisseur du 5e orteil', 'M. flexor digiti minimi brevis (pedis)', 'm', 'membre-inf', 'Pied – plante', 3, 'muscles-pied'],
  'opponens digiti minimi of foot': ['opposant-5e-orteil', 'Opposant du 5e orteil', 'M. opponens digiti minimi (pedis)', 'm', 'membre-inf', 'Pied – plante', 3, 'muscles-pied'],
};

// Lombricaux et interosseux plantaires numérotés
const ORD = { first: 1, second: 2, third: 3, fourth: 4 };
const ROM = ['', 'I', 'II', 'III', 'IV'];
const ordFr = (n) => (n === 1 ? '1er' : `${n}e`);

/** Traduit un nom FMA anglais de muscle. Renvoie null si inconnu. */
export function traduireMuscle(en) {
  const { cote, base } = separerCote(en.toLowerCase());
  const t = M[base];
  if (t) {
    const [cle, fr, la, genre, region, groupe, couche, fiche] = t;
    return { cle, fr, la, genre, region, groupe, couche, fiche, cote };
  }
  let m = base.match(/^(first|second|third|fourth) (lumbrical|plantar interosseous) of foot$/);
  if (m) {
    const n = ORD[m[1]];
    const lomb = m[2] === 'lumbrical';
    return {
      cle: `${lomb ? 'lombrical' : 'interosseux-plantaire'}-${n}`,
      fr: lomb ? `${ordFr(n)} lombrical du pied` : `${ordFr(n)} interosseux plantaire`,
      la: lomb ? `M. lumbricalis pedis ${ROM[n]}` : `M. interosseus plantaris ${ROM[n]}`,
      genre: 'm', region: 'membre-inf', groupe: 'Pied – plante', couche: lomb ? 2 : 3, fiche: 'muscles-pied', cote,
    };
  }
  return null;
}

/** Peau : un seul maillage pour tout le corps. */
export function traduirePeau(en) {
  return en.toLowerCase() === 'skin'
    ? { cle: 'peau', fr: 'Peau', la: 'Cutis', genre: 'f', region: 'corps', groupe: 'Peau', couche: 0, fiche: '', cote: null }
    : null;
}
