// Types partagés de l'application.

export type Cote = 'd' | 'g' | null;

/** Un maillage 3D (une structure, éventuellement latéralisée). */
export interface Structure {
  /** Identifiant du fichier BodyParts3D (FJxxxx), = nom du nœud dans le GLB */
  id: string;
  /** Identifiant FMA (Foundational Model of Anatomy) */
  fma: string;
  /** Nom anglais FMA d'origine */
  en: string;
  /** Identifiant non latéralisé (ex. « femur ») */
  cle: string;
  /** Nom français sans latéralité (ex. « Fémur ») */
  fr: string;
  /** Nom latin (Terminologia Anatomica) */
  la: string;
  cote: Cote;
  genre: 'm' | 'f';
  systeme: string;
  region: string;
  groupe: string;
  /** Identifiant de la fiche de cours */
  fiche: string;
  /** Paquet GLB contenant le maillage */
  paquet: string;
  /** Centre de la boîte englobante (mètres, Y en haut) */
  centre: [number, number, number];
}

export interface Systeme {
  id: string;
  nom: string;
  couleur: string;
}

export interface Region {
  id: string;
  nom: string;
}

/** Fiche de cours, lue depuis contenu/fiches/<systeme>/<id>.md */
export interface Fiche {
  id: string;
  titre: string;
  latin: string;
  systeme: string;
  /** « a-verifier » tant que l'étudiant ne l'a pas relue contre son cours */
  statut: 'a-verifier' | 'verifiee';
  /** Clés des structures décrites par la fiche */
  structures: string[];
  /** Sections : titre → Markdown */
  sections: { titre: string; markdown: string }[];
  /** Chemin du fichier source (pour savoir où corriger) */
  fichier: string;
}
