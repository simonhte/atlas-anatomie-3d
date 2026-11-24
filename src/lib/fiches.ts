// Lecture des fiches de cours écrites en Markdown.
//
// Format d'un fichier (voir contenu/fiches/LISEZMOI.md) :
//
//   ---
//   id: femur
//   titre: Fémur
//   latin: Femur
//   systeme: os
//   statut: a-verifier
//   structures: [femur]
//   ---
//   ## Description et situation
//   …texte…
//   ## À retenir pour l'examen
//   …

import type { Fiche } from './types';

/** Lit l'en-tête « front matter » (clé: valeur, listes entre crochets). */
export function lireEntete(texte: string): { entete: Record<string, string | string[]>; corps: string } {
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { entete: {}, corps: texte };
  const entete: Record<string, string | string[]> = {};
  for (const ligne of m[1].split(/\r?\n/)) {
    const kv = ligne.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const v = kv[2].trim();
    entete[kv[1]] = v.startsWith('[') && v.endsWith(']')
      ? v.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean)
      : v.replace(/^["']|["']$/g, '');
  }
  return { entete, corps: m[2] };
}

/** Découpe le corps en sections « ## Titre ». */
export function decouperSections(corps: string): { titre: string; markdown: string }[] {
  const sections: { titre: string; markdown: string }[] = [];
  let courante: { titre: string; lignes: string[] } | null = null;
  for (const ligne of corps.split(/\r?\n/)) {
    const h = ligne.match(/^##\s+(.+?)\s*$/);
    if (h) {
      if (courante) sections.push({ titre: courante.titre, markdown: courante.lignes.join('\n').trim() });
      courante = { titre: h[1], lignes: [] };
    } else if (courante) courante.lignes.push(ligne);
    else if (ligne.trim()) {
      courante = { titre: 'Description et situation', lignes: [ligne] };
    }
  }
  if (courante) sections.push({ titre: courante.titre, markdown: courante.lignes.join('\n').trim() });
  return sections.filter((s) => s.markdown);
}

export function lireFiche(texte: string, fichier: string): Fiche {
  const { entete, corps } = lireEntete(texte);
  const s = (k: string) => (typeof entete[k] === 'string' ? (entete[k] as string) : '');
  const id = s('id') || fichier.replace(/^.*\/|\.md$/g, '');
  const structures = Array.isArray(entete.structures) ? entete.structures : id ? [id] : [];
  return {
    id,
    titre: s('titre') || id,
    latin: s('latin'),
    systeme: s('systeme'),
    statut: s('statut') === 'verifiee' ? 'verifiee' : 'a-verifier',
    structures,
    sections: decouperSections(corps),
    fichier,
  };
}

/** Charge toutes les fiches du dossier contenu/fiches (intégrées au build par Vite). */
export function chargerFiches(): Map<string, Fiche> {
  const fichiers = import.meta.glob('/contenu/fiches/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const fiches = new Map<string, Fiche>();
  for (const [chemin, texte] of Object.entries(fichiers)) {
    if (/LISEZMOI|README|_modele/i.test(chemin)) continue;
    const f = lireFiche(texte, chemin.replace(/^\//, ''));
    fiches.set(f.id, f);
  }
  return fiches;
}
